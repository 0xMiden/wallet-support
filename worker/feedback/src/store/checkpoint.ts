/**
 * Sync checkpoints, retries and backoff — `store_sync_state`.
 *
 * One row per (source, app_id), holding where the last run got to and how it
 * went. It exists so a sync that is interrupted resumes instead of restarting,
 * and so a sync that is FAILING is visible as a countdown rather than as
 * silence.
 *
 * THE COUNTDOWN IS THE POINT, NOT THE HEALTH CHECK.
 * Google Play serves only reviews created or modified in the last 7 days. A
 * review that ages out of that window is unreachable through the API forever —
 * recoverable only from a Play Console CSV export, if anyone thinks to take
 * one. So the question worth alerting on is not "did the last sync fail" but
 * "how long has it been since one SUCCEEDED", measured against 168 hours.
 *
 * That is why `last_success_at` is a typed, indexed column rather than a value
 * inside a JSON blob: the alarm is a query against it.
 *
 * BACKOFF IS CAPPED FAR BELOW THE WINDOW, DELIBERATELY.
 * Unbounded exponential backoff is the right default almost everywhere and the
 * wrong one here. Doubling from minutes reaches days within a dozen failures,
 * and a day of backoff against a 7-day window is a day of reviews at risk. The
 * cap keeps a broken sync retrying often enough that fixing the cause within a
 * few days still recovers everything.
 */

/** Row shape in `store_sync_state`. */
export interface Checkpoint {
  key: string;
  cursor: string | null;
  last_success_at: number | null;
  last_attempt_at: number | null;
  consecutive_failures: number;
  last_error: string | null;
  updated_at: number;
  /** Set while the store has asked us to wait. Null means nothing is pending. */
  defer_until: number | null;
  /** Set while a credential is refused. Null means the sync is running normally. */
  paused_at: number | null;
  paused_reason: string | null;
  /** Fingerprints of the cursors the CURRENT pass has already used. */
  pass_tokens: string | null;
  /** When paging last went round in a circle. Cleared only by a completed pass. */
  cycle_at: number | null;
  /** When a pass last reached the end of the source. */
  last_pass_at: number | null;
  /** When the current attempt to get all the way round began. */
  pass_started_at: number | null;
  /** The run that currently owns this row. See beginAttempt. */
  run_id: string | null;
}

/** The window Google actually serves. Everything here is measured against it. */
export const GOOGLE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const BASE_BACKOFF_MS = 60_000;      // one minute
/** One hour. 1/168th of the window, so even a sustained outage keeps trying. */
export const MAX_BACKOFF_MS = 60 * 60 * 1000;

/**
 * How often a PAUSED sync tries once anyway.
 *
 * Pausing exists so a refused credential stops costing a request every five
 * minutes. Making it terminal would swap one silent failure for another: the
 * sync would sit stopped until somebody read a status page, while the 7-day
 * window emptied behind it — the exact failure this file argues against for
 * backoff. So a pause is a much slower cadence, not an off switch, and a
 * rotated key brings the sync back by itself within this interval without
 * anyone touching the database.
 *
 * An hour is the same ceiling backoffMs already reaches, so a paused sync costs
 * no more requests than a sync that is merely failing — 24 a day against a
 * refused endpoint instead of 288 — and a key rotated at any point is picked up
 * within the hour rather than at the end of a shift.
 */
export const PARK_REPROBE_MS = 60 * 60 * 1000;

/**
 * COLLECTION HAPPENS IN CYCLES, TWICE A DAY, and a cycle is a clock fact rather
 * than a stored one.
 *
 * 04:00 and 16:00 UTC are 12:00 and 00:00 in Asia/Manila — UTC+8 all year, no
 * daylight saving to drift against. Deriving the cycle from the clock instead
 * of recording it is what makes overlapping cycles impossible: there is no
 * "start a cycle" write to race, no flag that can be left set by an invocation
 * that died, and two ticks inside the same window compute the same answer.
 *
 * A source is finished for the cycle when it has COMPLETED A PASS since the
 * cycle began — `last_pass_at`, which only a pass reaching the end of the
 * source ever moves. So a quiet store is asked once and then left alone until
 * the next cycle, and a store with a backlog is asked again every tick until
 * the pass is done.
 */
export const CYCLE_PERIOD_MS = 12 * 60 * 60 * 1000;
/** 04:00 UTC — noon in Manila. The other cycle is twelve hours later. */
export const CYCLE_OFFSET_MS = 4 * 60 * 60 * 1000;

