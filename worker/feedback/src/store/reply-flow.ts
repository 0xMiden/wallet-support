/**
 * A reply's life: what a person does to it in the console, and what the sender
 * does with it once it is approved.
 *
 * TWO HALVES, ONE STATE MACHINE.
 *
 *   draft ── approve ──> approved ── send ──> publishing ─┬─> published
 *     ^                     │                             ├─> pending_publish ──> published   (Apple)
 *     └── change / edit ────┘                             ├─> failed        (the store refused: not sent)
 *                                                         └─> unconfirmed   (outcome unknown: check first)
 *
 * The human half writes only to our own tables. The sender half is the only
 * code that talks to a store, it runs only while STORE_REPLY_ENABLED is the
 * literal "true", and it checks the store's current reply before EVERY send —
 * a first send, a retry, and a resend after an unconfirmed delivery alike. A
 * reply that is live on the store and was not written by us, or not the one
 * we last knew about, is never overwritten.
 *
 * Every transition is a compare-and-swap on the reply row's state, so two
 * people clicking, or a click racing the sender, produce one outcome and the
 * loser is told the reply changed. Every transition writes an event.
 */
import { REPLY_MAX_CHARS, replyLength, storeReplyOf, errorJson, EXTERNAL_UNCONFIRMED } from './reply-panel';
import { replyStoreFor, type ReplyStoreEnv, type ReplyTarget } from './reply-stores';
import type { FetchLike } from './auth/google';

/** Row states onto the review's own reply_state, which the list badges read. */
export const REVIEW_REPLY_STATE: Record<string, string> = {
  draft: 'drafted', approved: 'approved', publishing: 'publishing', unconfirmed: 'unconfirmed',
  pending_publish: 'pending_publish', published: 'published', failed: 'failed',
};

const storeName = (source: string) => (source === 'app_store' ? 'the App Store' : 'Google Play');
const StoreName = (source: string) => (source === 'app_store' ? 'The App Store' : 'Google Play');

/**
 * Google's review read returns only reviews written or changed in the last week,
 * so a review it does not return may simply be older. Said as a possibility: a
 * 404 alone does not say why.
 */
const notReturnedWhy = (source: string) =>
  source === 'app_store' ? '' : ' This can happen when a review has not been written or changed in the last week.';

/** What an unanswered send got back, as a sentence: a status the store gave, or no answer at all. */
const noClearAnswer = (source: string, detail: string) => detail.startsWith('HTTP ')
  ? `${StoreName(source)} answered ${detail}.`
  : `No answer from ${storeName(source)}: ${detail}.`;

