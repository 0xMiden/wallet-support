# Bread Wallet Help Center — Content Proposal (v3, reconciled — APPROVED 3 Sep 2026)

Status: approved by the owner on 3 Sep 2026. Authorises migration of the 23 existing articles per §1 and the implementation shape in §5. Does not authorise writing any article in §2.

Sources: `content-source/extension.md` and `content-source/mobile.md` in the repo — transcribed 3 Sep 2026 from Notion › COMMUNITY ("Bread Wallet Help Center" → **Extension**, "Bread Wallet Help Center: Mobile" → **Mobile**) with the owner-approved corrections in §4/§6 already applied. These files are the source of truth for migration; Notion is not read during migration.

Rules:
- Two platforms only: **Extension** and **Mobile**. iOS and Android are both Mobile; no per-OS articles.
- Platform = source page. Everything on the Mobile page is included under Mobile; everything on the Extension page is included under Extension. No article is added, dropped, or duplicated to balance the two.
- Where the same title exists on both pages it is one article with two platform bodies (identical or variant, both preserved verbatim).
- Existing titles and body text are preserved exactly — no rewrites, renames, merges, or summaries. Titles below reflect Notion as edited by the owner; the migration takes the exact string from Notion at migration time.
- Existing images/screenshots are excluded; replaced later with current Bread Wallet screenshots.
- Structure (5 main categories, 7 subcategories) is fixed.

Structure:

| Main category | Subcategory |
|---|---|
| Getting started | Setup and basic use |
| Manage wallet | Security and recovery |
| Manage wallet | Sending, receiving, and claiming |
| Manage wallet | Activity and transaction status |
| Privacy | Public and private transactions |
| Guardian | Guardian protection |
| Troubleshooting | Common issues and support |

---

## 1. Existing articles — mapping

Body: **Same** = identical on both pages. **Variant** = same title, platform-specific body.

### Getting started › Setup and basic use

| # | Title | Ext | Mob | Body | Notes |
|---|---|---|---|---|---|
| 1 | How to install Bread Wallet | ✓ | ✓ | Variant | Ext: Chrome steps. Mob: App Store steps. Title unified by owner in Notion. |
| 2 | How do I create a Bread Wallet? | ✓ | ✓ | Variant | Ext: password + Guardian/Fully-private choice. Mob: biometrics + Guardian. |
| 3 | How to fund your Bread Wallet? | ✓ | ✓ | Variant | Mob: Explore tab step + testnet disclaimer. |
| 4 | How to find a token contract address in Bread Wallet? | ✓ | ✓ | Variant | Step 3 wording differs (Click/Tap). Mob screenshots excluded. |
| 5 | Is Bread Wallet available on mobile? | ✓ | ✓ | Variant | Caution callout wording differs. |
| 6 | What are the supported browsers for Bread Wallet? | ✓ | ✓ | Same | |


### Manage wallet › Security and recovery

| # | Title | Ext | Mob | Body | Notes |
|---|---|---|---|---|---|
| 8 | Can I recover stolen assets? | ✓ | ✓ | Same | |
| 9 | How do I restore my wallet with a recovery phrase? | ✓ | ✓ | Variant | Ext body per §6 (owner-verified). Mob screenshots excluded. |
| 10 | How to restore the wallet using an encrypted file? | ✓ | – | Ext only | |
| 11 | How to download the encrypted file? | ✓ | – | Ext only | |
| 12 | How do I keep my wallet secure? | ✓ | ✓ | Same | |
| 13 | What should I do if I lose my recovery phrase? | ✓ | ✓ | Same | |
| 14 | What is the difference between a recovery phrase and an encrypted wallet file? | ✓ | ✓ | Same | |

### Manage wallet › Sending, receiving, and claiming

| # | Title | Ext | Mob | Body | Notes |
|---|---|---|---|---|---|
| 15 | What is recall height? | ✓ | ✓ | Same | Recall height is a claiming rule. |

### Manage wallet › Activity and transaction status

| # | Title | Ext | Mob | Body | Notes |
|---|---|---|---|---|---|
| 7 | What is delegate proof generation? | ✓ | ✓ | Same | Concept: how transactions are proven fast. Moved here from Setup on 3 Sep (owner decision). |

### Privacy › Public and private transactions

| # | Title | Ext | Mob | Body | Notes |
|---|---|---|---|---|---|
| 16 | What is a private account? | ✓ | ✓ | Same | |
| 17 | What is a public note? | ✓ | ✓ | Same | |
| 18 | What is a private note? | ✓ | ✓ | Same | |

### Guardian › Guardian protection

| # | Title | Ext | Mob | Body | Notes |
|---|---|---|---|---|---|
| 19 | What is Guardian? | ✓ | ✓ | Same | |

### Troubleshooting › Common issues and support

| # | Title | Ext | Mob | Body | Notes |
|---|---|---|---|---|---|
| 20 | My transfer shows as completed, but the token never arrived. | ✓ | ✓ | Same | Links to SUPPORT. |
| 21 | My token is stuck on "Consuming" (receiver address) | ✓ | ✓ | Same | |
| 22 | Send stuck in the "Sending" phase | ✓ | ✓ | Same | |
| 23 | Why is my token taking so long to arrive? | ✓ | ✓ | Same | Links to SUPPORT. |

