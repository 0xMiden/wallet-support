/**
 * Triage AND publish for a single submission. Fully automated, no human in
 * the loop.
 *
 * fingerprint → retrieve candidates → classify → gate → write to GitHub.
 *
 * Ordering of the guards matters. Idempotency is checked before the cap so a
 * retry of an already-published submission never consumes cap budget.
 *
 * This module owns the terminal SUCCESS transitions (published / folded).
 * Everything that needs to be tried again later is returned as an Outcome and
 * the caller decides the retry bookkeeping — see drain.ts. That split keeps
 * the publish path identical no matter what drives it, which is what made the
 * move off Queues a rewiring rather than a rewrite.
 */

import type { Env } from './index';
import { classify, validateVerdict, PROMPT_VERSION, type Candidate, type Verdict } from './lib/classify';
import {
  spamGateEnabled, floodConfig, evaluateDeterministicEvidence, confirmFloodAtDrain,
  type SpamReason,
} from './lib/spam-signals';
import { claimForPublishing } from './lib/publish-guard';
import {
  createIssue, createComment, updateComment,
  markerAlreadyPublished, RateLimited,
} from './lib/publish';
import { publishAttachment, renderAttachment, type StoredAttachment } from './lib/attachments';
import { similarIssues } from './lib/embed';
import { sanitize } from './lib/sanitize';
import { assertWalletTarget } from './lib/github-auth';

/** The submissions columns this pipeline reads. */
export interface SubmissionRow {
  submission_id: string;
  state: string;
  received_at: number;
  body_sanitized: string;
  wallet_version: string | null;
  platform: string | null;
  network: string | null;
  route: string | null;
  error_code: string | null;
  fingerprint: string | null;
  /** Hashed reporter identity, for the per-reporter publish cap. NULL on every
   *  row written before migration 0004 — those skip that cap. */
  reporter_key: string | null;
  attachment_keys: string | null;
  attempts: number;
  /**
   * Spam layer. NULL on every row written before migration 0005, and NULL
   * MEANS CLEAN — failing tight here would strand every legacy row behind a
   * review no human ever made.
   */
  spam_status: string | null;
  spam_reviewed_at: number | null;
  normalized_hash: string | null;
  reporter_kind: string | null;
}

/**
 * `done`  — terminal, already transitioned here.
 * `defer` — try again later; NOT the submission's fault, so the caller must
 *           not spend an attempt on it (backpressure or an upstream outage).
 * `fail`  — an error we cannot classify; the caller spends an attempt and
 *           parks the row once the budget is gone.
 */
export type Outcome =
  | { kind: 'done'; detail: string }
  | { kind: 'defer'; state: 'capped' | 'deferred'; delayMs: number; detail: string }
  | { kind: 'fail'; error: string };

/**
 * Exactly one label, by decision (2026-08-13): its whole job is to say "a user
 * filed this through the Bread feedback form". Four labels per issue was noise
 * on someone else's tracker, and none of them were load-bearing — idempotency
 * uses the <!-- mfv2:{id} --> marker in the body, and the mirror sync pulls
 * every issue rather than filtering by label.
 *
 * Same name as the v1 relay uses, so one filter finds every form-sourced issue
 * regardless of which pipeline filed it.
 *
 * Still an allowlist: the model may suggest labels, and anything not in here is
 * dropped before it reaches GitHub.
 */
const ALLOWED_LABELS = new Set(['feedback-form']);

/** Longest a cap may defer a submission. Was the queue's retry delaySeconds. */
export const CAP_DEFER_MS = 900_000;

/**
 * When to come back after a cap refuses.
 *
 * The gate knows exactly when its window clears and says so in `resetAt`;
 * this used to be a flat CAP_DEFER_MS, which threw that away. A real report
 * whose hourly slot freed at 13:28:13 sat until 13:38:13 for no reason.
 *
 * Clamped at both ends. Never sooner than a minute — the drain ticks once a
 * minute, so anything less just burns a claim. Never later than CAP_DEFER_MS,
 * because a DAILY cap resets up to 24 hours out, and parking a row that long
 * would outlast any config change made to free it.
 */
function capDelayMs(decision: { resetAt?: number }): number {
  if (typeof decision.resetAt !== 'number') return CAP_DEFER_MS;
  // +2s: waking a hair early only to be refused again costs a whole cycle.
  return Math.min(CAP_DEFER_MS, Math.max(60_000, decision.resetAt - Date.now() + 2_000));
}
/** How long an unavailable classifier defers a submission. */
export const CLASSIFY_DEFER_MS = 300_000;

export async function transition(env: Env, id: string, from: string, to: string, detail?: string) {
  await env.DB.batch([
    env.DB.prepare('UPDATE submissions SET state = ? WHERE submission_id = ?').bind(to, id),
    env.DB.prepare('INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?,?,?,?,?)')
      .bind(id, Date.now(), from, to, detail ?? null),
  ]);
}

