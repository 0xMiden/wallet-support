-- Store Reviews — five new tables for Google Play and App Store reviews.
--
-- NOTHING READS OR WRITES THESE TABLES YET. This migration is deliberately
-- inert, in the same way 0005 was: it lands ahead of the code so the schema is
-- already in place when sync (Phase 1/2), the console (Phase 3), classification
-- (Phase 4) and the handoff (Phase 5) arrive, and so a rollback of any of that
-- code never leaves the tables shaped wrong.
--
-- NO EXISTING TABLE GAINS A COLUMN. That is the boundary the whole design rests
-- on: Store Reviews owns its own tables and touches `submissions` in exactly one
-- place — an INSERT at the handoff, with its matching state_log row. Everything
-- else the existing pipeline does is unreachable from here.
--
-- THE ORIGINAL IS NEVER EDITED.
-- raw_json is the payload exactly as the store returned it. Every derived field
-- beside it (review_body, rating, app_version, …) exists for querying and
-- rendering and is NEVER authoritative. When a review is edited upstream, a new
-- store_review_versions row is written and the derived fields are refreshed;
-- the first version row — the original as first seen — is never updated and
-- never deleted. A reviewer must always be able to read what was actually said.
--
-- WHY app_id IS PRESENT ON DAY ONE.
-- There is one Android package and one iOS app today. Storing the app id anyway
-- means a second app (a beta listing, a second wallet) is a row value rather
-- than a migration, and it makes the uniqueness constraint say what it means:
-- a review id is unique WITHIN one app on one store, not globally.

------------------------------------------------------------------------
-- STORE_REVIEWS — one row per platform review. The working record.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_reviews (
  -- Identity -----------------------------------------------------------
  store_review_id       TEXT PRIMARY KEY,        -- our UUIDv4, never the store's id
  platform              TEXT NOT NULL,           -- android | ios
  source                TEXT NOT NULL,           -- google_play | app_store
  app_id                TEXT NOT NULL,           -- package name, or ASC app id
  platform_review_id    TEXT NOT NULL,           -- the store's own id for the review

  -- The original, as received -------------------------------------------
  raw_json              TEXT NOT NULL,           -- payload exactly as returned
  raw_hash              TEXT NOT NULL,           -- sha256 of raw_json
  first_seen_at         INTEGER NOT NULL,        -- epoch ms we first stored it
  last_synced_at        INTEGER NOT NULL,        -- epoch ms of the last sync that saw it

  -- Extracted for querying and rendering. Derived, never authoritative.
  review_title          TEXT,
  review_body           TEXT,
  rating                INTEGER,                 -- 1..5
  reviewer_name         TEXT,
  territory             TEXT,
  language              TEXT,
  -- NOT NULL on purpose: every queue in the console orders by it, and an
  -- ordering column that can be NULL makes the queue's order undefined.
  -- Normalisation falls back to first_seen_at when a payload carries no
  -- timestamp, which is a worse answer than the store's but still an answer.
  review_created_at     INTEGER NOT NULL,
  review_updated_at     INTEGER,                 -- NULL on iOS; the API has no such field

  -- Environment. Populated on Android; NULL on iOS, which does not return it.
  app_version           TEXT,
  app_version_code      INTEGER,
  device                TEXT,
  device_product        TEXT,
  os_version            TEXT,

  -- AI. Advisory only — every one of these is a suggestion shown to a human.
  -- Recorded with model and prompt version so a bad batch can be found later
  -- and re-run, rather than being indistinguishable from a good one.
  ai_labels             TEXT,                    -- JSON array, allowlisted codes only
  ai_confidence         REAL,                    -- telemetry, never a gate
  ai_structured         TEXT,                    -- JSON object of extracted fields
  ai_model              TEXT,
  ai_prompt_version     TEXT,
  ai_classified_at      INTEGER,

  -- Human. ONLY a human ever writes these five. No code path may set them.
  human_labels          TEXT,                    -- JSON array; overrules ai_labels
  human_decision        TEXT,                    -- free-text note from the reviewer
  human_decided_at      INTEGER,
  human_decided_by      TEXT,
  eligibility           TEXT NOT NULL DEFAULT 'undecided',
                        -- undecided | eligible | not_eligible
                        -- The gate on the handoff. `undecided` is the only
                        -- default that can be right: a review nobody has read
                        -- must never be eligible for a public GitHub issue.

  -- Three INDEPENDENT workflows. One enum could not express "actionable and
  -- reply published", which is an ordinary state for a real review.
  review_state          TEXT NOT NULL DEFAULT 'new',
                        -- new | classifying | awaiting_review | actionable
                        -- | not_actionable | needs_info | sync_failed
  reply_state           TEXT NOT NULL DEFAULT 'none',
                        -- none | drafted | approved | publishing | published | failed
  current_reply_id      TEXT,                    -- -> store_review_replies.reply_id
  handoff_state         TEXT NOT NULL DEFAULT 'none',
                        -- none | requested | accepted | failed

  -- Handoff into the existing pipeline. See the architecture doc, §10.
  handoff_submission_id     TEXT,                -- the submissions row we created
  handoff_requested_at      INTEGER,
  handoff_accepted_at       INTEGER,
  handoff_attempts          INTEGER NOT NULL DEFAULT 0,
  handoff_next_attempt_at   INTEGER,
  handoff_error             TEXT,

  -- Safety. A store review is attacker-controlled text like any other, and a
  -- wallet review can contain a seed phrase someone pasted looking for help.
  -- Scanned at sync so the console renders it redacted, and enforced again at
  -- the handoff so a flagged review can never become a public issue.
  -- Reasons are hit KINDS only, never the matched value — the rule
  -- spam_reasons already follows.
  secret_scan_status    TEXT,                    -- NULL | clean | flagged
  secret_scan_reasons   TEXT,                    -- JSON array of reason CODES
  secret_scanned_at     INTEGER,

  -- Sync health.
  sync_error            TEXT,
  -- Only ever set on iOS. Google Play's API cannot report a deleted review, so
  -- a NULL here means "not detected", never "still present".
  deleted_detected_at   INTEGER
);

