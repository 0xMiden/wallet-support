# Help Center audit — 26 October 2026

## Merged change reviewed

[PR #53](https://github.com/0xMiden/wallet-support/pull/53) was already merged by Brian at 03:17:57 UTC as [c7a6ec6](https://github.com/0xMiden/wallet-support/commit/c7a6ec68e60bc1795192a8c97cba144a897c61e9). The audit covered all 43 changed paths, all 23 replacement Extension screenshots and both updated diagrams. No blocking regression was found. Profile, Transfer, Guardian choices and spending-limit chips match the captures. E21/E34 retain the wallet's existing co-signing wording; the glossary continues to describe the Guardian state-acknowledgement model. The cross-chain diagram remains unused because it depicts an unavailable fast route.

The merge's [Verify](https://github.com/0xMiden/wallet-support/actions/runs/40263382857) and [external links](https://github.com/0xMiden/wallet-support/actions/runs/40263382855) runs passed. [Deploy support preview](https://github.com/0xMiden/wallet-support/actions/runs/40263683103) was skipped. The dynamic “Push on main” run was CodeQL, not deployment. The production deployment file remains `.yml.disabled`. These workflows did not deploy the merge; independent Cloudflare activity could not be checked.

## Routing evidence and bounded correction

Read-only production HTTP checks after the merge returned `/` 200 and `/topics`, `/topics/`, `/feedback`, `/health`, `/deploy-record.json` 404. Root responds with Cloudflare headers. Its JavaScript includes the public pathname routes, but the build had no `topics/index.html` or `feedback/index.html`. Vite preview supplies an SPA fallback, so the old browser suite could pass while a file-only host returned 404. A new regression reproduces the 404 before the build correction and passes afterward.

The build now emits explicit documents for only the two existing public routes, using the final Vite HTML and absolute asset paths. There is no catch-all redirect or change to API/admin routing. Browser tests exercise a file-only host, both slash forms, direct loads, reloads, article navigation, back navigation and phone layout. Unknown public/API/admin paths remain 404 on that test host.

**The actual service and domain mapping serving production remain unverified.** The checked-in combined Worker configuration already has SPA fallback, but its `/health` contract is absent live. Existing Wrangler OAuth credentials were expired; read-only account metadata returned 403 and `wrangler whoami` could not refresh the session. Browser inspection timed out. No credentials were printed and no deployment or security setting was changed. This static-build correction does not establish that the live site's server configuration has been repaired.

## Content decisions and evidence

| Articles | Correction | Source |
| --- | --- | --- |
| 02, 09, 33, 35, 50, 60, 62, 70 | One active device; recovery replaces earlier access, with version-qualified device-replacement UI | [Product clarification](https://midengroup.slack.com/archives/C08UETFUE11/p1792887688983989), [v1.17.7 release](https://github.com/0xMiden/wallet/releases/tag/v1.17.7), `HotKeyRotatedOutGate` and English messages at that tag |
| 13, 31, 62, 64 | Profile navigation and Choose your Guardian screen label | v1.17.7 `Me.tsx`, `Settings.tsx`; merged screenshots E20/E22/E48 |
| 21, 42 | Retry versus Accept Transfer; sync/status/balance reconciliation before retry; expiry enables recall rather than automatic refund | [PendingActivityCard](https://github.com/0xMiden/wallet/blob/v1.17.6/src/app/templates/history/PendingActivityCard.tsx), existing article 41 recall guidance |
| 36–38, 69; reviewed 63, 72 | Circle USDC ↔ USDCx, Agglayer Ethereum ↔ Miden, disabled fast/NEAR transfer routes; Earn provider scope kept separate | [Mainnet v11 configuration](https://github.com/0xMiden/wallet-config/blob/2989b42cdcecb30fd913ba0856376ca3c3ce8ef2/mainnet.json), [route clarification](https://midengroup.slack.com/archives/C0A73K81FNZ/p1792968647531669) |
| 39–40, 43–51 | Enabled eligible Mainnet Earn; six Aave V3/Compound III markets; reported deposits on all three chains but withdrawals only from Base; UK/New York restrictions | Mainnet v11 configuration; [deposit test](https://midengroup.slack.com/archives/C0A73K81FNZ/p1792985253854739), [deposit result](https://midengroup.slack.com/archives/C0A73K81FNZ/p1792985256547279), [withdrawal limitation](https://midengroup.slack.com/archives/C0A73K81FNZ/p1792985574894959) |
| 43–46, 49 | Wallet USDCx distinct from external native USDC; fee reserve; conditional auto-accept | [Earn collateral](https://github.com/0xMiden/wallet/blob/v1.17.7/src/lib/epoch/earn-collateral.ts), deposit/withdrawal screens and English labels at v1.17.7 |
| 46–48 | Amount/Max and partial withdrawals, quote limits; sponsored gas distinct from route costs | [Amount screen](https://github.com/0xMiden/wallet/blob/v1.17.6/src/screens/earn-flow/EarnWithdrawAmount.tsx), [review screen](https://github.com/0xMiden/wallet/blob/v1.17.7/src/screens/earn-flow/EarnWithdrawReview.tsx) |
| 44–46, 49 | Retained E35–E47 captures explicitly labelled Bread 1.16.2 Testnet illustrations | `tasks/screenshot-capture-sheet.md`; no Mainnet deposit executed for screenshots |
| 51, 56 | Earn deposits are outgoing spending; withdrawals are not; unpriced assets are not covered | [Spending policy](https://github.com/0xMiden/wallet/blob/v1.17.7/src/lib/miden/spending-limits/policy.ts), E57–E59 |
| 60; reviewed 01, 05, 67 | GitHub release distinct from store/installed availability; invitation per new account, no new code for existing recovery; version-qualified $150 backup gate | [SeedBackupGate](https://github.com/0xMiden/wallet/blob/v1.17.7/src/app/templates/SeedBackupGate.tsx), v1.17.7 release; existing eligibility guidance retained |
| 68 | No weekly allowance/claim service or universal 1 GC posting fee; games own stakes/submissions/payouts; wallet Buy more GC disabled | [GC clarification](https://midengroup.slack.com/archives/C0A73K81FNZ/p1792972125667949), [purchase scope](https://midengroup.slack.com/archives/C0A73K81FNZ/p1792972506170989), v1.17.7 `ArcadeAllowance.tsx`, `ArcadeCoinsCard.tsx` and release |

Maintained content-source and FAQ sections are synchronized. Historical capture/audit records were not rewritten. IDs and article links are retained. New regression tests guard the main behavioral distinctions; existing tests enforce source fidelity, terminology and links.

## Updated Earn operational evidence

The full Earn thread was reread after the 12:32 JST update. Brian reported USDCx deposits on Ethereum, Arbitrum and Base working at 12:27 JST, then qualified at 12:32 JST that withdrawals worked only from Base to Miden; Ethereum and Arbitrum withdrawals were not working. These observations supersede the earlier liquidity-setup-pending message as the current operational notice. They do not independently establish settlement, every market/build/amount, or full Earn readiness; the amounts and exact withdrawal failure stage were not specified.

Article 39 records the dated result. Articles 43/44 prominently advise against new Ethereum/Arbitrum deposits while their withdrawal path is unavailable and require checking an exit for the exact market before any deposit. Articles 46/47 distinguish implemented withdrawal controls from route availability; article 49 directs affected withdrawals to support rather than repeated submission. No ETA or general deposit recommendation is added. Corresponding FAQ sections and the status regression are updated.

## Link preview image

`index.html` now supplies Open Graph/Twitter metadata with an absolute production image URL. `public/bread-wallet-og.png` is an unchanged copy of the official image declared by [Bread's page](https://www.miden.xyz/wallet), redirected from miden.xyz/bread, checked 26 October 2026. [Original image](https://cdn.prod.website-files.com/6a26670ad40ec24a0a8e0c5f/6aa91f205755fa1089759233_Miden%20wallet%20OG%201.png), 1204 × 631. No new illustration was created. The image URL on support.miden.xyz will remain absent until a frontend release is authorized and deployed.

## Verification

- `VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA yarn verify`: passed; typecheck, 274 unit tests, 140 Chromium browser tests and production build. Browser coverage includes every public article on mobile/desktop, accessibility, image alignment, navigation, reloads, headers and the file-only route regression.
- `yarn worker:typecheck`: passed. `yarn worker:test`: 425 tests passed across 26 files; existing local missing-secret/remote-AI-binding warnings were printed. No Worker code/configuration changed.
- `git diff --check`: passed. Independent final source/code/content review found no must-fix issues. Rendered mobile Arcade and desktop Mainnet instructions were also visually inspected.
- `yarn check:links`: one failure, the new `https://support.miden.xyz/bread-wallet-og.png` returns 404 before deployment. The local built file and its dimensions/MIME are verified; every other checked external link passed the checker's policy. This expected live-site failure remains visible rather than being suppressed.
- No lint command is configured in `package.json`; lint was not run.
- No preview or production deployment was attempted. Cloudflare target inspection is blocked by the expired existing session. Production `/topics` and `/feedback` still return 404.

Changed delivery files: `vite.config.ts`, `index.html`, `public/bread-wallet-og.png`, `playwright.config.ts`, `e2e/static-host.mjs`, `e2e/static-routes.spec.ts`, `src/help-center/current-wallet-content.test.ts`. Content edits are articles 02, 09, 13, 21, 31, 33, 35–40, 42–51, 56, 60, 62, 64, 68–70 under `src/help-center/content/`, plus their maintained sections in `content-source/extension.md`, `content-source/mobile.md` and `tasks/faq/bread-faq-content.md`. This audit is the only new documentation file.

## Release boundary

The follow-up is a draft PR, not a production release. Do not blindly deploy `worker/feedback`: the combined Worker also manages feedback APIs, protected operations, bindings, secrets and scheduled jobs.

Before requesting deployment approval, an operator must restore existing read access and identify the exact Cloudflare account, service/deployment and domain mapping serving support.miden.xyz. The proposed change is to release the verified frontend build containing the two public entry documents, content corrections and social metadata to that existing service while preserving its existing backend configuration. Review that service's native directory-index behavior and current switches/bindings first. If it serves assets differently, test the exact host behavior in preview before release.

After approval, verify `/`, `/topics`, `/topics/`, `/feedback`, `/feedback/` directly and on reload, article/navigation/back behavior at phone/desktop sizes, real HTTP statuses and security headers, the OG image, and served asset hashes/commit. Confirm existing API/admin paths and feedback destination retain their prior behavior. Do not submit feedback or change security settings as a health check. Retain the existing deployment/version for an operator-reviewed rollback.
