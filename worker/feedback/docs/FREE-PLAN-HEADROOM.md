# Free-plan headroom for a store sync tick

Measured against simulated store responses on the corrected write path (the one
that batches a review with its original and its arrival line). The numbers below
are produced by tests, not by arithmetic: **GP31, GP32, AS26, AS27**. They are
asserted exactly, so a change to the write path has to come past a failing test.

Everything here is measured LOCALLY. What that cannot cover is at the bottom,
and it is the part that actually decides whether this runs on the free plan.

## The limits

| Limit | Free plan | Verified |
|---|---|---|
| D1 queries per Worker invocation | 50 — **every statement in a batch counts** | docs, 2026-09-10 |
| Subrequests per invocation | 50 — "any request a Worker makes using the Fetch API or to Cloudflare services like R2, KV, or D1" | docs, 2026-09-16 |
| CPU per Cron Trigger invocation | 10 ms | docs, 2026-09-10 |
| Cron Triggers per account | 5 | docs, 2026-09-10 |
| D1 rows read / written per day | 5,000,000 / 100,000, reset 00:00 UTC | docs, 2026-09-16 |
| D1 database size | 500 MB (5 GB per account) | docs, 2026-09-16 |

## D1 statements per tick

Three statements are fixed overhead on every run, whatever the page holds:
`loadCheckpoint`, `beginAttempt`, and one of `recordSuccess` / `recordFailure` /
`recordDeferral` / `recordPause`.

| Tick | Per review | Total at 5 reviews a page | Of 50 |
|---|---|---|---|
| Empty page | — | **3** | 6% |
| All reviews unchanged (the steady state) | 3 — look-up, then a batch of 2 | **18** | 36% |
| All reviews brand new | 4 — look-up, then a batch of 3 | **23** | 46% |
| All reviews edited upstream (**worst case**) | 5 — look-up, then a batch of 4 | **28** | 56% |

The margin is made of the page size. At 5 reviews a page the worst case fits
with 22 statements to spare; **9 is the largest page that would still fit**
(`3 + 9 × 5 = 48`). GP31 asserts that, so raising `GOOGLE_PLAY_PAGE_SIZE` past
it fails the suite rather than production.

Batching made the writes atomic; it did not make them cheaper. Statement counts
went DOWN for a new review anyway — from 5 to 4 — because the read-back that
used to sit between the insert and the version row is now only needed when a
concurrent insert wins the race.

**Cross-run cycle detection costs no queries at all.** The pass memory
(`pass_tokens`, `cycle_at`, `last_pass_at`, migration 0012) is columns on writes
that already happen — `recordSuccess` binds three more parameters, and the cycle
path replaces `recordFailure` rather than adding to it. The table above was
re-measured after that change and did not move; GP31 and AS26 assert it.

What it does add is a little CPU and a slightly larger row: one SHA-256 of a
cursor for the token a run starts from and one for the token it ends on — two
short hashes against an RSA signature already in the same tick — and up to
`MAX_PASS_TOKENS` (200) fingerprints of 16 characters written back with the
checkpoint, about 3.8 KB in the worst case.

The cap is why the row cannot grow with the backlog, and it is the reason **a
cycle whose period is longer than 200 pages is not detected**. That limit is
bounded rather than open-ended, and it is not the last line of defence — see
below.

## Subrequests per tick

Outbound HTTP is two per tick, for both stores:

- **Google Play** — mint an access token, fetch one page. The token is minted per
  run and never stored: one subrequest against a live bearer token at rest in D1.
- **App Store** — look the app up by bundle ID, fetch one page. Apple's JWT is
  signed locally and costs nothing.

A cursor the store refuses adds one: the pass restarts from the first page, once
(GP32, AS27).

D1 calls count as subrequests too, and **how a `batch()` counts is not something
this repository can establish.** The two readings bound it:

| Reading | Worst-case tick | Of 50 |
|---|---|---|
| A `batch()` is one request to D1 | 2 fetch + 13 binding calls = **15** | 30% |
| Each statement in a batch is a request | 2 fetch + 28 statements = **30** | 60% |

Both fit, so nothing here depends on resolving it — but the pessimistic reading
is the one to plan with, and under it the page size has less room than the D1
query limit alone suggests.

## Daily volume

A brand-new review writes 3 rows (the review, its original, its arrival line);
an edit writes 2; an unchanged review writes none — the repair statement is a
no-op against the unique index, and the clock UPDATE is not a row insert.

Collection happens in **two cycles a day** — 00:00 and 12:00 Asia/Manila, which
are 16:00 and 04:00 UTC. Each cycle gets a four-hour window of five-minute ticks
(`*/5 4-7,16-19 * * *`), and the rotor alternates stores, so a store has at most
24 ticks per cycle and 48 a day.

**The window is a ceiling, not a schedule.** A store stops being asked the moment
its pass for that cycle is complete, so the tick count above is what a backlog
may use, not what a normal day costs. On a quiet day each store is asked **once
per cycle** — two requests a day.

