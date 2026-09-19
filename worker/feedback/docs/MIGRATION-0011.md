# Migration 0011 — `defer_until`, `paused_at`, `paused_reason`

> **Historical source-service note.** Do not run the account, database, or
> deployment commands below for Miden. Follow [MIDEN-CUTOVER.md](./MIDEN-CUTOVER.md),
> which separates fresh initialization, data migration, and incremental upgrade.

`migrations/0011_store_sync_defer_pause.sql` adds three nullable columns to
`store_sync_state`, so a sync can be WAITING or PAUSED rather than only failing.

```sql
ALTER TABLE store_sync_state ADD COLUMN defer_until INTEGER;
ALTER TABLE store_sync_state ADD COLUMN paused_at INTEGER;
ALTER TABLE store_sync_state ADD COLUMN paused_reason TEXT;
```

No table is rewritten, no index changes, no data is touched. On the production
database it is three `ALTER TABLE ... ADD COLUMN` statements against a table
that currently holds **no rows at all** — the syncs have never been switched on.

## What each column is for

| Column | Written by | Cleared by | Meaning |
|---|---|---|---|
| `defer_until` | `recordDeferral` | a successful run | The store asked us to come back later (429, or one of Google's quota-flavoured 403s). `isDue` refuses until this time. Set from `Retry-After`, floored at 1 min, capped at 1 h. |
| `paused_at` | `recordPause` | a successful run ONLY | A credential was refused (401/403, or `invalid_grant` at Google's token endpoint). The five-minute cadence stops; one probe runs per hour. |
| `paused_reason` | `recordPause` | a successful run ONLY | The same text as `last_error`: fixed wording, an HTTP status, and a shape-checked machine code. Never a key, an ID or upstream prose. |

## Compatibility with the code that is deployed right now

Production is version `0e6665b2`, built from master `486108e`. That code is
**forward-compatible with this migration**, and the reasoning is not "additive
migrations are usually fine" — it is these three facts:

1. `loadCheckpoint` does `SELECT * FROM store_sync_state WHERE key = ?` and
   assigns the row to a TypeScript interface. Extra columns arrive as extra
   object properties and are never read. TypeScript checks nothing at runtime.
2. Every write in the deployed code — `beginAttempt`, `recordSuccess`,
   `recordFailure` — names its columns explicitly. None is positional, so an
   added column cannot shift a binding.
3. The only other reader is the admin console's
   `SELECT MAX(last_success_at) ... WHERE key LIKE ?`, which names its column.

So applying 0011 to production **before** the new Worker ships changes nothing
about how the running Worker behaves.

The reverse order is what breaks. New code calls `recordDeferral` and
`recordPause`, which write columns that would not exist, and `syncHealth`
selects them by name. Both would fail:

- a sync tick would throw where it means to record a pause — but only if a sync
  runs at all, and every store switch is `"false"`, so none does;
- once the follow-up PR that adds per-store status to `/health` is also
  deployed, that block would report `"state": "unavailable"` for both stores.
  It catches the failure deliberately and keeps answering 200, because it is
  the uptime endpoint (test 16i).

That is the whole blast radius of getting the order wrong today, with every
switch off: nothing a sync does, and at worst a wrong-looking `/health` block.
It becomes a real failure the moment a switch is turned on, which is why the
order below is not optional at that point.

## Deployment order

1. Apply migration 0011 to the production D1.
2. Deploy the Worker (`npm run deploy`, from a clean checkout — never `--name`).

Step 1 before step 2, every time. This is the rule migration 0010 already
established and it has not changed.

**Sample reviews are not part of this.** The eight sample rows in production D1
stay where they are. Removing them is a precondition for turning a switch ON —
sync, replies or handoff — not for shipping a migration and a Worker whose
switches are all `"false"`.

## Rollback

There is no down-migration and none is needed.

- **Rolling back the Worker** to `cf2b25c9` (commit `022ed40`) with the columns
  present is safe, by exactly the three facts above: the old code never names
  them. Nothing has to be undone in the database first.
- **Rolling back the database** is not something to do. D1 supports
  `ALTER TABLE ... DROP COLUMN`, but dropping these would break the deployed new
  code, and leaving them costs nothing: three NULLs on a table with at most one
  row per store.
- **Undoing a pause or a wait** without any deploy: clear the columns for that
  source. This is the operational lever, and it is the whole recovery procedure
  if the classification ever gets something wrong.

  ```sql
  UPDATE store_sync_state
     SET paused_at = NULL, paused_reason = NULL, defer_until = NULL
   WHERE key = 'google_play:com.miden.wallet';
  ```

  A successful run does the same thing by itself, and a rotated key is picked up
  within the hour without touching the database at all.

## Who applies it

There is **no access limitation**. The wrangler OAuth token on this machine
holds `d1 (write)` for the account that owns `miden-feedback-v2-db`, so the
agent can run the migration. It has not been run, and will not be, because
applying schema to production is a deploy-shaped action that Ivan authorises
per action — not because it is technically blocked.

Note that this repository has no `wrangler d1 migrations apply` workflow: there
is no `migrations_dir` in `wrangler.jsonc` (the `migrations` key there is for
Durable Object classes), and `npm run db:init` runs `schema.sql` whole, which is
for a FRESH database and must never be pointed at production. Applying 0011 to
production means running its statements directly:

```
npx wrangler d1 execute miden-feedback-v2-db --remote --file=./migrations/0011_store_sync_defer_pause.sql
```

`scripts/validate-migrations.py` proves that replaying every migration in order
reproduces `schema.sql`, and `scripts/check-schema-drift.py` proves 0011 and
`schema.sql` agree on all 12 tables. Both run in CI.
