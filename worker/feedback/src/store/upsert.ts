/**
 * The ONE place that decides whether a store review is new, edited, or already
 * known. Every producer goes through here.
 *
 * The Google Play API, the App Store Connect API and a future Play Console CSV
 * importer all hand this function a `NormalizedReview` and get back one of
 * three outcomes. None of them contains a line of deduplication logic of its
 * own, and that is the entire point: three implementations of "is this a
 * duplicate" would be three chances to disagree, and the disagreement would
 * appear as the same review stored twice.
 *
 * IDEMPOTENT BY CONSTRUCTION. Re-syncing a window that has already been synced
 * writes nothing but a `last_synced_at` bump. That property is what makes the
 * whole retry story cheap: a lost cursor, a crashed run, a re-import of an
 * overlapping CSV range — all of them cost time, not correctness. Nothing
 * downstream has to reason about whether it has seen a review before.
 *
 * THE STORED PAYLOAD ALWAYS HAS A VERSION ROW. That is the invariant this
 * file exists to hold, and it is not a property of the happy path: a review
 * row and the original it was derived from are two writes, and anything that
 * can interrupt the second one — a dropped connection, an invocation killed
 * mid-flight — would otherwise leave a review whose original is missing FOR
 * EVER. Nothing would repair it either, because the next sync sees a matching
 * hash and takes the `unchanged` branch, and the only thing that used to write
 * a version row was a hash that DIFFERED.
 *
 * Two mechanisms hold it, and both are needed:
 *
 *   1. ATOMICITY. Every path that writes or overwrites `raw_json` does it in
 *      one `db.batch()` — a single transaction — together with the version row
 *      for that payload. A half-written review cannot be committed.
 *   2. CONVERGENCE. `VERSION_OF_STORED` is idempotent, and every path runs it,
 *      including the one for a review that has not changed. So a review whose
 *      version row is missing for ANY reason gets it back on the next ordinary
 *      sync — which is what makes the uncertain case safe: a batch that
 *      commits and then fails to report back leaves the caller not knowing
 *      whether it landed, and the retry no longer has to know either.
 *
 * A HUMAN'S DECISION IS NEVER OVERWRITTEN BY AN EDIT.
 * When a review's text changes upstream, this refreshes the derived columns and
 * writes a version row. It does NOT touch `eligibility`, `human_labels`,
 * `human_decision`, `human_decided_at/_by`, or `review_state`. A review's
 * author must not be able to move it through our pipeline by editing what they
 * wrote — including moving it backwards, which would silently discard a
 * judgement someone made. The edit is recorded as an event instead, so the
 * console can show "edited after your decision" and let a person choose.
 */
import { scanForSecrets } from '../lib/secret-scan';
import { assertUpsertable, type NormalizedReview } from './normalize';

export type UpsertOutcome = 'created' | 'updated' | 'unchanged';

export interface UpsertResult {
  outcome: UpsertOutcome;
  storeReviewId: string;
  /** True when the secret scanner flagged this review's text. */
  flagged: boolean;
}

interface ExistingRow {
  store_review_id: string;
  raw_hash: string;
  review_state: string;
  human_decided_at: number | null;
}

/**
 * Scans the review's text and returns what to store.
 *
 * Runs at INGEST, not at render, for two reasons. The console must be able to
 * redact without re-scanning on every page view; and a review that contains a
 * seed phrase must be marked the moment it enters the system, not the first
 * time somebody happens to look at it.
 *
 * Reasons are hit KINDS only — never the matched value. The same rule
 * `spam_reasons` follows: copying the secret into a column in order to record
 * that we found a secret would defeat the point of finding it.
 */
function scan(r: NormalizedReview): { status: 'clean' | 'flagged'; reasons: string } {
  const text = [r.reviewTitle, r.reviewBody].filter(Boolean).join('\n');
  const hits = text ? scanForSecrets(text) : [];
  return {
    status: hits.length > 0 ? 'flagged' : 'clean',
    reasons: JSON.stringify(hits.map((h) => h.kind)),
  };
}

/**
 * THE INVARIANT, AS ONE STATEMENT: whatever payload is stored for this review
 * has a row in `store_review_versions`.
 *
 * It copies from `store_reviews` rather than from the record in hand, which is
 * what makes it usable at every point where the stored payload changes — and
 * what makes it a REPAIR rather than a write: run against a review whose
 * version row is missing, it puts it back; run against one that is intact, the
 * unique index turns it into a no-op. Idempotent, so a thousand unchanged
 * reviews still write nothing.
 *
 * `last_synced_at` is the observation time because it is, by construction,
 * when the stored payload was stored — `first_seen_at` would be wrong for a
 * payload that arrived as an edit. On the paths that overwrite the row, this
 * runs BEFORE the UPDATE for the old payload and AFTER it for the new one, so
 * each version row carries the time its own payload was current.
 */
const VERSION_OF_STORED = `
  INSERT INTO store_review_versions (store_review_id, raw_hash, raw_json, rating, observed_at)
  SELECT store_review_id, raw_hash, raw_json, rating, last_synced_at
    FROM store_reviews WHERE store_review_id = ?
  ON CONFLICT(store_review_id, raw_hash) DO NOTHING`;

