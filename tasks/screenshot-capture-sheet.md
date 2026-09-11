# Screenshot capture sheet

For Ivan's capture run against the store release, **Bread Wallet 1.16.0**, on both platforms. The positions
are §7 of `tasks/content-proposal.md`; tick them off in the screenshot capture list at the end of
`tasks/todo.md`.

> **Settle before capturing.** §7's tables list **18 Extension and 14 Mobile** positions; its totals line
> says Extension 20, Mobile 12. This sheet follows the tables, so if positions are missing from them, they
> are missing here too.

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

## Extension run: Chrome, 18 positions

### A. Install

#### E01 · How to install Bread Wallet · Ext · step 2
- **Must show:** the Chrome Web Store listing for **Bread Wallet by Miden**, with **Add to Chrome**.
- The Help Center's Chrome link still points at a dead listing. Open the live one directly:
  `https://chromewebstore.google.com/detail/bread-wallet-by-miden/coajhopfooegmaifelglfboehacldcbo`
- **Save as:** `E01-install-web-store.png`

#### E02 · How to install Bread Wallet · Ext · step after 3
- **Must show:** the browser toolbar, with the **jigsaw icon** menu open and the **pin icon** beside Bread
  Wallet.
- **Save as:** `E02-install-pin.png`

### B. Create a wallet

#### E03 · How do I create a Bread Wallet? · Ext · step 1
- **Must show:** the first page, with the option to create a new wallet and **I already have a wallet**.
- **Read L3 and L4:** the exact wording of the create option.
- **Save as:** `E03-create-first-page.png`

#### E04 · How do I create a Bread Wallet? · Ext · step 2
- **Must show:** the **back up your wallet** page, with the seed phrase blurred or replaced by sample words.
- **Save as:** `E04-create-back-up.png`

#### E05 · How do I create a Bread Wallet? · Ext · step 4
- **Must show:** the create password page, with the fields empty or masked.
- **Save as:** `E05-create-password.png`

#### E06 · How do I create a Bread Wallet? · Ext · step 5
- **Must show:** the account recovery page, with **Guardian** and **Fully private**.
- **Read L1:** on the screen after it, the exact label of the button that opens the wallet.
- **Save as:** `E06-create-recovery-choice.png`

### C. Fund the wallet

#### E07 · How to fund your Bread Wallet? · Ext · step 1
- **Must show:** the wallet homepage, with **Faucet**.
- **Save as:** `E07-fund-homepage.png`

#### E08 · How to fund your Bread Wallet? · Ext · step 3–4
- **Must show:** the faucet page with the address, the amount, and the **Private** / **Public** choice. Mask
  all but a few characters of the address.
- **Save as:** `E08-fund-faucet-page.png`

### D. Find a token contract address

Token Information needs a token in the wallet; the faucet request in C should provide one once it arrives.

#### E09 · How to find a token contract address in Bread Wallet? · Ext · step 2
- **Must show:** the Token Information section, with the copy icon.
- **Save as:** `E09-token-information.png`

### E. Download the encrypted file

#### E10 · How to download the encrypted file? · Ext · step 2
- **Must show:** Settings, open at **Security**.
- **Save as:** `E10-download-security.png`

#### E11 · How to download the encrypted file? · Ext · step 3
- **Must show:** the **Encrypted Wallet File** option.
- **Save as:** `E11-download-option.png`

#### E12 · How to download the encrypted file? · Ext · step 6
- **Must show:** the download complete screen, with **Done**.
- **Save as:** `E12-download-done.png`

### F. Restore with a recovery phrase

Start fresh first: remove the extension or open a new Chrome profile, then install it again.

#### E13 · How do I restore my wallet with a recovery phrase? · Ext · step 1
- **Must show:** the first page, with **I already have a wallet** selected.
- **Read L3 and L4 again:** the create option, which should read as it did at E03.
- **Save as:** `E13-restore-first-page.png`

#### E14 · How do I restore my wallet with a recovery phrase? · Ext · step 2
- **Must show:** the import type page, with every option it offers.
- **Check Q2 here, before going on:** is importing from an encrypted wallet file offered? The app source
  checked when How to restore the wallet using an encrypted file? was held back had no such import. If it is
  not offered, capture the page as it is, skip E17 and E18, and say so in Q2.
