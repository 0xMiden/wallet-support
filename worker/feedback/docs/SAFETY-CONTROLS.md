# Safety controls

This service files GitHub issues automatically, with no human in the loop.
That is the requirement. These are the controls that make it survivable.

None of them add a human approval step. All of them are automatic.

---

## 0. Ingress — what actually gates `/submit`

This is a **public web form**. Anyone can open it, read its source, and replay
its requests. Three controls stand between that and the pipeline, in this
order:

1. **Turnstile — the ingress control.** Every submission carries a token that
   the Worker verifies server-side against Cloudflare with `TURNSTILE_SECRET`,
   which lives only on the Worker. A request without a valid token is rejected
   with 403 before it touches the database. This is the gate.

   The widget type is **Managed** (confirmed against the live dashboard
   2026-08-17: `mode = managed`). Do not change the type. Invisible mode
   carries a condition — Cloudflare requires their Turnstile Privacy Addendum
   to be referenced in our own privacy policy — which is why it was rejected on
   2026-08-13.

   The "Success!" card is **no longer shown** (2026-08-17). That is
   `appearance: 'interaction-only'` on the `turnstile.render()` call, which
   changes only *when* the widget is drawn, never the widget type — so the
   Privacy Addendum condition above does not attach. Visitors Managed mode
   clears silently see nothing; visitors it wants to challenge get the checkbox
   automatically.

   **Never hide the widget with CSS instead.** Managed mode is adaptive, so a
   real share of visitors are asked to interact. `display:none` leaves those
   people staring at "Complete the verification check above" with nothing to
   complete, and they cannot report the fault because the form *is* the
   reporting channel. It also will not show up in testing: whoever is testing
   almost certainly gets the silent auto-pass, so the broken path is invisible
   to them. Verified 2026-08-17 in a real browser against the production key —
   see §0.1a.
2. **Rate limiter.** A durable object, `RATE_LIMIT_PER_HOUR` (currently **20**)
   per hour per install id, falling back to IP when no install id is present.
   Sliding window; only submissions that passed Turnstile are counted.
   Bounds a reporter who passes Turnstile and then floods.

   Be honest about its strength: the install id comes from the client's own
   localStorage, so clearing one key resets the bucket. This bounds casual
   flooding, not a determined abuser. Turnstile is the gate, and the
   `PublishGate` caps in §3 are the hard ceiling on what can reach GitHub.
3. **Secret-scan quarantine.** Runs before anything is stored, on the raw body.
   See §5 — it is a data-safety control, not an anti-abuse one.

**HMAC is NOT an ingress control, and must not be described as one.** The form
signs a canonical subset of each submission, and the Worker verifies that
signature *only when it is present*. The key ships inside the client bundle —
the wallet is distributed as an extension and a mobile app, so anything in the
bundle is extractable — which means anyone can sign anything. Requiring a
signature would stop no attacker while reading like authentication to the next
reviewer. It is kept for one narrow purpose: a *wrong* signature indicates a
broken or forked client, so it is worth surfacing as 401. An absent signature
is normal and accepted.

If ingest ever needs real authentication, it needs a credential the client
does not hold. Do not promote the HMAC back to a requirement.

### 0.1a Re-arming the widget — why it is not `reset()`

A Turnstile token is single-use, so the widget must be re-armed after every
send. The form does that with `window.tsRearm()`, which **removes and
re-renders** rather than calling `turnstile.reset()`.

The reason is specific to interaction-only. There is a reported failure where a
widget that was never shown on its first execution stays hidden after `reset()`
even when the new execution *does* require interaction. This form re-arms on
both the success path and the error path, so if that bug is real it strands
anyone filing a second report — silently, and again with no way to tell us. We
could not reproduce it: Cloudflare's test keys are deterministic, so "passed
first, challenged second" is not constructible. A fresh render evaluates
appearance from nothing, so the stale state cannot carry over at all. That
makes reproducing it unnecessary rather than merely unresolved.

**Do not simplify this back to `reset()`** without first constructing that
scenario for real.

Verified 2026-08-17 in headless Chromium against `localhost` (an allowed
domain on the site key), using Cloudflare's test keys plus the production key:

| Case | Expected | Result |
|---|---|---|
| Auto-pass visitor (`1x…AA`) | hidden, token still issued | ✅ height 0, token issued |
| Challenged visitor (`3x…FF`) | widget shows itself | ✅ height 72 |
| Challenged → `tsRearm()` | still visible, new widget id | ✅ no stacking |
| Auto-pass → `tsRearm()` | fresh token, still hidden | ✅ |
| Production key (`0x4AAA…Ql`) | challenged here; re-arms cleanly | ✅ no error |

Reproduce with `python3 -m http.server` in `public/` and the page's own
`?tskey=` override. Headless Chromium is reliably challenged by the production
key, which makes it a usable stand-in for an at-risk visitor.

## 1. Credential