/** Candidates handed to the model. Bounded because every one costs prompt tokens. */
const MAX_CANDIDATES = 8;

async function retrieveCandidates(env: Env, sub: SubmissionRow): Promise<Candidate[]> {
  const byFingerprint = await env.DB.prepare(
    `SELECT m.number, m.title, m.body, m.state
       FROM dup_links d JOIN issue_mirror m ON m.number = d.issue_number
      WHERE d.submission_id IN (SELECT submission_id FROM submissions WHERE fingerprint = ?)
      GROUP BY m.number LIMIT 5`
  ).bind(sub.fingerprint).all<Candidate>();

  // Keyword pass — ONLY when there is a keyword. With a null error_code the
  // pattern collapsed to '%%', which matches every title and returned "the 5
  // most recently updated issues". Those are not candidates, and because they
  // were merged ahead of the semantic hits they consumed 5 of the 8 slots and
  // truncated the one pass that finds a paraphrase.
  const keywordTerm = (sub.error_code ?? '').replace(/_/g, ' ').toLowerCase().trim();
  const keyword = keywordTerm
    ? await env.DB.prepare(
        `SELECT number, title, body, state FROM issue_mirror
          WHERE title LIKE ? ORDER BY updated_at DESC LIMIT 5`
      ).bind(`%${keywordTerm}%`).all<Candidate>()
    : { results: [] as Candidate[] };

  let semantic: Candidate[] = [];
  try {
    semantic = await similarIssues(env, sub.body_sanitized, MAX_CANDIDATES);
  } catch (err) {
    // Degrades retrieval rather than aborting the submission: a lexical-only
    // candidate set risks a duplicate issue, deferring risks never filing.
    console.warn('embedding retrieval unavailable, falling back to lexical', err);
  }

  // Priority order, because the cap truncates from the tail:
  //   1. fingerprint — an exact structural match, the strongest evidence
  //   2. semantic    — the only pass that catches a rephrasing
  //   3. keyword     — weakest, and only present when an error code was inferred
  const seen = new Set<number>();
  const merged = [...(byFingerprint.results ?? []), ...semantic, ...(keyword.results ?? [])]
    .filter((c) => !seen.has(c.number) && seen.add(c.number))
    .slice(0, MAX_CANDIDATES);

  // Record what was offered. Without this a "why was this not deduped?" has no
  // answer: retrieval miss and classifier miss look identical after the fact.
  console.log(JSON.stringify({
    job: 'retrieve', submission: sub.submission_id,
    fingerprint: (byFingerprint.results ?? []).map((c) => c.number),
    semantic: semantic.map((c) => c.number),
    keyword: (keyword.results ?? []).map((c) => c.number),
    offered: merged.map((c) => c.number),
  }));
  return merged;
}

/**
 * A readability bound, not a platform one — GitHub allows 256.
 *
 * Deliberately well above the 70 characters the prompt asks for. An ellipsis
 * in the middle of an issue title is itself what reads as machine-filed, so a
 * model that overshoots by half still lands here whole and truncation stays
 * what it should be: a backstop for pathological input.
 */
const TITLE_MAX = 120;

/** Truncate on a word boundary. slice() alone produced titles ending "The bro". */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  // Any word boundary leaving a readable title beats a mid-word cut. The old
  // guard (space > max * 0.6) fell back to slicing mid-word whenever the break
  // landed early — the same defect this function exists to prevent.
  const kept = space >= 24 ? cut.slice(0, space) : cut;
  return kept.replace(/[\s,;:.!?\-–—]+$/, '') + '…';
}

/**
 * Prefer the classifier's summary — it reads the whole report and describes the
 * DEFECT. The fallback can only echo the reporter's opening words, which is how
 * #45 ended up titled with a mid-word truncation of its first sentence.
 *
 * NO ERROR-CODE PREFIX. Titles used to open with "[NODE_UNREACHABLE] ", which
 * reads as machine-filed on a tracker of hand-written issues and spent 19
 * characters of a budget that was then cut short mid-word anyway (#779).
 *
 * Nothing downstream depended on it, and the one thing that looked like it did
 * does not: the keyword retrieval pass normalises the code to "node
 * unreachable" before matching, so it only ever hit prose titles and never the
 * bracketed form. The code itself is still recorded — in the issue body's
 * Environment table, in submissions.error_code, and in the fingerprint.
 */
function titleFor(sub: SubmissionRow, summary?: string): string {
  const clean = (summary ?? '').trim();
  if (clean.length >= 12) return clamp(clean, TITLE_MAX);
  const first = sub.body_sanitized.split('\n').find((l) => l.trim()) ?? 'Feedback report';
  return clamp(first.trim(), TITLE_MAX);
}

