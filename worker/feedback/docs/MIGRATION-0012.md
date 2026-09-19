# Migration 0012 — `pass_tokens`, `cycle_at`, `last_pass_at`

> **Historical source-service note.** Do not run the account, database, or
> deployment commands below for Miden. Follow [MIDEN-CUTOVER.md](./MIDEN-CUTOVER.md),
> which separates fresh initialization, data migration, and incremental upgrade.

`migrations/0012_store_sync_pass.sql` adds three nullable columns to
`store_sync_state` so that a paging PASS — which spans many runs — can be
recognised as a thing with a beginning and an end.

```sql
ALTER TABLE store_sync_state ADD COLUMN pass_tokens TEXT;
ALTER TABLE store_sync_state ADD COLUMN cycle_at INTEGER;
ALTER TABLE store_sync_state ADD COLUMN last_pass_at INTEGER;
ALTER TABLE store_sync_state ADD COLUMN pass_started_at INTEGER;
```

Additive, nullable, no table rewritten, no index changed, no data touched. As
with 0011, the production table currently holds **no rows at all**: the syncs
have never been switched on.

## Why

A store sync reads one page per invocation, so the guard in `paginate` — a set
of tokens that dies with the invocation — could only ever catch a cursor
pointing at the page it came from. A store answering A → B and then B → A
defeated it completely: every tick walked a page it had not walked in *that*
run, every request succeeded, and the sync collected the same two pages
indefinitely while `/health` reported `ok` with a fresh last-success time and
Google's 7-day window emptied behind it.

| Column | Written by | Cleared by | Meaning |
|---|---|---|---|
| `pass_tokens` | `recordSuccess` | a completed pass | Fingerprints of the cursors this pass has already held, capped at 200, oldest dropped. A cursor coming back while the pass is open is a cycle. |
| `cycle_at` | `recordCycle` | **a completed pass only** | When paging last went round in a circle. A page fetched without error does not clear it. |
| `last_pass_at` | `recordSuccess`, when the pass ends | — | When a pass last reached the end of the source. The progress measure a stuck loop cannot refresh. |
| `pass_started_at` | `recordSuccess`, when a pass opens | a completed pass only | When the current attempt to get all the way round began. Not cleared by a cycle reset or a refused cursor, because neither of those got round either. |

The clearing rule is the whole design. Re-walking the same pages on a *later*
pass is not a fault — it is what a pass over a 7-day window is for — so the
memory empties when a pass finishes, and the same token is ordinary again.

`pass_started_at` exists because the cursor memory is bounded and therefore not
the last line of defence. A cycle longer than 200 pages is never detected, and a
first backlog that never ends is not a cycle at all; in both, no pass completes,
so every coverage measure was null and `/health` said `ok`. Anchoring on when
the attempt BEGAN means those two cases report a coverage gap that climbs.
See `docs/FREE-PLAN-HEADROOM.md`.

## Compatibility with the code that is deployed right now

Production is `0e6665b2`, from master `486108e`, and is forward-compatible for
the same three reasons 0011 is: `loadCheckpoint` uses `SELECT *` and assigns to
a TypeScript interface that ignores extra properties; every write names its
columns explicitly, so nothing is positional; and the console's only other read
names its column. Applying 0012 before the Worker that uses it changes nothing
about the running Worker.

Deploying the new code without the migration is what breaks, and identically to
0011: a sync tick would throw where it means to record a pass — though only if a
sync runs at all, and every store switch is `"false"` — and `/health` would
report `"state": "unavailable"` for both stores rather than failing.

## Deployment order

1. Apply **0011**, then **0012**, to the production D1.
2. Deploy the Worker.

Migrations before the Worker, in number order. Neither has been applied.

## Rollback

No down-migration, and none is needed. Rolling the Worker back to a version that
predates these columns is safe — that code never names them. Leaving three NULLs
on a table with at most one row per store costs nothing.

To clear a recorded cycle by hand, without a deploy:

```sql
UPDATE store_sync_state
   SET cycle_at = NULL, pass_tokens = NULL, cursor = NULL, pass_started_at = NULL
 WHERE key = 'google_play:com.miden.wallet';
```

That starts a fresh pass. A pass that completes does the same thing by itself,
which is the ordinary way out.

## Who applies it

Same as 0011, and worth repeating: **there is no access limitation.** The
wrangler OAuth token on this machine holds `d1 (write)` for the account that
owns `miden-feedback-v2-db`. Applying schema to production is an action Ivan
authorises per action; it is not technically blocked. There is no
`wrangler d1 migrations apply` workflow in this repository, so applying it means:

```
npx wrangler d1 execute miden-feedback-v2-db --remote --file=./migrations/0012_store_sync_pass.sql
```
