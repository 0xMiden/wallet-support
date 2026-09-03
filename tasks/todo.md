# Bread Wallet Help Center shell

## Plan

- [x] Create a standalone React and Vite project with a portable Help Center component.
- [x] Add the seven approved Help Center categories as structured data.
- [x] Build the reference-inspired desktop and responsive mobile layouts.
- [x] Add category search, platform tabs, sidebar navigation, and previous/next navigation.
- [x] Verify TypeScript and the production build without deploying or launching a browser.
- [x] Add review and results notes.

## Check-in before implementation

The first build contains the website shell and category structure only. Article titles and article content will be added in a later stage after review and verification.

## Review / Results

- Created the standalone project at `/home/jovan_lomoljo/bread-wallet-help-center`.
- Kept the reusable Help Center implementation isolated under `src/help-center/`.
- Added all seven approved categories exactly once; no article bodies or essential-page records were added.
- Added responsive navigation, category filtering, platform tabs, placeholder content, previous/next category links, and the global security reminder.
- Used the official Bread Wallet mark and current testnet brand orange from the wallet repository.
- `yarn typecheck` passed.
- `yarn build` passed with Vite 8.0.8; output was generated in `dist/`.
- No development server, browser validation, deployment, production change, commit, or push was performed.
- The parent `/home/jovan_lomoljo` repository ignores new top-level folders, so this standalone project is not tracked by that parent repository.

## Temporary Cloudflare preview deployment

- [x] Rebuild the verified static `dist/` output.
- [x] Confirm Cloudflare authentication and absence of a Pages project name collision.
- [x] Create only the `bread-wallet-help-center-preview` Pages project.
- [x] Upload `dist/` to the non-production `help-center-shell` preview branch.
- [x] Verify the public URL, page title, and preview `noindex` response header.

### Deployment check-in

This is a temporary Direct Upload Pages project in the currently authenticated Cloudflare account. It remains separate from the `miden-feedback-v2` Worker and will not use its name, routes, bindings, data, secrets, or custom domains.

### Deployment results

- Cloudflare project: `bread-wallet-help-center-preview`.
- Environment: Preview.
- Branch: `help-center-shell`.
- Stable preview alias: `https://help-center-shell.bread-wallet-help-center-preview.pages.dev`.
- Atomic deployment: `https://b1f63041.bread-wallet-help-center-preview.pages.dev`.
- Deployment ID: `b1f63041-5919-408d-800f-158da60069d7`.
- Verification: HTTP 200, title `Bread Wallet Help Center`, and `X-Robots-Tag: noindex`.
- Existing feedback Worker verification: `/health` returned `ok: true` after the Help Center deployment.
- No custom domain, production-branch deployment, Worker binding, database, bucket, Durable Object, secret, cron, or feedback-form configuration was changed.

## Bread identity and category-specific platforms

- [x] Model platform applicability in category data instead of applying tabs globally.
- [x] Remove platform tabs from Privacy, Guardian, Activity and Transaction Status, and Troubleshooting and Support.
- [x] Replace reference-like clipped panels and full-width segmented controls with Bread-specific surfaces and controls.
- [x] Verify TypeScript and the production build.
- [x] Update the existing `help-center-shell` Cloudflare preview branch.
- [x] Verify the updated public preview and feedback Worker health.

### Revision check-in

The update preserves the approved category-first information architecture while giving platform controls only to categories that need them. The visual system will retain the useful sidebar/content structure but use Bread's official orange and cream palette, softer branded surfaces, and distinct navigation treatments.

### Revision results

- Platform applicability is now a category-data property rather than a UI exception list.
- Platform tabs remain only on Setup and basic use, Security and Recovery, and Sending, Receiving, and Claiming.
- Privacy, Guardian, Activity and Transaction Status, and Troubleshooting and Support now render directly into their category panel without platform tabs.
- Removed clipped-corner cards and the full-width reference-style segmented control.
- Added Bread orange/cream tokens, warm surfaces, loaf-shaped rounded cards, branded panel markers, and orange navigation treatments.
- `yarn typecheck` and `yarn build` passed.
- Updated preview deployment ID: `ec48f826-96db-4eef-98a8-0840a13b504b`.
- Stable preview alias returned HTTP 200 with `X-Robots-Tag: noindex` and the updated CSS asset.
- Existing feedback Worker `/health` continued to return `ok: true` after deployment.

## Compact category journey navigation

- [x] Replace the oversized previous/next cards with a compact horizontal treatment.
- [x] Give the navigation its own Bread identity through loaf-shaped index markers and warm branded controls.
- [x] Verify TypeScript and the production build.
- [x] Update and verify the existing Cloudflare preview branch.

