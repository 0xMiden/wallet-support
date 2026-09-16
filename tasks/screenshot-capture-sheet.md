# Screenshot capture sheet

For Ivan's capture run against the store release, **Bread Wallet 1.16.0**, on both platforms. The positions
are §7 of `tasks/content-proposal.md`; tick them off in the screenshot capture list in
`tasks/todo.md`.

## Before you start

- Confirm **Settings** shows **Version 1.16.0** in the extension and on the phone (Q1 at the end).
- From §7: never show a real recovery phrase, password, or full address — use a throwaway test wallet; crop
  to the relevant control; keep one device and one theme for each platform.
- Keep the throwaway wallet's recovery phrase (E04) and its encrypted wallet file (E12) until both runs are
  done: the restore flows need them.
- The order comes from the articles' steps, not from the live wallet. Where the real flow differs, follow
  the wallet and keep the position IDs, so every capture still lands in its place.
- The labels to read (L1–L7, the seven conflicts under Verify against wallet build in `tasks/todo.md`) and
  the checks (Q1–Q3) are marked where they come up. Write the answers into the two tables at the end.
- **Each capture is two steps: save the file, then register its size.** Save into
  `src/help-center/assets/screenshots/`, then add the one line printed under each position to
  `SCREENSHOT_SIZES`, filling in the file's own width and height in pixels. The size is written down
  because the browser needs it before the image arrives; without it the page reflows under the reader as
  each screenshot loads, which is worst on a phone. Nothing else needs changing — the renderer already
  takes a screenshot inside a step.
- If you forget the line, the build stops and names the file and the exact shape to add, so a missing
  entry cannot ship. If you get the numbers wrong, `content.test.ts` fails and prints the file's real
  size. Neither is something to guard against by hand.
- Put the image into the article on its own line in the step's block, indented under the step:
  `![alt text](E01-install-web-store.png)`. Alt text is required. Mirror the same line into
  `content-source/` or the fidelity test fails.

## Extension run: Chrome, 18 positions

### A. Install

#### E01 · How to install Bread Wallet · Ext · step 2
- **Must show:** the Chrome Web Store listing for **Bread Wallet by Miden**, with **Add to Chrome**.
- The Help Center's Chrome link still points at a dead listing. Open the live one directly:
  `https://chromewebstore.google.com/detail/bread-wallet-by-miden/coajhopfooegmaifelglfboehacldcbo`
- **Save as:** `E01-install-web-store.png`
- **Then register:** `'E01-install-web-store.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E02 · How to install Bread Wallet · Ext · step after 3
- **Must show:** the browser toolbar, with the **jigsaw icon** menu open and the **pin icon** beside Bread
  Wallet.
- **Save as:** `E02-install-pin.png`
- **Then register:** `'E02-install-pin.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### B. Create a wallet

#### E03 · How do I create a Bread Wallet? · Ext · step 1
- **Must show:** the first page, with the option to create a new wallet and **I already have a wallet**.
- **Read L3 and L4:** the exact wording of the create option.
- **Save as:** `E03-create-first-page.png`
- **Then register:** `'E03-create-first-page.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E04 · How do I create a Bread Wallet? · Ext · step 2
- **Must show:** the **back up your wallet** page, with the seed phrase blurred or replaced by sample words.
- **Save as:** `E04-create-back-up.png`
- **Then register:** `'E04-create-back-up.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E05 · How do I create a Bread Wallet? · Ext · step 4
- **Must show:** the create password page, with the fields empty or masked.
- **Save as:** `E05-create-password.png`
- **Then register:** `'E05-create-password.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E06 · How do I create a Bread Wallet? · Ext · step 5
- **Must show:** the account recovery page, with **Guardian** and **Fully private**.
- **Read L1:** on the screen after it, the exact label of the button that opens the wallet.
- **Save as:** `E06-create-recovery-choice.png`
- **Then register:** `'E06-create-recovery-choice.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### C. Fund the wallet

#### E07 · How to fund your Bread Wallet? · Ext · step 1
- **Must show:** the wallet homepage, with **Faucet**.
- **Save as:** `E07-fund-homepage.png`
- **Then register:** `'E07-fund-homepage.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E08 · How to fund your Bread Wallet? · Ext · step 3–4
- **Must show:** the faucet page with the address, the amount, and the **Private** / **Public** choice. Mask
  all but a few characters of the address.
- **Save as:** `E08-fund-faucet-page.png`
- **Then register:** `'E08-fund-faucet-page.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### D. Find a token contract address