/** The start of the collection cycle `nowMs` falls in. */
export function cycleStart(nowMs: number): number {
  return Math.floor((nowMs - CYCLE_OFFSET_MS) / CYCLE_PERIOD_MS) * CYCLE_PERIOD_MS + CYCLE_OFFSET_MS;
}

/** Has this source already finished its pass for the cycle `nowMs` is in? */
export function cycleDone(cp: Checkpoint | null, nowMs: number): boolean {
  return cp?.last_pass_at != null && cp.last_pass_at >= cycleStart(nowMs);
}

export function syncKey(source: string, appId: string): string {
  return `${source}:${appId}`;
}

export async function loadCheckpoint(db: D1Database, key: string): Promise<Checkpoint | null> {
  return db.prepare('SELECT * FROM store_sync_state WHERE key = ?').bind(key).first<Checkpoint>();
}

/**
 * How long to wait after `n` consecutive failures.
 *
 * Exponential, capped. `n = 0` means the last attempt succeeded, so there is
 * nothing to wait for.
 */
export function backoffMs(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return 0;
  const raw = BASE_BACKOFF_MS * 2 ** (consecutiveFailures - 1);
  return Math.min(raw, MAX_BACKOFF_MS);
}

/**
 * May this source be synced right now?
 *
 * A source that has never run is always due — the first run must not be
 * delayed by a backoff computed from no history at all.
 */
export function isDue(cp: Checkpoint | null, nowMs: number): boolean {
  if (!cp) return true;

  // A PAUSE OUTRANKS EVERYTHING BELOW IT, including a due backoff: while a
  // credential is refused, the answer to every request is already known.
  if (cp.paused_at) return nowMs >= cp.paused_at + PARK_REPROBE_MS;

  // A wait the STORE asked for. Honoured even when our own backoff has expired
  // — being due on our clock is not permission on theirs.
  if (cp.defer_until && nowMs < cp.defer_until) return false;

  // The work for this cycle is done. Every remaining tick in the window costs
  // one query to find that out, and asks the store nothing.
  if (cycleDone(cp, nowMs)) return false;

  if (cp.consecutive_failures <= 0) return true;
  const waitUntil = (cp.last_attempt_at ?? 0) + backoffMs(cp.consecutive_failures);
  return nowMs >= waitUntil;
}

/**
 * The one hold worth re-checking after claiming, against the row the claim
 * handed back: did another run FINISH THE PASS while this one was reading?
 *
 * It is the only one that corrupts anything. A run that starts a fresh pass
 * inside a completed cycle puts a live cursor on a finished pass and restarts
 * the coverage clock, and it does so holding a valid claim, so nothing
 * downstream would refuse it.
 *
 * THE OTHERS ARE DELIBERATELY NOT RE-CHECKED, and each for its own reason:
 *
 *   * Backoff would be measured against this run's own stamp — the claim sets
 *     `last_attempt_at` — so it would hold every time, and a sync with one
 *     failure behind it would never run again.
 *   * A pause is the same trap in a different shape: the probe that a paused
 *     sync is allowed every hour is decided before claiming, and re-reading
 *     `paused_at` afterwards would cancel the probe it just permitted.
 *   * A deferral or a pause imposed by another run in between costs one wasted
 *     request and then records the same answer. Nothing is corrupted, so
 *     nothing needs guarding.
 *
 * Which is the general rule here: re-check what would be WRONG to proceed
 * through, not everything that might have changed.
 */
export function holdAfterClaim(cp: Checkpoint | null, nowMs: number): 'cycle-done' | null {
  return cycleDone(cp, nowMs) ? 'cycle-done' : null;
}

/** Why a sync is not due, for a status page. Null when it is due. */
export function holdReason(
  cp: Checkpoint | null, nowMs: number
): 'paused' | 'deferred' | 'cycle-done' | 'backoff' | null {
  if (isDue(cp, nowMs)) return null;
  if (cp?.paused_at) return 'paused';
  if (cp?.defer_until && nowMs < cp.defer_until) return 'deferred';
  if (cycleDone(cp, nowMs)) return 'cycle-done';
  return 'backoff';
}

/** Hours since the last SUCCESSFUL sync. `null` means one has never happened. */
export function hoursSinceSuccess(cp: Checkpoint | null, nowMs: number): number | null {
  if (!cp?.last_success_at) return null;
  return (nowMs - cp.last_success_at) / 3_600_000;
}