/** The same, for a review identified the only way a brand-new one can be. */
const VERSION_OF_STORED_BY_IDENTITY = `
  INSERT INTO store_review_versions (store_review_id, raw_hash, raw_json, rating, observed_at)
  SELECT store_review_id, raw_hash, raw_json, rating, last_synced_at
    FROM store_reviews WHERE source = ? AND app_id = ? AND platform_review_id = ?
  ON CONFLICT(store_review_id, raw_hash) DO NOTHING`;

/**
 * The "first seen" line, written only if this review has never had one.
 *
 * INSERT ... SELECT, not VALUES, for the same reason as above: it attaches to
 * whichever row is actually stored, so the loser of a concurrent insert adds
 * nothing rather than a second arrival line for a row it did not create. The
 * create event is the only one with no from_state, which is what NOT EXISTS
 * matches — an edit event carries the state it moved from.
 */
const FIRST_SEEN_EVENT = `
  INSERT INTO store_review_events (store_review_id, at, kind, from_state, to_state, detail, actor)
  SELECT r.store_review_id, ?, 'sync', NULL, 'new', ?, 'sync'
    FROM store_reviews r
   WHERE r.source = ? AND r.app_id = ? AND r.platform_review_id = ?
     AND NOT EXISTS (
       SELECT 1 FROM store_review_events e
        WHERE e.store_review_id = r.store_review_id
          AND e.from_state IS NULL AND e.to_state = 'new')`;

