# When the stores are actually contacted

Collection runs in **two cycles a day**: 00:00 and 12:00 in Asia/Manila, which
are 16:00 and 04:00 UTC. Manila is UTC+8 all year, so there is no daylight
saving for the two to drift apart on.

It replaced a cron that ran every five minutes, all day, giving each store a
tick every ten minutes — 144 a day per store, whether or not there was anything
to collect.

## A cycle, not a clock

A **cycle** is a clock fact, not a stored one: `cycleStart(now)` is the most
recent 04:00 or 16:00 UTC. Nothing is written to open a cycle and nothing has to
be cleared to close one.

A source is finished for the cycle once it has **completed a pass** in it —
`last_pass_at`, which only a pass reaching the end of the source ever moves. So:

- a store with nothing new is asked **once** and then left alone until the next
  cycle;
- a store with a backlog is asked again every tick until its pass is done;
- a pass that does not finish inside its window keeps its cursor and **resumes**
  in the next cycle, from where it stopped.

That last point is also why a second PASS can never open beside an existing one.
There is no "start a cycle" write to race and no flag an invocation can leave
set; two ticks in the same window compute the same answer, and a source that has
not finished simply continues the one pass it already has (GP35).

## Two invocations at once — which the clock does NOT prevent

The paragraph above is about passes, not about invocations, and it would be a
mistake to read it as covering both. Cloudflare can deliver a tick while the
previous one is still running, and a retry is another. Both read the same
cursor, both fetch the same page, and both try to write.

The reviews survive that — `upsertReview` is idempotent, and C4 checks that two
runs collecting the same review produce one row and one stored original. The
**checkpoint** does not survive it on its own:

| Interleaving | What it would do | Test |
|---|---|---|
| A slow run finishes after two newer ones | Stores the successor of the cursor IT read: the pass walks **backwards** and re-reads pages already stored | C1 |
| A slow run finishes after another completes the pass | **Reopens** a finished pass, leaving a live cursor on it and restarting the coverage clock | C2 |
| A slow run stores the pass memory it read | Drops the fingerprints newer runs added, **weakening cycle detection** for the rest of the pass | C3 |
| A slow run fails after a newer one succeeded | Counts a failure against a sync that is working, and parks the cursor on its own page | C5 |

It takes **two** things to make that safe, and it is worth separating them
because guarding the write alone is not enough.

**1. The claim decides what a run may finish.** Every run claims the row in
`beginAttempt` (`run_id`, migration 0013), and every checkpoint write carries
`WHERE run_id = ?`. Newest wins, because the newest run read the freshest
cursor; the loser discards its checkpoint write and nothing else, since what it
collected is already stored. A claim is *replaced rather than released*, so it
needs no expiry and cannot get stuck — a run that dies mid-flight holds nothing.

**2. The claim also decides what a run starts from.** A run reads the checkpoint
*before* it claims anything, and another run can take the pass forward, or
finish it, in between. The late claim is then perfectly valid — it is the newest
— so the write guard would let it through, and the run would store the successor
of a cursor that has moved on. Nothing about the write is stale there; the read
was.

So `beginAttempt` **returns the row it claimed**, in the same statement, and the
run walks from that rather than from what it read. The earlier read is used for
one thing only: deciding whether to bother claiming at all. **C6** covers a run
that reads, waits while two others advance the pass, and then claims — it asks
for the cursor it owns, not the one it read. **C7** covers the same ordering
where the other run *completes* the pass: the claimed row says the cycle is
done, so the late run stops instead of opening a fresh pass inside it.

One hold is re-read after claiming and the rest are not, which is deliberate:
only "another run finished the pass" would be *wrong* to proceed through.
Backoff cannot be re-read, because the claim stamps `last_attempt_at` and a
backoff measured against a run's own stamp would hold every time; a paused
sync's hourly probe is the same trap, decided before the claim and cancelled by
re-reading it afterwards. A pause or deferral imposed in between costs one
wasted request and then records the same answer — nothing is corrupted, so
nothing needs guarding.

