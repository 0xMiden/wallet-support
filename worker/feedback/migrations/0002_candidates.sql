-- 0002 — record which issues were offered to the classifier.
--
-- Without it, "why was this not flagged as a duplicate?" is unanswerable: a
-- retrieval miss (the right issue was never shown) and a classifier miss (it
-- was shown and rejected) look identical afterwards.
--
--   npx wrangler d1 execute wallet-support-feedback --remote --file=./migrations/0002_candidates.sql
--
-- Not idempotent: SQLite has no ADD COLUMN IF NOT EXISTS, so a second run
-- errors with "duplicate column name", which means it was already applied.

ALTER TABLE submissions ADD COLUMN candidates TEXT;
