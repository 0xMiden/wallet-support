-- wallet-support feedback — D1 schema
-- Idempotency, triage state, issue mirror, and audit trail.

------------------------------------------------------------------------
-- SUBMISSIONS — one row per feedback submission. Idempotency layer 1.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  submission_id     TEXT PRIMARY KEY,          -- client UUIDv4
  received_at       INTEGER NOT NULL,
  state             TEXT NOT NULL DEFAULT 'received',
                    -- received → claimed → publishing → published
                    -- waiting:   capped   (cap closed)
                    --            deferred (classifier down, GitHub rate
                    --                      limited, or an error with retry
                    --                      budget left)
                    --            both retried when next_attempt_at passes
                    -- terminal:  quarantined | failed
                    -- spam:      suspected_spam (awaiting human review)
                    --            spam           (confirmed by a human)
                    -- Neither appears in the drain's claim filter, so both are
                    -- non-publishing by ABSENCE rather than by a check that
                    -- could be forgotten. quarantined stays dedicated to secret
                    -- material and is never reused for spam.
                    -- A `claimed` row whose claimed_at has gone stale is
                    -- reclaimed by the drain: a dead Worker costs time, not
                    -- the report.
  body_sanitized    TEXT NOT NULL,
  body_hash         TEXT NOT NULL,             -- sha256 of raw, for dupe-payload detection
  wallet_version    TEXT,
  platform          TEXT,                      -- android | ios | extension
  network           TEXT,
  route             TEXT,
  error_code        TEXT,                      -- 12-code taxonomy, if inferable
  fingerprint       TEXT,                      -- deterministic bucket key
  reporter_key      TEXT,                      -- sha256 of the ingest limiter key; see migration 0004
  attachment_keys   TEXT,                      -- JSON array of R2 keys
  verdict           TEXT,                      -- new | duplicate | uncertain
  confidence        REAL,
  matched_issue     INTEGER,                   -- github issue number
  draft_path        TEXT,
  published_issue   INTEGER,
  published_title   TEXT,                      -- title we filed with; see migration 0003
  model_version     TEXT,                      -- for regression forensics
  prompt_version    TEXT,
  candidates        TEXT,  -- JSON array of issue numbers offered to the classifier
  quarantine_reason TEXT,

  -- Drain bookkeeping. These four reproduce, in D1, what Cloudflare Queues
  -- provided for free: retry budget, backoff, in-flight ownership, and a
  -- dead-letter destination.
  attempts          INTEGER NOT NULL DEFAULT 0,  -- spent on errors only
  next_attempt_at   INTEGER,                     -- epoch ms; NULL = now
  claimed_at        INTEGER,                     -- epoch ms of current claim
  last_error        TEXT,

  -- Spam layer; see migration 0005 for the reasoning behind each one.
  -- spam_status IS NULL means CLEAN: fail-open, so rows that predate the layer
  -- are never stranded. spam_score is telemetry and must never gate anything.
  -- spam_reasons holds reason CODES only, never quoted spam content.
  -- reporter_kind is required to tell an install_id hash from an IP hash —
  -- reporter_key alone cannot, and both rules depend on the distinction.
  spam_status       TEXT,                        -- NULL | clean | suspected | spam
  spam_score        REAL,                        -- telemetry ONLY, never a gate
  spam_reasons      TEXT,                        -- JSON array of reason CODES
  spam_reviewed_at  INTEGER,                     -- epoch ms of the human decision
  spam_reviewed_by  TEXT,                        -- verified reviewer identity
  normalized_hash   TEXT,                        -- flood key; src/lib/spam-signals.ts
  reporter_kind     TEXT,                        -- 'install' | 'ip'
  -- Which overdue tier has already been announced for this row. Per-row rather
  -- than a high-water cursor: reports do not become suspected in arrival order,
  -- so a cursor silently skips one flagged long after it was received. See
  -- migration 0006.
  overdue_alert_tier TEXT                        -- NULL | warn | escalate
);
CREATE INDEX IF NOT EXISTS idx_sub_state       ON submissions(state);
-- The drain's claim query filters on exactly this pair.
CREATE INDEX IF NOT EXISTS idx_sub_pending     ON submissions(state, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_sub_fingerprint ON submissions(fingerprint);
-- The per-reporter publish gate counts a reporter's issues over 1h and 24h.
CREATE INDEX IF NOT EXISTS idx_sub_reporter     ON submissions(reporter_key);
CREATE INDEX IF NOT EXISTS idx_sub_received    ON submissions(received_at);
CREATE INDEX IF NOT EXISTS idx_sub_body_hash   ON submissions(body_hash);
-- The review queue lists by verdict, oldest first; the overdue check counts
-- unreviewed rows past a deadline. Both filter on exactly this pair.
CREATE INDEX IF NOT EXISTS idx_sub_spam       ON submissions(spam_status, received_at);
-- The flood check counts one reporter's identical submissions inside a window.
CREATE INDEX IF NOT EXISTS idx_sub_flood      ON submissions(reporter_key, normalized_hash, received_at);
-- The overdue-alert query filters on exactly this triple.
CREATE INDEX IF NOT EXISTS idx_sub_overdue    ON submissions(state, overdue_alert_tier, spam_reviewed_at);

------------------------------------------------------------------------
-- STATE_LOG — append-only audit. Never UPDATE, only INSERT.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS state_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL,
  at            INTEGER NOT NULL,
  from_state    TEXT,
  to_state      TEXT NOT NULL,
  detail        TEXT,
  FOREIGN KEY (submission_id) REFERENCES submissions(submission_id)
);
CREATE INDEX IF NOT EXISTS idx_log_sub ON state_log(submission_id, at);