/** Display names. The stored values are the wire values: android | ios | extension. */
const PLATFORM_LABEL: Record<string, string> = {
  android: 'Android', ios: 'iOS', extension: 'Extension',
};

/**
 * Where a report came from when it was NOT the in-app form: a Google Play or
 * App Store review a person sent here from Store Reviews.
 *
 * Such a report must never be described as a form submission — not in the
 * footer, not in the label, not in a rolling comment. It is recognised by
 * `reporter_kind = 'store'`, which only the handoff writes; the store and the
 * rating come from the review it was sent from (one read, only for these rows).
 * Nothing about the reviewer is carried: no name, no id.
 */
export interface StoreOrigin { store: 'Google Play' | 'App Store'; rating: number | null }

function storeName(source: string | null, platform: string | null): StoreOrigin['store'] {
  return (source ?? (platform === 'ios' ? 'app_store' : 'google_play')) === 'app_store' ? 'App Store' : 'Google Play';
}
const validRating = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);

async function storeOriginOf(env: Env, sub: SubmissionRow): Promise<StoreOrigin | null> {
  if (sub.reporter_kind !== 'store') return null;
  const r = await env.DB.prepare('SELECT source, rating FROM store_reviews WHERE handoff_submission_id = ?')
    .bind(sub.submission_id).first<{ source: string; rating: number | null }>();
  return { store: storeName(r?.source ?? null, sub.platform), rating: validRating(r?.rating) };
}

/**
 * One environment fact, ready to render. Values reach here from the submitted
 * `meta` blob, which — unlike the report body — was never passed through
 * sanitize(). Anyone posting to /submit directly could put "@everyone" or
 * "#123" in wallet_version and have it act on the repo, so it is neutralised
 * here alongside the pipe and newline stripping the layout needs.
 */
function envRow(label: string, value: string | null): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const safe = sanitize(v).replace(/[|\r\n]+/g, ' ').trim().slice(0, 60);
  return safe ? `- **${label}:** ${safe}` : null;
}

/** A matched issue this report was NOT attached to, and how firmly to say so. */
export interface RelatedIssue {
  number: number;
  /** Confident enough to spend a real cross-reference on the other issue. */
  strong: boolean;
  /** Shown to the maintainer in the weak form, so the match is auditable. */
  confidence: number;
}

/**
 * @param related  The issue this report matched but was not attached to.
 *
 *   strong  — rendered as `#N`, a real GitHub cross-reference. That puts a
 *             "referenced this issue" event on the other issue's timeline, so
 *             the maintainers who closed it see this report without it being
 *             reopened. Earned only at AUTO_ACTION_THRESHOLD.
 *   weak    — rendered as plain text, deliberately NOT `#N`. Below the
 *             threshold the match has not earned a mark on someone else's
 *             issue, and a cross-reference is exactly that mark. A maintainer
 *             still reads the number; the other issue stays untouched.
 *
 * Safe to interpolate either way: it is a validated integer from the
 * candidate set, not text. The reporter's own #N references were already
 * defanged by sanitize().
 */
function issueBody(
  sub: SubmissionRow,
  env: Env,
  attachments: StoredAttachment[],
  related: RelatedIssue | null = null,
  origin: StoreOrigin | null = null
): string {
  // Only facts we actually have. The form collects platform; wallet version,
  // network and route arrive only when the wallet embeds the form, so on the
  // standalone page they are all null — and printing four rows of "not
  // reported" under an empty-header table said nothing, at length.
  const facts = [
    envRow('Platform', sub.platform ? PLATFORM_LABEL[sub.platform] ?? sub.platform : null),
    envRow('Wallet version', sub.wallet_version),
    envRow('Network', sub.network),
    envRow('Route', sub.route),
    envRow('Error code', sub.error_code),
  ].filter((r): r is string => r !== null);

  const environment = facts.length ? `\n## Environment\n\n${facts.join('\n')}\n` : '';
  const attach = attachments.length
    ? `\n## Attachments\n\n${attachments.map(renderAttachment).join('\n\n')}\n`
    : '';

  // First, not last: a maintainer reading a new issue that is really a
  // reopening candidate needs that context before the report, not after it.
  //
  // The strong form deliberately claims no fix. Routing keys on state alone,
  // and a close can mean "not planned" as easily as "completed" — asserting
  // "the fix has not reached you yet" would then be writing something untrue
  // into a public issue on someone else's repository. This wording holds
  // either way.
  const relatedNote = !related ? ''
    : related.strong
      ? `> **Possibly related to #${related.number}, which was previously closed.**\n` +
        `> This report arrived after that issue was closed. It may mean the defect\n` +
        `> was not fully resolved, has returned, or that the reporter's build\n` +
        `> predates the change.\n\n`
      : `> Possibly the same defect as issue ${related.number}, matched automatically\n` +
        `> at ${related.confidence.toFixed(2)} confidence. That is below the threshold for adding a\n` +
        `> report to an existing issue, so this was filed separately. Left unlinked\n` +
        `> on purpose — the match is not certain enough to mark that issue.\n\n`;

  // A store review says so, with its rating when the store gave one. Empty for
  // a form report, which keeps that body byte for byte what it was.
  const storeSection = origin
    ? `\n## Store review\n\n- **Store:** ${origin.store}\n${origin.rating != null ? `- **Rating:** ${origin.rating} of 5 stars\n` : ''}`
    : '';
  const filedFrom = origin
    ? `Filed from ${origin.store === 'App Store' ? 'an App Store' : 'a Google Play'} review after a maintainer reviewed it in the feedback console.`
    : 'Filed automatically from the in-app feedback form by an anonymous reporter.';

  return `${relatedNote}${sub.body_sanitized}
${storeSection}${environment}${attach}
---
*${filedFrom} Pipeline operated by the Miden support team; replies remain visible to maintainers.*

<!-- mfv2:${sub.submission_id} -->
`;
}