### Navigation check-in

The revised navigation will preserve clear previous/next movement while reducing card height and visual weight. It will not adopt Uniswap's dense article-list cards or return to the original reference's oversized clipped panels.

### Navigation results

- Reduced category navigation cards from `13rem` to `8.5rem` on desktop and `7.75rem` on mobile.
- Changed each card to a horizontal journey link with a small arrow, category number, direction label, and title.
- Added Bread-specific loaf-shaped number markers, asymmetric soft corners, and warm orange surface accents.
- Preserved the accessible previous/next labels, category order, responsive single-column behavior, and reduced-motion support.
- `yarn typecheck` and `yarn build` passed.
- Updated preview deployment ID: `35dedfa5-e893-45e3-81f8-583ec2988ec0`.
- Stable preview returned HTTP 200 with `X-Robots-Tag: noindex` and the new compact-navigation stylesheet.
- Existing feedback Worker `/health` continued to return `ok: true` after deployment.

## Deploy shared half-height navigation revision

- [x] Confirm the current shared source uses the compact `4.25rem` desktop treatment.
- [x] Capture the source hash and build the current shared source without modifying it.
- [x] Confirm the source did not change during the build.
- [x] Deploy only to the existing `help-center-shell` Cloudflare Pages preview branch.
- [x] Verify the live CSS, preview headers, and separate feedback Worker health.

### Deployment check-in

The current source was updated from another WSL session. This deployment will publish that shared `4.25rem` version as-is; it will not edit the navigation source or modify the feedback Worker.

### Deployment results

- Source hash remained `6b9906c75c8d39849166a3f9ec8a0eda78e3b4566121532f842b155f5a8547c0` before and after the build/deployment checks.
- `yarn build` passed, including TypeScript verification.
- The live stylesheet contains the `4.25rem` desktop and `3.9rem` mobile navigation-card sizes.
- Preview deployment ID: `c09d3f4d-fdb3-4b1f-ac3b-0361a42e34ef`.
- The stable preview returned HTTP 200 with `X-Robots-Tag: noindex`.
- The separate feedback Worker `/health` continued to return `ok: true`; no feedback integration was deployed or edited.

## Five-category Help Center hierarchy

- [x] Add a reusable main-category data model with ordered subcategories.
- [x] Replace the single Manage wallet accordion with five independently expandable main categories.
- [x] Apply the approved five-category and seven-subcategory mapping without adding article bodies.
- [x] Update breadcrumbs, search results, and previous/next labels for the hierarchy.
- [x] Verify TypeScript and the production build.
- [x] Deploy and verify only the existing Cloudflare preview branch.

### Hierarchy check-in

The five main categories will be Getting started, Manage wallet, Privacy, Guardian, and Troubleshooting. Their seven subcategories will follow the user's approved mapping exactly; no unapproved pages or article bodies will be introduced.

### Hierarchy results

- Added a two-level, data-driven category model that can later be sourced from Markdown or JSON.
- Added five independently expandable main categories and the seven approved subcategories.
- Search now matches both main categories and subcategories, and opens matching groups while filtering.
- The breadcrumb reports the active main category and its local subcategory position.
- Previous/next links now use subcategory language while preserving the approved overall reading order.
- `yarn typecheck` and `yarn build` passed; the source hash remained `1e5d794167825a633a3313dbf2510443e387e246d3fecb92a2310d8169bfb946` through deployment verification.
- Preview deployment ID: `8d24a71f-87b1-4a7a-8aff-8c1a1b00b2bc`.
- The stable preview returned HTTP 200 with `X-Robots-Tag: noindex` and the deployed bundle contained all approved category titles.
- The separate feedback Worker `/health` continued to return `ok: true`; no feedback integration was edited or deployed.

## Main-page Contact Support action

- [x] Keep Contact Support unlinked until its destination is approved.
- [x] Add a prominent Contact Support button beside the main-page search field.
- [x] Keep the action visible in the mobile layout.
- [x] Verify TypeScript and the production build.
- [x] Deploy and verify only the existing Help Center preview branch.

### Contact Support check-in

The button will be visible on the main page but remain unlinked until its destination is separately approved. No feedback URL will be stored in the Help Center source.

### Contact Support results