**Totals:** 23 titles. 21 on both platforms (15 same, 6 variant). 2 extension-only. 0 mobile-only.

Page furniture, not migrated as articles:
- "Never share your private key…" reminder callout — already rendered by the shell.
- "Still stuck? Help us make this better" callout — becomes the Contact Support destination (§3).
- "Follow us on" social table — footer concern, separate decision.

---

## 2. Optional new articles (titles only — separate approval, separate content review)

Only listed for the two subcategories that have little or no existing content. Not required for migration.

| Subcategory | Proposed title |
|---|---|
| Sending, receiving, and claiming | How do I send tokens? |
| Sending, receiving, and claiming | How do I receive tokens? |
| Sending, receiving, and claiming | How do I claim assets? |
| Activity and transaction status | What do the transaction statuses mean? |

---

## 3. Decisions still open

**A. Contact Support destination — resolved.** Use `https://miden-feedback-v2.miden-feedback-relay.workers.dev/`. The `?cb=4` parameter seen on existing links is not required and is dropped.

**B. Empty subcategories — resolved.** A subcategory with no articles on the selected platform stays visible and renders an explicit empty state ("No articles for Mobile yet"), so gaps are visible to the owner. A coverage report (articles per subcategory per platform) runs with the test suite and WARNS on any empty subcategory; it does not fail the build — empty is a legitimate, owner-visible content state. The build fails only on malformed data (article referencing a missing subcategory, declared platform without a body). Hiding empty states in production, if ever wanted, is a later data-level flag.

Decisions previously listed as "distribute concepts vs. Key concepts subcategory" and "keep Activity subcategory" are closed by "structure is fixed".

---

## 4. Flags for content reviewers (preserved verbatim; not ours to change)

- #9 "How do I restore my wallet with a recovery phrase?" — the Notion Extension page carries the mobile body ("Open the Bread app", "tap", "fingerprint"). content-source/extension.md already has the owner-verified extension body (§6); nothing to do for migration. Notion housekeeping: paste §6 into the Extension page when convenient so Notion matches the repo.
- #6 "supported browsers" appears on the Mobile page.
- Copy defects preserved verbatim for reviewers: Ext #5 caution "This the only official Bread wallet from both Android and iOS" (missing verb); #10 opens "On the Miden wallet page creation"; #10 step 5 offers "Guardian and Public account" where every other article says Guardian / Fully private — a naming inconsistency inside a recovery instruction.
- Mobile #1 documents iOS install only; no Android steps. Ships as-is per the platform rule; top candidate for a future §2 addition.
- Version-specific content to re-check on each release: Mob #9 Guardian operator roster; #6 browser roadmap claim; #21/#22/#23 30- and 20-minute thresholds; Chrome Web Store slug (detail/miden-wallet/…).
- SUPPORT links inside #20 and #23 keep ?cb=4 (verbatim); the Contact Support button uses the URL without it.
- #2 Mobile body has a numbered list that restarts at 1 after the Guardian callout (Notion formatting artefact).
- Link labels say "Miden Wallet" (Play/Chrome stores) vs "Bread Wallet by Miden" (App Store). **Owner decision: labels must read "Bread Wallet".** Applied in content-source/ (Play and Chrome labels); the App Store label already contains "Bread Wallet".

---

## 5. Implementation shape (for after approval)

Content lives in the repo, not fetched from Notion at build time: one Markdown file per article under `src/help-center/content/`, frontmatter `id`, `title` (verbatim), `mainCategory`, `subcategory`, `platforms`, and per-platform body sections where variant. Notion is the authoring origin until migration; afterwards the repo is the source of truth and Notion changes are re-migrated deliberately. Extend the existing data test to articles: every article maps to a real subcategory, titles are unique, each declared platform has a body.

---

## 6. Extension body for #9 (verified by owner 3 Sep 2026 — paste into Notion)

Drawn from flow details already documented in the extension articles #2 and #10; steps 5 and 6 confirmed by the owner against the extension.

Title (unchanged): **How do I restore my wallet with a recovery phrase?**

Before you start, make sure you have:
- Your recovery phrase, written down and ready to enter.
- A fresh install of Bread Wallet in your Chrome browser.

**Steps:**
1. Open Bread Wallet. On the wallet creation page, choose between "Create a new wallet" and "I already have a wallet." Select "I already have a wallet."
2. On the choose your import type page, select "Import with Seed Phrase," then click "Continue."
3. Enter your recovery phrase. Type it into the numbered boxes, word by word, in the exact order you wrote it down. When all the words are in, click "Continue."
4. Create a new password. A minimum of 8 characters with at least 1 number, then click "Continue."
5. Choose how you want to recover your account if you lose access — Guardian or Fully private — then click "Continue."
6. Click "Open Wallet." The tab closes automatically and the wallet opens in the sidebar.