- **Save as:** `E14-restore-import-type.png`

#### E15 · How do I restore my wallet with a recovery phrase? · Ext · step 3
- **Must show:** the numbered recovery-phrase boxes, with the words blurred or replaced by sample words.
- **Save as:** `E15-restore-phrase-boxes.png`

#### E16 · How do I restore my wallet with a recovery phrase? · Ext · step 5
- **Must show:** the recovery choice, with **Guardian** and **Fully private**.
- **Read L1 again:** on the screen after it, the exact label of the button that opens the wallet.
- **Save as:** `E16-restore-recovery-choice.png`

### G. Restore with an encrypted file

Only if Q2 is yes; otherwise skip to the Mobile run. Start fresh once more, then choose **I already have a
wallet** and the encrypted wallet file.

#### E17 · How to restore the wallet using an encrypted file? · Ext · step 2
- **Must show:** the import type page, with **Import with encrypted wallet file** selected.
- **Save as:** `E17-file-restore-import-type.png`

#### E18 · How to restore the wallet using an encrypted file? · Ext · step 3
- **Must show:** the import wallet page, with the drag-and-drop area and the password field empty or masked.
- **Read L7, Extension half:** finish the flow and read the label of its last button.
- **Save as:** `E18-file-restore-import-page.png`

## Mobile run: phone, 14 positions

### A. Install

#### M01 · How to install Bread Wallet · Mob · step 2
- **Must show:** the App Store listing, with **Get**.
- §7 names the App Store, so on an Android phone this is the one position that needs an iPhone.
- **Save as:** `M01-install-app-store.png`

### B. Create a wallet

#### M02 · How do I create a Bread Wallet? · Mob · step 1
- **Must show:** the **Welcome to Bread!** screen, with both of its options.
- **Read L7, Mobile half:** the exact label of the create button.
- **Save as:** `M02-create-welcome.png`

#### M03 · How do I create a Bread Wallet? · Mob · step 2
- **Must show:** the screen for choosing how to protect the wallet, with the biometric option.
- **Save as:** `M03-create-protect.png`

#### M04 · How do I create a Bread Wallet? · Mob · step 5
- **Must show:** the Guardian choice.
- **Read L2 and L5:** on the screen after it, its exact title and the label of the button that opens the
  wallet.
- **Save as:** `M04-create-guardian.png`

### C. Fund the wallet

#### M05 · How to fund your Bread Wallet? · Mob · step 1
- **Must show:** the **Explore** tab.
- **Save as:** `M05-fund-explore.png`

#### M06 · How to fund your Bread Wallet? · Mob · step 2
- **Must show:** the **Faucet** card.
- **Save as:** `M06-fund-faucet-card.png`

#### M07 · How to fund your Bread Wallet? · Mob · step 3–4
- **Must show:** the faucet page with the address, the amount, and the **Private** / **Public** choice. Mask
  all but a few characters of the address.
- **Save as:** `M07-fund-faucet-page.png`

### D. Find a token contract address

#### M08 · How to find a token contract address in Bread Wallet? · Mob · step 1
- **Must show:** the homepage, with a token being selected.
- **Save as:** `M08-token-homepage.png`

#### M09 · How to find a token contract address in Bread Wallet? · Mob · step 2
- **Must show:** the Token Information section.
- **Save as:** `M09-token-information.png`

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

#### M11 · How do I restore my wallet with a recovery phrase? · Mob · step 2
- **Must show:** the import type choice.
- **Save as:** `M11-restore-import-type.png`

#### M12 · How do I restore my wallet with a recovery phrase? · Mob · step 3
- **Must show:** the recovery-phrase entry, with the words blurred or replaced by sample words.
- **Save as:** `M12-restore-phrase.png`

#### M13 · How do I restore my wallet with a recovery phrase? · Mob · step 4
- **Must show:** the Guardian operator list, with every operator and region visible.
- **Save as:** `M13-restore-operators.png`

#### M14 · How do I restore my wallet with a recovery phrase? · Mob · step 5
- **Must show:** the ready screen at the end of the restore.
- **Read L2 and L6:** its exact title and the label of the button that opens the wallet.
- **Save as:** `M14-restore-ready.png`

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