The trigger still schedules **96 Worker invocations a day**, 48 per window, and
that is a different number from "two collection cycles". Every tick after a
store's pass completes is a **status check**: one D1 query to read the
checkpoint, then nothing — no token minted, no store called, no row written. Up
to 23 per store per cycle, so about 92 such queries a day. Against 100,000 daily
requests and 5,000,000 daily row reads that is noise, but both numbers are true
and only quoting the smaller one would understate what this costs.

| | Per store per day |
|---|---|
| Ticks available | 48 (24 per cycle) |
| Reviews collectable | 240 |
| Requests on a quiet day | **2** |

The arithmetic worst case is 240 reviews a day per store and about 1,440 row
writes across both — **1.4% of the 100,000 daily allowance**. Switching replies
on adds a third phase, which makes it smaller still. Reads are dominated by the per-review look-up: on the
same worst case, well under 0.1% of the 5,000,000 daily allowance.

Storage is not a concern at this volume: each review stores its payload twice
(the row and its first version), a few KB, against 500 MB.

## What this CANNOT verify locally

These are the reasons this document is a starting position and not a clearance.

1. **CPU time, which is the binding limit.** 10 ms per cron invocation, and
   nothing local enforces or measures it. The work that spends it is real —
   an RSA signature per Google run, ECDSA for Apple, plus JSON parsing, hashing
   and a secret scan for every review on the page. `GOOGLE_PLAY_PAGE_SIZE` and
   `APP_STORE_PAGE_SIZE` are 5 because of this, not because of the query
   budget, and the comments in both files say so. **Read the real number from
   the Worker's observability after the first day of live syncing**, before
   anyone raises a page size.
2. **Payload size.** The fixtures are short. Real reviews carry longer bodies,
   more metadata and non-Latin text; every one of those costs hashing and
   scanning CPU, and D1 row bytes.
3. **How Cloudflare bills a `batch()` as a subrequest**, above.
4. **Page fullness.** Google serves a 7-day window and Apple its whole history,
   so the first live pass is a backlog and every tick after it is mostly empty.
   The steady state will sit near the 3-statement row of the table; the worst
   case is the first day.
5. **Whether two cycles a day keep up.** 240 reviews a day per store is far
   above anything this app is likely to receive, but the number that matters is
   reviews per cycle against the 24 ticks a cycle allows. A store that
   consistently needs more than 24 pages would never finish a pass, which shows
   up as a `coverageGapHours` that keeps climbing — see below. The first Apple
   pass is a whole history and may legitimately take several cycles.
6. **Miniflare's D1 is local SQLite.** No network, no timeouts, no contention,
   and `db.batch()` there is not the same code path as D1's. I12b asserts that a
   failed batch rolls back, which holds locally — the production behaviour is
   documented, not tested here.
7. **Daily allowances are account-wide.** The form pipeline, the drain cron and
   the mirror sync share them. The numbers above are the store syncs alone.
8. **The CPU that hashing and the larger checkpoint row cost.** Both are small
   next to the signature each run already makes, and neither can be measured
   here — same limitation as item 1, same place to read it.

## The 200-page limit, and what catches what it does not

A pass remembers 200 cursors, oldest dropped. Two things follow, and both are
tested rather than argued:

**A legitimate backlog longer than 200 pages finishes.** Real cursors are unique
within a pass, so a partial memory cannot match one and cannot cause a reset.
**P7** walks 260 pages one per run — the store cron's shape — and asserts zero
cycles detected and exactly one pass end, at the tail. A false positive here
would be a backlog that restarts for ever and never reaches its last page, which
is why it is tested with a real walk rather than reasoned about.

**A cycle longer than 200 pages escapes the cursor memory, and is still
visible.** Nothing repeats inside the memory, so `cycle_at` is never set and
`/health` reports `state: "ok"` — every request really is working, and the state
says only what is known. What such a sync can never do is FINISH a pass, so:

| Field | A >200-page cycle | Why |
|---|---|---|
| `state` | `ok` | nothing was detected; the state does not guess |
| `lastSuccessHours` | near zero | pages are loading, which is true |
| `lastCompletedPassHours` | `null` | no pass has ever completed |
| **`coverageGapHours`** | **climbs** | measured from when the attempt began |
| **`windowConsumed`** | **climbs past 1** | that gap against Google's 7 days |

`coverageGapHours` is hours since the last completed pass, or — when none has
completed — since the current attempt to get all the way round began
(`pass_started_at`, cleared only by a pass that finishes). **16l** pins the
cycle case and **16m** the more general one: a sync that has never completed a
pass used to report `null` coverage and `null` window indefinitely, with
`state: "ok"`, which is not a signal a monitor can alarm on. The only remaining
null is a sync that has collected nothing at all, where `state` is `never` and
that is the louder signal anyway.

**So the alarm is `windowConsumed >= 1` (Google) or a `coverageGapHours` that
keeps growing — not `state`.** `state` catches the cycles the cursor memory
sees; the coverage gap catches stalled collection whatever the cause.

## Before enabling

Nothing in this document justifies turning a switch on by itself. After the
first live day: read CPU per invocation from observability, compare the real
per-tick statement count against the table, and confirm the daily row writes
against the allowance while the account's other crons are running too.
