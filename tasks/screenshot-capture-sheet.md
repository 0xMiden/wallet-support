# Screenshot capture sheet

For Ivan's capture run, on both platforms. The positions are §7 of `tasks/content-proposal.md`; tick them
off in the screenshot capture list in `tasks/todo.md`.

**Version captured against, per run.** The two runs happen at different times on different builds, so the
version is recorded once per run rather than once for the sheet: a reader needs to know which build a
given screenshot came from, and "the store release" stops meaning anything as soon as the store moves.

| Run | Version | State |
|---|---|---|
| Extension | **1.16.1** | in progress, from 2026-09-16 |
| Mobile | record it from Settings when the run starts | not started; separate run, later build |

1.16.1 is what Settings reports in the build being captured. It supersedes the 1.16.0 this sheet carried,
which came from the store listing — the installed build is the authority, not the listing.

## Image spec — keep this open while capturing

**Every capture is at least 2x: at least twice the width it will be shown at.** That one rule is what
makes the set look like a set. It is crisp on a modern display, and with the stroke set by the
capture's width (under Annotation) the box always lands at 3px on screen, whatever the capture is of.

The article column is at most **680px** (68ch, `--measure`) and never wider, so 680px is the widest any
image is ever shown. An image wider than the column is scaled down to fit it; an image narrower than the
column is shown at its own size. A capture tagged `'narrow'` is the exception: it is shown at half its
width, which is life size for a 200% capture.

### Two categories, decided by how wide the surface naturally is

Not by who owns it. Bread Wallet's sidebar is a narrow panel like a Chrome menu, not like a full tab.

| | **A · Fills the column** | **B · A narrow panel, menu or dialog** |
|---|---|---|
| What | A page in a browser tab — the whole tab, or the part of it that matters (E01: the top of the Chrome Web Store listing); any Bread Wallet screen that opens as a full page in a tab | Chrome's jigsaw menu and **Add extension** dialog; Bread Wallet's sidebar or popup |
| How | **Whole tab:** Chrome DevTools, device toolbar, width **1360**, DPR **1**. **Part of a tab:** OS screenshot at **150%** Windows display scaling, cropped to the part that matters | OS screenshot at **200%** Windows display scaling, cropped tight to the surface |
| Capture width | **Whole tab:** exactly **1360px**. **Part of a tab:** **1360–2040px** | whatever the surface comes to at 2x, **520–1200px** (floor lowered 2026-09-18 and 2026-09-23, see below) |
| Shown at | 680px — the full column, identical for every one | half the capture, so it appears at life size — the `'narrow'` tag is what tells the page to halve it |

**Why 1360 at DPR 1 and not 680 at DPR 2.** Both give 1360 device pixels, which is what the 2x rule
needs. But a page laid out for a 680px viewport is the site's *narrow* layout — the Chrome Web Store at
680px is not the listing anyone sees on a desktop. 1360 CSS pixels is a desktop viewport, so the capture
shows the desktop layout, and the 1360 device pixels still land exactly 2x on a 680px render.

**Part of a tab, and why 1360–2040.** When only one region of a page matters, crop to it instead of
shooting the whole tab — E01 shows the top of the listing, where the icon, the name **Bread Wallet by
Miden** and **Add to Chrome** sit together. Take it with the OS screenshot tool at 150%, the scaling this
run's display already uses. Every file under 1360px is under 2x on the 680px column, so that is the floor
— at 150% it means a region at least about 910 CSS px wide. 2040px at 150% is 1360 CSS px of page, as
much as a whole-tab capture holds, so that is the ceiling: any wider and the page shows smaller than a
whole tab does. A region that wide should be a whole-tab capture instead.

A tab-width surface gets one fixed width because you choose it: a page reflows to whatever viewport is
set, so there is no reason for two of them to differ. A narrow surface cannot — a menu is the size it
is, and stretching it to 1360px would show it at twice life size, which looks crude beside the real
thing. Forcing both into a single width is what would look wrong here, not the two categories.

### How small a surface can still clear the floor

At 200% scaling a surface W CSS pixels wide captures at 2W, so the **560px floor needs a surface at
least 280 CSS pixels wide**. Everything in this run clears that:

| Surface | Roughly, CSS px | At 200% | Floor |
|---|---|---|---|
| Chrome's jigsaw menu (E02) | 310–370 | 620–740 | clears 560 |
| Chrome's **Add extension** dialog (E01a) | ~400 | ~800 | clears 560 |
| Bread Wallet's sidebar | ~400 | ~800 | clears 560 |

The floor is 560 and not 800 for exactly this reason: the jigsaw menu is the smallest thing in the run
and lands near 620 at 200%, so an 800px floor would have made E02 impossible to shoot to spec. 560 is
still high enough to catch the mistake it exists to catch — the same menu captured at 1x lands near
310, and even a 400px dialog at 1x lands at 400, both well under it.

If a surface ever comes out under 560, raise Windows scaling past 200% for that shot rather than
upscaling the file afterwards.

**Floor lowered to 540 (2026-09-18).** Ivan captures Bread Wallet's sidebar at 150% scaling, where it
comes to about 547px (E07, E08). 540 still catches a 1x capture: the menus, dialogs and sidebar land
between 310 and 435 at 1x.

**Floor lowered to 520 (2026-09-23).** The Guardian switch captures E19 to E23 came to 528–530px at the
same 150% scaling. 520 still catches a 1x capture.

**Each position below is pre-tagged A or B.** The pattern is simple: everything before the wallet opens
is onboarding in a browser tab, so it is A; everything inside the running wallet is the sidebar, so it
is B. A few are marked **you decide** where the step text does not settle it — each says what to look
at. If a pre-tagged one turns out wrong when you see it, the tag is a starting point, not a ruling.

### The rest of the rules

- **Height: free, up to 1.3× the width.** Content decides how tall a screen is. Past that the image
  dominates the article on a phone, where it already runs the full width — split it into two captures.
- **Format: PNG.** Lossless, and UI is flat colour so it compresses well: a 1786px capture came to 160 KB.
  Not WebP — the test suite's PNG reader would need extending, for no saving worth having at these sizes.
- **Ceiling: 400 KB a file.** Nothing captured so far is close. Each article loads only its own images,
  lazily, so the run's total is not what any reader pays.
- **Never upscale to reach a width.** An enlarged small capture is visibly soft, which is worse than
  showing it small.

### Annotation

Read off the first three captures, so every later one matches without eyeballing it:

- **Colour:** `#E61B1B` — rgb(230, 27, 27)
- **Stroke:** **3px on screen**, the same on all four edges. Set it from the capture's width: **capture
  width × 3 ÷ 680**, rounded. A 1360px capture takes **6px**; E01, at 1783px, takes **8px**. A
  narrow-surface capture is shown at half its width, so it takes **6px** whatever its width.
- **Corners:** square, no radius
- **Drawn last**, on the final image at its capture size, so it scales down with everything else to 3px

**Only the Chrome install screenshots (E01, E01a, E02) get a box** — Ivan, 2026-09-17. Screenshots of
Bread Wallet's own screens carry none. Nothing is drawn on a delivered capture without Ivan asking.

### If a capture misses the spec

`content.test.ts` fails the build and names the file and the number it found: a column-width capture
outside 1360–2040px, a narrow-surface capture outside 520–1200px, any image taller than 1.3× its width, or
any file over 400 KB. The test cannot tell a whole tab from part of one, so a whole-tab capture that is
not exactly 1360px, or a stroke that is not 3px on screen, is still yours to check.

## Before you start

- Confirm **Settings** shows the version for the run you are doing — **1.16.1** for the extension; for
  the mobile run, read it and record it in the table above (Q1 at the end).
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

## Extension run: Chrome, 20 positions

### A. Install

#### E01 · How to install Bread Wallet · Ext · step 2
- **Must show:** the Chrome Web Store listing for **Bread Wallet by Miden**, with **Add to Chrome**.
- The article's Chrome link is correct and live — it points at
  `bread-wallet-by-miden/coajhopfooegmaifelglfboehacldcbo`, so open it from the article. (This position
  once warned the link was dead; that was fixed before the run began.)