> ⚠️ **Before you type your recovery phrase:** it's the master key to your wallet, and anyone who gets it can take everything.
> - Only enter it in the official Bread Wallet extension — never on a website, pop-up, or form.
> - No support team or admin will ever ask for it. Anyone who does is a scammer.
> - Type it somewhere private, with no screen recording or sharing turned on.


Note: subcategory names above match categories.ts display titles; the migration keys articles on subcategory **ids** (e.g. `sending-receiving-and-claiming`), never on titles.

---

## 7. Screenshot plan (owner-approved positions — placeholders now, real captures later)

Principle: a screenshot goes where the reader has to find something on screen (a button, a page, a menu) — not on concept or FAQ articles. "Notion" = a screenshot existed at that position in the original Mobile page.

### Getting started › Setup and basic use

| Article | Platform | Step | Shows | Source |
|---|---|---|---|---|
| How to install Bread Wallet | Ext | 2 | Chrome Web Store listing with "Add to Chrome" | new |
| How to install Bread Wallet | Ext | after 3 | Browser toolbar: jigsaw icon and pin icon | new |
| How to install Bread Wallet | Mob | 2 | App Store listing with "Get" | new |
| How do I create a Bread Wallet? | Ext | 1 | "Create new wallet" / "I already have a wallet" page | new |
| How do I create a Bread Wallet? | Ext | 2 | Back up your wallet page (seed phrase blurred/sample) | new |
| How do I create a Bread Wallet? | Ext | 4 | Create password page | new |
| How do I create a Bread Wallet? | Ext | 5 | Account recovery: Guardian vs Fully private | new |
| How do I create a Bread Wallet? | Mob | 1 | Welcome to Bread! with "Get started" | Notion |
| How do I create a Bread Wallet? | Mob | 2 | Choose how to protect your wallet (biometrics) | Notion |
| How do I create a Bread Wallet? | Mob | 5 | Pick your Guardian | Notion |
| How to fund your Bread Wallet? | Ext | 1 | Wallet homepage with "Faucet" | new |
| How to fund your Bread Wallet? | Ext | 3–4 | Faucet page: address, amount, Private/Public | new |
| How to fund your Bread Wallet? | Mob | 1 | Explore tab | new |
| How to fund your Bread Wallet? | Mob | 2 | Faucet card | new |
| How to fund your Bread Wallet? | Mob | 3–4 | Faucet page: address, amount, Private/Public | new |
| How to find a token contract address in Bread Wallet? | Ext | 2 | Token Information section with copy icon | new |
| How to find a token contract address in Bread Wallet? | Mob | 1 | Homepage, selecting a token | Notion |
| How to find a token contract address in Bread Wallet? | Mob | 2 | Token Information section | Notion |

No screenshots: Is Bread Wallet available on mobile?; What are the supported browsers for Bread Wallet?

### Manage wallet › Security and recovery

| Article | Platform | Step | Shows | Source |
|---|---|---|---|---|
| How do I restore my wallet with a recovery phrase? | Ext | 1 | "I already have a wallet" selection | new |
| How do I restore my wallet with a recovery phrase? | Ext | 2 | Import type: Seed Phrase / Encrypted Wallet File | new |
| How do I restore my wallet with a recovery phrase? | Ext | 3 | Numbered recovery-phrase entry boxes (sample words) | new |
| How do I restore my wallet with a recovery phrase? | Ext | 5 | Recovery choice: Guardian vs Fully private | new |
| How do I restore my wallet with a recovery phrase? | Mob | 1 | Welcome to Bread! with "Recover your account" | Notion |
| How do I restore my wallet with a recovery phrase? | Mob | 2 | Import type choice | Notion |
| How do I restore my wallet with a recovery phrase? | Mob | 3 | Recovery-phrase entry | Notion |
| How do I restore my wallet with a recovery phrase? | Mob | 4 | Guardian operator list | Notion |
| How do I restore my wallet with a recovery phrase? | Mob | 5 | "Your Wallet is ready!" | Notion |
| How to restore the wallet using an encrypted file? | Ext | 2 | Import type: "Import with encrypted wallet file" | new |
| How to restore the wallet using an encrypted file? | Ext | 3 | Import wallet page: drag-and-drop + password | new |
| How to download the encrypted file? | Ext | 2 | Settings › Security | new |
| How to download the encrypted file? | Ext | 3 | "Encrypted Wallet File" option | new |
| How to download the encrypted file? | Ext | 6 | Download complete / "Done" | new |

No screenshots: Can I recover stolen assets?; How do I keep my wallet secure?; What should I do if I lose my recovery phrase?; What is the difference between a recovery phrase and an encrypted wallet file?

### Everything else
No screenshots for Sending/receiving/claiming, Activity, Privacy, Guardian (all concept articles). Optional later: one screenshot of the Activity view showing a "Consuming"/"Sending" status, attached to the two "stuck" Troubleshooting articles — worth it once real captures are being made.

**Totals:** 32 positions (10 from Notion, 22 new). Extension 18, Mobile 14. Every one starts as the SAMPLE placeholder.

Capture guidance for real screenshots: never show a real recovery phrase, password, or full address — use a throwaway test wallet; crop to the relevant control; same device/browser theme across a platform so the set looks consistent.
