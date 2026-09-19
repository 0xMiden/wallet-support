# Migration 0013 — `run_id`

> **Historical source-service note.** Do not run the account, database, or
> deployment commands below for Miden. Follow [MIDEN-CUTOVER.md](./MIDEN-CUTOVER.md),
> which separates fresh initialization, data migration, and incremental upgrade.

```sql
ALTER TABLE store_sync_state ADD COLUMN run_id TEXT;
```

One nullable column. Additive, no table rewritten, no index changed, no data
touched, and the production table still holds no rows: the syncs have never been
switched on.

## Why

A collection cycle is derived from the clock, which means a second **pass** can
never open beside an existing one. That says nothing about two **invocations**
running at the same time, which Cloudflare can deliver: a cron tick that runs
long is still running when the next fires, and a retry is another.

The reviews survive it — `upsertReview` is idempotent. The checkpoint did not:

- a slow run finishing after two newer ones would store the successor of the
  cursor *it* read, walking the pass backwards over pages already stored;
- it would store the pass memory as it was when it read the row, dropping the
  fingerprints the newer runs had added and weakening cycle detection;
- a run that read a mid-pass cursor could store it after another had *completed*
  the pass, reopening a finished pass and restarting the coverage clock;
- a stale failure could count against a sync that was, by then, working.

Each of those is a test: C1, C3, C2 and C5 in `test/store-ingest.test.ts`, with
C6 and C7 for the ordering where the claim comes *after* the other run. They all
fail with the mechanism removed, which is how they were checked — a concurrency
test that passes either way proves nothing.

## How it works

`beginAttempt` writes a fresh `run_id` for the run that is starting **and
returns the row it claimed**. Both halves matter:

- Every checkpoint write after it — success, failure, deferral, pause, cycle —
  carries `WHERE store_sync_state.run_id = ?`, so it applies only while that
  claim stands. That decides what a run may **finish**.
- The run then works from the returned row rather than from the read it did
  before claiming. That decides what a run **starts from**, and it is the half
  a write guard cannot cover: a run that reads, waits while another finishes the
  pass, and only then claims holds a perfectly valid claim, so its write would
  be accepted — it is the *read* that was stale, not the write. C6 and C7.

**Newest wins**, deliberately: the newest run is the one that read the freshest
cursor. A run that has been overtaken discards its checkpoint write and nothing
else, because what it collected is already stored.

A claim is **replaced rather than released**, so it needs no expiry and cannot
get stuck. A run that dies mid-flight holds nothing; the next tick claims the
row the way any run does.

## Compatibility with the code that is deployed

Production is `0e6665b2`, and is forward-compatible for the same reasons 0011
and 0012 are: `loadCheckpoint` uses `SELECT *` into an interface that ignores
extra properties, and every write names its columns explicitly, so nothing is
positional.

Deploying the new code without the migration is what breaks — `beginAttempt`
would name a column that does not exist — and with every switch off, no sync
runs to hit it.

## Cost

None. The claim is `beginAttempt`, the statement that already ran on every
working tick; it now sets one more column and returns its row. A tick whose pass
is already complete for the cycle never claims — it costs the single look-up it
always did. GP31 asserts both.

## Deployment order

1. **0011**, then **0012**, then **0013**, on the production D1.
2. Deploy the Worker.

Migrations before the Worker, in number order. None of the three has been
applied.

## Rollback

No down-migration, and none needed. Older code never names the column; a single
NULL on a table with at most one row per store costs nothing.

There is nothing to clear by hand: a claim is only meaningful between one run's
`beginAttempt` and its checkpoint write, and the next run replaces it.