- Added a prominent Contact Support control beside search on desktop and full-width below search on narrow screens.
- The control is intentionally disabled and announces that its destination will be added later.
- Removed the temporary feedback URL configuration file and confirmed no feedback Worker URL exists in source, local build output, or the deployed JavaScript bundle.
- `yarn typecheck` and `yarn build` passed; source hash `c6d8793e727f277de73c938c86f505c5453590f2abf5ed281c04d665fee9269d` remained stable through deployment verification.
- Preview deployment ID: `4cebb515-277c-44ab-96e3-827713eafcc6`.
- The stable preview returned HTTP 200 with `X-Robots-Tag: noindex`.
- The separate feedback Worker `/health` continued to return `ok: true`; its form and integration were not changed.

## Shorten the Extension platform label

- [x] Replace the visible Extension and Desktop wording with Extension.
- [x] Preserve the internal platform identifier and selection behavior.
- [x] Verify and deploy only the Help Center preview.

### Label check-in

This is a presentation-only wording change. Internal platform data remains `extension-desktop` so existing category applicability does not change.

### Label results

- The platform tab and active-panel label now display `Extension`.
- The internal `extension-desktop` value and category applicability remain unchanged.
- `yarn build` passed, including TypeScript verification.
- Preview deployment ID: `3c106922-c4af-4746-bd79-240028869937`.
- The stable preview returned HTTP 200 and its deployed bundle contains `Extension` without the former combined label.
- The separate feedback Worker `/health` continued to return `ok: true`.
## Put the Help Center under version control

- [x] Confirm the deployed preview, local `dist/`, and local source all agree before touching the tree.
- [x] Scan the tree for credentials, tokens, and account identifiers.
- [x] Initialise a local repository and ignore wrangler local state.
- [x] Commit the source, configuration, and task notes without build output or dependencies.
- [x] Confirm no remote is configured.

### Version control check-in

The project had no repository of its own, and the parent `/home/jovan_lomoljo` repository ignores this
directory, so seven revision cycles of work existed only as unversioned files in a tree that two WSL
sessions have both written to. This step is local only; no remote, push, or deployment is part of it.

### Version control results

- Drift check was clean before any change: the live preview, `dist/index.html`, and the local source all
  referenced `index-BCaHZ82S.js` and `index-Bmh77DEi.css`.
- Credential scan over source, configuration, and notes found no keys, tokens, account identifiers, or
  Cloudflare credentials; the only URLs present are the already-public `pages.dev` preview addresses.
- Initialised a repository on branch `main` at `/home/jovan_lomoljo/bread-wallet-help-center`.
- Added `.wrangler/` to `.gitignore` alongside the existing `node_modules/`, `dist/`, `.vite/`, and `*.local`.
- Initial commit `3c9d8af` recorded 18 files and 2,079 lines: source, assets, configuration, README, and
  the `tasks/` notes. Build output and dependencies remain ignored.
- No remote is configured and nothing was pushed.
- No source behaviour, category data, styling, or Cloudflare deployment was changed by this step.

## Single-source category positions

- [x] Report which files computed numbering, previous/next, and breadcrumb position before changing anything.
- [x] Add a navigation module that derives every position from the hierarchy, taking the hierarchy as a parameter.
- [x] Remove the fallback index so an unknown category cannot render a plausible wrong number.
- [x] Refactor the sidebar, breadcrumb, and previous/next cards to consume the module and drop their own counting.
- [x] Show the target's main category on a previous/next card when the move leaves the current main category.
- [x] Add a test runner and cover the position rules, including shapes the shipped data does not have.
- [x] Remove the denormalised `order` field now that nothing displays it.
- [x] Verify TypeScript, tests, and the production build, and re-run the preview drift check.

### Position check-in

The sidebar and breadcrumb were the reference behaviour and were not changed. The previous/next
cards were the outlier and now report the same local position as everything else. This is a
derivation change, not a visual redesign; the crossing signal rides inside the existing meta row so
card height is untouched.

### Position results

- `src/help-center/navigation.ts` is now the only place a position is computed. It exposes local
  index, siblings and sibling count, main-category index, previous/next, and whether a move crosses
  into a different main category.
- The module takes the hierarchy as a parameter rather than importing it, so the rules can be tested
  against shapes the shipped data does not have. Four of the five main categories currently hold a
  single subcategory, so cross-category movement is barely exercised by the real data alone.
- `resolve()` has no fallback. An unknown id throws in development and logs and returns undefined in
  production, so a caller must omit the marker rather than render a wrong one. The former
  `?? helpCenterMainCategories[1]` and `?? helpCenterCategories[0]` fallbacks are both gone.
- The previous/next card now shows the target's main category name whenever the move crosses a
  boundary, in the visible meta row and in the accessible label. The name carries a leading separator
  dot, so it must follow the direction label in both cards; placing it first on the next card renders
  a dangling dot at the start of the row.