Token Information needs a token in the wallet; the faucet request in C should provide one once it arrives.

#### E09 · How to find a token contract address in Bread Wallet? · Ext · step 2
- **Must show:** the Token Information section, with the copy icon.
- **Save as:** `E09-token-information.png`
- **Then register:** `'E09-token-information.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### E. Download the encrypted file

#### E10 · How to download the encrypted file? · Ext · step 2
- **Must show:** Settings, open at **Security**.
- **Save as:** `E10-download-security.png`
- **Then register:** `'E10-download-security.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E11 · How to download the encrypted file? · Ext · step 3
- **Must show:** the **Encrypted Wallet File** option.
- **Save as:** `E11-download-option.png`
- **Then register:** `'E11-download-option.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E12 · How to download the encrypted file? · Ext · step 6
- **Must show:** the download complete screen, with **Done**.
- **Save as:** `E12-download-done.png`
- **Then register:** `'E12-download-done.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### F. Restore with a recovery phrase

Start fresh first: remove the extension or open a new Chrome profile, then install it again.

#### E13 · How do I restore my wallet with a recovery phrase? · Ext · step 1
- **Must show:** the first page, with **I already have a wallet** selected.
- **Read L3 and L4 again:** the create option, which should read as it did at E03.
- **Save as:** `E13-restore-first-page.png`
- **Then register:** `'E13-restore-first-page.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E14 · How do I restore my wallet with a recovery phrase? · Ext · step 2
- **Must show:** the import type page, with every option it offers.
- **Check Q2 here, before going on:** is importing from an encrypted wallet file offered? The app source
  checked when How to restore the wallet using an encrypted file? was held back had no such import. If it is
  not offered, capture the page as it is, skip E17 and E18, and say so in Q2.
- **Save as:** `E14-restore-import-type.png`
- **Then register:** `'E14-restore-import-type.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E15 · How do I restore my wallet with a recovery phrase? · Ext · step 3
- **Must show:** the numbered recovery-phrase boxes, with the words blurred or replaced by sample words.
- **Save as:** `E15-restore-phrase-boxes.png`
- **Then register:** `'E15-restore-phrase-boxes.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E16 · How do I restore my wallet with a recovery phrase? · Ext · step 5
- **Must show:** the recovery choice, with **Guardian** and **Fully private**.
- **Read L1 again:** on the screen after it, the exact label of the button that opens the wallet.
- **Save as:** `E16-restore-recovery-choice.png`
- **Then register:** `'E16-restore-recovery-choice.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### G. Restore with an encrypted file

Only if Q2 is yes; otherwise skip to the Mobile run. Start fresh once more, then choose **I already have a
wallet** and the encrypted wallet file.

#### E17 · How to restore the wallet using an encrypted file? · Ext · step 2
- **Must show:** the import type page, with **Import with encrypted wallet file** selected.
- **Save as:** `E17-file-restore-import-type.png`
- **Then register:** `'E17-file-restore-import-type.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E18 · How to restore the wallet using an encrypted file? · Ext · step 3
- **Must show:** the import wallet page, with the drag-and-drop area and the password field empty or masked.
- **Read L7, Extension half:** finish the flow and read the label of its last button.
- **Save as:** `E18-file-restore-import-page.png`
- **Then register:** `'E18-file-restore-import-page.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

## Mobile run: phone, 14 positions

### A. Install

#### M01 · How to install Bread Wallet · Mob · step 2
- **Must show:** the App Store listing, with **Get**.
- §7 names the App Store, so on an Android phone this is the one position that needs an iPhone.
- **Save as:** `M01-install-app-store.png`
- **Then register:** `'M01-install-app-store.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### B. Create a wallet

#### M02 · How do I create a Bread Wallet? · Mob · step 1
- **Must show:** the **Welcome to Bread!** screen, with both of its options.
- **Read L7, Mobile half:** the exact label of the create button.
- **Save as:** `M02-create-welcome.png`
- **Then register:** `'M02-create-welcome.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M03 · How do I create a Bread Wallet? · Mob · step 2
- **Must show:** the screen for choosing how to protect the wallet, with the biometric option.
- **Save as:** `M03-create-protect.png`
- **Then register:** `'M03-create-protect.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M04 · How do I create a Bread Wallet? · Mob · step 5
- **Must show:** the Guardian choice.
- **Read L2 and L5:** on the screen after it, its exact title and the label of the button that opens the
  wallet.
- **Save as:** `M04-create-guardian.png`
- **Then register:** `'M04-create-guardian.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### C. Fund the wallet

