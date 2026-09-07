# Article review — `19-what-is-guardian.md`

**Date:** 2026-09-07
**Source of truth:** Path A (repository), commit `731a307`, live bundles `index-Ch0u8dCA.js` / `index-RfSt1PSG.css` — scoped `git status` clean, local `dist/assets` equal to live. `reference/live-template.md` stamp matches; no re-extraction needed.
**Status:** PROPOSAL. Nothing has been changed in `src/help-center/content/` or `content-source/`.

## 1. Corrected article

```markdown
---
id: what-is-guardian
title: What is Guardian?
mainCategory: guardian
subcategory: guardian-protection
platforms: [extension-desktop, mobile]
---

Guardian is a recovery and backup layer for private accounts. Because Miden keeps some of your account data private and local to your device, losing that device can also mean losing access to it — Guardian backs that data up so you can recover it on a new one.

Guardian does not hold your recovery phrase, does not hold your private key, and cannot move funds by itself.
```

## 2. Change log

Issue | Original | Fix | Category
--- | --- | --- | ---
Four sentences over two paragraphs; house rule for a concept explanation is one to three | "Because Miden keeps some account data private and local to you, losing a device can also mean losing access to that account data. Guardian helps back up and recover that data on a new device." | "Because Miden keeps some of your account data private and local to your device, losing that device can also mean losing access to it — Guardian backs that data up so you can recover it on a new one." | length
Third person drifts out of the reader's frame; "a device" is not necessarily the reader's | "losing a device" | "losing that device" | tone
"account data" repeated three times in two sentences | "…local to you, losing a device can also mean losing access to that account data." | "…local to your device, losing that device can also mean losing access to it" | language
"helps back up and recover" hedges an action Guardian performs | "Guardian helps back up and recover that data" | "Guardian backs that data up so you can recover it" | language
Second paragraph left byte-identical — it is the security statement | *(unchanged)* | *(unchanged)* | tone

**Accuracy pass — all five claims verified**, against `https://miden.xyz/blog/what-is-miden-guardian`:

Claim | Verified by
--- | ---
Guardian is a recovery and backup layer | "In Phase I, Guardian functions as a backup and synchronization layer."
Miden keeps account data private and local | "keeps 'account state' local, publishing only cryptographic commitments to the chain"
Losing a device can mean losing that data | "users also need a trusted party to synchronize, back up, and recover that private state"
Recover on a new device | "You can recover your latest state in minutes from another device"
Holds no recovery phrase / no private key | "The provider holds no keys and bears no custody liability"; "without ever holding your keys"
Cannot move funds by itself | "Guardian can never move funds alone."

Nothing was flagged at step 6, so no step 1–5 edit had to be reverted.

## 3. Needs human decision

1. **This is approved live copy, so the rewrite needs Ivan's per-line approval before it lands.** The article ships today as four sentences; the one-to-three-sentence rule is Ivan's instruction and outranks the corpus, but the corpus is what was approved. If approved, the same text must be edited in **both** trees or `content.test.ts` fails: `src/help-center/content/19-what-is-guardian.md`, `content-source/extension.md:213`, and `content-source/mobile.md:217`.

2. **Proposed depth link, not inserted:** `https://miden.xyz/blog/what-is-miden-guardian` (or `https://docs.miden.xyz/`) at the end of the article for readers who want the mechanism. **No article on the live site links to either** — the entire corpus contains four outbound URLs (three store links and the support relay). Adding the first outbound docs link is a messaging decision, not a copy edit. Options: (a) leave as-is, (b) add to this article only, (c) adopt a site-wide "Learn more" convention for all six concept articles.

3. **Scope the reader may expect and this article does not cover:** the blog describes Guardian's Phase I as a 2-of-3 key structure (hot key, cold key, Guardian's co-signing service key), which is what makes "cannot move funds by itself" true. `12-how-do-i-keep-my-wallet-secure.md` alludes to it; this article does not. Adding it is a new claim, so it is not in the correction. Decide whether the Guardian category should explain the key structure anywhere.

## Post-checks

- Product name: the article never names Bread Wallet, as it ships today; nothing introduced to break the spelling assertion.
- Frontmatter: five fields, unchanged, `platforms` valid and non-repeating; no `<!-- platform: -->` markers used or needed.
- No `#` heading introduced, no image reference.
- No quoted UI labels in the original — nothing to preserve byte-identical.
- `git status --short -- src/help-center/content content-source` is still empty.
