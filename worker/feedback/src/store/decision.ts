/**
 * A person's decision on a store review, and the handoff that turns an eligible
 * one into a report for the existing feedback pipeline.
 *
 * THE DECISION writes only human columns, and only from a signed-in person's
 * POST. It is the gate: `eligibility` is never set by code, and `eligible` is
 * refused unless the review is actionable, carries a pipeline label, and was
 * not flagged by the secret scanner. The same rules hold for a direct POST.
 *
 * THE HANDOFF writes one `submissions` row the way /submit does, so the drain
 * treats it like any other report. It runs only while STORE_HANDOFF_ENABLED is
 * "true" (shipped "false"), and it is where SAFETY-CONTROLS §10 is enforced:
 *
 *   - a compare-and-swap claim, so two clicks write one submission
 *   - the secret scan again, as a hard refusal
 *   - sanitize(), as /submit applies it
 *   - spam released in advance (`clean` + `spam_reviewed_at`), which is sticky
 *     in the pipeline, so the spam model cannot park a human-approved review
 *   - a synthetic reporter_key and a NULL normalized_hash, so the flood check
 *     cannot fire; reporter_kind 'store' is read only for display and by the
 *     flood evidence, which requires 'install'
 *   - a review edited after its decision is refused until someone decides it
 *     again, so a public issue never carries text nobody judged
 *
 * The handoff itself makes no outbound request. It writes rows; the drain,
 * minutes later, is what talks to GitHub.
 */
import { sanitize } from '../lib/sanitize';
import { scanForSecrets } from '../lib/secret-scan';
import { fingerprint, inferErrorCode } from '../lib/fingerprint';
import { sha256Hex } from '../lib/validate';
import { filterLabels, isPipelineCandidate, PIPELINE_LABELS, REVIEW_STATE_LABEL } from './states';
import { editObservedAt } from './edits';

export type ActionResult = { ok: true } | { ok: false; status: number; message: string };
const refuse = (status: number, message: string): ActionResult => ({ ok: false, status, message });

/** The triage choices a person makes. `new`, `classifying` and `awaiting_review` are not verdicts. */
export const TRIAGE = ['actionable', 'needs_info', 'not_actionable'] as const;
export const NOTE_MAX_CHARS = 1000;
/** A claim older than this means the request died between claim and write. */
export const HANDOFF_LEASE_MS = 2 * 60 * 1000;

export const MSG = {
  notFound: 'That review is not in the console.',
  decisionConflict: 'This decision changed since the page loaded. Reload to see the latest.',
  chooseTriage: 'Choose actionable, needs more information or not actionable.',
  chooseEligibility: 'Choose whether this review is eligible to send to GitHub.',
  noteTooLong: `Keep the note to ${NOTE_MAX_CHARS.toLocaleString('en-US')} characters.`,
  eligibleNeeds: `To be eligible to send to GitHub, a review must be actionable and have at least one of these labels: ${PIPELINE_LABELS.join(', ')}.`,
  flaggedNotEligible: "A review flagged by the secret scanner can't be eligible to send to GitHub.",
  lockedInPipeline: "This review is already queued for GitHub, so its triage and eligibility can't change.",
  handoffOff: 'Sending to GitHub is switched off.',
  alreadySent: 'This review is already queued for GitHub.',
  notEligible: 'Only a review marked eligible can be sent to GitHub.',
  editedAfterDecision: 'This review was edited after the decision. Save the decision again before sending it.',
  noText: 'This review has no text to send.',
  secretRefused: 'The secret scanner found key or seed phrase material in this review, so it was not queued for GitHub.',
  handoffConflict: 'This review changed since the page loaded. Reload to see the latest.',
} as const;