- **Framing (Ivan, 2026-09-17):** the top of the listing, not the whole page — the icon, the name, the
  rating and **Add to Chrome**. This replaces the earlier whole-page framing.
- **Save as:** `E01-install-web-store.png`
- **Capture as:** **A · part of a tab** — OS screenshot at 150% scaling, cropped to the top of the listing
- **Captured:** 1783 × 363, 8px box. The 8px is Ivan's 6px box thickened inward by 2px, so its outer
  edge is where he drew it.
- **Then register:** `'E01-install-web-store.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E01a · How to install Bread Wallet · Ext · step 3
- **Must show:** Chrome's confirmation dialog, **Add "Bread Wallet by Miden"?**, with **Add extension**.
- Added 2026-09-16 on Ivan's call, after the capture run began: §7 had no position for step 3. It is a
  33rd position, not a renumbering — E02 onwards keep the IDs this sheet already gave them.
- **Save as:** `E01a-install-add-extension.png`
- **Captured 2026-09-17:** 870 × 486 at 200%, shown at 435 × 243. The box is 8px, so 4px on screen, and
  **Cancel** shows Chrome's focus ring; Ivan accepted both.
- **Capture as:** **B · narrow surface** — OS screenshot at 200% scaling, cropped tight
- **Then register:** `'E01a-install-add-extension.png': [width, height, 'narrow'],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E02 · How to install Bread Wallet · Ext · step after 3
- **Must show:** Chrome's **Extensions** menu, open, with the **pin icon** beside Bread Wallet — taken
  before pinning, so the pin is the plain one the reader will see.
- **The toolbar and jigsaw icon are optional** (Ivan, 2026-09-17): the step text already says where the
  menu opens from, and MetaMask's own help shows the menu alone.
- **Save as:** `E02-install-pin.png`
- **Captured 2026-09-17:** 616 × 300 at 200%, the menu alone, before pinning; shown at 308 × 150. The box is
  8px, so 4px on screen; Ivan accepted it.
- **Capture as:** **B · narrow surface** — OS screenshot at 200% scaling, cropped tight
- **Then register:** `'E02-install-pin.png': [width, height, 'narrow'],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### B. Create a wallet

The wallet's onboarding changed before this position was shot: there is no longer a back-up page or a
Guardian-or-Fully-private choice while creating a wallet, and the article's steps were rewritten to
match (Ivan, 2026-09-17). E03 to E06 keep their numbers but now show the new screens, and E06a is a
34th position for the last one. All five were taken at 150% and are tagged narrow, so they show at
half their width: about three-quarters of life size, which Ivan accepted. They carry **no box**:
boxes are for the Chrome install screenshots only (Ivan, 2026-09-17, after boxes were added here
without asking and looked messy). Only the empty space below the content was cropped, to meet the
height rule; every remaining pixel is the file as delivered.

#### E03 · How do I create a Bread Wallet? · Ext · step 1
- **Shows:** **Welcome to Bread!**, with **Get started**.
- **File:** `E03-create-get-started.png`, 820 × 903, narrow

#### E04 · How do I create a Bread Wallet? · Ext · step 2
- **Shows:** the Miden Testnet notice (*You are using Bread on Miden Testnet*), with **I understand**. The article calls it the Acknowledgment Screen page, by Ivan's choice. Retaken once to lose
  the mouse pointer.
- **File:** `E04-create-testnet-notice.png`, 817 × 991, narrow

#### E05 · How do I create a Bread Wallet? · Ext · step 3
- **Shows:** **Create password**, fields masked.
- **File:** `E05-create-password.png`, 824 × 879, narrow

#### E06 · How do I create a Bread Wallet? · Ext · step 4
- **Shows:** **Choose your Guardian**, with the four operators.
- **File:** `E06-create-guardian.png`, 819 × 953, narrow

#### E06a · How do I create a Bread Wallet? · Ext · step 5
- **Shows:** **Your Wallet is ready!**, with **Open wallet**.
- **File:** `E06a-create-wallet-ready.png`, 821 × 582, narrow

### C. Fund the wallet

The article's extension steps were rewritten by Ivan on 2026-09-18 to match build 1.16.1: there is no
**Faucet** button or **Go to faucet** page in the extension; funding is the **Fund your wallet** card on
Home (**Fund now**), tracked on **Activity**. Both captures are used exactly as Ivan took them, at 150%,
uncropped, so they are exempt from the height ceiling in `content.test.ts` by name.

#### E07 · How to fund your Bread Wallet? · Ext · step 2
- **Shows:** Home, with the **Fund your wallet** card. Ivan's own red box on the card.
- **File:** `E07-fund-homepage.png`, 547 × 909, narrow

#### E08 · How to fund your Bread Wallet? · Ext · step 5
- **Shows:** **Activity**, with a **Faucet Request** of 100 MIDEN, **Confirmed**.
- **File:** `E08-fund-activity.png`, 549 × 1305, narrow

### D. Find a token contract address

**On hold (2026-09-18):** the article is hidden by Ivan's call; Token Information is not visible in the
wallet at the moment. Skip this section until the article is published again.

Token Information needs a token in the wallet; the faucet request in C should provide one once it arrives.

#### E09 · How to find a token contract address in Bread Wallet? · Ext · step 2
- **Must show:** the Token Information section, with the copy icon.
- **Save as:** `E09-token-information.png`
- **Capture as:** **B · narrow surface** — OS screenshot at 200% scaling, cropped tight
- **Then register:** `'E09-token-information.png': [width, height, 'narrow'],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### E. Download the encrypted file