/**
 * How much of the 7-day window has been burned since the last success.
 *
 * 1.0 means reviews have begun ageing out and are now unrecoverable through
 * the API. Returns null when no sync has ever succeeded — that is a different
 * situation (nothing was ever collected) and must not be reported as data loss.
 */
export function windowConsumed(cp: Checkpoint | null, nowMs: number): number | null {
  if (!cp?.last_success_at) return null;
  return (nowMs - cp.last_success_at) / GOOGLE_WINDOW_MS;
}

/**
 * Claims the row for this run, stamps the attempt, AND HANDS BACK THE ROW IT
 * CLAIMED — which is the row the run must then work from.
 *
 * GUARDING THE WRITE IS NOT ENOUGH ON ITS OWN. A run reads the checkpoint
 * before it claims anything, and in between another run can take the pass
 * forward or finish it. The late claim is then perfectly valid — it is the
 * newest — so the write guard lets it through, and the run stores the successor
 * of a cursor that has moved on, or reopens a pass that completed. The guard
 * cannot see that, because nothing about the WRITE is stale; the READ was.
 *
 * So the claim returns the row as of itself, in the same statement, and a run
 * walks from the cursor it owns rather than the one it happened to read. The
 * two together are what make concurrency safe: this decides what a run STARTS
 * from, and the run_id condition decides whether it may FINISH.
 *
 * Stamped before any work, so a crash mid-run is still recorded.
 */
export async function beginAttempt(
  db: D1Database, key: string, nowMs: number, runId: string
): Promise<Checkpoint | null> {
  return db.prepare(
    `INSERT INTO store_sync_state (key, last_attempt_at, consecutive_failures, updated_at, run_id)
     VALUES (?1,?2,0,?2,?3)
     ON CONFLICT(key) DO UPDATE SET last_attempt_at = ?2, updated_at = ?2, run_id = ?3
     RETURNING *`
  ).bind(key, nowMs, runId).first<Checkpoint>();
}

/**
 * THE CLAIM, and why every checkpoint write carries it.
 *
 * A cycle is derived from the clock, which stops a second PASS opening beside
 * an existing one. It does nothing about two INVOCATIONS at once — Cloudflare
 * can deliver a tick while the previous one is still running, and a retry is
 * another. Both read the same cursor, both fetch the same page, and both try to
 * write. The reviews survive that, because upsertReview is idempotent; the
 * CHECKPOINT does not.
 *
 * A run overtaken by a newer one would otherwise store the cursor IT read the
 * successor of — walking the pass backwards — along with the pass memory as it
 * was before the newer runs added to it, and could reopen a pass another run
 * had already completed.
 *
 * So `beginAttempt` claims the row, and this is the condition every write after
 * it carries: apply only while that claim still stands. Newest wins, because
 * the newest run is the one that read the freshest cursor. The loser discards
 * its checkpoint write and nothing else — what it collected is already stored.
 *
 * A claim is replaced rather than released, so it needs no expiry and a run
 * that dies mid-flight holds nothing.
 */
const STILL_OURS = 'store_sync_state.run_id = ?RUN';

/** The condition, with its placeholder numbered for the statement it joins. */
const stillOurs = (n: number) => STILL_OURS.replace('?RUN', `?${n}`);

/**
 * A run finished cleanly.
 *
 * `cursor` is stored as given, including null — a null cursor means "the next
 * run starts from the beginning", which after a complete pass is exactly right
 * and is not a loss of information.
 *
 * A NULL CURSOR IS ALSO THE END OF A PASS, and that is the difference between
 * a request that worked and collection that is progressing. Only here does
 * `last_pass_at` move, the pass memory empty, and a recorded cycle clear — so a
 * sync going round in circles cannot reach any of them however many pages it
 * fetches without error.
 */
