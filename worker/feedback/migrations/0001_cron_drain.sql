-- 0001 — cron drain bookkeeping.
--
-- schema.sql carries these columns for a fresh database; this migration adds
-- them to one already created from the pre-rework schema (CREATE TABLE IF NOT
-- EXISTS will not add columns to an existing table).
--
-- Apply once:
--   npx wrangler d1 execute wallet-support-feedback --remote --file=./migrations/0001_cron_drain.sql
--
-- Not idempotent: SQLite has no ADD COLUMN IF NOT EXISTS, so a second run
-- errors with "duplicate column name". That is a safe failure — it means the
-- migration was already applied.

ALTER TABLE submissions ADD COLUMN attempts        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN next_attempt_at INTEGER;
ALTER TABLE submissions ADD COLUMN claimed_at      INTEGER;
ALTER TABLE submissions ADD COLUMN last_error      TEXT;

CREATE INDEX IF NOT EXISTS idx_sub_pending ON submissions(state, next_attempt_at);
