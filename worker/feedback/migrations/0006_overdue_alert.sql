-- Which overdue tier a suspected report has already been alerted about.
--
-- The first design tracked a single high-water cursor per tier in sync_state:
-- the newest "waiting since" timestamp already alerted on. It is wrong, and
-- the way it is wrong is silent.
--
-- Rows do NOT become suspected in the order they arrived. A report can sit in
-- `deferred` for days -- a classifier outage, a publish cap, a retry backoff --
-- and only then be flagged. Its clock starts at its RECEIPT, which may be far
-- older than the cursor, so a high-water mark skips it and it is never alerted
-- about at all. The failure mode is exactly the one this feature exists to
-- prevent: a real report sitting unreviewed with nothing announcing it.
--
-- Per-row state cannot be skipped by anything. NULL means never alerted;
-- 'warn' means the first tier fired; 'escalate' means both have.
--
-- Cleared on restore, in the same statement that moves the state, so a report
-- brought back for a second look starts a fresh review clock rather than
-- inheriting a verdict about a decision that has since been reversed.
ALTER TABLE submissions ADD COLUMN overdue_alert_tier TEXT;  -- NULL | warn | escalate

-- The alert query filters on exactly this triple.
CREATE INDEX IF NOT EXISTS idx_sub_overdue
  ON submissions(state, overdue_alert_tier, spam_reviewed_at);