export async function recordSuccess(
  db: D1Database, key: string, cursor: string | null, nowMs: number,
  passTokens: string | null = null, runId: string | null = null
): Promise<void> {
  const completed = cursor === null;
  const passAt = completed ? nowMs : null;
  const tokens = completed ? null : passTokens;
  // Every placeholder NUMBERED, for the reason recordFailure gives: a bare `?`
  // beside `?NNN` takes the next unused index, and this statement binds the
  // same value in several places.
  await db.prepare(
    `INSERT INTO store_sync_state
       (key, cursor, last_success_at, last_attempt_at, consecutive_failures, last_error,
        updated_at, pass_tokens, cycle_at, last_pass_at, pass_started_at)
     VALUES (?1, ?2, ?3, ?3, 0, NULL, ?3, ?4, NULL, ?5,
             CASE WHEN ?5 IS NULL THEN ?3 ELSE NULL END)
     ON CONFLICT(key) DO UPDATE SET
       cursor = ?2, last_success_at = ?3, last_attempt_at = ?3,
       consecutive_failures = 0, last_error = NULL, updated_at = ?3,
       pass_tokens = ?4,
       -- The clock on the CURRENT attempt to get all the way round. Started
       -- when a pass opens, and stopped only by one that finishes — never by a
       -- cycle reset or a refused cursor, because neither of those got round
       -- either. It is what stops a sync that never completes a pass from
       -- reporting a null coverage gap for ever.
       pass_started_at = CASE WHEN ?5 IS NOT NULL THEN NULL
                              ELSE COALESCE(store_sync_state.pass_started_at, ?3) END,
       -- A cycle is forgotten ONLY by a pass that reaches the end. A page
       -- fetched without error is not progress and must not clear it, or a
       -- store that keeps cycling would look healthy between detections.
       cycle_at = CASE WHEN ?5 IS NULL THEN store_sync_state.cycle_at ELSE NULL END,
       last_pass_at = COALESCE(?5, store_sync_state.last_pass_at),
       defer_until = NULL, paused_at = NULL, paused_reason = NULL
     WHERE ${stillOurs(6)}`
  ).bind(key, cursor, nowMs, tokens, passAt, runId).run();
}

/**
 * The store sent this pass back to a page it had already read.
 *
 * NOT A SUCCESS, WHICH IS THE WHOLE POINT. The cycle used to be reported as a
 * finished pass: cursor cleared, `last_success_at` refreshed, nothing to see.
 * A sync could alternate between two pages indefinitely and look like one
 * completing a pass every other tick while the 7-day window emptied.
 *
 * So it is recorded as a failure — counted, backed off, visible in last_error —
 * and `cycle_at` stays set until a pass actually reaches the end, so the ticks
 * in between cannot make it look resolved.
 *
 * THE PASS IS RESET, which is the recovery. The cursor clears and the memory
 * empties, so the next run starts a fresh pass from the top rather than
 * resuming inside the loop. Re-reading costs time and nothing else.
 */
export async function recordCycle(
  db: D1Database, key: string, message: string, nowMs: number, runId: string | null = null
): Promise<void> {
  const detail = message.slice(0, 300);
  await db.prepare(
    `INSERT INTO store_sync_state
       (key, cursor, last_attempt_at, consecutive_failures, last_error, updated_at,
        pass_tokens, cycle_at)
     VALUES (?1, NULL, ?2, 1, ?3, ?2, NULL, ?2)
     ON CONFLICT(key) DO UPDATE SET
       cursor = NULL,
       last_attempt_at = ?2,
       consecutive_failures = store_sync_state.consecutive_failures + 1,
       last_error = ?3,
       pass_tokens = NULL,
       cycle_at = ?2,
       updated_at = ?2
     WHERE ${stillOurs(4)}`
  ).bind(key, nowMs, detail, runId).run();
}

/**
 * The store asked us to come back later — a 429, or one of Google's 403s that
 * is really a quota.
 *
 * NOT A FAILURE, AND DELIBERATELY NOT COUNTED AS ONE. `consecutive_failures`
 * drives our backoff and, through /health, the question "is this sync broken".
 * A store that is briefly busy is not a broken sync, and letting a rate limit
 * inflate that counter means an afternoon of load looks identical to a revoked
 * key. `last_error` is left alone for the same reason: the last thing that went
 * WRONG is still the last thing that went wrong.
 *
 * The wait itself is what stops the next tick, which is why `defer_until` had
 * to be a column: skipping the increment alone would leave the sync due
 * immediately and asking again — worse than counting it.
 */
export async function recordDeferral(
  db: D1Database, key: string, untilMs: number, nowMs: number, cursor?: string | null,
  runId: string | null = null
): Promise<void> {
  const advance = cursor === undefined ? null : cursor;
  const keepOld = cursor === undefined ? 1 : 0;
  await db.prepare(
    `INSERT INTO store_sync_state
       (key, cursor, last_attempt_at, consecutive_failures, defer_until, updated_at)
     VALUES (?1, ?2, ?3, 0, ?4, ?3)
     ON CONFLICT(key) DO UPDATE SET
       cursor = CASE WHEN ?5 = 1 THEN store_sync_state.cursor ELSE ?2 END,
       last_attempt_at = ?3,
       defer_until = ?4,
       -- A rate limit during a pause PROVES NOTHING about the credential: the
       -- request never got far enough to be refused. So the pause stands, and
       -- its clock restarts rather than a probe firing again inside the wait.
       paused_at = CASE WHEN store_sync_state.paused_at IS NULL THEN NULL ELSE ?3 END,
       updated_at = ?3
     WHERE ${stillOurs(6)}`
  ).bind(key, advance, nowMs, untilMs, keepOld, runId).run();
}