------------------------------------------------------------------------
-- ISSUE_MIRROR — local copy of 0xMiden/wallet issues. Read-only source.
-- Includes v1-relay and human-filed issues; all are valid dedup targets.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS issue_mirror (
  number        INTEGER PRIMARY KEY,
  title         TEXT NOT NULL,
  body          TEXT,
  state         TEXT NOT NULL,                 -- open | closed
  labels        TEXT,                          -- JSON array
  author        TEXT,
  created_at    INTEGER,
  updated_at    INTEGER,
  marker        TEXT,                          -- extracted mfv2/v1 submission id, if any
  embedding     BLOB,                          -- optional local vector
  synced_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mirror_state   ON issue_mirror(state);
CREATE INDEX IF NOT EXISTS idx_mirror_updated ON issue_mirror(updated_at);
CREATE INDEX IF NOT EXISTS idx_mirror_marker  ON issue_mirror(marker);

------------------------------------------------------------------------
-- DUP_LINKS — which submissions were COMMENTED onto which issue. A closed
-- match is not folded and gets no row here; /status reads this table to
-- decide whether to tell a reporter their report was merged.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dup_links (
  submission_id TEXT NOT NULL,
  issue_number  INTEGER NOT NULL,
  confidence    REAL,
  linked_at     INTEGER NOT NULL,
  PRIMARY KEY (submission_id, issue_number)
);
CREATE INDEX IF NOT EXISTS idx_dup_issue ON dup_links(issue_number);

------------------------------------------------------------------------
-- SYNC_STATE — cursors and ETags for the mirror.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  at    INTEGER NOT NULL
);

------------------------------------------------------------------------
-- STORE REVIEWS — Google Play and App Store reviews. See migration 0007
-- for the reasoning behind each table. No existing table above gains a
-- column: the only write Store Reviews makes into the pipeline's own
-- tables is an INSERT into `submissions` at the handoff.
------------------------------------------------------------------------
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
  deleted_detected_at   INTEGER,

  -- A person's own summary, shown instead of the AI's without overwriting it
  -- (migration 0010). Only a human writes these; NULL means never edited.
  human_summary         TEXT,
  human_summary_by      TEXT,
  human_summary_at      INTEGER
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
  updated_at           INTEGER NOT NULL,
  -- Waiting, not failing: the store asked us to come back later (a 429, or a
  -- 403 that is really a quota). Set from Retry-After, clamped. See migration 0011.
  defer_until          INTEGER,
  -- Paused: a credential was refused. Retrying on the normal cadence cannot
  -- fix it, so the sync stops and re-probes rarely until someone rotates the key.
  paused_at            INTEGER,
  paused_reason        TEXT,
  -- The cursors the CURRENT pass has already held, fingerprinted. One coming
  -- back while the pass is open is a paging cycle; cleared when a pass ends,
  -- which is what makes the same token legitimate on the next pass. See 0012.
  pass_tokens          TEXT,
  -- When paging last went round in a circle. Cleared only by a completed pass.
  cycle_at             INTEGER,
  -- When a pass last reached the end. The measure of progress that a stuck
  -- loop cannot refresh.
  last_pass_at         INTEGER,
  -- When the current attempt to get all the way round began. Cleared only by a
  -- completed pass, so a sync that never finishes one still reports a coverage
  -- gap instead of a null. See 0012.
  pass_started_at      INTEGER,
  -- The run that currently owns this row. Every checkpoint write applies only
  -- while the claim stands, so a slow invocation overtaken by a newer one
  -- cannot move the cursor backwards. See 0013.
  run_id               TEXT
);
-- The staleness alarm scans for the oldest successful sync.
CREATE INDEX IF NOT EXISTS idx_sss_success ON store_sync_state(last_success_at);

------------------------------------------------------------------------
-- ADMIN_ALLOWED — who may open the admin console. See migration 0008.
-- One row per person, keyed on the email address Google verifies.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_allowed (
  email        TEXT PRIMARY KEY,     -- lowercased, as verified by Google
  name         TEXT,                 -- display name, for the audit trail
  added_at     INTEGER NOT NULL,
  added_by     TEXT,                 -- the email of whoever granted access
  -- Revocation is a timestamp rather than a DELETE: who had access, and when it
  -- ended, is exactly the question asked after something goes wrong. A deleted
  -- row cannot answer it.
  disabled_at  INTEGER,
  last_seen_at INTEGER
);

-- The console lists people by when they were added; the sign-in path looks up
-- one address at a time and uses the primary key.
CREATE INDEX IF NOT EXISTS idx_admin_added ON admin_allowed(added_at);

------------------------------------------------------------------------
-- ADMIN_OAUTH_STATE — one-time use for sign-in state. See migration 0009.
-- Signed and unexpired is not the same as unused; this is what makes it used.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_oauth_state (
  state_hash  TEXT PRIMARY KEY,   -- sha256 of the state value, never the value
  consumed_at INTEGER NOT NULL,   -- epoch ms
  -- Kept so a stale row can be purged without re-deriving anything. A state is
  -- only valid for ten minutes, so rows past that are dead weight.
  expires_at  INTEGER NOT NULL
);

-- The purge deletes everything already expired; this is the index it uses.
CREATE INDEX IF NOT EXISTS idx_oauth_state_expiry ON admin_oauth_state(expires_at);