/** Append-only. Never UPDATEd — the discipline `state_log` follows. */
function eventStmt(
  db: D1Database, storeReviewId: string, at: number,
  kind: string, detail: string, fromState?: string | null, toState?: string | null
): D1PreparedStatement {
  return db.prepare(
    `INSERT INTO store_review_events
       (store_review_id, at, kind, from_state, to_state, detail, actor)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(storeReviewId, at, kind, fromState ?? null, toState ?? null, detail, 'sync');
}

/**
 * Writes one normalised review. Safe to call repeatedly with the same input.
 *
 * `newId` is injected so tests are deterministic; production passes
 * `crypto.randomUUID`.
 */
export async function upsertReview(
  db: D1Database,
  record: NormalizedReview,
  nowMs: number,
  newId: () => string = () => crypto.randomUUID()
): Promise<UpsertResult> {
  // Guards every producer, not just the one that remembered to ask.
  assertUpsertable(record);

  const existing = await db.prepare(
    `SELECT store_review_id, raw_hash, review_state, human_decided_at
       FROM store_reviews
      WHERE source = ? AND app_id = ? AND platform_review_id = ?`
  ).bind(record.source, record.appId, record.platformReviewId).first<ExistingRow>();

  const sec = scan(record);

  // ---- already known, and unchanged -------------------------------------
  if (existing && existing.raw_hash === record.rawHash) {
    /**
     * Only the sync clock moves, and no event is written: a run that sees a
     * thousand unchanged reviews must not write a thousand rows saying so.
     *
     * THE VERSION STATEMENT IS NOT AN EXCEPTION TO THAT. It writes nothing for
     * a review that is intact — the unique index sees to it — and it is what
     * makes this path the repair for one that is not. This is the ONLY branch
     * a review with a matching hash ever takes, so a version row missing here
     * is a version row missing for ever unless this puts it back.
     *
     * It runs BEFORE the UPDATE so the row still carries the `last_synced_at`
     * of the payload it is versioning, rather than this run's clock.
     */
    await db.batch([
      db.prepare(VERSION_OF_STORED).bind(existing.store_review_id),
      db.prepare('UPDATE store_reviews SET last_synced_at = ?, sync_error = NULL WHERE store_review_id = ?')
        .bind(nowMs, existing.store_review_id),
    ]);
    return { outcome: 'unchanged', storeReviewId: existing.store_review_id, flagged: sec.status === 'flagged' };
  }

  // ---- already known, and edited upstream --------------------------------
  if (existing) {
    const update = db.prepare(
      `UPDATE store_reviews SET
         raw_json = ?, raw_hash = ?, last_synced_at = ?,
         review_title = ?, review_body = ?, rating = ?, reviewer_name = ?,
         territory = ?, language = ?, review_updated_at = ?,
         app_version = ?, app_version_code = ?, device = ?, device_product = ?, os_version = ?,
         secret_scan_status = ?, secret_scan_reasons = ?, secret_scanned_at = ?,
         sync_error = NULL
       WHERE store_review_id = ?`
    ).bind(
      JSON.stringify(record.raw), record.rawHash, nowMs,
      record.reviewTitle, record.reviewBody, record.rating, record.reviewerName,
      record.territory, record.language, record.reviewUpdatedAt,
      record.appVersion, record.appVersionCode, record.device, record.deviceProduct, record.osVersion,
      sec.status, sec.reasons, nowMs,
      existing.store_review_id
    );

    // review_created_at is NOT refreshed. It anchors the queue's ordering, and
    // an edit is not a new review arriving — letting it move would reshuffle a
    // reviewer's list under them for a one-word correction.

    // Said plainly in the audit trail, because it is the case a human needs to
    // notice: the text they judged is not the text that is there now.
    const afterDecision = existing.human_decided_at != null;

    /**
     * ONE TRANSACTION, AND THE ORDER IS THE POINT.
     *
     * The same statement runs either side of the UPDATE, and each time it
     * means "the payload in the row right now has a version". Before, that is
     * the OLD payload — which is how an original that was never versioned is
     * rescued in the last moment before `raw_json` is overwritten and it stops
     * being recoverable at all. After, it is the edit.
     *
     * Batched, so an interruption cannot land the overwrite without the
     * version rows that make it readable.
     */
    await db.batch([
      db.prepare(VERSION_OF_STORED).bind(existing.store_review_id),
      update,
      db.prepare(VERSION_OF_STORED).bind(existing.store_review_id),
      eventStmt(
        db, existing.store_review_id, nowMs, 'sync',
        afterDecision
          ? 'edited upstream AFTER a human decision; decision left untouched'
          : 'edited upstream',
        existing.review_state, existing.review_state
      ),
    ]);

    return { outcome: 'updated', storeReviewId: existing.store_review_id, flagged: sec.status === 'flagged' };
  }

  // ---- new ---------------------------------------------------------------
  const id = newId();
  // A review that already carries a developer reply is recorded as replied, so
  // the console never offers to answer something that has been answered. The
  // reply's own history is Phase 6's table to own; this only prevents a second
  // reply appearing under the first.
  const replyState = record.existingReplyText ? 'published' : 'none';

  const insert = db.prepare(
    `INSERT INTO store_reviews
       (store_review_id, platform, source, app_id, platform_review_id,
        raw_json, raw_hash, first_seen_at, last_synced_at,
        review_title, review_body, rating, reviewer_name, territory, language,
        review_created_at, review_updated_at,
        app_version, app_version_code, device, device_product, os_version,
        review_state, reply_state, handoff_state, eligibility,
        secret_scan_status, secret_scan_reasons, secret_scanned_at)
     VALUES (?,?,?,?,?, ?,?,?,?, ?,?,?,?,?,?, ?,?, ?,?,?,?,?, ?,?,?,?, ?,?,?)
     ON CONFLICT(source, app_id, platform_review_id) DO NOTHING`
  ).bind(
    id, record.platform, record.source, record.appId, record.platformReviewId,
    JSON.stringify(record.raw), record.rawHash, nowMs, nowMs,
    record.reviewTitle, record.reviewBody, record.rating, record.reviewerName,
    record.territory, record.language,
    record.reviewCreatedAt, record.reviewUpdatedAt,
    record.appVersion, record.appVersionCode, record.device, record.deviceProduct, record.osVersion,
    'new', replyState, 'none', 'undecided',
    sec.status, sec.reasons, nowMs
  );

  /**
   * THE REVIEW, ITS ORIGINAL AND ITS ARRIVAL, IN ONE TRANSACTION.
   *
   * These three used to be three awaits with a read in the middle, and the gap
   * between the first and the second is where a review lost its original with
   * nothing able to give it back. Batched, the review row cannot exist without
   * them; if the batch fails, nothing was written and the next run creates the
   * review cleanly rather than finding a shell of one.
   *
   * ON CONFLICT DO NOTHING on the insert, because two sync runs overlapping —
   * a retry landing on top of a slow run, or the rotor firing twice — must
   * produce ONE row, not a unique-constraint error that fails the whole batch
   * for a review that is already stored. The two statements after it resolve
   * the row by identity rather than by the id generated here, so they attach
   * to the winner's row and add nothing that is already there.
   */
  const written = await db.batch([
    insert,
    db.prepare(VERSION_OF_STORED_BY_IDENTITY).bind(record.source, record.appId, record.platformReviewId),
    db.prepare(FIRST_SEEN_EVENT).bind(
      nowMs, `first seen from ${record.source}`, record.source, record.appId, record.platformReviewId
    ),
  ]);

  // Whether the insert was ours. `changes` is how D1 reports a conflict that
  // wrote nothing; the read-back below settles it either way, so a driver that
  // ever stopped reporting it would cost a query, not correctness.
  if ((written[0]?.meta?.changes ?? 0) > 0) {
    return { outcome: 'created', storeReviewId: id, flagged: sec.status === 'flagged' };
  }

  const stored = await db.prepare(
    `SELECT store_review_id, raw_hash, review_state, human_decided_at
       FROM store_reviews
      WHERE source = ? AND app_id = ? AND platform_review_id = ?`
  ).bind(record.source, record.appId, record.platformReviewId).first<ExistingRow>();

  if (!stored) throw new Error('upsert: row vanished immediately after insert');
  // Someone else inserted it between our SELECT and our INSERT. Their row, and
  // their version and arrival rows — ours added nothing.
  return {
    outcome: stored.store_review_id === id ? 'created' : 'unchanged',
    storeReviewId: stored.store_review_id,
    flagged: sec.status === 'flagged',
  };
}

