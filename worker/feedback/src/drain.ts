/**
 * Cron drain — the free-tier replacement for the Queues consumer.
 *
 * Every minute: claim a small batch of pending submissions, run each through
 * the same publish path the queue consumer used (pipeline.processSubmission),
 * and record the outcome. Queues' retry/backoff/DLQ machinery is reproduced
 * here in D1 columns: attempts, next_attempt_at, claimed_at, last_error.
 *
 * State machine:
 *   received ──claim──> claimed ──> published        (terminal, success)
 *                          │
 *                          ├──> capped    (cap hit)      ─┐ next_attempt_at
 *                          ├──> deferred (upstream down)  ─┘ then reclaimed
 *                          └──> failed   (attempts spent) (terminal, parked)
 *
 * A `claimed` row whose claim has gone stale is reclaimed, so a Worker that
 * dies mid-flight loses time, not the report. That is the property Queues
 * gave us for free and the one most worth reproducing.
 */

import type { Env } from './index';
import { processSubmission, transition, type SubmissionRow } from './pipeline';

/** A claim older than this is treated as abandoned and may be reclaimed. */
const STALE_CLAIM_MS = 600_000;
/** Base wait after an unexplained error. Multiplied by the attempt number. */
const FAIL_BACKOFF_MS = 120_000;

/**
 * Put a row back in the pending pool without spending its retry budget.
 *
 * Deferral means "not this submission's fault" — the cap is closed, the
 * classifier is down, GitHub is rate limiting. The claim already incremented
 * `attempts`, so this reverses it. Every deferral path goes through here so
 * none can forget to.
 */
async function defer(
  env: Env, id: string, from: string, to: 'capped' | 'deferred',
  delayMs: number, detail: string,
) {
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE submissions
          SET state = ?, next_attempt_at = ?, claimed_at = NULL,
              attempts = MAX(attempts - 1, 0)
        WHERE submission_id = ?`
    ).bind(to, Date.now() + delayMs, id),
    env.DB.prepare(
      'INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?,?,?,?,?)'
    ).bind(id, Date.now(), from, to, detail),
  ]);
}

/** Retry budget spent. Park the row — this is the DLQ, done in D1. */
async function park(env: Env, id: string, from: string, error: string) {
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE submissions
          SET state = 'failed', last_error = ?, claimed_at = NULL, next_attempt_at = NULL
        WHERE submission_id = ?`
    ).bind(error.slice(0, 500), id),
    env.DB.prepare(
      'INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?,?,?,?,?)'
    ).bind(id, Date.now(), from, 'failed', `attempts exhausted: ${error.slice(0, 200)}`),
  ]);
}

/** Error, but budget remains. Wait, keeping the spent attempt on the record. */
async function backoff(env: Env, id: string, from: string, attempts: number, error: string) {
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE submissions
          SET state = 'deferred', next_attempt_at = ?, claimed_at = NULL, last_error = ?
        WHERE submission_id = ?`
    ).bind(Date.now() + FAIL_BACKOFF_MS * attempts, error.slice(0, 500), id),
    env.DB.prepare(
      'INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?,?,?,?,?)'
    ).bind(id, Date.now(), from, 'deferred', `attempt ${attempts}: ${error.slice(0, 200)}`),
  ]);
}

export async function drain(env: Env): Promise<void> {
  const now = Date.now();
  // Batch size is a var, not a constant: the free plan allows 50 subrequests
  // per invocation and one submission can spend six or seven of them.
  const batchSize = Math.max(1, Number(env.DRAIN_BATCH_SIZE ?? 3));
  const maxAttempts = Math.max(1, Number(env.MAX_ATTEMPTS ?? 5));

  const eligible = await env.DB.prepare(
    `SELECT submission_id, state, received_at, body_sanitized, wallet_version, platform,
            network, route, error_code, fingerprint, reporter_key, attachment_keys, attempts,
            -- Spam layer. The claim filter below already excludes suspected_spam
            -- and spam by ABSENCE, so these are read for the sticky-release
            -- check and for flood corroboration, never to decide eligibility.
            spam_status, spam_reviewed_at, normalized_hash, reporter_kind
       FROM submissions
      WHERE (state IN ('received', 'capped', 'deferred') AND COALESCE(next_attempt_at, 0) <= ?1)
         OR (state = 'claimed' AND COALESCE(claimed_at, 0) <= ?2)
      ORDER BY received_at
      LIMIT ?3`
  ).bind(now, now - STALE_CLAIM_MS, batchSize).all<SubmissionRow>();

  const rows = eligible.results ?? [];
  if (rows.length === 0) return;

  let published = 0, deferred = 0, failed = 0;

  for (const sub of rows) {
    const id = sub.submission_id;

    // Claim by compare-and-swap on the state we just read. If a concurrent
    // invocation got there first, changes === 0 and we leave it alone — this
    // is what stands in for the queue's at-most-one-consumer guarantee.
    const claim = await env.DB.prepare(
      `UPDATE submissions SET state = 'claimed', claimed_at = ?, attempts = attempts + 1
        WHERE submission_id = ? AND state = ?`
    ).bind(now, id, sub.state).run();
    if (claim.meta.changes === 0) continue;

    await env.DB.prepare(
      'INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?,?,?,?,?)'
    ).bind(id, now, sub.state, 'claimed', `drain attempt ${sub.attempts + 1}`).run();

    const attempts = sub.attempts + 1;
    const outcome = await processSubmission(env, { ...sub, attempts }, 'claimed');

    switch (outcome.kind) {
      case 'done':
        published++;
        break;
      case 'defer':
        await defer(env, id, 'claimed', outcome.state, outcome.delayMs, outcome.detail);
        deferred++;
        break;
      case 'fail':
        if (attempts >= maxAttempts) {
          await park(env, id, 'claimed', outcome.error);
          failed++;
        } else {
          await backoff(env, id, 'claimed', attempts, outcome.error);
          deferred++;
        }
        break;
    }
  }

  console.log(JSON.stringify({
    job: 'drain', claimed: rows.length, published, deferred, failed,
  }));
}

/**
 * Recover rows left in `publishing` by a Worker that died between creating the
 * issue and recording it. Idempotency layer 3 finds the marker on GitHub and
 * settles them, so this only needs to make them claimable again.
 */
export async function recoverStuckPublishing(env: Env): Promise<number> {
  const cutoff = Date.now() - STALE_CLAIM_MS;
  const stuck = await env.DB.prepare(
    `SELECT submission_id FROM submissions
      WHERE state = 'publishing' AND COALESCE(claimed_at, 0) <= ?`
  ).bind(cutoff).all<{ submission_id: string }>();

  for (const row of stuck.results ?? []) {
    await transition(env, row.submission_id, 'publishing', 'received', 'reclaimed after stalled publish');
  }
  return (stuck.results ?? []).length;
}