/** One folded report, as the comment needs it. */
interface FoldedReport {
  platform: string | null;
  body: string;
  confidence: number | null;
  linked_at: number;
  /** Set for a store review: which store, and its rating if any. */
  origin?: StoreOrigin | null;
}

/** Render as a blockquote so the reporter's words are unmistakably theirs. */
function quote(text: string): string {
  return text.split('\n').map((l) => `> ${l}`).join('\n');
}

/**
 * A GitHub comment body cannot exceed 65536 characters. Budget the WHOLE
 * comment rather than clipping each report: a report cut off mid-sentence is
 * worse than one that is absent and counted, because a maintainer cannot tell
 * whether the missing half changed the meaning.
 */
const COMMENT_CHAR_BUDGET = 55_000;

/**
 * Rolling comment: ONE comment per issue, edited in place. Never N comments —
 * GitHub notifies on a new comment but not on an edit, so twenty duplicates
 * cost exactly one notification no matter how early the first one appears.
 *
 * It carries the REPORTS, not just a count. A maintainer cannot judge whether
 * a fold was correct from "one further report matches this issue" — the words
 * are the only evidence, and without them a wrong match is invisible and
 * unappealable. The match confidence is shown for the same reason.
 */
function rollingComment(total: number, reports: FoldedReport[], storeTotal = 0): string {
  const rendered: string[] = [];
  let used = 0;
  for (const [i, r] of reports.entries()) {
    const meta = [
      ...(r.origin
        ? [`${r.origin.store} review`, r.origin.rating != null ? `${r.origin.rating} of 5 stars` : null]
        : [r.platform ? PLATFORM_LABEL[r.platform] ?? r.platform : null]),
      new Date(r.linked_at).toISOString().slice(0, 10),
      r.confidence != null ? `matched at ${r.confidence.toFixed(2)}` : null,
    ].filter(Boolean).join(' · ');
    // Full text, never clipped mid-sentence.
    const entry = `**${i + 1}.** ${meta}\n\n${quote(r.body)}`;
    if (used + entry.length > COMMENT_CHAR_BUDGET) break;
    rendered.push(entry);
    used += entry.length;
  }

  const headline = total === 1
    ? 'One further report matches this issue:'
    : `**${total}** further reports match this issue:`;

  const omitted = total > rendered.length
    ? `\n\n_Showing ${rendered.length} of ${total}. The rest are recorded but omitted to keep this comment within GitHub's size limit._`
    : '';

  // Names every source the reports came from, counted over all of them, not
  // only the ones shown. Form-only comments keep their heading unchanged.
  const heading = storeTotal === 0 ? 'Additional reports from the in-app feedback form'
    : storeTotal >= total ? 'Additional reports from store reviews'
    : 'Additional reports from the in-app feedback form and store reviews';

  return `### ${heading}

${headline}

${rendered.join('\n\n')}${omitted}

---

Matched automatically by similarity, not by a human. **If any of these is a
different defect, reply and it can be filed separately.**

*Edited in place as more arrive, rather than reposted.*

<!-- mfv2-rollup -->
`;
}

/**
 * Attach one report to an OPEN issue as a comment.
 *
 * ORDERING IS THE POINT. The dup_links row is written LAST, after GitHub has
 * confirmed the comment, because that row is what /status reads to tell a
 * reporter "added to existing issue #N". Written first — as it used to be —
 * the claim went true before the comment existed, and stayed true if the
 * comment never happened: a 403, a rate limit, or simply the kill switch left
 * a reporter told their report had been merged into an issue that had never
 * heard of it. The row now means one thing only: this text is on that issue.
 *
 * Throws if the comment fails. The caller turns that into a defer or a retry;
 * nothing is recorded either way.
 */