#### E10 · How to download the encrypted file? · Ext · step 2
- **Must show:** Settings, open at **Security**.
- **Save as:** `E10-download-security.png`
- **Capture as:** **B · narrow surface** — OS screenshot at 200% scaling, cropped tight
- **Then register:** `'E10-download-security.png': [width, height, 'narrow'],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E11 · How to download the encrypted file? · Ext · step 3
- **Must show:** the **Encrypted Wallet File** option.
- **Save as:** `E11-download-option.png`
- **Capture as:** **B · narrow surface** — OS screenshot at 200% scaling, cropped tight
- **Then register:** `'E11-download-option.png': [width, height, 'narrow'],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E12 · How to download the encrypted file? · Ext · step 6
- **Must show:** the download complete screen, with **Done**.
- **Save as:** `E12-download-done.png`
- **Capture as:** **B · narrow surface** — OS screenshot at 200% scaling, cropped tight
- **Then register:** `'E12-download-done.png': [width, height, 'narrow'],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### F. Restore with a recovery phrase

The restore flow changed like the create flow did: **Recover your account**, the Miden Testnet notice,
the recovery phrase, Create password, the account recovery page, then **Your Wallet is ready!**, after
which the wallet rotates the everyday key before the sidebar opens. There is no import-type page, and
the steps are Brian's (PR #21). E13 to E16 keep their numbers but show the new screens; E15a, E16a and
E16b are new positions (Ivan, 2026-09-23). The six onboarding captures were taken at 150% and are
tagged narrow; the key-rotation screen is part of a tab and fills the column. They carry **no box**.
Only the empty space below the content was cropped, 64px left under it as in section B (61px for E14,
to meet the height rule); every remaining pixel is the file as delivered. E16 is shown whole rather
than split, past the height ceiling, by Ivan's call (2026-09-23).

#### E13 · How do I restore my wallet with a recovery phrase? · Ext · step 1
- **Shows:** **Welcome to Bread!**, with **Recover your account**.
- **File:** `E13-restore-welcome.png`, 789 × 902, narrow

#### E14 · How do I restore my wallet with a recovery phrase? · Ext · step 2
- **Shows:** the Miden Testnet notice, with **I understand**. Q2 answered: there is no import-type page,
  so encrypted-file import is not offered; E17 and E18 are skipped.
- **File:** `E14-restore-testnet-notice.png`, 764 × 993, narrow

#### E15 · How do I restore my wallet with a recovery phrase? · Ext · step 3
- **Shows:** **Import Wallet**, the twelve numbered boxes blurred.
- **File:** `E15-restore-phrase-boxes.png`, 820 × 813, narrow

#### E15a · How do I restore my wallet with a recovery phrase? · Ext · step 4
- **Shows:** **Create password**, fields masked.
- **File:** `E15a-restore-password.png`, 825 × 849, narrow

#### E16 · How do I restore my wallet with a recovery phrase? · Ext · step 5
- **Shows:** *How would you like to recover this wallet?*, with the four Guardian operators,
  **Import public account**, and **Continue**. Used as delivered, not cropped.
- **File:** `E16-restore-recovery-choice.png`, 820 × 1284, narrow, full height by Ivan

#### E16a · How do I restore my wallet with a recovery phrase? · Ext · step 6
- **Shows:** **Your Wallet is ready!**, with **Open wallet**. L1 answered: the button reads **Open wallet**.
- **File:** `E16a-restore-wallet-ready.png`, 820 × 871, narrow

#### E16b · How do I restore my wallet with a recovery phrase? · Ext · step 6
- **Shows:** the wallet rotating the everyday key after **Open wallet**, before the sidebar opens. The
  screen's own title uses the retired term, so the article and alt text say everyday key.
- **File:** `E16b-restore-everyday-key.png`, 1721 × 387

### G. Restore with an encrypted file

Only if Q2 is yes; otherwise skip to the Mobile run. Start fresh once more, then choose **I already have a
wallet** and the encrypted wallet file.

#### E17 · How to restore the wallet using an encrypted file? · Ext · step 2
- **Must show:** the import type page, with **Import with encrypted wallet file** selected.
- **Save as:** `E17-file-restore-import-type.png`
- **Capture as:** **A · fills a tab** — DevTools device toolbar, width 1360, DPR 1
- **Then register:** `'E17-file-restore-import-type.png': [1360, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### E18 · How to restore the wallet using an encrypted file? · Ext · step 3
- **Must show:** the import wallet page, with the drag-and-drop area and the password field empty or masked.
- **Read L7, Extension half:** finish the flow and read the label of its last button.
- **Save as:** `E18-file-restore-import-page.png`
- **Capture as:** **A · fills a tab** — DevTools device toolbar, width 1360, DPR 1
- **Then register:** `'E18-file-restore-import-page.png': [1360, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### H. Switch Guardian operators (added 2026-09-23)

Ivan's steps for How do I switch Guardian operators?, with his five sidebar captures at 150%, tagged
narrow and used exactly as captured, like E07 and E08, so they are let past the height ceiling. E20
carries the box Ivan drew himself. Steps 2 and 3 were merged into one (Ivan, 2026-09-23). Steps 6 and 7 have no capture yet: they wait until the
password screen issue is resolved, then follow the same pattern.

- **E19** · step 1 · Home page, **Settings** lower right · `E19-guardian-home.png`, 530 × 1255
- **E20** · step 2 · Settings, **Guardian Settings** boxed · `E20-guardian-settings-menu.png`, 529 × 1248
- **E21** · step 3 · **Guardian Settings**, **Rotate Guardian** · `E21-guardian-settings.png`, 528 × 1245
- **E22** · step 4 · *Choose your Guardian*, **Continue** · `E22-guardian-choose.png`, 530 × 1249
- **E23** · step 5 · **Review rotation**, **Continue** · `E23-guardian-review.png`, 530 × 1246

## Mobile run: phone, 14 positions

### Phone capture spec (set 2026-09-24, Ivan)

Phone captures sit on each article's **Mobile** tab and must look like the same set as the sidebar
captures (E19 onward) on the **Extension** tab.

- **Take:** the phone's own screenshot, full screen, of the screen the step names. Send it as it is.
- **Prepared before it lands** (the agent does this and shows Ivan the result before committing):
  - crop off the status bar (time, battery, signal) and the home indicator, so no device chrome
    shows, like the sidebar captures;
  - scale to **530px wide**, the width of the sidebar set, so both tabs show their screenshots at the
    same size (about 265px) and it stays at 2x;
  - mask all but a few characters of any address.
- **Register:** tagged `'narrow'` in `SCREENSHOT_SIZES` and shown full height like E19 onward, so each
  is added to `FULL_HEIGHT_BY_IVAN` in `content.test.ts`.
- **Box:** red, drawn by Ivan as on E20, where a step needs one.
- **Text first:** before capturing, check each screen against the article's Mobile text. If the phone now
  matches the Extension steps, report it instead: the Mobile text may be stale, and a proposed fix goes to
  Ivan as ORIGINAL → PROPOSED before any capture is placed.

### A. Install

#### M01 · How to install Bread Wallet · Mob · step 2
- **Must show:** the App Store listing, with **Get**.
- §7 names the App Store, so on an Android phone this is the one position that needs an iPhone.
- **Save as:** `M01-install-app-store.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M01-install-app-store.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`
- **Done (2026-09-24):** Ivan's App Store capture in light mode with his box on **Get** (get2.jpg), scaled to 530 × 888. iOS only by his
  call: a side-by-side iOS + Android image was previewed and was too small to read on a phone.

### B. Create a wallet

#### M02 · How do I create a Bread Wallet? · Mob · step 1
- **Must show:** the **Welcome to Bread!** screen, with both of its options.
- **Read L7, Mobile half:** the exact label of the create button.
- **Save as:** `M02-create-welcome.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M02-create-welcome.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M03 · How do I create a Bread Wallet? · Mob · step 2
- **Must show:** the screen for choosing how to protect the wallet, with the biometric option.
- **Save as:** `M03-create-protect.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M03-create-protect.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M04 · How do I create a Bread Wallet? · Mob · step 5
- **Must show:** the Guardian choice.
- **Read L2 and L5:** on the screen after it, its exact title and the label of the button that opens the
  wallet.
- **Save as:** `M04-create-guardian.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M04-create-guardian.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### C. Fund the wallet

#### M05 · How to fund your Bread Wallet? · Mob · step 1
- **Must show:** the **Explore** tab.
- **Save as:** `M05-fund-explore.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M05-fund-explore.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M06 · How to fund your Bread Wallet? · Mob · step 2
- **Must show:** the **Faucet** card.
- **Save as:** `M06-fund-faucet-card.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M06-fund-faucet-card.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M07 · How to fund your Bread Wallet? · Mob · step 3–4
- **Must show:** the faucet page with the address, the amount, and the **Private** / **Public** choice. Mask
  all but a few characters of the address.
- **Save as:** `M07-fund-faucet-page.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M07-fund-faucet-page.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

### D. Find a token contract address

**On hold (2026-09-18):** the article is hidden by Ivan's call; Token Information is not visible in the
wallet at the moment. Skip this section until the article is published again.

#### M08 · How to find a token contract address in Bread Wallet? · Mob · step 1
- **Must show:** the homepage, with a token being selected.
- **Save as:** `M08-token-homepage.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M08-token-homepage.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M09 · How to find a token contract address in Bread Wallet? · Mob · step 2
- **Must show:** the Token Information section.
- **Save as:** `M09-token-information.png`
- **Capture as:** phone, see *Phone capture spec* above
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
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M10-restore-welcome.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M11 · How do I restore my wallet with a recovery phrase? · Mob · step 2
- **Must show:** the import type choice.
- **Save as:** `M11-restore-import-type.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M11-restore-import-type.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M12 · How do I restore my wallet with a recovery phrase? · Mob · step 3
- **Must show:** the recovery-phrase entry, with the words blurred or replaced by sample words.
- **Save as:** `M12-restore-phrase.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M12-restore-phrase.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M13 · How do I restore my wallet with a recovery phrase? · Mob · step 4
- **Must show:** the Guardian operator list, with every operator and region visible.
- **Save as:** `M13-restore-operators.png`
- **Capture as:** phone, see *Phone capture spec* above
- **Then register:** `'M13-restore-operators.png': [width, height],` in `SCREENSHOT_SIZES`, `src/help-center/content.ts`

#### M14 · How do I restore my wallet with a recovery phrase? · Mob · step 5
- **Must show:** the ready screen at the end of the restore.
- **Read L2 and L6:** its exact title and the label of the button that opens the wallet.
- **Save as:** `M14-restore-ready.png`
- **Capture as:** phone, see *Phone capture spec* above
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
| Q1 | Settings version — extension (expect 1.16.1); phone (record it, mobile run) | |
| Q2 | At E14, the import type page offers an encrypted wallet file | |
| Q3 | Settings on the phone offers an encrypted wallet file export: menu path and labels | |