async function logEvent(db: D1Database, reviewId: string, at: number, kind: 'human' | 'handoff',
                        detail: string, from: string | null, to: string | null, actor: string) {
  await db.prepare(
    `INSERT INTO store_review_events (store_review_id, at, kind, from_state, to_state, detail, actor)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(reviewId, at, kind, from, to, detail, actor).run();
}

const codePoints = (s: string) => [...s].length;

// ---------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------

export interface DecisionInput {
  reviewId: string;
  user: string;
  /** The `human_decided_at` the page showed, '' when there was none. */
  seenDecidedAt: string;
  triage: unknown;
  labels: unknown;
  note: unknown;
  /** Absent when the page did not offer it: a review already in the pipeline. */
  eligibility: unknown;
  nowMs: number;
}

export async function runDecision(db: D1Database, a: DecisionInput): Promise<ActionResult> {
  const row = await db.prepare(
    `SELECT review_state, eligibility, human_decided_at, handoff_state, secret_scan_status
       FROM store_reviews WHERE store_review_id = ?`
  ).bind(a.reviewId).first<any>();
  if (!row) return refuse(404, MSG.notFound);

  const seen = a.seenDecidedAt === '' ? null : Number(a.seenDecidedAt);
  if ((row.human_decided_at ?? null) !== seen) return refuse(409, MSG.decisionConflict);

  const triage = String(a.triage ?? '');
  if (!(TRIAGE as readonly string[]).includes(triage)) return refuse(400, MSG.chooseTriage);
  const labels = filterLabels(Array.isArray(a.labels) ? a.labels : []);
  const note = String(a.note ?? '').trim();
  if (codePoints(note) > NOTE_MAX_CHARS) return refuse(400, MSG.noteTooLong);

  const inPipeline = row.handoff_state === 'requested' || row.handoff_state === 'accepted';
  let eligibility: string;
  if (inPipeline) {
    // Once a report exists, the verdict that created it stays as it was.
    const asked = a.eligibility == null || a.eligibility === '' ? row.eligibility : String(a.eligibility);
    if (triage !== row.review_state || asked !== row.eligibility) return refuse(409, MSG.lockedInPipeline);
    eligibility = row.eligibility;
  } else {
    eligibility = String(a.eligibility ?? '');
    if (eligibility !== 'eligible' && eligibility !== 'not_eligible') return refuse(400, MSG.chooseEligibility);
    if (eligibility === 'eligible') {
      if (row.secret_scan_status === 'flagged') return refuse(400, MSG.flaggedNotEligible);
      if (triage !== 'actionable' || !isPipelineCandidate(labels)) return refuse(400, MSG.eligibleNeeds);
    }
  }

  // Compare-and-swap on the decision the person saw and on the handoff state
  // the rules above were checked against.
  const res = await db.prepare(
    `UPDATE store_reviews
        SET review_state = ?, human_labels = ?, human_decision = ?, human_decided_at = ?,
            human_decided_by = ?, eligibility = ?
      WHERE store_review_id = ? AND human_decided_at IS ? AND handoff_state = ?`
  ).bind(triage, JSON.stringify(labels), note || null, a.nowMs, a.user, eligibility,
    a.reviewId, seen, row.handoff_state).run();
  if ((res.meta?.changes ?? 0) === 0) return refuse(409, MSG.decisionConflict);

  await logEvent(db, a.reviewId, a.nowMs, 'human',
    `Decision saved: ${REVIEW_STATE_LABEL[triage]}, ${eligibility === 'eligible' ? 'eligible' : 'not eligible'} to send to GitHub${
      labels.length ? `; labels ${labels.join(', ')}` : ''}`,
    row.review_state, triage, a.user);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// The handoff
// ---------------------------------------------------------------------------

export interface HandoffEnv {
  DB: D1Database;
  /** Anything but the literal "true" means no submissions row is ever written. */
  STORE_HANDOFF_ENABLED?: string;
}

export interface HandoffInput {
  reviewId: string;
  user: string;
  nowMs: number;
  newId?: () => string;
}

/** The text a report is made of: the title, when the store has one, then the body. */
export function handoffText(row: { review_title: string | null; review_body: string | null }): string {
  return [row.review_title, row.review_body].map((s) => (s ?? '').trim()).filter(Boolean).join('\n\n');
}

export async function runHandoff(env: HandoffEnv, a: HandoffInput): Promise<ActionResult> {
  if (env.STORE_HANDOFF_ENABLED !== 'true') return refuse(409, MSG.handoffOff);
  const db = env.DB;
  const row = await db.prepare('SELECT * FROM store_reviews WHERE store_review_id = ?').bind(a.reviewId).first<any>();
  if (!row) return refuse(404, MSG.notFound);

  // Clear reasons first. The claim below is what actually enforces them.
  const stale = row.handoff_state === 'requested' && (row.handoff_requested_at ?? 0) <= a.nowMs - HANDOFF_LEASE_MS;
  if (row.handoff_state === 'accepted' || (row.handoff_state === 'requested' && !stale)) return refuse(409, MSG.alreadySent);
  if (row.secret_scan_status === 'flagged') return refuse(409, MSG.flaggedNotEligible);
  if (row.eligibility !== 'eligible' || row.review_state !== 'actionable' || row.human_decided_at == null) {
    return refuse(409, MSG.notEligible);
  }
  const versions = await db.prepare(
    'SELECT raw_json, observed_at FROM store_review_versions WHERE store_review_id = ? ORDER BY id'
  ).bind(a.reviewId).all<{ raw_json: string; observed_at: number }>();
  const edited = editObservedAt(row.source, row.app_id, versions.results ?? []);
  if (edited != null && edited > row.human_decided_at) return refuse(409, MSG.editedAfterDecision);

  const text = handoffText(row);
  if (!text) return refuse(409, MSG.noText);

  const from = row.handoff_state as string;
  const hits = scanForSecrets(text);
  if (hits.length > 0) {
    // A hard refusal, recorded. Reason kinds only, never the matched text.
    const kinds = [...new Set(hits.map((h) => h.kind))].join(',');
    const res = await db.prepare(
      `UPDATE store_reviews SET handoff_state = 'failed', handoff_error = ?
        WHERE store_review_id = ? AND handoff_state = ?`
    ).bind(`secret_material:${kinds}`, a.reviewId, from).run();
    if ((res.meta?.changes ?? 0) === 0) return refuse(409, MSG.handoffConflict);
    await logEvent(db, a.reviewId, a.nowMs, 'handoff', 'Not queued for GitHub: the secret scanner found key or seed phrase material',
      from, 'failed', a.user);
    return refuse(422, MSG.secretRefused);
  }

  // The claim. changes === 0 is a stop, not a retry: that is what makes two
  // clicks produce one submission. A stale claim keeps its submission id, so
  // a retry can never write a second row for the same review.
  const newId = (a.newId ?? (() => crypto.randomUUID()))();
  const claim = await db.prepare(
    `UPDATE store_reviews
        SET handoff_state = 'requested', handoff_submission_id = COALESCE(handoff_submission_id, ?),
            handoff_requested_at = ?, handoff_attempts = handoff_attempts + 1, handoff_error = NULL
      WHERE store_review_id = ?
        AND eligibility = 'eligible' AND review_state = 'actionable' AND human_decided_at IS NOT NULL
        AND COALESCE(secret_scan_status, 'clean') <> 'flagged'
        AND (handoff_state IN ('none', 'failed') OR (handoff_state = 'requested' AND handoff_requested_at <= ?))`
  ).bind(newId, a.nowMs, a.reviewId, a.nowMs - HANDOFF_LEASE_MS).run();
  if ((claim.meta?.changes ?? 0) === 0) return refuse(409, MSG.handoffConflict);
  const claimed = await db.prepare('SELECT handoff_submission_id FROM store_reviews WHERE store_review_id = ?')
    .bind(a.reviewId).first<{ handoff_submission_id: string }>();
  const submissionId = claimed!.handoff_submission_id;

  // Built as /submit builds a report.
  const clean = sanitize(text);
  const errorCode = inferErrorCode(clean);
  const fp = fingerprint({ errorCode, walletVersion: row.app_version, platform: row.platform, route: null });
  const bodyHash = await sha256Hex(text);
  const reporterKey = await sha256Hex(`store:${row.source}:${row.app_id}:${row.platform_review_id}`);

  try {
    await db.batch([
      // state and spam_status together, as /submit writes them, so the sticky
      // release in the pipeline holds from the row's first read.
      db.prepare(
        `INSERT INTO submissions
           (submission_id, received_at, state, body_sanitized, body_hash,
            wallet_version, platform, network, route, error_code, fingerprint,
            reporter_key, attachment_keys, normalized_hash, reporter_kind,
            spam_status, spam_reasons, spam_reviewed_at, spam_reviewed_by)
         VALUES (?, ?, 'received', ?, ?, ?, ?, NULL, NULL, ?, ?, ?, '[]', NULL, 'store', 'clean', NULL, ?, ?)
         ON CONFLICT(submission_id) DO NOTHING`
      ).bind(submissionId, a.nowMs, clean, bodyHash, row.app_version ?? null, row.platform,
        errorCode, fp, reporterKey, a.nowMs, a.user),
      db.prepare(
        `INSERT INTO state_log (submission_id, at, from_state, to_state, detail)
         SELECT ?, ?, NULL, 'received', ? WHERE NOT EXISTS (SELECT 1 FROM state_log WHERE submission_id = ?)`
      ).bind(submissionId, a.nowMs, `${fp} store:${row.source}`, submissionId),
      db.prepare(
        `UPDATE store_reviews SET handoff_state = 'accepted', handoff_accepted_at = ?, handoff_error = NULL
          WHERE store_review_id = ? AND handoff_state = 'requested' AND handoff_submission_id = ?`
      ).bind(a.nowMs, a.reviewId, submissionId),
      db.prepare(
        `INSERT INTO store_review_events (store_review_id, at, kind, from_state, to_state, detail, actor)
         VALUES (?, ?, 'handoff', ?, 'accepted', 'Queued for GitHub', ?)`
      ).bind(a.reviewId, a.nowMs, from, a.user),
    ]);
  } catch (err) {
    // The batch is one transaction: nothing of it was written.
    const why = String((err as Error)?.message ?? err).slice(0, 200);
    await db.prepare(
      `UPDATE store_reviews SET handoff_state = 'failed', handoff_error = ?
        WHERE store_review_id = ? AND handoff_state = 'requested'`
    ).bind(why, a.reviewId).run();
    await logEvent(db, a.reviewId, a.nowMs, 'handoff', 'Not queued for GitHub: the write failed', 'requested', 'failed', a.user);
    return refuse(500, 'Could not queue this review for GitHub, so nothing was sent. Try again.');
  }
  return { ok: true };
}