**None of this costs a query.** The claim *is* `beginAttempt`, the statement
that already ran on every working tick; it now returns its row as well. A tick
whose pass is already complete for the cycle never claims at all — it costs the
one look-up described above. GP31 pins both: 3 statements for a working tick
that writes nothing, 1 for a status check.

## Two cycles, ninety-six invocations

These are different numbers and it is worth being plain about both.

| | Per day |
|---|---|
| Collection **cycles** | **2** — 00:00 and 12:00 Manila |
| Worker **invocations** the trigger schedules | **96** — 48 per window |
| Invocations that reach a given store | 48 (24 per cycle) |
| Invocations that **contact a store**, on a quiet day | **2** — one per store per cycle |

The cron fires every five minutes through each window whatever is happening;
the rotor gives every other tick to each store. What changes is what a tick
*does*. Once a store's pass for the cycle is complete, every remaining tick for
that store is a **status check**: `loadCheckpoint`, one D1 query, then nothing.
No token is minted, no store is called, no row is written.

**What the status checks cost.** Up to 23 per store per cycle — 92 D1 queries
and, with the ticks that do work, 96 Worker invocations a day. Against the free
plan's 100,000 daily requests and 5,000,000 daily row reads, that is noise; it
is written down because "96 scheduled invocations" and "two collection cycles"
are both true and describing only the first would overstate what this costs,
while describing only the second would hide it.

It could be cheaper — the gate could be computed without reading the row — but a
query is the honest way to ask "has this store finished its pass", and making it
cheaper would mean keeping that answer somewhere it could go stale.

## The window is a ceiling, and a pass may outlast it

`STORE_CRON` is `*/5 4-7,16-19 * * *` — five-minute ticks through four hours
after each cycle opens. That window exists so a backlog can be walked page by
page, because **one page per invocation is what the free plan's 50 queries
allow**; it is not a plan to make 48 requests.

**A PASS IS NOT GUARANTEED TO FINISH IN ONE CYCLE.** Twenty-four ticks is 120
reviews per store per cycle, and a backlog larger than that carries on in the
next window, from the cursor it stopped at. The first App Store pass is that
app's entire review history and may legitimately take several cycles; Google's
is at most the last seven days.

An unfinished pass is not a fault, and it is not reported as one — but it is not
reported as finished either. `lastCompletedPassHours` stays null and
`coverageGapHours` keeps counting from when the attempt began, through the quiet
hours between windows as well as the busy ones, because the reviews are ageing
either way. A pass that never finishes is exactly what that number is for
(16n).

| | Per store |
|---|---|
| Ticks available per cycle | 24 |
| Reviews collectable per cycle | 120 |
| Requests on a quiet day | **1 per cycle** |

Every tick after a store's pass completes costs a single query to discover there
is nothing to do, and contacts nobody.

## What it costs to get wrong

Google Play serves only the last 7 days. Two cycles a day is 14 chances to
collect a review before it ages out of the API for good, and each cycle can take
120 reviews per store — far more than this app will receive. But the number to
watch is not the ceiling, it is whether passes are actually completing:
`/health` reports `coverageGapHours` per store, and `windowConsumed` for Google
Play, both measured from the last **completed pass**. A store that cannot finish
a pass within a cycle will show those climbing (`docs/FREE-PLAN-HEADROOM.md`).

## Changing it

`STORE_CRON` in `src/crons.ts` and `triggers.crons` in `wrangler.jsonc` must
match character for character — test GP14 compares the two sets, and a trigger
with no matching constant silently never runs.

The cycle times themselves are `CYCLE_OFFSET_MS` and `CYCLE_PERIOD_MS` in
`src/store/checkpoint.ts`. **The cron windows have to open at the cycle starts.**
GP33 pins both halves together: if you move one, that test fails until you move
the other, because a tick that fires in a cycle its window does not belong to
would collect nothing and look like a healthy quiet day.