async function attachToIssue(
  env: Env, sub: SubmissionRow, issueNumber: number, confidence: number, origin: StoreOrigin | null = null
) {
  const token = env.GITHUB_WRITE_TOKEN;
  const repo = env.TARGET_REPO;

  // Only the reports ALREADY attached — this one is not in the table yet and
  // must not be until the write lands, so it is added in memory instead.
  // LIMIT 9, not 10: this report takes the tenth slot.
  const prior = await env.DB.prepare(
    `SELECT s.platform, s.body_sanitized AS body, d.confidence, d.linked_at,
            s.reporter_kind, sr.source AS store_source, sr.rating AS store_rating
       FROM dup_links d JOIN submissions s ON s.submission_id = d.submission_id
       LEFT JOIN store_reviews sr ON sr.handoff_submission_id = s.submission_id
      WHERE d.issue_number = ?
      ORDER BY d.linked_at DESC LIMIT 9`
  ).bind(issueNumber).all<FoldedReport & { reporter_kind: string | null; store_source: string | null; store_rating: number | null }>();

  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS n, COUNT(CASE WHEN s.reporter_kind = 'store' THEN 1 END) AS store
       FROM dup_links d LEFT JOIN submissions s ON s.submission_id = d.submission_id
      WHERE d.issue_number = ?`
  ).bind(issueNumber).first<{ n: number; store: number }>();

  const linkedAt = Date.now();
  const reports: FoldedReport[] = [
    { platform: sub.platform, body: sub.body_sanitized, confidence, linked_at: linkedAt, origin },
    ...(prior.results ?? []).map((p) => ({
      platform: p.platform, body: p.body, confidence: p.confidence, linked_at: p.linked_at,
      origin: p.reporter_kind === 'store'
        ? { store: storeName(p.store_source, p.platform), rating: validRating(p.store_rating) } : null,
    })),
  ];
  const count = (totals?.n ?? 0) + 1;
  const storeCount = (totals?.store ?? 0) + (origin ? 1 : 0);

  // NO THRESHOLD. The comment goes up on the FIRST attach.
  //
  // The form tells the reporter their report was added to an existing issue.
  // While the old COMMENT_THRESHOLD=3 ladder stayed silent that was a claim
  // the repository could not corroborate — the report existed only in D1, and
  // the first two of every three were invisible to the maintainer who owns
  // the issue. Quiet was not worth that.
  //
  // It is no noisier than waiting: GitHub notifies on a new comment but not on
  // an edit, and this comment is edited in place, so an issue that collects
  // twenty duplicates still produces exactly one notification.
  const existing = await env.DB.prepare(
    "SELECT value FROM sync_state WHERE key = ?"
  ).bind(`rollup:${issueNumber}`).first<{ value: string }>();

  const body = rollingComment(count, reports, storeCount);

  const dupLink = env.DB.prepare(
    `INSERT INTO dup_links (submission_id, issue_number, confidence, linked_at)
     VALUES (?,?,?,?) ON CONFLICT DO NOTHING`
  ).bind(sub.submission_id, issueNumber, confidence, linkedAt);

  if (existing?.value) {
    await updateComment(repo, token, Number(existing.value), body);
    await dupLink.run();
  } else {
    const commentId = await createComment(repo, token, issueNumber, body);
    // Batched so the comment id and the attachment record land together. If
    // this half fails after GitHub accepted the comment, the retry posts a
    // second one — recoverable noise on the issue, and a far smaller window
    // than telling a reporter their report was attached when it was not.
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO sync_state (key, value, at) VALUES (?,?,?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, at=excluded.at`
      ).bind(`rollup:${issueNumber}`, String(commentId), Date.now()),
      dupLink,
    ]);
  }
}

/**
 * The spam decision. Returns an Outcome to stop the pipeline, or null to
 * continue to dedup and publishing.
 *
 * THE DECISION IS HERE, IN CODE — not in the model's answer. The model supplies
 * an opinion in the same JSON an injection-prone prompt returns, so treating
 * that opinion as the verdict would mean a crafted body could bury a rival's
 * report by getting it declared spam. Confirmation therefore requires a signal
 * the model CANNOT SET, and the code-assigned reason codes are unreachable from
 * the model's allowlist precisely so it cannot manufacture its own
 * corroboration.
 *
 *   human cleared it        → bypass entirely, permanently
 *   model says clean        → continue
 *   gate off                → log what would have happened, continue
 *   model spam + evidence   → state `spam`
 *   model spam, no evidence → state `suspected_spam`
 *   model suspected         → state `suspected_spam`
 */