async function logEvent(db: D1Database, reviewId: string, at: number, detail: string,
                        from: string | null, to: string | null, actor: string): Promise<void> {
  await db.prepare(
    `INSERT INTO store_review_events (store_review_id, at, kind, from_state, to_state, detail, actor)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(reviewId, at, 'reply', from, to, detail, actor).run();
}

/** Sets the review's badge from the reply it currently points at. */
async function syncReviewState(db: D1Database, reviewId: string): Promise<void> {
  const row = await db.prepare(
    `SELECT s.current_reply_id, s.source, s.app_id, s.raw_json, r.state
       FROM store_reviews s LEFT JOIN store_review_replies r ON r.reply_id = s.current_reply_id
      WHERE s.store_review_id = ?`
  ).bind(reviewId).first<any>();
  if (!row) return;
  const state = row.state
    ? REVIEW_REPLY_STATE[row.state] ?? 'none'
    : storeReplyOf(row) ? 'published' : 'none';
  await db.prepare('UPDATE store_reviews SET reply_state = ? WHERE store_review_id = ?').bind(state, reviewId).run();
}

// ---------------------------------------------------------------------------
// The human half
// ---------------------------------------------------------------------------

export type ActionResult = { ok: true } | { ok: false; status: number; message: string };

export const CONFLICT = 'This reply changed since the page loaded. Reload to see the latest.';
const conflict = (): ActionResult => ({ ok: false, status: 409, message: CONFLICT });

function checkBody(raw: unknown): { body: string } | ActionResult {
  const body = String(raw ?? '').trim();
  if (!body) return { ok: false, status: 400, message: 'Write a reply before saving.' };
  if (replyLength(body) > REPLY_MAX_CHARS) return { ok: false, status: 400, message: `Up to ${REPLY_MAX_CHARS} characters.` };
  return { body };
}

export interface ActionInput {
  reviewId: string;
  user: string;
  /** The reply the person was looking at, '' when there was none. */
  replyId: string;
  body?: unknown;
  nowMs: number;
  newId?: () => string;
}

export type ReplyAction = 'draft' | 'approve' | 'send' | 'discard' | 'change' | 'edit' | 'retry' | 'check';
export const REPLY_ACTIONS: readonly ReplyAction[] = ['draft', 'approve', 'send', 'discard', 'change', 'edit', 'retry', 'check'];

export async function runReplyAction(db: D1Database, action: ReplyAction, a: ActionInput): Promise<ActionResult> {
  const newId = a.newId ?? (() => crypto.randomUUID());
  const review = await db.prepare(
    'SELECT store_review_id, source, app_id, raw_json, current_reply_id FROM store_reviews WHERE store_review_id = ?'
  ).bind(a.reviewId).first<any>();
  if (!review) return { ok: false, status: 404, message: 'That review is not in the console.' };
  const seen = a.replyId || null;
  // Every action is about the reply the person saw. If the review points at a
  // different one now, somebody else got there first.
  if ((review.current_reply_id ?? null) !== seen) return conflict();

  const casRow = async (sql: string, ...binds: unknown[]) =>
    ((await db.prepare(sql).bind(...binds).run()).meta?.changes ?? 0) > 0;

  switch (action) {
    case 'draft': {
      const checked = checkBody(a.body);
      if ('ok' in checked) return checked;
      if (seen) {
        if (!(await casRow(`UPDATE store_review_replies SET body = ? WHERE reply_id = ? AND store_review_id = ? AND state = 'draft'`,
          checked.body, seen, a.reviewId))) return conflict();
        await logEvent(db, a.reviewId, a.nowMs, 'Draft saved', 'draft', 'draft', a.user);
        return { ok: true };
      }
      const id = newId();
      await db.prepare(
        `INSERT INTO store_review_replies (reply_id, store_review_id, body, source, state, created_at, created_by)
         VALUES (?,?,?,?,?,?,?)`
      ).bind(id, a.reviewId, checked.body, 'human', 'draft', a.nowMs, a.user).run();
      if (!(await casRow(`UPDATE store_reviews SET current_reply_id = ? WHERE store_review_id = ? AND current_reply_id IS NULL`,
        id, a.reviewId))) {
        await db.prepare('DELETE FROM store_review_replies WHERE reply_id = ?').bind(id).run();
        return conflict();
      }
      await syncReviewState(db, a.reviewId);
      await logEvent(db, a.reviewId, a.nowMs, 'Draft saved', null, 'draft', a.user);
      return { ok: true };
    }

    case 'approve': {
      const checked = checkBody(a.body);
      if ('ok' in checked) return checked;
      if (!seen || !(await casRow(
        `UPDATE store_review_replies SET body = ?, state = 'approved', approved_at = ?, approved_by = ?,
                attempts = 0, next_attempt_at = NULL, last_error = NULL
          WHERE reply_id = ? AND store_review_id = ? AND state = 'draft'`,
        checked.body, a.nowMs, a.user, seen, a.reviewId))) return conflict();
      await syncReviewState(db, a.reviewId);
      await logEvent(db, a.reviewId, a.nowMs, 'Reply approved', 'draft', 'approved', a.user);
      return { ok: true };
    }

    case 'send': {
      // "Send" on the page: save what was typed and approve it in one step. Approval
      // is the whole of it. The sender publishes approved replies, and only while
      // STORE_REPLY_ENABLED is "true"; nothing here talks to a store.
      const checked = checkBody(a.body);
      if ('ok' in checked) return checked;
      if (seen) return runReplyAction(db, 'approve', a);
      // The new draft's id is fixed up front, so the approval can only ever apply
      // to the draft this request created, never one somebody else saved meanwhile.
      const id = newId();
      const drafted = await runReplyAction(db, 'draft', { ...a, newId: () => id });
      if (!drafted.ok) return drafted;
      return runReplyAction(db, 'approve', { ...a, replyId: id });
    }

    case 'discard': {
      if (!seen || !(await casRow(`DELETE FROM store_review_replies WHERE reply_id = ? AND store_review_id = ? AND state = 'draft'`,
        seen, a.reviewId))) return conflict();
      // Back to whatever is still live on the store, if anything.
      const live = await db.prepare(
        `SELECT reply_id FROM store_review_replies WHERE store_review_id = ? AND state IN ('published', 'pending_publish')
          ORDER BY created_at DESC LIMIT 1`
      ).bind(a.reviewId).first<{ reply_id: string }>();
      await db.prepare('UPDATE store_reviews SET current_reply_id = ? WHERE store_review_id = ?')
        .bind(live?.reply_id ?? null, a.reviewId).run();
      await syncReviewState(db, a.reviewId);
      await logEvent(db, a.reviewId, a.nowMs, 'Draft discarded', 'draft', null, a.user);
      return { ok: true };
    }

    case 'change': {
      const old = seen ? await db.prepare(
        'SELECT body, source, state FROM store_review_replies WHERE reply_id = ? AND store_review_id = ?'
      ).bind(seen, a.reviewId).first<any>() : null;
      if (!old || !(await casRow(
        `UPDATE store_review_replies SET state = 'superseded' WHERE reply_id = ? AND state IN ('approved', 'failed')`, seen))) {
        return conflict();
      }
      const id = newId();
      await db.prepare(
        `INSERT INTO store_review_replies (reply_id, store_review_id, body, source, state, created_at, created_by)
         VALUES (?,?,?,?,?,?,?)`
      ).bind(id, a.reviewId, old.body, old.source, 'draft', a.nowMs, a.user).run();
      await db.prepare('UPDATE store_reviews SET current_reply_id = ? WHERE store_review_id = ?').bind(id, a.reviewId).run();
      await syncReviewState(db, a.reviewId);
      await logEvent(db, a.reviewId, a.nowMs, 'New draft started from the reply', old.state, 'draft', a.user);
      return { ok: true };
    }

    case 'edit': {
      // From a reply that is live: ours, or one written outside the console.
      let text: string | null = null;
      let source = 'human';
      if (seen) {
        const cur = await db.prepare(
          `SELECT body, source FROM store_review_replies WHERE reply_id = ? AND state IN ('published', 'pending_publish')`
        ).bind(seen).first<any>();
        if (cur) { text = cur.body; source = cur.source; }
      } else {
        text = storeReplyOf(review)?.text ?? null;
      }
      if (text == null) return conflict();
      const id = newId();
      await db.prepare(
        `INSERT INTO store_review_replies (reply_id, store_review_id, body, source, state, created_at, created_by)
         VALUES (?,?,?,?,?,?,?)`
      ).bind(id, a.reviewId, text.slice(0, 2000), source, 'draft', a.nowMs, a.user).run();
      if (!(await casRow(`UPDATE store_reviews SET current_reply_id = ? WHERE store_review_id = ? AND current_reply_id IS ?`,
        id, a.reviewId, seen))) {
        await db.prepare('DELETE FROM store_review_replies WHERE reply_id = ?').bind(id).run();
        return conflict();
      }
      await syncReviewState(db, a.reviewId);
      await logEvent(db, a.reviewId, a.nowMs, 'New draft started from the published reply', 'published', 'draft', a.user);
      return { ok: true };
    }

    case 'retry': {
      if (!seen || !(await casRow(
        `UPDATE store_review_replies SET state = 'approved', attempts = 0, next_attempt_at = NULL, last_error = NULL
          WHERE reply_id = ? AND store_review_id = ? AND state = 'failed'`, seen, a.reviewId))) return conflict();
      await syncReviewState(db, a.reviewId);
      await logEvent(db, a.reviewId, a.nowMs, 'Retry requested', 'failed', 'approved', a.user);
      return { ok: true };
    }

    case 'check': {
      if (!seen || !(await casRow(
        `UPDATE store_review_replies SET next_attempt_at = ? WHERE reply_id = ? AND store_review_id = ? AND state = 'unconfirmed'`,
        a.nowMs, seen, a.reviewId))) return conflict();
      await logEvent(db, a.reviewId, a.nowMs, `Check of ${storeName(review.source)} requested`, 'unconfirmed', 'unconfirmed', a.user);
      return { ok: true };
    }
  }
}

// ---------------------------------------------------------------------------
// The sender half
// ---------------------------------------------------------------------------

export interface ReplySenderEnv extends ReplyStoreEnv {
  DB: D1Database;
  STORE_REPLY_ENABLED?: string;
}

/** A claim older than this means the invocation died mid-send: outcome unknown. */
export const SEND_LEASE_MS = 10 * 60 * 1000;
/** How often Apple is asked whether a pending response went live. */
export const PENDING_RECHECK_MS = 60 * 60 * 1000;
/** Failures where nothing reached the store, before the reply is marked not sent. */
export const MAX_SEND_ATTEMPTS = 5;
const SENDER = 'reply-sender';

const backoff = (attempts: number) => Math.min(6 * 60 * 60 * 1000, 5 * 60 * 1000 * 2 ** Math.max(0, attempts - 1));

export interface ReplyTickReport {
  reclaimed: number;
  handled: string | null;         // reply_id
  from: string | null;
  to: string | null;
}

export async function runReplySender(
  env: ReplySenderEnv, nowMs: number, fetchImpl?: FetchLike
): Promise<{ skipped: string | null; report: ReplyTickReport | null }> {
  if (env.STORE_REPLY_ENABLED !== 'true') return { skipped: 'STORE_REPLY_ENABLED is not "true"', report: null };
  const db = env.DB;
  const report: ReplyTickReport = { reclaimed: 0, handled: null, from: null, to: null };

  // 1. A send whose invocation died: nobody knows if the store got it.
  const stuck = await db.prepare(
    `SELECT r.reply_id, r.store_review_id, s.source FROM store_review_replies r
       JOIN store_reviews s ON s.store_review_id = r.store_review_id
      WHERE r.state = 'publishing' AND r.next_attempt_at <= ? LIMIT 3`
  ).bind(nowMs).all<any>();
  for (const s of stuck.results ?? []) {
    const moved = await db.prepare(
      `UPDATE store_review_replies SET state = 'unconfirmed', external_state = ?, next_attempt_at = ?, last_error = ?
        WHERE reply_id = ? AND state = 'publishing'`
    ).bind(EXTERNAL_UNCONFIRMED, nowMs,
      errorJson('console', `Sending was interrupted, so ${storeName(s.source)}'s answer was not recorded.`), s.reply_id).run();
    if ((moved.meta?.changes ?? 0) > 0) {
      report.reclaimed += 1;
      await syncReviewState(db, s.store_review_id);
      await logEvent(db, s.store_review_id, nowMs, 'Delivery unconfirmed: sending was interrupted', 'publishing', 'unconfirmed', SENDER);
    }
  }

  // 2. One reply per tick: a delivery to confirm, then Apple's pending ones, then new sends.
  const r = await db.prepare(
    `SELECT r.*, s.source AS review_source, s.app_id, s.platform_review_id, s.raw_json, s.current_reply_id
       FROM store_review_replies r JOIN store_reviews s ON s.store_review_id = r.store_review_id
      WHERE COALESCE(r.next_attempt_at, 0) <= ?
        AND (r.state IN ('unconfirmed', 'pending_publish') OR (r.state = 'approved' AND r.reply_id = s.current_reply_id))
      ORDER BY CASE r.state WHEN 'unconfirmed' THEN 0 WHEN 'pending_publish' THEN 1 ELSE 2 END, r.approved_at
      LIMIT 1`
  ).bind(nowMs).first<any>();
  if (!r) return { skipped: null, report };

  report.handled = r.reply_id;
  report.from = r.state;
  const target: ReplyTarget = { source: r.review_source, appId: r.app_id, platformReviewId: r.platform_review_id };
  const store = replyStoreFor(r.review_source, env, nowMs, fetchImpl);
  const S = storeName(r.review_source);
  const couldNotCheck = (err: unknown) => `Could not check ${S}: ${(err as Error).message}.`;
  /**
   * How a stop ends. "Nothing was sent" only when no attempt of this reply can
   * have reached the store; after one the store never confirmed, that is not
   * known, and the message says so instead.
   */
  const unsure = r.state === 'unconfirmed' || r.external_state === EXTERNAL_UNCONFIRMED;
  const noSendEnding = unsure ? 'No further attempt was made. Delivery remains unconfirmed.' : 'Nothing was sent.';

  /** Moves the row from `from` to a new state; false if someone moved it first. */
  const move = async (from: string, to: string, fields: Record<string, unknown>, detail: string) => {
    const cols = Object.keys(fields);
    const res = await db.prepare(
      `UPDATE store_review_replies SET state = ?${cols.map((c) => `, ${c} = ?`).join('')}
        WHERE reply_id = ? AND state = ?`
    ).bind(to, ...cols.map((c) => fields[c]), r.reply_id, from).run();
    if ((res.meta?.changes ?? 0) === 0) return false;
    if (to === 'published') {
      // Whatever was live before is not any more.
      await db.prepare(
        `UPDATE store_review_replies SET state = 'superseded'
          WHERE store_review_id = ? AND reply_id <> ? AND state IN ('published', 'pending_publish')`
      ).bind(r.store_review_id, r.reply_id).run();
    }
    await syncReviewState(db, r.store_review_id);
    await logEvent(db, r.store_review_id, nowMs, detail, from, to, SENDER);
    report.to = to;
    return true;
  };

  /**
   * The texts we know to be legitimately on the store for this review: replies
   * of ours the store took, or may have taken, and the outside reply sync saw.
   */
  const knownTexts = async () => {
    const rows = await db.prepare(
      'SELECT body FROM store_review_replies WHERE store_review_id = ? AND (published_at IS NOT NULL OR external_state = ?)'
    ).bind(r.store_review_id, EXTERNAL_UNCONFIRMED).all<{ body: string }>();
    const known = new Set((rows.results ?? []).map((x) => x.body));
    const outside = storeReplyOf({ source: r.review_source, app_id: r.app_id, raw_json: r.raw_json });
    if (outside) known.add(outside.text);
    return known;
  };

  const landed = (at: number | null, externalId: string | null, pending: boolean, from: string) => pending
    ? move(from, 'pending_publish', { published_at: at ?? nowMs, external_id: externalId, external_state: 'PENDING_PUBLISH',
        next_attempt_at: nowMs + PENDING_RECHECK_MS, last_error: null }, 'Sent to the App Store; waiting for Apple')
    : move(from, 'published', { published_at: at ?? nowMs, external_id: externalId,
        external_state: 'PUBLISHED', next_attempt_at: null, last_error: null }, `Published on ${S}`);

  {
    if (r.state === 'approved') {
      const claimed = await db.prepare(
        `UPDATE store_review_replies SET state = 'publishing', attempts = attempts + 1, next_attempt_at = ?
          WHERE reply_id = ? AND state = 'approved' AND COALESCE(next_attempt_at, 0) <= ?`
      ).bind(nowMs + SEND_LEASE_MS, r.reply_id, nowMs).run();
      if ((claimed.meta?.changes ?? 0) === 0) { report.to = null; return { skipped: null, report }; }
      await syncReviewState(db, r.store_review_id);
      const attempts = (r.attempts ?? 0) + 1;

      /** Nothing reached the store: wait and try again, up to the limit. */
      const notReached = async (why: string) => attempts >= MAX_SEND_ATTEMPTS
        ? move('publishing', 'failed', { next_attempt_at: null,
            last_error: errorJson('console', `Stopped after ${attempts} attempts. ${noSendEnding} ${why}`) },
            `Stopped after ${attempts} attempts`)
        : move('publishing', 'approved', { next_attempt_at: nowMs + backoff(attempts), last_error: errorJson('console', why) },
            `Send postponed. ${why}`);

      let live;
      try {
        live = await store.current(target);
      } catch (err) {
        await notReached(couldNotCheck(err));
        return { skipped: null, report };
      }
      if (live.kind === 'unavailable') {
        await move('publishing', 'failed', { next_attempt_at: null, last_error: errorJson('console',
          `${StoreName(r.review_source)} did not return this review, so its current reply could not be checked.${
            notReturnedWhy(r.review_source)} ${noSendEnding}`) },
          `Stopped: ${S} did not return this review`);
        return { skipped: null, report };
      }
      if (live.kind === 'reply' && live.text === r.body) {
        await landed(live.at, live.externalId, live.pending, 'publishing');
        return { skipped: null, report };
      }
      if (live.kind === 'reply' && !(await knownTexts()).has(live.text)) {
        await move('publishing', 'failed', { next_attempt_at: null, last_error: errorJson('console', unsure
          ? `${StoreName(r.review_source)} shows a different reply now. ${noSendEnding}`
          : `${StoreName(r.review_source)} shows a different reply now, so this one was not sent.`) },
          `Stopped: ${S} shows a different reply`);
        return { skipped: null, report };
      }

      let outcome;
      try {
        outcome = await store.send(target, r.body);
      } catch (err) {
        // The credential failed before the request was made.
        await notReached(`Could not reach ${S}: ${(err as Error).message}.`);
        return { skipped: null, report };
      }
      switch (outcome.kind) {
        case 'published': await landed(outcome.at, outcome.externalId, false, 'publishing'); break;
        case 'pending': await landed(outcome.at, outcome.externalId, true, 'publishing'); break;
        case 'rejected':
          if (outcome.retryable) {
            // Refused for rate, not for content: not an attempt spent.
            await move('publishing', 'approved', { attempts: attempts - 1, next_attempt_at: nowMs + backoff(attempts),
              last_error: errorJson('store', outcome.detail) }, `Send postponed: ${S} said ${outcome.detail}`);
          } else {
            await move('publishing', 'failed', { next_attempt_at: null, last_error: errorJson('store', outcome.detail) },
              `Not sent: ${S} said ${outcome.detail}`);
          }
          break;
        case 'unknown':
          await move('publishing', 'unconfirmed', { next_attempt_at: nowMs + backoff(1), external_state: EXTERNAL_UNCONFIRMED,
            last_error: errorJson('console', noClearAnswer(r.review_source, outcome.detail)) },
            `Delivery unconfirmed: ${outcome.detail}`);
          break;
      }
      return { skipped: null, report };
    }

    // unconfirmed or pending_publish: ask the store what it has.
    let live;
    try {
      live = await store.current(target);
    } catch (err) {
      await db.prepare('UPDATE store_review_replies SET next_attempt_at = ?, last_error = ? WHERE reply_id = ? AND state = ?')
        .bind(nowMs + backoff(3), errorJson('console', couldNotCheck(err)), r.reply_id, r.state).run();
      report.to = r.state;
      return { skipped: null, report };
    }

    if (live.kind === 'reply' && live.text === r.body) {
      if (live.pending) {
        if (r.state === 'unconfirmed') await landed(live.at, live.externalId, true, 'unconfirmed');
        else {
          await db.prepare('UPDATE store_review_replies SET next_attempt_at = ? WHERE reply_id = ? AND state = ?')
            .bind(nowMs + PENDING_RECHECK_MS, r.reply_id, r.state).run();
          report.to = r.state;
        }
      } else {
        await landed(live.at, live.externalId, false, r.state);
      }
      return { skipped: null, report };
    }

    if (r.state === 'pending_publish') {
      await move('pending_publish', 'failed', { next_attempt_at: null, last_error: errorJson('console',
        live.kind === 'reply' ? 'The App Store shows a different reply now.' : 'The App Store no longer has this reply.') },
        live.kind === 'reply' ? `Checked ${S}: it shows a different reply` : `Checked ${S}: this reply was not found`);
      return { skipped: null, report };
    }

    // unconfirmed
    if (live.kind === 'unavailable') {
      await db.prepare('UPDATE store_review_replies SET next_attempt_at = ?, last_error = ? WHERE reply_id = ? AND state = ?')
        .bind(nowMs + backoff(99), errorJson('console',
          `${StoreName(r.review_source)} did not return this review, so delivery could not be confirmed.${notReturnedWhy(r.review_source)}`),
          r.reply_id, 'unconfirmed').run();
      report.to = 'unconfirmed';
      return { skipped: null, report };
    }
    if (live.kind === 'none' || (await knownTexts()).has(live.text)) {
      // The check found no matching reply. That is what it established — not
      // that the earlier attempt failed — so external_state stays UNCONFIRMED;
      // sending again goes through the same check.
      await move('unconfirmed', 'approved', { next_attempt_at: nowMs, external_state: EXTERNAL_UNCONFIRMED, last_error: null },
        `Checked ${S}: this reply was not found, so it will be tried again`);
      return { skipped: null, report };
    }
    await move('unconfirmed', 'failed', { next_attempt_at: null, external_state: EXTERNAL_UNCONFIRMED, last_error: errorJson('console',
      `${StoreName(r.review_source)} shows a different reply now. ${noSendEnding}`) },
      `Checked ${S}: it shows a different reply`);
    return { skipped: null, report };
  }
}