/**
 * A credential was refused. Stop the normal cadence.
 *
 * This is the one failure that retrying cannot fix, so it is the one failure
 * that stops asking. What it does NOT do is go quiet: the reason is stored, it
 * is what /health reports, and PARK_REPROBE_MS still lets one request through
 * every few hours so a rotated key resumes the sync on its own.
 *
 * The reason is the same text as `last_error`, and for the same reason it is
 * safe to store: fixed wording, an HTTP status, and a machine code that has
 * already been shape-checked. No key, no ID, no upstream prose.
 */
export async function recordPause(
  db: D1Database, key: string, error: unknown, nowMs: number, cursor?: string | null,
  runId: string | null = null
): Promise<void> {
  const message = String((error as Error)?.message ?? error).slice(0, 300);
  const advance = cursor === undefined ? null : cursor;
  const keepOld = cursor === undefined ? 1 : 0;
  await db.prepare(
    `INSERT INTO store_sync_state
       (key, cursor, last_attempt_at, consecutive_failures, last_error, paused_at, paused_reason, updated_at)
     VALUES (?1, ?2, ?3, 1, ?4, ?3, ?4, ?3)
     ON CONFLICT(key) DO UPDATE SET
       cursor = CASE WHEN ?5 = 1 THEN store_sync_state.cursor ELSE ?2 END,
       last_attempt_at = ?3,
       -- Still counted. A pause is a failure that happens to be diagnosable,
       -- and the count is what shows a probe answering 401 every six hours.
       consecutive_failures = store_sync_state.consecutive_failures + 1,
       last_error = ?4,
       paused_at = ?3,
       paused_reason = ?4,
       updated_at = ?3
     WHERE ${stillOurs(6)}`
  ).bind(key, advance, nowMs, message, keepOld, runId).run();
}

/**
 * A run failed.
 *
 * THE CURSOR IS NOT CLEARED. Whatever the last successful pass reached stays
 * put, so a transient failure resumes rather than restarting. Even if the
 * cursor is stale by the time it is used, re-reading pages already seen costs
 * only time: `upsertReview` is idempotent, so a repeated page writes nothing.
 *
 * The error message is truncated. It reaches a page that renders it, and an
 * upstream error body is attacker-adjacent text like any other.
 */
export async function recordFailure(
  db: D1Database, key: string, error: unknown, nowMs: number,
  cursor?: string | null, runId: string | null = null
): Promise<void> {
  const message = String((error as Error)?.message ?? error).slice(0, 300);
  // OMITTING `cursor` keeps whatever is stored; PASSING it (even as null)
  // advances the checkpoint to the page that actually failed, so the retry
  // resumes there instead of re-walking pages already stored.
  const advance = cursor === undefined ? null : cursor;
  const keepOld = cursor === undefined ? 1 : 0;
  // Every placeholder is NUMBERED. Mixing `?` and `?NNN` in one statement is
  // legal SQLite and reads as a trap: the bare `?` takes the next unused index,
  // so inserting a parameter silently renumbers the ones after it.
  await db.prepare(
    `INSERT INTO store_sync_state
       (key, cursor, last_attempt_at, consecutive_failures, last_error, updated_at)
     VALUES (?1, ?2, ?3, 1, ?4, ?3)
     ON CONFLICT(key) DO UPDATE SET
       cursor = CASE WHEN ?5 = 1 THEN store_sync_state.cursor ELSE ?2 END,
       last_attempt_at = ?3,
       consecutive_failures = store_sync_state.consecutive_failures + 1,
       last_error = ?4,
       -- A PAUSED SYNC THAT FAILS FOR SOME OTHER REASON IS STILL PAUSED, and
       -- its probe clock restarts. Leaving paused_at alone would leave it in
       -- the past, which isDue reads as "the probe is due" — every tick, five
       -- minutes apart, which is the hammering the pause exists to stop.
       paused_at = CASE WHEN store_sync_state.paused_at IS NULL THEN NULL ELSE ?3 END,
       updated_at = ?3
     WHERE ${stillOurs(6)}`
  ).bind(key, advance, nowMs, message, keepOld, runId).run();
}