async function applySpamGate(
  env: Env, sub: SubmissionRow, verdict: Verdict, from: string
): Promise<Outcome | null> {
  const id = sub.submission_id;

  // RELEASE IS STICKY. A human who cleared this report outranks the model,
  // permanently. Without this, release is a loop: reviewer releases the row,
  // the drain re-classifies it, the model says spam again, and it lands back
  // in the queue it was just released from — with the reviewer's decision
  // silently overwritten each time.
  if (sub.spam_reviewed_at != null && sub.spam_status === 'clean') return null;

  if (verdict.spam_status === 'clean') return null;

  // Corroboration is consulted ONLY when the model said `spam`. A `suspected`
  // verdict caps at `suspected_spam` regardless, so the extra read would buy
  // nothing — and clean reports never reach here at all.
  let evidence: SpamReason[] = [];
  if (verdict.spam_status === 'spam') {
    evidence = evaluateDeterministicEvidence({
      body: sub.body_sanitized,
      errorCode: sub.error_code,
      reporterKind: sub.reporter_kind,
      floodConfirmed: await confirmFloodAtDrain(
        env.DB, sub.reporter_key, sub.normalized_hash, sub.received_at, floodConfig(env)
      ),
    });
  }

  const confirmed = verdict.spam_status === 'spam' && evidence.length > 0;
  const target = confirmed ? 'spam' : 'suspected_spam';
  const reasons = [...new Set([...verdict.spam_reasons, ...evidence])];

  if (!spamGateEnabled(env)) {
    // Shadow mode. Log the counterfactual; change nothing.
    //
    // spam_status is deliberately NOT written here. A status without a matching
    // state is the same disagreement as a state without a status, and the
    // publishing guard reads spam_status directly — so writing it would block
    // publishing on a verdict we have explicitly decided not to enforce yet.
    console.warn(JSON.stringify({
      job: 'spam', submission: id, would_be: target,
      model: verdict.spam_status, evidence, enforced: false,
    }));
    return null;
  }

  // state and spam_status in ONE batch. Two statements would leave a window
  // where they disagree, and every later guard reads a NULL spam_status as
  // clean — so a crash between them would produce a row that is excluded from
  // the drain but reads as publishable to the guard meant to catch exactly
  // that.
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE submissions SET state = ?, spam_status = ?, spam_reasons = ? WHERE submission_id = ?'
    ).bind(target, confirmed ? 'spam' : 'suspected', JSON.stringify(reasons), id),
    env.DB.prepare(
      'INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?,?,?,?,?)'
    ).bind(id, Date.now(), from, target, `spam_gate ${reasons.join(',') || 'model_only'}`),
  ]);

  console.warn(JSON.stringify({
    job: 'spam', submission: id, state: target, evidence, enforced: true,
  }));

  // `done`, not `fail`. This is a decision, not an error: the drain must spend
  // no retry budget on it and must not park it in `failed`, which is the dead
  // letter destination for things that broke.
  return { kind: 'done', detail: `spam gate: ${target}` };
}

/**
 * Run one submission all the way through. `from` is the state the row held
 * before it was claimed, so the audit trail records the real transition.
 */
