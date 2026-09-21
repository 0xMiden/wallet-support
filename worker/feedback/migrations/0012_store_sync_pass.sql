-- 0012 — a pass is a thing with a beginning and an end, and can now say so.
--
-- The paging guard could only ever catch a cursor that pointed at the page it
-- came from. A store answering A -> B and then B -> A defeated it completely:
-- each tick walked a page it had not walked in THAT invocation, so nothing
-- repeated, every tick recorded a success, and the sync collected the same two
-- pages for ever while /health reported `ok` with a fresh last-success time and
-- Google's 7-day window emptied behind it.
--
-- Catching that needs memory ACROSS runs, because one run is one page. These
-- three columns are that memory:
--
--   pass_tokens   the cursors this pass has already held, fingerprinted. A
--                 cursor that comes back while the pass is still open is a
--                 cycle. Cleared when a pass ENDS, which is what makes the
--                 same token legitimate again on the next pass — a re-scan
--                 from the top is supposed to walk the same pages.
--   cycle_at      when paging last went round in a circle. Cleared ONLY by a
--                 pass that reaches the end, so a sync that keeps cycling
--                 cannot look healthy again in between.
--   last_pass_at  when a pass last completed. The honest measure of progress:
--                 a page fetched without error says a request worked, but only
--                 a finished pass says everything the store offered was seen.
--   pass_started_at
--                 when the CURRENT attempt to get all the way round began.
--                 Cleared only by a pass that completes — not by a cycle reset,
--                 not by a refused cursor — so that a sync which never finishes
--                 a pass cannot hide behind a null. Without it, every measure of
--                 coverage is null until a first pass completes, and a sync that
--                 never completes one reports nothing at all, for ever.
ALTER TABLE store_sync_state ADD COLUMN pass_tokens TEXT;
ALTER TABLE store_sync_state ADD COLUMN cycle_at INTEGER;
ALTER TABLE store_sync_state ADD COLUMN last_pass_at INTEGER;
ALTER TABLE store_sync_state ADD COLUMN pass_started_at INTEGER;
