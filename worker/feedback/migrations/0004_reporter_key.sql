-- Per-reporter publish caps need to know WHO sent a report at publish time.
--
-- install_id was previously used once, at intake, to key the ingest rate
-- limiter, and then discarded. Publishing happens later, in the drain cron,
-- which had no idea who the reporter was — so a per-reporter cap was not
-- expressible at all. This column carries that identity forward.
--
-- HASHED, not raw. The value is sha256 of the same key the ingest limiter
-- uses ("i:<install_id>" or, when the form sends none, "ip:<address>").
-- For install_id — a random UUIDv4 — the hash is a genuine pseudonym. For the
-- IP fallback it is pseudonymisation, not anonymisation: the address space is
-- small enough to enumerate offline. That is still strictly better than
-- storing the address, and no worse than the status quo, since the rate
-- limiter already names its Durable Object after the raw key.
--
-- Nullable: every row written before this migration has no reporter identity
-- and never will. Those rows skip the per-reporter cap and are held only by
-- the global one — see src/pipeline.ts.
ALTER TABLE submissions ADD COLUMN reporter_key TEXT;
CREATE INDEX IF NOT EXISTS idx_sub_reporter ON submissions(reporter_key);
