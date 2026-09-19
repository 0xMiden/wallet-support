-- 0011 — a sync can now be WAITING or PAUSED, not only failing.
--
-- store_sync_state could say "the last run failed, N times in a row" and
-- nothing else, so two very different situations were handled identically:
--
--   * Rate limited. The store asked us to come back later. Counting that as a
--     failure doubles the backoff and, worse, the next tick asks again
--     immediately if the counter is left alone — the very thing the store said
--     not to do.
--   * A credential refused. A revoked key or a role removed from the account
--     never recovers by being retried, so the old behaviour was one request per
--     tick, for ever, against an endpoint that will answer 401 to every one.
--
-- Three typed columns rather than a JSON blob, for the reason checkpoint.ts
-- already gives for last_success_at: the checks are queries against them, and
-- /health reads them on every request.
ALTER TABLE store_sync_state ADD COLUMN defer_until INTEGER;
ALTER TABLE store_sync_state ADD COLUMN paused_at INTEGER;
ALTER TABLE store_sync_state ADD COLUMN paused_reason TEXT;