#### M05 · How to fund your Bread Wallet? · Mob · step 1
- **Must show:** the **Explore** tab.
- **Save as:** `M05-fund-explore.png`
- **Then register:** `'M05-fund-explore.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M06 · How to fund your Bread Wallet? · Mob · step 2
- **Must show:** the **Faucet** card.
- **Save as:** `M06-fund-faucet-card.png`
- **Then register:** `'M06-fund-faucet-card.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M07 · How to fund your Bread Wallet? · Mob · step 3–4
- **Must show:** the faucet page with the address, the amount, and the **Private** / **Public** choice. Mask
  all but a few characters of the address.
- **Save as:** `M07-fund-faucet-page.png`
- **Then register:** `'M07-fund-faucet-page.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### D. Find a token contract address

#### M08 · How to find a token contract address in Bread Wallet? · Mob · step 1
- **Must show:** the homepage, with a token being selected.
- **Save as:** `M08-token-homepage.png`
- **Then register:** `'M08-token-homepage.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M09 · How to find a token contract address in Bread Wallet? · Mob · step 2
- **Must show:** the Token Information section.
- **Save as:** `M09-token-information.png`
- **Then register:** `'M09-token-information.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### E. The encrypted file on Mobile

No screenshot here.

- **Check Q3 before starting fresh:** does Settings on the phone offer a way to export an encrypted wallet
  file? The app source has a mobile branch for it, and How to download the encrypted file? has Extension
  steps only. If it is there, note the menu path and each label on the way.

### F. Restore with a recovery phrase

Start fresh first: delete the app and install it again. The Mobile create flow shows no recovery phrase, so
use the one from E04.

#### M10 · How do I restore my wallet with a recovery phrase? · Mob · step 1
- **Must show:** the **Welcome to Bread!** screen, with **Recover your account**.
- **Save as:** `M10-restore-welcome.png`
- **Then register:** `'M10-restore-welcome.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M11 · How do I restore my wallet with a recovery phrase? · Mob · step 2
- **Must show:** the import type choice.
- **Save as:** `M11-restore-import-type.png`
- **Then register:** `'M11-restore-import-type.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M12 · How do I restore my wallet with a recovery phrase? · Mob · step 3
- **Must show:** the recovery-phrase entry, with the words blurred or replaced by sample words.
- **Save as:** `M12-restore-phrase.png`
- **Then register:** `'M12-restore-phrase.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M13 · How do I restore my wallet with a recovery phrase? · Mob · step 4
- **Must show:** the Guardian operator list, with every operator and region visible.
- **Save as:** `M13-restore-operators.png`
- **Then register:** `'M13-restore-operators.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M14 · How do I restore my wallet with a recovery phrase? · Mob · step 5
- **Must show:** the ready screen at the end of the restore.
- **Read L2 and L6:** its exact title and the label of the button that opens the wallet.
- **Save as:** `M14-restore-ready.png`
- **Then register:** `'M14-restore-ready.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

## Answers

The seven conflicts, in the order of the Verify against wallet build table in `tasks/todo.md`. `02:23` is
line 23 of the article file starting `02-`.

| | Label as written | Where | Read at | The screen shows |
| --- | --- | --- | --- | --- |
| L1 | `Open Wallet` | `02:23` (x2), `09:23` | Extension, after E06 and after E16 | |
| L2 | `Open wallet` | `02:47`, `09:49` | Mobile, after M04 and at M14 | |
| L3 | `Create a new wallet` | `09:18`, `10:18` | Extension, E03 and E13 | |
| L4 | `Create new wallet` | `02:11`, `02:15` | Extension, E03 and E13 | |
| L5 | `Your Wallet is ready` | `02:46` | Mobile, after M04 | |
| L6 | `Your Wallet is ready!` | `09:49` | Mobile, M14 | |
| L7 | `Get started` | `02:27`, `02:33` (mobile), `10:22` (extension) | Mobile, M02; Extension, end of G | |

If G could not be run, leave the Extension half of L7 blank.

| | Check | Answer |
| --- | --- | --- |
| Q1 | Settings shows Version 1.16.0: in the extension, on the phone | |
| Q2 | At E14, the import type page offers an encrypted wallet file | |
| Q3 | Settings on the phone offers an encrypted wallet file export: menu path and labels | |
