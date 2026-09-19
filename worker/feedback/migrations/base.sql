-- wallet-support feedback — D1 schema
-- Idempotency, triage state, issue mirror, and audit trail.

------------------------------------------------------------------------
-- SUBMISSIONS — one row per feedback submission. Idempotency layer 1.
------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  submission_id     TEXT PRIMARY KEY,          -- client UUIDv4
  received_at       INTEGER NOT NULL,
  state             TEXT NOT NULL DEFAULT 'received',
                    -- received → publishing → published
                    -- deferred:  capped (cap hit; queue re-delivers)
                    -- terminal:  quarantined | failed
  body_sanitized    TEXT NOT NULL,
  body_hash         TEXT NOT NULL,             -- sha256 of raw, for dupe-payload detection
  wallet_version    TEXT,
  platform          TEXT,                      -- android | ios | extension | desktop
  network           TEXT,
  route             TEXT,
  error_code        TEXT,                      -- 12-code taxonomy, if inferable
  fingerprint       TEXT,                      -- deterministic bucket key
  attachment_keys   TEXT,                      -- JSON array of R2 keys
  verdict           TEXT,                      -- new | duplicate | uncertain
  confidence        REAL,
  matched_issue     INTEGER,                   -- github issue number
  draft_path        TEXT,
  published_issue   INTEGER,
  model_version     TEXT,                      -- for regression forensics
  prompt_version    TEXT,
  quarantine_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_sub_state       ON submissions(state);
CREATE INDEX IF NOT EXISTS idx_sub_fingerprint ON submissions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_sub_received    ON submissions(received_at);
CREATE INDEX IF NOT EXISTS idx_sub_body_hash   ON submissions(body_hash);

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
-- DUP_LINKS — which submissions folded into which issue. Drives the
-- escalation ladder: silent → label → comment.
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
