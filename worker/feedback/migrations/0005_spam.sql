-- Spam detection and the review queue need somewhere to record a verdict, and
-- ingest needs somewhere to record the two facts a flood check depends on.
--
-- NOTHING READS THESE COLUMNS YET. This migration is deliberately inert: it
-- lands ahead of the code so the schema is already in place when the flood
-- check (Phase 2) and the classifier gate (Phase 3) arrive, and so a rollback
-- of that code never leaves the table shaped wrong.
--
-- spam_status IS NULL MEANS CLEAN — fail-open, on purpose.
-- The 19 legacy production rows and everything in flight at deploy time have no
-- spam verdict and never will. Failing tight would strand them permanently:
-- every one would sit unpublishable behind a review queue for a judgement no
-- human ever made. The publishing guard therefore treats NULL and 'clean' as
-- the same answer. The cost of that choice is explicit — a row that somehow
-- loses its verdict publishes rather than parks — and it is the right side to
-- err on for a pipeline whose failure mode is losing real user reports.
--
-- spam_score IS TELEMETRY, NEVER A GATE.
-- It exists so a wrong verdict can be argued with after the fact. No code path
-- may branch on it: the decision is made in pipeline.ts from a reason code plus
-- deterministic evidence, never from a threshold on a model's number. The
-- classifier's confidence is already known to be unstable across identical
-- inputs; a score is a debugging aid, not a control.
--
-- spam_reasons HOLDS REASON CODES ONLY, NEVER QUOTED CONTENT.
-- A JSON array drawn from a fixed allowlist. Never the spam text itself:
-- copying attacker-controlled strings into a column that a review page renders
-- is how a junk filter becomes an injection vector.
--
-- reporter_kind IS REQUIRED, NOT COSMETIC.
-- reporter_key (migration 0004) is a sha256 of either "i:<install_id>" or
-- "ip:<addr>", and the two are INDISTINGUISHABLE once hashed. The rules the
-- review layer is built on both depend on telling them apart: repeated
-- submissions count as spam evidence only from the same install_id, and an
-- IP-only match must never be sufficient to confirm spam. Without this column
-- neither is expressible, and the flood check would silently treat a shared
-- NAT egress as one abusive reporter.
ALTER TABLE submissions ADD COLUMN spam_status      TEXT;    -- NULL | clean | suspected | spam
ALTER TABLE submissions ADD COLUMN spam_score       REAL;    -- telemetry ONLY, never a gate
ALTER TABLE submissions ADD COLUMN spam_reasons     TEXT;    -- JSON array of reason CODES
ALTER TABLE submissions ADD COLUMN spam_reviewed_at INTEGER; -- epoch ms of the human decision
ALTER TABLE submissions ADD COLUMN spam_reviewed_by TEXT;    -- verified reviewer identity, not "reviewer"
ALTER TABLE submissions ADD COLUMN normalized_hash  TEXT;    -- flood key; see src/lib/spam-signals.ts
ALTER TABLE submissions ADD COLUMN reporter_kind    TEXT;    -- 'install' | 'ip'

-- The review queue lists by verdict, oldest first, and the overdue check counts
-- unreviewed rows past a deadline. Both filter on exactly this pair.
CREATE INDEX IF NOT EXISTS idx_sub_spam  ON submissions(spam_status, received_at);
-- The flood check counts one reporter's identical submissions inside a window.
-- Column order matches that query: equality on the first two, range on the last.
CREATE INDEX IF NOT EXISTS idx_sub_flood ON submissions(reporter_key, normalized_hash, received_at);