- Added `navigation.ts` and `navigation.test.ts` to the README's portability file list. The list is what
  a host copies, so a file missing from it produces a shell that does not compile.
- Added Vitest 4.1.11, the first release whose peer range admits Vite 8. The project pins vite
  exactly, so Vitest had resolved a second copy (8.2.2) and tests would not have run against the
  build's Vite; a `resolutions` entry collapses both onto 8.0.8.
- 33 tests cover first and last within a group, cross-group movement in both directions, single-category
  groups, a lone category, an empty group, duplicate ids, and both halves of the missing-id policy. The
  agreement check asserts against a hand-written table taken from `categories.ts` rather than against
  the module, so it cannot pass by construction.
- Removed the `order` field from both levels of the data model. Reading order is array order; a stored
  position beside the data was the second source of truth that allowed the mismatch.
- Removed the unused `helpCenterCategories` export. It flattened the hierarchy a second time and so was
  another copy of reading order; `navigation.categories` is the supported way to read it.
- Sidebar numbering is now stable under an active search. It previously counted with its render index,
  so a filtered list renumbered the categories that survived the filter. This was the same root cause
  and is fixed by the same change.
- Replaced the hardcoded `'getting-started'` initial open group with the first category's own main
  category, so renaming or reordering the first group cannot silently break it.
- `yarn typecheck`, the test run, and `yarn build` all passed.

### Running the tests

`yarn test` is blocked by the host's Jest worker guard, which looks for Jest's `--runInBand` and does
not recognise Vitest's flags. Run the binary directly instead:

```bash
NODE_OPTIONS=--max-old-space-size=1536 ./node_modules/.bin/vitest run --no-file-parallelism
```

## Validate the shipped category data

- [x] Confirm whether any test validated `categories.ts` as data. None did.
- [x] Add `src/help-center/categories.test.ts` for ids, structure, platform applicability, and the landing target.
- [x] Run the full suite.

### Data-test check-in

`navigation.test.ts` proves the position rules are correct. It touched the shipped data only by
building a navigation from it, so duplicate ids within one level would have thrown as a side effect,
but nothing checked the hierarchy as data. A bad edit to `categories.ts` should fail in the suite
rather than in a browser.

### Data-test results

- Ids: unique per level, unique across the whole hierarchy, never reused between the two levels, and
  hash-safe, since ids are written straight into `href="#id"` and read back out of the hash.
- Structure: every subcategory has exactly one parent, no main category is empty, and every category
  carries a title and description. The parent check is true by construction while the data is nested;
  it is asserted so that a later move to a flat file with a `parentId` cannot silently lose it.
- Platform applicability: only known values, no repeats, and never exactly one platform, since the
  shell renders tabs only when a category has more than one variant.
- Landing target: the first category resolves, and is pinned as `setup-and-basic-use` inside
  `getting-started`. The component derives the initially open sidebar group from this category's owner
  instead of naming a group literally, so this assertion is what keeps that derivation honest.
- 44 tests across 2 files pass; typecheck clean.

## Deploy the single-source navigation to the preview

- [x] Confirm the Pages project has no production deployment and pass the preview branch explicitly.
- [x] Rebuild from the committed state and upload only `dist/`.
- [x] Verify the alias, headers, and asset hashes.

### Deployment check-in

This directory became a git repository on `main` during this work, so an inferred-branch deploy could
have targeted production. The branch was passed explicitly for that reason.

### Deployment results

- Preview deployment ID: `09ef9a68-bd75-49b8-ab60-276300866ff1`.
- Environment `Preview`, branch `help-center-shell`, source commit `65877c8`.
- Atomic deployment: `https://09ef9a68.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: `https://help-center-shell.bread-wallet-help-center-preview.pages.dev`, HTTP 200 with
  `X-Robots-Tag: noindex`.
- All seven previous deployments were also Preview on `help-center-shell`; production has never been
  deployed and still has not been.
- No custom domain, Worker, binding, database, secret, or feedback configuration was created or changed.

### New drift-check baseline

The preview and the local build now both serve `index-CHm5Uhty.js` and `index-DDGcEOL9.css`. Diff both
hashes before editing: a design-only change moves the CSS hash while leaving the JS hash alone.

### Awaiting visual review

Typecheck, 44 tests, and the build pass, but nothing has looked at the rendered page. The crossing
signal, the `Troubleshooting` label at the 9rem ellipsis boundary, sidebar numbering under an active
search, and the landing state are all unverified by eye.