**Classic token, scope `public_repo` and nothing else.**

- `0xMiden/wallet` is public, so this is sufficient for issues, comments,
  and labels.
- No organization approval at creation or renewal.
- **No access to any private repository.** This is the control that matters:
  the service processes anonymous, attacker-controlled text, and the May 2025
  GitHub MCP disclosure showed exactly what happens when a process in that
  position holds a credential that can reach private data
  (https://invariantlabs.ai/blog/mcp-github-vulnerability).

Never substitute a broader scope. `repo` reaches every private repository the
account can see and defeats the entire control. Set a 90-day expiry.

Token settings: https://github.com/settings/tokens

Stored as a Worker secret: `wrangler secret put GITHUB_WRITE_TOKEN`.
Never in the wallet bundle, never in git, never in a client-reachable config.

## 2. Kill switch

`PUBLISH_ENABLED = "false"` in `wrangler.jsonc`, then `wrangler deploy`.

Every GitHub write stops within seconds — new issues, and the labels and
rolling comments that duplicates would otherwise produce. Ingest, secret
scanning, dedup and storage keep running: folds are still recorded in D1, so
nothing is lost and the comment appears on the next fold once writes resume.

That completeness is not free. The `PublishGate` guards only new-issue
creation, and folds never reach it — until 2026-08-13 a third duplicate would
have commented on someone else's issue with the kill switch off. `foldIntoIssue`
now checks `PUBLISH_ENABLED` directly, as an env var rather than through the
gate, so suppressing a comment still consumes no cap budget. Any future GitHub
write added outside the gate needs the same check.

Test this before launch, not during an incident.

Current consumption is visible at `GET /health`.

## 3. Volume caps

Two scopes, both served by the `PublishGate` durable object, told apart by the
object's name.

| Scope | Cap | What it is for |
|---|---|---|
| **Global** (`global`) | `CAP_PER_HOUR = 200`, `CAP_PER_DAY = 800` | The circuit breaker. Everything the service creates, from everyone. |
| **Per reporter** (`r:<reporter_key>`) | `REPORTER_CAP_PER_HOUR = 20`, `REPORTER_CAP_PER_DAY = 50` | Fairness between honest reporters. |

Both windows are **rolling**, not calendar: the gate keeps write timestamps and
filters on `now - t`, so budget frees up continuously rather than resetting at
the top of the hour or at midnight.

**The global scope is the only one that is an abuse control.** `reporter_key`
is a hash of the client-supplied `install_id` — a UUID the browser generates
and can clear at will — so anyone determined to flood just rotates it. The
per-reporter cap stops one honest reporter from monopolising the budget; it
stops nothing else. Per-reporter caps also have no ceiling in aggregate: 100
reporters at 20/hour is 2,000/hour, roughly 4× GitHub's ~500/hour secondary
limit, and crossing that throttles the *account* the write token belongs to —
at which point nothing files for anybody.

Sizing: 200 new issues/hour is ~200 content-creating GitHub requests/hour.
Labels travel inside the same `POST /issues` body (`addLabels` exists but is
not on the publish path), so an issue costs one request, not two; a report
carrying an attachment adds one upload. That leaves real headroom under
GitHub's ~80/min and ~500/hr secondary limits. The drain can physically move
only 5 reports/minute — 300/hour — so at 200/hour the cap binds first, which
is the correct ordering: the limit should be a decision, not an accident.

The daily stays 4× the hourly, deliberately: at parity, or even at 2.5×, a
couple of sustained busy hours exhaust the day and every later report crawls.

- Only **new issue creation** consumes budget. Folding a duplicate into an
  existing issue does not, and is never capped.
- The gates are checked **reporter first, then global**. Both consume a slot
  when they allow, so the order decides whose budget is spent on a write that
  then does not happen. A reporter over quota — the everyday case — returns
  without touching the global counter. The reverse order burned a global slot
  on every throttled reporter.
- Hitting a cap **defers**, it does not drop. The row stays in D1 in state
  `capped` and the drain returns to it at the gate's own `resetAt` — the
  moment the window actually clears — bounded to at most `CAP_DEFER_MS`
  (15 min) so a *daily* cap cannot park a row for 20 hours past a config
  change made to free it. A cap costs no retry budget: `attempts` is restored
  when the row is deferred, so backpressure can never park a report as
  `failed`.
- The form shows a capped report as **Queued**, not `Received`. Those were one
  pill until 2026-08-20, so a 45-second wait and a 65-minute one looked
  identical — and identical to a failure.

**History.** These were `1/hour, 3/day` in production until 2026-08-20, while
this document already described 200/800. The throttle was deliberate and the
drift was not: a genuine report waited 65 minutes behind one filed six minutes
earlier, showing nothing but "Received" throughout. Config and document now
agree.

## 4. Where a matched report goes

Two inputs: how confident the match is, and whether the issue is still open.

| Confidence | Issue | Action | Writes on an issue we don't own? |
|---|---|---|---|
| ≥ `AUTO_ACTION_THRESHOLD` (0.85) | **open** | Comment on it, from the **first** match — one comment, **edited in place** thereafter, carrying each report's text | **yes** |
| ≥ `AUTO_ACTION_THRESHOLD` | **closed** | New issue with a real `#N` cross-reference: *"Possibly related to #N, which was previously closed."* | a timeline event only |
| `REVIEW_THRESHOLD`–`AUTO_ACTION_THRESHOLD` (0.60–0.85) | either | New issue, match named in **plain text** — never `#N` | no |
| < `REVIEW_THRESHOLD` | — | New issue, no mention | no |

**One row in that table writes on someone else's issue**, and it needs both
high confidence and an open target. Everything else becomes its own issue,
because the two mistakes cost differently: a duplicate issue takes a maintainer
seconds to close, while a wrong comment lands on their thread with no clean
undo. When there is no data on how well-calibrated the classifier is — and on
2026-08-20 there was none, the dedup path having matched exactly once in 22
classified submissions — prefer the mistake that is cheaper to reverse.

The plain-text form is deliberate, not cosmetic. A `#N` reference puts a
"referenced this issue" event on the other issue's timeline; below the
authorisation threshold the match has not earned that mark, and a
cross-reference would be the same unearned assertion by a quieter route. A
maintainer still reads the number.

`AUTO_ACTION_THRESHOLD` is its own variable rather than a reused
`DUP_THRESHOLD`, so "we think this is a duplicate" and "we may act on that in
public" can move independently. Lower it once there is evidence about how often
a 0.70 match is genuinely the same defect.

The comment quotes each attached report and its match confidence. That is the
only place a maintainer can audit a dedup decision: without the words, a wrong
match is invisible on GitHub and the reporter's text exists solely in D1. It
also gives them a way to object — the comment says plainly that the match was
automatic and can be split out.

**`dup_links` is written only after GitHub confirms the comment.** The row is
the record of a completed write, and `/status` reads it to tell a reporter
"added to existing issue #N". Written first — as it was until 2026-08-20 — that
claim went true before the comment existed and stayed true if it never
happened: a 403, a rate limit, or the kill switch left a reporter told their
report had been merged into an issue that had never heard of it. For the same
reason the kill switch now **defers** an attach instead of completing it
silently; previously the report went terminal and its text surfaced only if
some later report happened to attach to the same issue.

Commenting on the first fold is not noisier than waiting for a third: GitHub
notifies on a new comment but not on an edit, so an issue that collects twenty
duplicates still produces exactly one notification. Waiting only decided how
long the form's "merged into an existing report" went uncorroborated on GitHub.

A closed match is deliberately **not** folded. The report may mean the defect
was not fully resolved, that it has returned, or simply that the reporter's
build predates the change — and the form cannot tell which, because it has no
reporter version to compare against (`wallet_version` is populated only when
the wallet embeds the form, and is NULL on every submission received so far).
The issue body therefore asserts no fix: routing keys on `state` alone, and a
close can be `not planned` as readily as `completed`. All three readings need a
maintainer, and a comment on a closed issue reaches nobody. The closed issue is
never reopened: reopening is a maintainer's judgement, and the cross-reference
puts the new issue on its timeline either way.

The form's own history list reads `dup_links` — "was this report commented onto
that issue" — never `matched_issue`. They diverge on exactly this path, and
reading the wrong one tells a reporter their report was merged when it is
queued for an issue of its own.

Closed matches are the one duplicate path that consumes cap budget, because
they create an issue. The caps in §3 bound it exactly as they bound any other
new issue.

The former label rung (`triage:auto-deduped`, `recurring`) went with the
reduction to a single label on 2026-08-13. Recurrence is still visible — the
rolling comment states the count — but it is no longer filterable from the
issue list. Restoring `recurring` alone would bring that back at the cost of a
second label.

Twenty duplicate reports become one comment edited twenty times. This is the
difference between an automation the team tolerates and one they ask you to
switch off.

## 5. Secret scanning

Runs before anything is stored, let alone published. Detects BIP-39-shaped
sequences (12/15/18/21/24 words), hex key material, labelled secrets, and
GitHub token formats. A hit quarantines the submission and returns 202 —
deliberately indistinguishable from success, so an attacker learns nothing
and a legitimate user is not alarmed.

**Attachments are published to GitHub.** Images and MP4 render inline in the
issue. A durable copy is kept in R2 first, so a file can be revoked from your
own storage and old links repointed if GitHub's endpoint changes.

The residual risk is accepted deliberately and mitigated at the point of
entry, not after: the form carries a prominent warning above the description
field, and a second reminder directly under the file picker. Automated
scanning cannot see inside an image or a video, so **the user's own check is
the control** for attachment content.

Two things follow:

- Keep both warnings in the form. They are load-bearing, not decoration.
- If a leaked file is reported, delete the R2 object **and** edit the GitHub
  issue. GitHub-hosted attachments cannot be revoked by deleting the R2 copy.

Adding OCR on images and frame-sampled OCR on video would move this from a
user-side control to a system-side one. Worth doing eventually; not a blocker.

## 6. Classification never publishes blind

If both LLM providers are unavailable, the submission is **retried**, not
published unclassified. Publishing without dedup is how one bug becomes
fifteen issues.

Low-confidence matches fold into the candidate issue rather than creating a
new one: a misplaced comment is recoverable, a duplicate issue is maintainer
noise someone must triage and close.

## 7. The model holds nothing

Non-negotiable. The model receives candidates and untrusted text and returns
JSON. `validateVerdict` rejects hallucinated issue numbers and off-allowlist
labels. Deterministic code performs every write.

A successful prompt injection can therefore do exactly one thing: misclassify
a report. It cannot cause an API call, because none is available to it.

## 8. Idempotency — three layers

1. `submission_id` unique constraint in D1.
2. State machine: `publishing` is set *before* the API call, so a mid-call
   crash leaves a row to investigate rather than blindly retry.
3. `<!-- mfv2:{id} -->` marker in every issue body. Checked against the mirror
   before any write. If D1 were lost or restored stale, this alone prevents
   re-publishing.

## 8b. Durability without a queue

There is no Cloudflare Queue. Queues requires the paid Workers plan, and this
runs on the free tier by decision (2026-08-13). A `* * * * *` cron claims a
batch of pending rows and runs each through exactly the same publish path.
Every guard above still applies, in the same order — the cap gate, the three
idempotency layers, never-publish-unclassified, and secret-scan quarantine at
ingest, which happens before any of this and is untouched.

What replaces the queue's guarantees, and what does not:

- **The row is the work item.** Ingest commits to D1 and returns 202. A report
  that reached D1 cannot be lost by a failed handoff, because there is no
  handoff to fail.
- **Retry budget** is `attempts`, incremented at claim time — so a Worker that
  dies mid-flight still burns one, and a crash loop cannot run forever.
  `MAX_ATTEMPTS` reached → state `failed`, parked with `last_error`.
- **Deferrals cost nothing.** Cap closed, classifier down, GitHub rate
  limiting: `attempts` is restored. Only unexplained errors spend budget.
  Backpressure and outages must never park a real report.
- **A refusal is not backpressure.** GitHub answers 403 for a rate limit AND
  for "this token may not", and only the headers tell them apart. Because a
  deferral restores `attempts`, treating every 403 as a limit would make a
  permanent credential failure retry forever while `needsAttention.failed`
  stayed at 0 — an outage that reports itself as healthy. `lib/gh-status.ts`
  defers only on 429, `x-ratelimit-remaining: 0`, or a `retry-after` header;
  every other 403, and any 404 on a write, spends budget and parks in
  `failed`. Verify the credential without writing: `GET /admin/whoami`.
- **In-flight ownership** is a compare-and-swap on `state`, so two overlapping
  ticks cannot both claim a row. A claim older than 10 minutes is treated as
  abandoned and reclaimed.
- **Not replaced:** platform-managed redelivery. If Cloudflare skips a cron
  tick, nothing retries it — the row simply waits for the next tick. And
  nothing alerts on `state='failed'`; the launch checklist item is a person
  looking.

`docs/ARCHITECTURE.md` §7 carries the full ledger of what the drain gives up
versus Queues, and the throughput ceiling to watch.

## 9. Labels are additive only

The pipeline creates labels in its own namespace and applies labels. It never
edits or deletes a label definition — deleting one strips it from every issue
using it, irreversibly.

Match your Claude Code allowlist:
- allow: `Bash(gh label create *)`, `Bash(gh label list *)`
- confirm: `gh label delete`, `gh label edit`

---

## 10. Store Reviews — the handoff reproduces `/submit`'s guards

A store review is a stranger's text in a public listing. It gets exactly the
treatment a submitted report gets, and the handoff is where that has to be
proven rather than assumed.

| `/submit` guard | At the handoff | Why |
| --- | --- | --- |
| Turnstile | **not applicable** | There is no browser. The review was written on a store listing; the caller is our own cron, authenticated to Google or Apple. |
| Rate limit per reporter | **not applicable** | The store's own posting limits bound the volume, and the sync cannot fetch faster than the API allows. |
| `sanitize()` | **reproduced** | Strips markup, neutralises mentions and issue refs, truncates. A review body may not become a GitHub mention or a live issue reference. |
| `scanForSecrets()` | **reproduced, twice** | At sync, so the console renders a flagged review redacted. At the handoff, as a hard refusal. A wallet review can contain a seed phrase someone pasted looking for help, and a public issue is irreversible and indexed within minutes. |
| Attachment sniffing | **not applicable** | Neither store API returns attachments. |
| Flood check | **not applicable, and cannot misfire** | Store rows carry a synthetic `reporter_key` and a NULL `normalized_hash`. `confirmFloodAtDrain` returns false on a NULL hash, and `flood_repeat` evidence requires `reporter_kind === 'install'`, which a store row never is. Store reviews cannot flag each other. |
| Spam gate | **released in advance** | The row is written with `spam_status = 'clean'` and a `spam_reviewed_at`. Release is sticky in `pipeline.ts` — a human who cleared a report outranks the model, permanently — so a human-approved review cannot be re-parked by the classifier. |

**A flagged review stays visible and stays replyable.** It simply can never
enter the pipeline: the handoff's `WHERE` clause requires
`COALESCE(secret_scan_status,'clean') <> 'flagged'`.

### 10.1 The handoff is compare-and-swap

The claiming `UPDATE` requires `handoff_state IN ('none','failed')`,
`eligibility = 'eligible'` and `human_decided_at IS NOT NULL`. `changes === 0`
is a hard stop, not a retry — that is what makes two concurrent clicks produce
exactly one submission. `UNIQUE(handoff_submission_id)` is the second line:
SQLite permits many NULLs in a unique index, so it allows "not handed off" on
every row while making a second claim of the same id impossible.

A claim whose request died before the write (`requested` older than two
minutes) may be taken over, and keeps its submission id, so a retry can never
write a second row for the same review (DH12). The row, its `state_log` entry
and the review's `accepted` state are written in one D1 batch, which is a
transaction: a failed write leaves no report behind.

### 10.2 What the decision and the handoff enforce

Implemented in `src/store/decision.ts`; each rule pinned by a test in
`test/store-decision.test.ts`.

| Rule | How |
| --- | --- |
| **Eligible is earned** | `eligible` is refused unless triage is actionable, a label from `PIPELINE_LABELS` is set, and the secret scan did not flag the review — on a direct POST as much as from the form (DH3). |
| **Switched off writes nothing** | While `STORE_HANDOFF_ENABLED` is not `"true"` the handoff is refused before any read, and the page offers no button (DH6). |
| **The report is built as /submit builds one** | `sanitize()`, `inferErrorCode`, `fingerprint` with a null route (the bucket a standalone-form report without a route shares), `body_hash` of the raw text, `attachment_keys = '[]'` (DH7). |
| **Spam released in advance** | `spam_status = 'clean'` with `spam_reviewed_at` and `spam_reviewed_by`, in the same INSERT as the state, so the sticky release holds on the drain's first read; with the spam gate on and the model saying `suspected`, the report is still filed (DH13). |
| **Nothing for the flood check** | `normalized_hash` is NULL, which `confirmFloodAtDrain` treats as no match; `reporter_key` is a per-review hash; `reporter_kind = 'store'`, which only the display and the `=== 'install'` flood-evidence check read (DH7). |
| **Secret material is a hard refusal** | The title and body are scanned together, since a phrase split between them is neither half's (DH10). The refusal is recorded by reason kind only. |
| **No text nobody judged** | A proven edit first stored after `human_decided_at` refuses the handoff until someone decides again (DH11). |
| **A store review is never passed off as a form report** | `pipeline.ts` recognises `reporter_kind = 'store'` and, for those rows only: a `## Store review` section naming the store and the rating when there is one, a footer saying which store it was filed from, no `feedback-form` label, and a rolling comment that names each report's source. The reviewer's name is never carried. A form report's issue body is pinned byte for byte, and was checked against the pipeline before this change (DH13, DH16–DH18, DH20). |
| **Queued is not on GitHub** | The console says "Queued for GitHub" for its own state, and reads the report itself to say "On GitHub" with the issue link, or "Not filed" (DH19). |
| **Decisions are not overwritten** | The decision is a compare-and-swap on the `human_decided_at` the page showed (DH4). Once in the pipeline, triage and eligibility are fixed (DH5). The classifier's flagged-review path now requires `review_state = 'classifying'`, like its other writes. |

## 11. The model suggests; a human decides

The classifier reads a review and returns labels from a fixed allowlist plus a
draft reply. It has no tools, no credentials, and no way to move a review
anywhere. Labels outside the allowlist are dropped, not added.

`eligibility` is the gate on the pipeline and is written **only** by a human
action. `undecided` is the default because a review nobody has read must never
be eligible for a public GitHub issue — the absence of a decision has to read
as "no", not as "not yet no".

An injection attempt inside a review body can therefore change one thing: its
own suggested label, which a human is looking at.

**Since 2026-09-16 there is no store classifier at all.** It was removed:
`src/store/classify.ts`, `src/store/classify-batch.ts`, their tests and the three
`STORE_CLASSIFY_*` variables are gone (maintainer's call — at this review volume
a suggested label arrives after a person has already formed the opinion, and a
second label system beside a person's own is worse than none). The console had
already stopped rendering any AI output on 2026-09-15.

The `ai_*` columns remain on `store_reviews`, nullable and unread by any code
path, because dropping them would be a migration that buys nothing. The Label
filter and the reply templates use a person's labels only (PA1, PA2, C3).

Nothing in this system now sends a review to a model, so an injection inside a
review body has no path to anything at all. The editable summary built on 2026-09-15 was
removed with that section; its route is gone (404), and the three `human_summary*`
columns from migration 0010 stay, unused and empty, rather than a destructive
schema change to drop them.

**Reply templates are text to copy, not an action.** Each is one of four fixed
templates picked from the rating and a person's labels, in its own section under
the reply. It sends nothing; a reply reaches a store only through the reply
actions. Every template, as written, fits the 350-character reply limit (PT1), and
the field is capped at it. The bug template points reviewers to the public
feedback form, not an email address.

## 12. Store kill switches — and the one that is destructive

There is deliberately **no single store kill switch**. Google serves only the
last 7 days of reviews, so turning collection off for a week destroys every
Android review in that window permanently.

| Variable | Default | Turning it off |
| --- | --- | --- |
| `STORE_SYNC_ENABLED` | `"false"` | Ships off. Turned on by a committed change to `wrangler.jsonc` once production is verified — a dashboard edit is overwritten by the next deploy. **Once on, turning it off is data-destructive**: only for a credential compromise, and then with the 168-hour countdown understood. |
| `APP_STORE_SYNC_ENABLED` | `"false"` | Ships off, and needs `STORE_SYNC_ENABLED` on as well. Turned on by a committed change to `wrangler.jsonc`, like the row above. Safe to turn off: App Store Connect does not limit reviews to the last 7 days, so the next run continues from its checkpoint, and Google Play keeps syncing. |
| `STORE_REPLY_ENABLED` | `"false"` | Safe. Drafts and approvals persist; nothing is published. While off, the reply phase is not in the store cron's rotation at all, so no code path can call a store's reply endpoint. |
| `STORE_HANDOFF_ENABLED` | `"false"` | Safe. Decisions are recorded; no `submissions` row is written. **This is the rollback that fully isolates the existing pipeline.** |

Each follows the existing convention that anything but the literal `"true"`
means off, so a typo can never arm a stage.

## 12.1 Store replies — what is sent, and what is never assumed

A published reply is public text under Bread Wallet's developer account and
cannot be withdrawn by us. The reply flow (`src/store/reply-flow.ts`) holds
these, each pinned by a test in `test/store-replies.test.ts`:

| Guarantee | How |
| --- | --- |
| **A human approves the exact text** | Approval records the approver and locks the body. An approved reply is never edited in place; changing it supersedes it and starts a new draft, so what was approved is what is sent. |
| **Console actions never call a store** | Draft, approve, send, change, edit, discard, retry and check write only our own rows (RA11, PS1). Only the sender sends. The button beside "Save as draft" saves the text and approves it in one step. While `STORE_REPLY_ENABLED` is off it reads "Approve reply" and the reply waits; while on it reads "Send" and says the reply is queued for public posting. What follows is shown from the reply's actual state — waiting, sending, sent to Apple, published — never assumed from the click (PS5). |
| **The store is checked before every send** | First sends, retries and resends alike read the store's current reply first. A live reply we did not write, and that is not the outside reply recorded at sync, is never overwritten (RS7). A review the store does not return cannot be checked, so nothing is sent (RS8) — Google's review read returns only reviews written or changed in the last week, so an older review may be one of these. A reply of ours the store may have taken can be replaced by the reply that follows it (RS15). |
| **"Not sent" only when confirmed** | A store refusal (4xx) is `failed` and quotes the store. A network error, timeout, 408 or 5xx — where the request may have arrived — is `unconfirmed` ("Delivery unconfirmed"), and is checked on the store before anything is sent again (RS5). A send whose invocation died is reclaimed as `unconfirmed` after a 10-minute lease (RS10). |
| **Apple's pending state is its own** | A response Apple accepted but has not published is `pending_publish` ("Sent, waiting for Apple") until a later check finds it `PUBLISHED`; one Apple drops is "Not published", not "Not sent" (RS9). |
| **One claim, one send** | Every transition is a compare-and-swap on the reply's state; two senders racing publish once (RS12), and a person acting on a reply that changed since the page loaded is refused (RA4, RA5). |
| **Messages claim only what is known** | Once an attempt's outcome is unknown, the reply keeps `external_state = 'UNCONFIRMED'` until the store confirms it. From then on no message says "Nothing was sent" or "Not sent": a stop says "No further attempt was made. Delivery remains unconfirmed." (RS14). A check that finds no matching reply records that it found none, not that the earlier attempt failed (RS6). |
| **Typed text survives a conflict** | A save refused because someone else changed the reply shows the refused text, escaped, under "What you typed (not saved)" (RA12). |
| **Rate limits cost nothing** | A 429 waits without spending an attempt (RS4). Failures where nothing reached the store stop after 5 attempts (RS11). |

## 12.2 Store Reviews pages — the one script, and search on redacted reviews

Every console page used to carry no JavaScript, which is what made
`default-src 'none'` possible. The Store Reviews pages now load one script
(`src/store/review-script.ts`, served from `/admin/store/review.js` behind the
same sign-in) for what cannot be done without it: one-click Copy, switching a
reply template without a reload, closing an info tooltip with Escape or a tap,
and saying that a filter choice has not been applied yet. Every page still works
without it.

| Guarantee | How |
| --- | --- |
| **Only that script can run** | `script-src 'nonce-…'` with a nonce that is new on every response; no `'unsafe-inline'`, no `'unsafe-eval'`, no host (SR9, C13). An injected `<script>` has no nonce and does not run. `base-uri 'none'` keeps an injected `<base>` from redirecting the script's address. |
| **It can send nothing anywhere** | `default-src 'none'` still covers `connect-src`, so the page can make no request; the script contains no `fetch`, XHR, `innerHTML` or `eval` (PT5). |
| **It never turns review text into markup** | It copies a field's value and swaps one field's value for a template string the server escaped into an attribute. Review text stays escaped server-side as before. |
| **Filters apply on submit, never on change** | Reloading under someone still choosing would move their focus. A change not yet applied is announced instead. |
| **Search cannot probe a redacted review** | A review the secret scanner flagged is never shown, and its text is never searched either (PF4). Before 2026-09-15 a search for a word inside a redacted review returned it, which would let anyone confirm hidden words one guess at a time. A redacted review stays in the list with its Redacted badge. The tooltip on Search does not mention this, by the maintainer's call. |

## 13. Admin sign-in

Every browser-facing `/admin/*` page requires a signed-in session: Google
sign-in, checked against an allowlist of email addresses (`admin_allowed`,
migration 0008). Granting access is one row; removing it is one column.

**This reverses a decision, deliberately.** Between 2026-08-25 and 2026-09-02
`/admin/review` took no credential at all. That was correct while the repository
was private and one person used it. The repository is public -- so the route is
discoverable from source -- the team is bigger, and the buttons on that page
publish things nobody can take back.

### What holds it up

| | |
| --- | --- |
| **Sessions cannot be forged** | HMAC-signed with `ADMIN_SESSION_SECRET`, compared in constant time. The expiry is *inside* the signed payload, not only in the cookie's `Max-Age` -- a `Max-Age` is a request to a browser, and a replayed cookie never sees one. |
| **Revocation is immediate** | The allowlist is read on **every** request, not just at sign-in. A signed cookie alone would keep working until it expired, which is the wrong answer to "remove them now". |
| **CSRF on every state-changing POST** | Bound to the signed-in address. `SameSite=Lax` already blocks the cross-site POST; this does not rest on a browser behaviour alone, because the actions publish to a third-party repository. |
| **Cookie flags** | `__Host-` prefix (no sibling subdomain can set or overwrite it), `HttpOnly`, `Secure`, `SameSite=Lax` (Strict breaks sign-in; see below). |
| **It fails closed** | With any secret missing, **nobody** signs in. A missing secret must lock the door, not remove it. |
| **A sign-in link is single-use** | The state is *consumed* server-side (`admin_oauth_state`, migration 0009) before the Google token exchange, by `INSERT ... ON CONFLICT DO NOTHING` and a `changes` check — atomic, so two racing callbacks produce exactly one winner. Signed and unexpired is not the same as unused, and clearing a browser cookie does not stop a scripted client replaying one for ten minutes. |
| **Sign-in attempts are bounded** | 30 starts per IP per 10 minutes, per-policy counter. `/admin/auth/callback` needs none: its state check runs *before* the token exchange, so a caller without valid state never causes a subrequest. Exceeding the limit delays sign-in; it never disables an account. |
| **Rate-limit config fails closed** | Limits are parsed as positive integers. `Math.max(1, Number(v))` returns `NaN` for a typo and `hits >= NaN` is always false — one mistyped var silently disabled the limiter while the comment claimed otherwise. Malformed, fractional, zero, negative and infinite all fall back conservatively. |
| **The limiter takes no caller input** | A *path* names a policy; the numbers come from the Worker's own env. An unknown path is **denied**, not mapped to a default — "the stricter policy" is a claim a config change can falsify. |

### What is checked about Google's answer

The ID token is read from a **direct** HTTPS POST from the Worker to Google's
token endpoint, so TLS already establishes who sent it and that it was not
altered -- Google's own guidance is that a token obtained this way needs no
signature check. **That reasoning collapses the moment an ID token arrives by
any other route:** if a future change accepts one from a redirect, a form post,
or a client, JWKS verification has to come with it.

The claims are checked either way, because a valid signature over the wrong
audience is still the wrong token: `aud` must be our client id, `iss` must be
Google, `exp` must be in the future, and `email_verified` must be true -- an
unverified address proves nothing, since anyone can put any address on an
account until Google confirms it.

`ADMIN_EMAIL_DOMAINS` is a second fence on top of the allowlist. The allowlist
grants access; the fence stops a typo in it from ever admitting an outside
address.

### Setup

Three **secrets** -- never vars, because a client secret in `wrangler.jsonc`
would be a client secret in a public repository:

```
wrangler secret put ADMIN_SESSION_SECRET        # any long random string
wrangler secret put GOOGLE_OAUTH_CLIENT_ID
wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
```

The OAuth client is created in Google Cloud Console with this redirect URI:

```
https://miden-feedback-v2.miden-feedback-relay.workers.dev/admin/auth/callback
```

The first person has to be inserted by hand -- the page that grants access is
itself behind the gate:

```
wrangler d1 execute miden-feedback-v2-db --remote --command \
  "INSERT INTO admin_allowed (email, added_at, added_by) VALUES ('you@miden.team', 0, 'bootstrap')"
```

After that, Settings handles it: the gear at the foot of the console rail
(`/admin/settings`). The old `/admin/team` address redirects there.

### Appearance: the theme cookie

Settings offers Match my device, Light or Dark (`src/lib/theme.ts`). The choice is a
`__Host-mfv2_theme` cookie for that browser — Secure, HttpOnly, SameSite=Lax, one year —
holding `light` or `dark`; Match my device deletes it. It is read back through the same
two-word allowlist and applied as `data-theme` on `<html>` by an HTMLRewriter pass over
console HTML responses, so no cookie value can reach the markup (TH4), no script is
needed and the page never flashes the wrong theme. Saving it is a signed-in POST with the
CSRF token like every other (TH3). It grants nothing and is not a security control; it is
listed here because it is a cookie the console sets.

### Not covered, on purpose

`/admin/backfill`, `/admin/gate-reset`, `/admin/quarantined`, `/admin/whoami`
and `/admin/retrieval-test` keep their `BACKFILL_TOKEN`. They are called by
scripts, which have no browser to sign in with.

`/submit` is untouched. Reporters never sign in.

### The one CSRF exception, stated rather than discovered

Every state-changing POST carries a session-bound token — including
`/admin/logout`, **when somebody is signed in**. A signed-OUT logout is allowed
through and simply clears the cookies: there is no session to protect, and
refusing would strand somebody whose session expired while the page was open,
since their token no longer verifies and the cookie they cannot clear is
already useless. `A27`-`A29` pin all three behaviours.

### What proves the cookie policy

The session cookie and the one-time OAuth state cookie are both `SameSite=Lax`.
Google returns the browser by a top-level cross-site navigation, and that
navigation stays cross-site through the callback's own redirect into the
console. Strict is withheld on all of it: on the state cookie it refuses every
sign-in, and on the session cookie it sends a sign-in that succeeded back to the
sign-in page with no error. The session cookie shipped as Strict, and the first
real sign-in, on 2026-09-11, found it.

Lax gives up nothing this console relies on. It is still withheld on a
cross-site POST, every state-changing POST also needs the CSRF token above, and
every console page a session opens by GET only reads.

**No unit test can prove this.** They set the `Cookie` header by hand, which
fabricates the browser behaviour at issue — which is how Strict passed twenty
tests on both cookies. `npm run test:oauth` uses a real browser and a real site
boundary, runs a positive control (the session works same-site) and a negative
control (Strict *is* withheld cross-site) before trusting its own result, then
checks that the Lax state cookie and the Lax session both survive the cross-site
return. It is a required CI step.

## Launch checklist

- [ ] `GITHUB_WRITE_TOKEN` is a classic token with **only** `public_repo`
- [ ] Kill switch tested — flip to `false`, confirm writes stop, flip back
- [ ] Caps verified against a scratch repo you own before pointing at `0xMiden/wallet`
- [x] Embeddings retrieval implemented — Workers AI `@cf/baai/bge-small-en-v1.5`,
      vectors in `issue_mirror.embedding`, cosine in the Worker
- [ ] Mirror backfilled — POST `/admin/backfill` until `remaining` is 0.
      An empty mirror means every report looks new and files its own issue
- [ ] Both LLM providers configured, failover tested
- [ ] Parked and quarantined rows monitored — `GET /health` reports
      `needsAttention.quarantined` and `.failed`; `GET /admin/quarantined`
      with the `BACKFILL_TOKEN` bearer lists them with reasons. **Quarantine
      returns 202 to the reporter on purpose, so a false positive is silent:
      a non-zero count is the only signal a real report was discarded.**
      Nothing alerts on it; someone has to look
- [ ] Drain confirmed running — `state_log` shows `claimed` transitions within
      a minute of a submission. A cron that never fires looks exactly like a
      quiet day
- [ ] Ran against a scratch repo for a full day at realistic volume
- [ ] Maintainers told the pipeline exists, with the label namespace and caps
