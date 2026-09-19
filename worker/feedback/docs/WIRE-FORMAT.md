# Submission wire format

`POST /submit`

The request is **`multipart/form-data`**, not JSON — it has to carry an
attachment, and base64 in a JSON body would inflate a 10 MB video by a third.

Headers:
```
content-type: multipart/form-data; boundary=...   (set by the browser, not by hand)
x-mfv2-signature: sha256=<hex hmac of the canonical string>   OPTIONAL — see Signing
```

Form fields:

| Field | Required | Notes |
|---|---|---|
| `submission_id` | ✅ | uuid-v4, generated client side |
| `body` | ✅ | free text, min 10 chars, max ~60KB |
| `platform` | ✅ | `android` \| `ios` \| `extension` |
| `turnstile_token` | ✅ | from the Turnstile widget |
| `meta` | — | JSON string: `install_id`, `wallet_version`, `network`, `route` |
| `attachment` | — | one file, ≤10 MB, `image/png` \| `image/jpeg` \| `video/mp4` |

## What gates a submission

**Turnstile is the ingress control.** Every submission carries a Turnstile
token, verified server-side against Cloudflare using `TURNSTILE_SECRET`, which
exists only on the Worker. No valid token, no submission — 403. Behind it sit
the rate limiter (5/hour per install id, else per IP) and the secret-scan
quarantine.

## Signing — optional, unused by this client, and not a security control

**The browser client does not sign.** Two reasons, and the second is a trap
worth recording:

1. The key would ship in the bundle, so it authenticates nobody.
2. **Multipart normalises newlines.** HTML's `multipart/form-data` encoder
   rewrites every LF in a field value to CRLF, while a textarea's value in
   JavaScript uses bare LF. A client that hashes the JS string signs LF; the
   server receives CRLF and computes a different digest. Every submission
   containing a line break fails with `bad signature` — and single-line ones
   pass, which makes it look intermittent rather than systematic.

Any future signer must hash the CRLF-normalised body, not the raw textarea
value. The server still verifies a signature when one is present, so a client
that gets this right keeps working.

The form also signs a **canonical subset** of each submission. The Worker
verifies that signature **only when the header is present**; a submission
without it is accepted normally.

It is not authentication and must not be documented as such: the key ships in
the client bundle, the wallet is distributed as an extension and a mobile app,
and anything in a shipped bundle is extractable. Anyone can therefore produce
a valid signature. Requiring one would stop no attacker while looking like a
control to the next reviewer.

What it is for: a *wrong* signature means a broken or forked client, which is
worth a loud 401 rather than a silently-accepted malformed report.

The signature covers a canonical string rather than the raw body because the
request is multipart — a browser cannot hand its own code the exact bytes
`fetch` will serialize, since the boundary is chosen inside `fetch`.

Canonical string, joined by newlines:

```
mfv2.v1
<submission_id>
<sha256 hex of the body field>
<platform>
```

HMAC-SHA-256, hex-encoded, prefixed `sha256=`. Versioned by its first line, so
a scheme change fails a stale client closed rather than silently signing the
wrong thing.

**Not covered:** the attachment bytes, `meta`, and the Turnstile token. A
tampered attachment is caught by type/size validation and the secret scanner.
Do not extend the canonical string to cover the attachment — hashing 10 MB in
the client is exactly the work the free-tier CPU budget cannot absorb.

Responses:

| Status | Meaning |
|---|---|
| 202 | Accepted (also returned for quarantined submissions — deliberately indistinguishable) |
| 200 `duplicate_submission` | Same `submission_id` already seen. Safe retry. |
| 400 | Malformed |
| 401 | A signature header was supplied and did not verify (absent is fine) |
| 403 | Turnstile failed |
| 429 | Rate limited |
| 413 | Attachment too large or wrong type |

## `GET /status?ids=<uuid,uuid,…>`

Up to 25 UUIDv4 ids. Anything that is not a UUIDv4 is dropped, not rejected.

```json
{
  "results": {
    "<submission_id>": {
      "status": "attached",
      "issue": 31,
      "duplicate": true,
      "title": "Earn screen shows staking rewards as zero while chain shows them accruing"
    }
  },
  "repo": "0xMiden/wallet"
}
```

`status` is PRESENTATION vocabulary — `received`, `reviewing`, `queued`,
`attached`, `filed` — and never the internal pipeline state. The raw `state`
used to ride along beside it and was removed: `/status` needs no credential and
a reporter picks their own `submission_id`, so that field let anyone submit a
probe, read back `suspected_spam`, adjust and repeat. Nothing goes on this
response that `publicStatus()` would not say.

`issue` collapses `published_issue` and `matched_issue`; `duplicate` is what
tells them apart, so "Filed #41" is never shown for a report that folded into
someone else's issue.

`title` is the GitHub issue title, resolved as `issue_mirror.title` first and
`submissions.published_title` second. The mirror comes first so a maintainer's
rename reaches the reporter; the stored title only covers the window after a
new issue is filed and before the next mirror sync (≤15 min). Folds have no
stored title at all — the mirror is their only source. `null` means neither was
available, and the caller should fall back to its own text.

> **Callers MUST compare `repo` before displaying `title`.** `issue_mirror` is
> keyed by issue number alone and holds only the current `TARGET_REPO`, so a
> report filed before a repo cutover can join to an unrelated issue of the same
> number. Display the title only when the report's recorded repo *equals*
> `repo`. A report with no recorded repo does not qualify — absence of proof is
> not proof of a match. Showing a mismatched title tells a reporter their bug is
> something it is not.

## Client notes

- Generate `submission_id` once per submission attempt and reuse it across
  retries. This is idempotency layer 1 — a retry with the same id will never
  produce a second report.
- **The HMAC key ships in the client, so it is not a secret.** Turnstile and
  the rate limiter are the actual controls. Never treat a valid signature as
  evidence of anything about the sender, and never make it mandatory.
- Set only the signature header by hand. Letting `fetch` write its own
  `content-type` is what puts the multipart boundary in it; overriding it
  breaks parsing server-side.
- No GitHub credential exists anywhere on the client. The wallet ships as an
  extension and a mobile app; anything in the bundle is extractable.