-- The whole of sync idempotency. A re-sync that sees the same review resolves
-- to the same row, so re-running a window writes no duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sr_platform_id ON store_reviews(source, app_id, platform_review_id);
-- SQLite permits many NULLs in a unique index, so this allows "not handed off"
-- on every row while making a second claim of the same submission id impossible.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sr_handoff_sub ON store_reviews(handoff_submission_id);
-- Each index below matches ONE query the console issues, in column order:
-- equality on the leading columns, range or sort on the last.
CREATE INDEX IF NOT EXISTS idx_sr_queue    ON store_reviews(platform, review_state, review_created_at);
CREATE INDEX IF NOT EXISTS idx_sr_classify ON store_reviews(review_state, ai_classified_at);
CREATE INDEX IF NOT EXISTS idx_sr_handoff  ON store_reviews(handoff_state, handoff_next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_sr_reply    ON store_reviews(platform, reply_state, review_created_at);
CREATE INDEX IF NOT EXISTS idx_sr_rating   ON store_reviews(platform, rating, review_created_at);
CREATE INDEX IF NOT EXISTS idx_sr_version  ON store_reviews(platform, app_version);
CREATE INDEX IF NOT EXISTS idx_sr_created  ON store_reviews(review_created_at);

------------------------------------------------------------------------
-- STORE_REVIEW_VERSIONS — every distinct payload ever seen for a review.
--
-- UNIQUE(store_review_id, raw_hash) is what makes an unchanged re-sync free:
-- it writes nothing. A genuine edit or rating change writes exactly one row.
-- The first row is the original as received and is never updated or deleted.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_review_versions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  store_review_id TEXT NOT NULL,
  raw_hash        TEXT NOT NULL,
  raw_json        TEXT NOT NULL,
  rating          INTEGER,
  observed_at     INTEGER NOT NULL,
  FOREIGN KEY (store_review_id) REFERENCES store_reviews(store_review_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_srv_unique ON store_review_versions(store_review_id, raw_hash);
CREATE INDEX IF NOT EXISTS idx_srv_review ON store_review_versions(store_review_id, observed_at);

------------------------------------------------------------------------
-- STORE_REVIEW_REPLIES — every draft and every publish attempt.
--
-- History by listing; the CURRENT reply is store_reviews.current_reply_id.
-- A reply is never edited in place once approved: a change supersedes it and
-- writes a new row, so what was approved and what was published are always
-- the same text.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_review_replies (
  reply_id        TEXT PRIMARY KEY,              -- UUIDv4
  store_review_id TEXT NOT NULL,
  body            TEXT NOT NULL,
  source          TEXT NOT NULL,                 -- human | ai_draft | ai_edited
  state           TEXT NOT NULL DEFAULT 'draft',
                  -- draft | approved | publishing | published | failed | superseded
  created_at      INTEGER NOT NULL,
  created_by      TEXT,
  approved_at     INTEGER,                       -- set ONLY by a human action
  approved_by     TEXT,
  published_at    INTEGER,
  -- What the store says about it, kept separate from our own state so a reply
  -- Apple is still processing is distinguishable from one we failed to send.
  external_state          TEXT,
  external_id             TEXT,
  external_last_modified  INTEGER,
  -- Retry budget, in the same shape the drain uses on submissions.
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER,
  last_error      TEXT,
  FOREIGN KEY (store_review_id) REFERENCES store_reviews(store_review_id)
);
CREATE INDEX IF NOT EXISTS idx_srr_review  ON store_review_replies(store_review_id, created_at);
-- The reply publisher claims work with exactly this pair.
CREATE INDEX IF NOT EXISTS idx_srr_pending ON store_review_replies(state, next_attempt_at);

------------------------------------------------------------------------
-- STORE_REVIEW_EVENTS — append-only audit. Never UPDATE, only INSERT.
-- The same discipline state_log follows, and the source of the per-review
-- "processing and decision history" the console renders.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_review_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  store_review_id TEXT NOT NULL,
  at              INTEGER NOT NULL,
  kind            TEXT NOT NULL,                 -- sync | classify | human | reply | handoff
  from_state      TEXT,
  to_state        TEXT,
  detail          TEXT,
  actor           TEXT,                          -- who or what caused it
  FOREIGN KEY (store_review_id) REFERENCES store_reviews(store_review_id)
);
CREATE INDEX IF NOT EXISTS idx_sre_review ON store_review_events(store_review_id, at);

------------------------------------------------------------------------
-- STORE_SYNC_STATE — one row per (source, app_id), plus the cron rotor row.
--
-- Not folded into the existing sync_state table, for two reasons. It keeps the
-- boundary literally true — the only existing table Store Reviews writes to is
-- `submissions` — and last_success_at needs to be a typed, indexed column
-- rather than a value inside a JSON blob, because the data-loss alarm is a
-- query against it: Google serves only the last 7 days, so "the last successful
-- Android sync is older than N hours" is a countdown, not a health check.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_sync_state (
  key                  TEXT PRIMARY KEY,         -- e.g. google_play:com.miden.wallet
  cursor               TEXT,
  last_success_at      INTEGER,
  last_attempt_at      INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error           TEXT,
  updated_at           INTEGER NOT NULL
);
-- The staleness alarm scans for the oldest successful sync.
CREATE INDEX IF NOT EXISTS idx_sss_success ON store_sync_state(last_success_at);
