# Article review — encrypted-file articles are flagged Extension only

**Date:** 2026-09-07
**Articles:** `10-how-to-restore-the-wallet-using-an-encrypted-file.md`, `11-how-to-download-the-encrypted-file.md`
**Source of truth:** Path A (repository), commit `731a307`, live bundles `index-Ch0u8dCA.js` / `index-RfSt1PSG.css` — scoped `git status` clean, local `dist/assets` equal to live.
**Status:** PROPOSAL. Nothing changed in `src/help-center/content/` or `content-source/`.

## The finding

These are the **only two articles in the corpus** with `platforms: [extension-desktop]`. `HelpCenter.tsx:774-776` renders a single-platform article with an **"Extension only"** badge, so both currently tell a mobile reader the encrypted wallet file is not for them.

That is wrong for the export path, and the app source settles it.

## Evidence — mobile support is explicit in the code

Claim | Evidence
--- | ---
Export has a dedicated mobile branch | `~/wallet/src/screens/encrypted-file-flow/ExportFileComplete.tsx:76` — `if (isMobile())` writes the file to `Directory.Cache` and opens the native share sheet via `Share.share({ dialogTitle: t('saveEncryptedWalletFile') })`; the `else` branch is the desktop Blob download.
The password step is mobile-aware | `EncryptedWalletFileWalletPassword.tsx:134` — `const usePasscodeEntry = isMobile() && hasHardwareProtector === false`.
There is mobile-specific copy for it | locale key `encryptedWalletFileDescriptionHardware` = "Unlock with your passcode to access your Encrypted Wallet File."
The strings ship in the Android app | `android/app/src/main/assets/public/_locales/en/messages.json` carries the full `encryptedWalletFile*` set.
The approved mobile content already says so | `content-source/mobile.md:117` — the mobile import chooser offers "Import with Encrypted Wallet File"; `mobile.md:189` — "Bread Wallet lets you import or export your wallet using either a recovery phrase or an encrypted wallet file"; `mobile.md:166` — "export an encrypted wallet file too, while you still can."

Checked against `~/wallet` at `f95c4855` (2026-08-27) and `~/wallet-mobile` at `893e22bd` (2026-08-10). `github.com/0xMiden` is an allowed source.

## Why this is not a one-line flag flip

Adding `mobile` to `platforms:` without a mobile body would show desktop steps under a Mobile tab — trading one inaccuracy for another. Both bodies contain desktop-only instructions:

- `11` step 6-7: "The encrypted file downloads automatically — click 'Done'… Locate the file in your Downloads folder." On mobile this is the **share sheet** (`Share.share`), and the file goes wherever the reader sends it. There is no Downloads folder step.
- `11` step 1: "From the wallet homepage, open 'Settings' (top-right corner)" — mobile navigation is a drawer (`EncryptedFileManager.tsx:207` renders a `DrawerTitle` on the mobile branch, a `NavigationHeader` otherwise).
- `10` step 3: "drag and drop the file or choose from a device" — drag-and-drop is not a mobile interaction.

So each article needs a `<!-- platform: mobile -->` section, which is **new copy requiring Ivan's per-line approval**, and it must land in `content-source/mobile.md` as well or `content.test.ts` fails.

## Needs human decision

1. **Article 11 (download/export) — the flag is provably wrong; the mobile steps are the open question.** The `isMobile()` branch tells us *what* happens (cache write + native share sheet with a "Save Encrypted Wallet File" dialog), but not the exact screen sequence a reader taps through. Either Ivan confirms the mobile flow, or someone walks it on the device, before the mobile section can be written accurately.

2. **Article 10 (restore/import) — a larger question than the platform flag.** I could not locate an encrypted-file *import* path anywhere in the current source, on either checkout:
   - `src/screens/encrypted-file-flow/types.ts:1-6` — `EncryptedFileStep` is `WalletPassword | ExportFilePassword | ExportFileComplete | Navigate`. Export steps only; no import step.
   - `src/screens/onboarding/import-wallet-flow/` contains only `ImportSeedPhrase.tsx` and `ImportRecoveryMethod.tsx` (the latter is the Guardian-vs-public choice, not an import-type chooser).
   - I also could not find where `EncryptedFileManager` is mounted, so my search may simply be missing a route registry or a lazily-loaded entry point. **I am not claiming the import flow is gone** — only that I could not find it, and that is worth someone confirming on a device before this article is edited at all.

   If the import flow does still exist on both platforms, article 10 gets the same treatment as 11. If it exists only on the extension, the current flag is right and only article 11 changes. If it no longer exists anywhere, the article describes a removed flow, which is a separate and more urgent problem.

3. **Neither article should ship a mobile tab until its mobile steps are verified.** Flipping the flag alone is available as an interim if Ivan prefers the "Extension only" badge gone immediately, but it would put desktop steps in front of mobile readers.

## What is ready to land once decided

Frontmatter change, identical in both files (the body sections are the part that needs writing):

```
platforms: [extension-desktop, mobile]
```

Shared prose stays above the first marker; the desktop steps move under `<!-- platform: extension-desktop -->` and the new mobile steps under `<!-- platform: mobile -->`, matching `09-how-do-i-restore-my-wallet-with-a-recovery-phrase.md`, which is the corpus's model for a two-platform procedure.

---

## Resolution (Ivan, 2026-09-07)

> "Lets hide this for now instead both extension and mobile and make available when the encrypted file import is ready on the wallet, this is not available on the UI atm."

Article `10` is held back on both platforms until encrypted-file import ships. This confirms the finding above: the import flow is not in the wallet UI.

Article `11` (download/export) is **left published and unchanged**. Its rationale is the opposite one: export demonstrably ships, with a dedicated mobile branch. Its `platforms: [extension-desktop]` flag is still wrong and its "Extension only" badge still misleads, but correcting it needs mobile steps and an entry in `content-source/mobile.md`, so it stays open.