export async function processSubmission(env: Env, sub: SubmissionRow, from: string): Promise<Outcome> {
  assertWalletTarget(env.TARGET_REPO);
  const id = sub.submission_id;
  try {
    // --- Idempotency layer 2: terminal states are never reprocessed. -------
    //
    // suspected_spam and spam join the terminal states here. The drain's claim
    // filter already excludes them by absence, so in normal operation this is
    // unreachable — it exists for the paths that do NOT go through that filter:
    // a reclaimed stale row, a future caller, a hand-run replay.
    if (sub.state === 'published' || sub.state === 'quarantined'
        || sub.state === 'suspected_spam' || sub.state === 'spam') {
      return { kind: 'done', detail: `already ${sub.state}` };
    }

    // --- Idempotency layer 3: has GitHub already got this? -----------------
    const already = await markerAlreadyPublished(env.DB, id);
    if (already) {
      await transition(env, id, from, 'published', `recovered marker #${already}`);
      await env.DB.prepare('UPDATE submissions SET published_issue = ? WHERE submission_id = ?')
        .bind(already, id).run();
      return { kind: 'done', detail: `recovered marker #${already}` };
    }

    // --- Classify ----------------------------------------------------------
    const candidates = await retrieveCandidates(env, sub);
    const allowedIssues = new Set(candidates.map((c) => c.number));

    let verdict; let modelVersion = 'none';
    try {
      const r = await classify(sub.body_sanitized, candidates, env as any);
      verdict = validateVerdict(r.verdict, allowedIssues, ALLOWED_LABELS);
      modelVersion = r.modelVersion;
    } catch (e) {
      // Both providers down. Do NOT publish unclassified — that is how
      // duplicates are born. The row waits; nothing is dropped.
      console.warn('classification unavailable, deferring', id, e);
      return {
        kind: 'defer', state: 'deferred', delayMs: CLASSIFY_DEFER_MS,
        detail: 'classifier unavailable',
      };
    }

    await env.DB.prepare(
      `UPDATE submissions SET verdict=?, confidence=?, matched_issue=?, model_version=?,
              prompt_version=?, candidates=?, spam_score=?
         WHERE submission_id=?`
    ).bind(verdict.verdict, verdict.confidence, verdict.issue_number,
           modelVersion, PROMPT_VERSION,
           JSON.stringify(candidates.map((c) => c.number)),
           // Telemetry, recorded for every report including clean ones: tuning
           // a threshold later needs the whole distribution, not just the tail
           // that tripped it. It gates nothing, so writing it cannot change an
           // outcome. Rides the UPDATE that was happening anyway.
           verdict.spam_score,
           id).run();

    // --- Spam gate ---------------------------------------------------------
    // Before dedup, before any GitHub call. A report that stops here has cost
    // one classifier call and nothing else.
    const spam = await applySpamGate(env, sub, verdict, from);
    if (spam) return spam;

    // Two DIFFERENT questions, deliberately two different numbers.
    //
    //   REVIEW_THRESHOLD      — is this match worth mentioning at all?
    //   AUTO_ACTION_THRESHOLD — is it strong enough to AUTHORISE a write on
    //                           an issue this service does not own?
    //
    // They were one variable, and reusing a classification threshold as write
    // authorisation is how a 0.61 guess earned the right to post publicly on
    // someone else's thread. Same value today; separate so they can diverge
    // without a code change.
    const autoGate = Number(env.AUTO_ACTION_THRESHOLD ?? 0.85);
    const reviewGate = Number(env.REVIEW_THRESHOLD ?? 0.6);

    // validateVerdict only ever returns an issue_number drawn from the
    // candidate set, and every candidate carries its state, so this needs no
    // second query and cannot name an issue the mirror knows nothing about.
    //
    // The state is the mirror's, so it can trail GitHub by up to one sync
    // (15 min). Both ways round that is harmless.
    const match = verdict.issue_number != null && verdict.confidence >= reviewGate
      ? candidates.find((c) => c.number === verdict.issue_number) ?? null
      : null;

    // --- The ONLY path that writes on an issue we do not own. --------------
    // High confidence AND still open. Everything else below becomes its own
    // issue, because the two mistakes are not equally expensive: a duplicate
    // issue costs a maintainer seconds to close, while a wrong comment lands
    // on their thread with no clean undo.
    if (match && match.state !== 'closed' && verdict.confidence >= autoGate) {
      // KILL SWITCH. Folds bypass the publish gate — they consume no cap
      // budget — so without this check PUBLISH_ENABLED=false would still
      // comment. It DEFERS rather than completing silently: the old code
      // marked the report terminal and the comment then only ever appeared if
      // some later report happened to attach to the same issue.
      if (env.PUBLISH_ENABLED !== 'true') {
        console.warn(JSON.stringify({ job: 'attach', issue: match.number, suppressed: 'killswitch' }));
        return {
          kind: 'defer', state: 'deferred', delayMs: CAP_DEFER_MS,
          detail: 'publishing disabled',
        };
      }
      // THE SAME GUARD AS THE NEW-ISSUE PATH. A fold is a GitHub write onto a
      // thread this service does not own, so it is if anything the more
      // expensive of the two to get wrong. It previously bypassed both the cap
      // and the `publishing` state entirely, which also left it with no
      // in-flight state for recoverStuckPublishing to clean up.
      if (!(await claimForPublishing(env.DB, id, from))) {
        console.warn(JSON.stringify({
          job: 'attach', submission: id, issue: match.number, aborted: 'publish claim refused',
        }));
        return { kind: 'done', detail: 'publish claim refused' };
      }
      await attachToIssue(env, sub, match.number, verdict.confidence, await storeOriginOf(env, sub));
      await transition(env, id, 'publishing', 'published', `attached to #${match.number}`);
      return { kind: 'done', detail: `attached to #${match.number}` };
    }

    // --- Everything else becomes its own issue. ----------------------------
    // Two ways to get here, and the new issue says which:
    //
    //   closed match, high confidence — a report arriving after a close means
    //     the fix has not reached the reporter's build, or it has regressed.
    //     Worth a real cross-reference: the maintainers who closed it see the
    //     new issue on that issue's timeline. Never reopened — their call.
    //
    //   any match below autoGate — mentioned in plain text, NOT as #N. The
    //     match was not strong enough to authorise a comment on that issue,
    //     and a #N reference would put an event on its timeline anyway, which
    //     is the same unearned assertion by a quieter route.
    //
    // No dup_links row either way: that table means "this report's text is on
    // that issue". The association survives as submissions.matched_issue.
    const related: RelatedIssue | null = match
      ? { number: match.number, strong: verdict.confidence >= autoGate, confidence: verdict.confidence }
      : null;

    // --- New issue. This is the only path that consumes cap budget. --------
    //
    // TWO gates, reporter before global. Both CONSUME a slot when they allow,
    // so the order decides whose budget is spent on a write that then does not
    // happen. A reporter over their own quota is the everyday case and returns
    // here without ever touching the global counter, so nothing leaks. Reversed,
    // every throttled reporter would have burned a global slot.
    //
    // The residual case — reporter allowed, global refused — can only happen
    // during a genuine service-wide flood, and costs that reporter one slot of
    // twenty per retry. It rolls off with the window; nothing needs unwinding.
    //
    // A row with no reporter_key predates migration 0004 and is held by the
    // global cap alone.
    if (sub.reporter_key) {
      const rGate = env.PUBLISH_GATE.get(env.PUBLISH_GATE.idFromName(`r:${sub.reporter_key}`));
      const rDecision = await (await rGate.fetch('https://gate/check?scope=reporter')).json<any>();
      if (!rDecision.allowed) {
        // Backpressure, not data loss. The row stays; the drain returns to it.
        console.warn(`reporter capped (${rDecision.reason}), deferring`, id);
        return {
          kind: 'defer', state: 'capped', delayMs: capDelayMs(rDecision),
          detail: `reporter ${rDecision.reason}`,
        };
      }
    }

    const gate = env.PUBLISH_GATE.get(env.PUBLISH_GATE.idFromName('global'));
    const decision = await (await gate.fetch('https://gate/check?scope=global')).json<any>();

    if (!decision.allowed) {
      // Backpressure, not data loss. The row stays; the drain returns to it.
      console.warn(`capped (${decision.reason}), deferring`, id);
      return {
        kind: 'defer', state: 'capped', delayMs: capDelayMs(decision),
        detail: String(decision.reason),
      };
    }

    const attachments: StoredAttachment[] =
      (JSON.parse(sub.attachment_keys ?? '[]') as string[])
        .map((j) => { try { return JSON.parse(j) as StoredAttachment; } catch { return null; } })
        .filter((a): a is StoredAttachment => a !== null);
    // Platform, error code and confidence are all in the issue body's
    // Environment table, so dropping their labels loses no information — it
    // just stops restating it in the label row.
    //
    // A store review gets no `feedback-form` label: that label's whole meaning
    // is "filed through the form", and a store review was not.
    const origin = await storeOriginOf(env, sub);
    const labels = origin ? [] : ['feedback-form', ...verdict.suggested_labels]
      .filter((l) => ALLOWED_LABELS.has(l));

    // THE REAL GUARD. This UPDATE already happened; making it conditional
    // costs nothing and closes a window an in-memory re-check cannot: a
    // reviewer marking this row spam between the drain's claim and the GitHub
    // call. `changes === 0` is a hard stop — no request, no retry.
    //
    // Residual, accepted: the cap slot above is already spent by the time we
    // get here, so losing this race costs one slot. It rolls off with the
    // window and needs no unwinding, and the race requires a reviewer acting
    // inside the few hundred milliseconds of one submission's publish.
    if (!(await claimForPublishing(env.DB, id, from))) {
      console.warn(JSON.stringify({
        job: 'publish', submission: id, aborted: 'publish claim refused',
      }));
      return { kind: 'done', detail: 'publish claim refused' };
    }

    if (related) {
      // The one line that says a new issue was born from a match, so "why was
      // this not attached?" has an answer after the fact.
      console.log(JSON.stringify({
        job: 'publish', submission: id, related_issue: related.number,
        confidence: verdict.confidence,
        reason: related.strong ? 'match is closed' : 'below auto-action threshold',
      }));
    }

    const publishedAttachments = await Promise.all(
      attachments.map((attachment) => publishAttachment(attachment, env))
    );
    const title = titleFor(sub, verdict.title);
    const number = await createIssue(env.TARGET_REPO, env.GITHUB_WRITE_TOKEN, {
      title,
      body: issueBody(sub, env, publishedAttachments, related, origin),
      labels: [...new Set(labels)],
    });

    // The title is stored, not just sent, so /status can show the reporter a
    // real title straight away. issue_mirror does not learn about this issue
    // until the next sync (<=15 min), and until then the form would otherwise
    // fall back to the truncated body this change exists to remove.
    await env.DB.prepare(
      'UPDATE submissions SET published_issue = ?, published_title = ? WHERE submission_id = ?'
    ).bind(number, title, id).run();
    await transition(env, id, 'publishing', 'published', `#${number}`);
    return { kind: 'done', detail: `#${number}` };
  } catch (err) {
    if (err instanceof RateLimited) {
      // GitHub's problem, not the submission's. Wait it out without spending
      // an attempt.
      console.warn('github rate limited, backing off', err.retryAfterMs);
      return {
        kind: 'defer', state: 'deferred', delayMs: err.retryAfterMs,
        detail: 'github rate limited',
      };
    }
    console.error('publish failed', id, err);
    return { kind: 'fail', error: err instanceof Error ? err.message : String(err) };
  }
}
