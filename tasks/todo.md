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

### Visual verification — DONE

Verified by eye on preview `65877c8`, desktop and mobile, all eight checklist items confirmed:

1. `#sending-receiving-and-claiming` — previous card reads `01`, matching the sidebar. This is the case
   that read `02` before, and it is the defect the whole change existed to remove.
2. `#security-and-recovery` — previous crosses and names `Getting started`; next stays inside Manage
   wallet and shows no category name.
3. `#activity-and-transaction-status` — previous stays; next crosses and names `Privacy`.
4. `#public-and-private-transactions` — both sides cross, separator sits between label and name.
5. `#guardian-protection` — next names `Troubleshooting`, the longest label, without clipping at the
   `9rem` / `0.68rem` ellipsis boundary.
6. `#setup-and-basic-use` and `#common-issues-and-support` — one card plus spacer, no orphaned separator.
7. Sidebar under an active search keeps true hierarchy numbering: `sending` shows `02`, `activity`
   shows `03`, rather than renumbering the filtered list from 1.
8. Landing with no hash opens Getting started on Setup and basic use, breadcrumb `1 of 1`.

The numbering inconsistency first recorded on 2026-09-03 is closed. Position is derived in one module,
the denormalised `order` field and the duplicate flattening are gone, and 44 tests hold the behaviour.

Tagged `v0.1.0-shell`, local only.

## Migrate and render the approved articles

- [x] Land the approved sources and reconciled proposal in the repo, byte-identical.
- [x] Add the article model, loader, and a fidelity test against `content-source/`.
- [x] Migrate the 23 approved articles and report coverage.
- [x] Render articles, derive platform tabs from content, and enable Contact Support.

### Migration check-in

Four commits, in that order, so the checks existed before the content they check. The audit of the
approved mapping ran before anything was written and matched exactly: 23 titles, 21 on both platforms,
15 same, 6 variant, 2 extension-only, Activity holding one article.

### Migration results

- `content-source/extension.md`, `content-source/mobile.md`, and `tasks/content-proposal.md` are in the
  repo, byte-identical to the owner's originals.
- 23 articles under `src/help-center/content/`, named with the proposal's own §1 number so on-disk order
  matches the approved mapping. Generated by parsing §1 rather than by retyping it, with every derived
  main-category and subcategory id checked against `categories.ts` before a file was written.
- Articles key on subcategory **ids**, never display titles. `validationErrors()` fails an article whose
  subcategory id does not exist, so the Oxford-comma class of mismatch is a test failure.
- The fidelity test parses `content-source/` with its own parser, independent of the generator, and all
  44 platform bodies compare equal. The only permitted transformation is dropping `[image removed]`.
- Coverage: 6/6, 7/5, 1/1, 1/1, 3/3, 1/1, 4/4 across the seven subcategories — 23 extension, 21 mobile,
  zero warnings. Empty warns and never fails; malformed data fails.
- Platform applicability left the category data. `subcategoryNeedsPlatformChoice()` derives it from the
  articles, so tabs appear on Setup and basic use and Security and recovery only.
- The Markdown renderer covers the subset the content actually uses, derived by scanning rather than
  assumed. That scan found italic, which was not in the agreed subset; supporting it was the only option
  consistent with both preserving bodies verbatim and refusing unknown constructs.
- Contact Support is enabled and routed to the §3A destination with `target="_blank"` and
  `rel="noopener noreferrer"`.
- The pre-commit hook now also runs on `content-source/` and `src/help-center/content/`; it matched only
  `.ts` and dependency files, so a commit changing article bodies would have skipped the fidelity test.
- `yarn typecheck`, 95 tests across 4 files, and `yarn build` all pass.

### Not reachable in the UI today

The empty state is written and tested but no subcategory has zero articles on a selected platform, so it
cannot be seen on the preview. It becomes reachable only if an article is removed from a platform.

### Migration deployment

- Preview deployment ID: `f30df159-50dc-40bd-9f11-6ec4e1d85022`.
- Environment `Preview`, branch `help-center-shell`, source commit `cdb8c50`. Production still has never
  been deployed; the branch was passed explicitly so it could not be inferred from `main`.
- Alias `https://help-center-shell.bread-wallet-help-center-preview.pages.dev`, HTTP 200 with
  `X-Robots-Tag: noindex`.
- Drift check before deploying: the preview was still on the previous pair, so nobody deployed underneath
  this work.

### New drift-check baseline

`index-Dm9weVRf.js` and `index-X9tn3OFP.css`. Diff both before editing; a design-only change moves the
CSS hash alone.

### Awaiting visual review

Article rendering, derived tabs, platform persistence, and the Contact Support link are all unverified by
eye. Checklist handed over separately.

## Article cards and per-article pages

- [x] Replace the stacked article list with one card per article.
- [x] Add `#subcategory/article` routing and an article view.
- [x] Design the card from Bread's own identity, not from the references.
- [x] Derive card excerpts from the body; tune the rule against the real articles.
- [x] Verify, deploy to the preview, and record the new baseline.

### Card check-in

The references were read for information hierarchy only. One uses a uniform rounded rectangle, the other
a clipped corner; the clipped corner is already recorded in lessons.md as a borrowed motif removed once
before, so neither shape is reused here.

### Card results

- Cards are shaped as a tin loaf — domed top corners, squared base — with a warm crust band along the top
  edge and the diagonal scores a baker cuts into dough. The round open control reuses the loaf marker the
  sidebar and sequence cards already carry.
- Routing rules live in `routing.ts` as a pure function given its lookups, so they are tested without the
  component. The case that matters: an article id that exists but belongs to another subcategory opens
  the subcategory rather than being lifted into it.
- Excerpts are derived from the body, never authored. Callouts are skipped and a short label such as
  `**Steps:**` is joined to the first list item rather than shown alone. All 23 read sensibly.
- Platform tabs inside an article key on that article rather than its subcategory, so a reader is never
  asked to choose between two identical pages. A single-platform article shows an "Extension only" badge.
- The sequence nav walks sibling articles inside an article and subcategories outside one, through the
  same markup.
- 112 tests across 5 files, typecheck and build clean.

### Card deployment

- Preview deployment ID: `7592c75a`.
- Environment `Preview`, branch `help-center-shell`. Production still never deployed.
- New drift baseline: `index-CKFrJdA_.js` and `index-BLf8CD-8.css`.

### Awaiting visual review

The card shape, crust and scores, the grid at both widths, and the article view are unverified by eye.

## Design system, row index, and Back navigation

- [x] Inspect the implementation and identify root causes before changing anything.
- [x] Have UX/UI and QA/Accessibility review the current state.
- [x] Introduce token scales and migrate every component onto them.
- [x] Replace the filled article cards with a divided row list.
- [x] Add Back navigation to every article page.
- [x] Fix text display: wrapping, measure, hierarchy, contrast.
- [x] Have QA review the result and fix the regressions it found.

### Root causes

1. No design system, only per-component values: 26 ad-hoc font sizes (five inside a 0.14rem band),
   8 fractional weights, 18 hardcoded text colours, 10 corner treatments including three contradictory
   "signature loaf" shapes. Every component invented its own values, so nothing could agree.
2. `Inter` was named in `styles.css` and never loaded — no `@font-face`, no link, no font file, and
   `font-synthesis: none`. All eight weights resolved to the fallback's 400/700, so the h1, card title,
   nav heading and Contact Support button rendered identically.
3. The article preview was a container rather than a list item, so it needed a fill; and grid gap
   (0.85rem) was smaller than card padding (1.6rem), so the fills fused into a slab.

### Results

- Scales for type, weight, space, radius, measure and text colour. The stylesheet now holds zero
  hardcoded font sizes, weights, text colours or radii.
- System font stack, three real weights. `--weight-medium` is 500, not 600: 600 resolves to 700 against
  Roboto and DejaVu, so it was not a third weight at all on Android or Linux.
- The index is a divided row list. Divider is `--help-rule`; hover is the same 7% orange the sidebar
  rows use; the loaf marker carries the position as it does in the sidebar. Rows are content-height, so
  uneven heights stop existing, and the chevron is a grid cell rather than a floating block.
- Back control on every article page, built from the existing marker and chevron.
- Every text role is warm and clears 4.5:1; three colours previously failed at 4.03, 4.06 and 4.12.
- No size falls below 12px; five previously did, down to 9.6px.

### The regression QA caught

The row's marker and chevron each had `grid-row: 1 / 3` with no `grid-column`, so auto-placement gave
the chevron column 2, the title column 3 and the excerpt row 3. Every width at or above 621px was
broken; it looked right below 621px only because the chevron is `display: none` there. Fixed by placing
all four cells explicitly, and verified in headless Chromium at 360/620/621/900/1280/1600.

### Deployment

- Preview `c733c5f5`, environment `Preview`, branch `help-center-shell`.
- New drift baseline: `index-Cu-L4AIR.js` and `index-CV0MyHVA.css`.

### Known and NOT addressed

- Search matches only category and subcategory titles, not the 23 articles.
- `markdown.ts` forbids headings, so 21 section labels across 12 articles render as bold paragraphs.
- Images are forbidden; ten step screenshots were dropped during migration.
- Mobile search results are unreachable: the input is in `<main>`, its output in the off-canvas drawer.
- Platform choice is component state, not route state, so it resets on reload and cannot be shared.
- The mobile drawer has no Escape handler, no focus move, and keeps off-canvas controls focusable.

## Cards, clearer links, search, headings, and the deferred list

- [x] One card per article on a plain page; outer panel loses its surface.
- [x] Reword the store links and the bare URL in `content-source/`.
- [x] Sidebar follows navigation.
- [x] Search over article titles and bodies, results in the main column.
- [x] Promote whole-line bold labels to real headings.
- [x] Platform in the URL; touch devices default to Mobile.
- [x] Drawer Escape, focus move, and off-canvas controls out of the tab order.
- [x] "Was this helpful?" and Copy link on article pages.

### Direction change, recorded

The brief of 2026-09-03 said to remove the fill from each article item and keep the outer container.
The later brief said the opposite: drop the outer panel's surface and give every article its own card.
The second is what ships. Noted so the first is not read as an unfollowed instruction.

### Content edits, listed in full

Made in `content-source/` so the fidelity test still guards them:

- "Bread Wallet by Miden App - App Store" → "App Store"
- "Bread Wallet - Apps on Google Play" → "Google Play"
- "Bread Wallet - Chrome Web Store" → "Chrome Web Store"
- the bare `chromewebstore.google.com` URL → "Bread Wallet listing on the Chrome Web Store"
- the caution's three platform lines became a list, so they render one per line

Article titles and body prose are otherwise untouched.

### Was this helpful — what it does and does not record

"Yes" is acknowledged locally and stored nowhere. "No" links into the support form already approved as
the Contact Support destination. There is no aggregate count of either, anywhere. Getting numbers needs
an endpoint — a Worker plus KV or D1 — and is a separate decision.

### Still open

- Step screenshots. The plan is §7 of `tasks/content-proposal.md`: 32 positions across 7 articles, ten of
  them where the Notion pages had a screenshot. Blocked on the captures, which Ivan takes against the
  store release. The renderer takes one now: an image on its own line inside a step's block renders in
  that step, and a screenshot is labelled "Open screenshot full size" rather than as a diagram. A capture
  drops into `src/help-center/assets/screenshots/` and needs one size entry in `SCREENSHOT_SIZES` beside
  the diagrams' table, for the reason given there. Tracked in the screenshot capture list below.
- Attaching the article title to a "No" report. The support form's accepted parameters are not known
  here, so nothing is appended rather than guessing at another service's API.

## Home page at the bare URL

- [x] Split the query-string writer so one parameter cannot cost another.
- [x] Make an empty hash the home route; point the brand mark and breadcrumb at it.
- [x] Put the search query in the URL as `?q=`.
- [x] Build the home page: hero, search, popular searches, five category cards, support panel, footer.
- [x] Add Playwright and cover the routing rules end to end.
- [x] Show the six authored lines for approval before committing them.

### Results

- Five commits, each building and passing its own tests, because the pre-commit hook runs typecheck
  and the unit suite on every one: `3afb100` query-string fix, `3b0047e` routing, `2a810fa` the page,
  `524558b` meta description, `9a334c6` Playwright.
- Cards are the five main categories. Counts are read from the articles — 6, 9, 3, 1, 4 — and nothing
  stores a total that could disagree with them.
- Main categories gained a `description`, which subcategories already had.
- The five popular searches are one per category and every one is asserted to return an article.
  Two of the four first written found nothing: the search is plain substring matching, so
  "Restore wallet" and "Transfer stuck" both read well and matched no text.
- 144 unit tests in node, 6 Playwright cases against the production build. `yarn e2e` runs them.

### One bug found by rendering it

The brand mark did not leave search results. It changed the hash, but the results kept rendering
because the query was still set, so the one control that promises a way out of the results was the one
that did not provide it. Found by driving the built page, not by reading the diff. Playwright case four
fails if the fix is removed, and only case four.

### The stated e2e case that was not reachable

"Choosing Mobile does not drop an active search" cannot be performed: the platform tabs sit inside the
category section, which is `hidden` while results show. The test drives the same invariant in the order
a reader can — set Mobile, then search — plus clearing the search and checking the platform survives.

### Copy approval

Six authored lines were listed for approval before landing. One was corrected: the Guardian description
had promised "how to manage it", and the only article under Guardian explains what it is. It now reads
"Learn what Guardian backs up, how recovery works, and what it can never do."

### Still open

- Step screenshots. 32 positions across 7 articles, per §7 of `tasks/content-proposal.md`; see the
  screenshot capture list below.
- Footer links with no destination: Documentation, About, Blog, Careers, Status, and the legal pages are
  absent rather than dead. They need real URLs.
- No DOM-level unit tests. The unit suite stays in node; component behaviour is covered by Playwright
  instead of jsdom.

## Hold back the encrypted-file restore article

Ivan, from the live page: restoring from an encrypted file is not in the wallet UI, so the article should not
be published on either platform until that flow ships. The article was also flagged `Extension only`, which
is wrong for the encrypted wallet file in general.

- [x] Verify the claim against the app source rather than the article.
- [x] Add a way to hold an article back without deleting its approved copy.
- [x] Hold back `10-how-to-restore-the-wallet-using-an-encrypted-file.md`.
- [x] Keep every guard pointed at the held-back file.
- [x] Confirm the behaviour on the built page, not just in tests.

### What the app source says

`ExportFileComplete.tsx:76` branches on `isMobile()`: mobile writes the file to the cache directory and opens
the native share sheet, desktop downloads a Blob. `EncryptedWalletFileWalletPassword.tsx:134` has a mobile
passcode path, and the `encryptedWalletFile*` strings ship inside the Android bundle. So the encrypted wallet
file is not an extension-only feature.

Import is the other half, and it is missing. `EncryptedFileStep` is `WalletPassword | ExportFilePassword |
ExportFileComplete | Navigate` - export steps only - and `import-wallet-flow/` holds only `ImportSeedPhrase`
and `ImportRecoveryMethod`. Checked against `~/wallet` at `f95c4855` and `~/wallet-mobile` at `893e22bd`.

### The mechanism

`hidden: true` in frontmatter, with a `hiddenReason` the parser *requires* whenever `hidden` is set, so the
flag cannot outlive the reason for it. `helpCenterAllArticles` is everything on disk; `helpCenterArticles` is
what the site publishes. The article file and its `content-source/` entry are untouched, so publishing it
again is one line.

Fidelity, validation and markdown rendering all run over `helpCenterAllArticles`. Hiding an article must not
retire the guards that prove its text still matches source - that would be the regression this change could
otherwise introduce.

### Results

- 154 unit tests, 14 Playwright cases, typecheck clean.
- The direct link falls back to its category: `parseRoute` returns the category view when an article id does
  not resolve, so `#security-and-recovery/how-to-restore-the-wallet-using-an-encrypted-file` renders
  "Security and recovery". Confirmed by driving the production build, not by reading the router.
- The subcategory lists 6 articles, search for "encrypted" no longer returns it, and the home page reads
  22 articles. Every one of those numbers is derived, so none of them needed editing.

### Still open

- `11-how-to-download-the-encrypted-file.md` is still `Extension only`, and that flag is wrong: export has a
  mobile branch. Correcting it needs mobile steps written and added to `content-source/mobile.md`, which is
  new copy needing approval. Left as-is deliberately.
- Not deployed. The change is local until Ivan asks for the deploy.

## Verify against wallet build

The label change to bold made the articles' disagreements with themselves visible. Casing was
deliberately **not** normalised: the wallet source yields only code comments for these strings
(`Open wallet` 8x vs `Open Wallet` 1x, all in comments, never a rendered label), so picking one
would have been a guess dressed as a fix. Resolve each pair against a screenshot or the rendered
string, then correct the article **and** its `content-source/` entry together.

| Label as written | Where | Conflict |
| --- | --- | --- |
| `Open Wallet` | `02:23` (x2), `09:23` | vs `Open wallet` below - same control, two casings |
| `Open wallet` | `02:47`, `09:49` | vs `Open Wallet` above |
| `Create a new wallet` | `09:18`, `10:18` | vs `Create new wallet` below - same first-run choice |
| `Create new wallet` | `02:11`, `02:15` | vs `Create a new wallet` above |
| `Your Wallet is ready` | `02:46` | vs `Your Wallet is ready!` - trailing "!" differs |
| `Your Wallet is ready!` | `09:49` | vs `Your Wallet is ready` |
| `Get started` | `02:27`, `02:33` (mobile), `10:22` (extension) | not a casing conflict: check it is the same button on both platforms, and that the extension restore flow really ends on it |

Also unresolved, and not a casing question:

- `02:23` reads `Click **Open Wallet**; it will close the tab automatically after clicking the
  **Open Wallet** button` - the control is named twice in one sentence. Rewriting it is a copy
  edit, so it waits for approval.
- `21` and `22` keep quoted `"Consuming"` / `"Sending"` in their titles while the bodies bold the
  same words. Titles are escaped plain text, so bold renders literally there; removing the quotes
  means editing two titles plus their `### ` headings in `content-source/`. Ivan's call, deferred.

### Not built: the SAMPLE placeholder badge

Belongs with the screenshot work above, and does not exist yet. Nothing in the component tree or
the stylesheet renders a SAMPLE badge, and no article carries an `[image removed]` marker any more
— they were dropped at migration. The 2026-09-09 brand audit went looking for it as an existing
element and found nothing, which is worth recording so the next person does not assume it is there
and only styled wrongly.

It may never become real work. Ivan ruled on 2026-09-16 that no SAMPLE placeholders ship at all: the
positions stay empty until a real capture fills them, so there is nothing for a badge to mark. If that
is ever reversed, a placeholder image needs to say it is a placeholder, and the badge has to be legible
on whatever the screenshot happens to show.

**`PLACEHOLDERS_OK` is not a gate and never was.** The deploy entries below record builds run with
`PLACEHOLDERS_OK=1`, which reads as though something checked it. Nothing does: the name appears only in
this file's prose, never in the source, the config or any workflow, on any commit in this repository's
history — searched across every ref on 2026-09-16, not inferred. Setting it, unsetting it and misspelling
it all produce the same build.

So there is no automated placeholder gate on production, and nothing would stop a placeholder shipping.
Whether the page is ready to publish is a human decision, made by looking at it.

## Screenshot capture list

The 33 positions for Ivan to capture: the 32 of §7 in `tasks/content-proposal.md`, plus E01a, added
2026-09-16 for the **Add extension** dialog at step 3, which §7 had no position for. It is a 33rd
position rather than a renumbering, so every ID below keeps the number the capture sheet gave it.
`tasks/screenshot-capture-sheet.md` has them in flow order, with the image spec, the annotation spec,
what each screen must show, and the labels to read for the seven conflicts under Verify against wallet
build.

**Version is recorded per run, not once.** The extension run is against **1.16.1** (what Settings
reports in the build being captured; the 1.16.0 previously recorded here came from the store listing and
was wrong). The mobile run happens later on a different build — record its version when it starts.

### Resolved 2026-09-17: narrow captures are shown at half size

- The capture sheet said a narrow-surface capture is shown at half its width, so it appears at life
  size, but `registerImages` dropped the `'narrow'` tag and the page showed every capture at its own
  width up to the column, about twice life size for a menu or dialog. Ivan chose to build the halving:
  the tag now reaches the renderer, which writes half the width and height into the `<img>`. The file
  and its full-size link are unchanged. Narrow captures stay at **200%** scaling.

### Waiting on the mobile run

- **The every-image-used test will fail on the first mobile screenshot, and the image will be fine.**
  `markdown.test.ts`, "shows every supplied image, each exactly once", renders only each article's
  `extension-desktop` body and then requires that set to equal the whole image registry. A screenshot
  used solely in a mobile body is registered but never rendered by that test, so it reports a correct
  image as missing. Not fixed now, deliberately: nothing can exercise the fix until a mobile capture
  exists, and an untestable fix sitting in the tree is worth less than this note. Fix it in the same
  change as the first mobile capture, by rendering both platform bodies there.

### Extension, 20

- [x] E01a · How to install Bread Wallet · step 3 · Chrome's "Add extension" confirmation dialog — 870 × 486 (2026-09-17)

- [x] E01 · How to install Bread Wallet · step 2 · Chrome Web Store listing with "Add to Chrome" — top of the listing, 1783 × 363 (2026-09-17)
- [x] E02 · How to install Bread Wallet · step after 3 · Extensions menu and pin icon (toolbar optional) — 616 × 300 (2026-09-17)
- [x] E03 · How do I create a Bread Wallet? · step 1 · **Welcome to Bread!** with **Get started** — 820 × 902 (2026-09-17)
- [x] E04 · How do I create a Bread Wallet? · step 2 · Miden Testnet notice with **I understand** — 817 × 1010 (2026-09-17)
- [x] E05 · How do I create a Bread Wallet? · step 3 · **Create password** — 824 × 878 (2026-09-17)
- [x] E06 · How do I create a Bread Wallet? · step 4 · **Choose your Guardian** — 819 × 972 (2026-09-17)
- [x] E06a · How do I create a Bread Wallet? · step 5 · **Your Wallet is ready!** with **Open wallet** — 821 × 601 (2026-09-17)
- [ ] E07 · How to fund your Bread Wallet? · step 1 · Wallet homepage with "Faucet"
- [ ] E08 · How to fund your Bread Wallet? · step 3–4 · Faucet page: address, amount, Private/Public
- [ ] E09 · How to find a token contract address in Bread Wallet? · step 2 · Token Information section with copy icon
- [ ] E10 · How to download the encrypted file? · step 2 · Settings › Security
- [ ] E11 · How to download the encrypted file? · step 3 · "Encrypted Wallet File" option
- [ ] E12 · How to download the encrypted file? · step 6 · Download complete / "Done"
- [ ] E13 · How do I restore my wallet with a recovery phrase? · step 1 · "I already have a wallet" selection
- [ ] E14 · How do I restore my wallet with a recovery phrase? · step 2 · Import type: Seed Phrase / Encrypted Wallet File
- [ ] E15 · How do I restore my wallet with a recovery phrase? · step 3 · Numbered recovery-phrase entry boxes (sample words)
- [ ] E16 · How do I restore my wallet with a recovery phrase? · step 5 · Recovery choice: Guardian vs Fully private
- [ ] E17 · How to restore the wallet using an encrypted file? · step 2 · Import type: "Import with encrypted wallet file"
- [ ] E18 · How to restore the wallet using an encrypted file? · step 3 · Import wallet page: drag-and-drop + password

### Mobile, 14

- [ ] M01 · How to install Bread Wallet · step 2 · App Store listing with "Get"
- [ ] M02 · How do I create a Bread Wallet? · step 1 · Welcome to Bread! with "Get started"
- [ ] M03 · How do I create a Bread Wallet? · step 2 · Choose how to protect your wallet (biometrics)
- [ ] M04 · How do I create a Bread Wallet? · step 5 · Pick your Guardian
- [ ] M05 · How to fund your Bread Wallet? · step 1 · Explore tab
- [ ] M06 · How to fund your Bread Wallet? · step 2 · Faucet card
- [ ] M07 · How to fund your Bread Wallet? · step 3–4 · Faucet page: address, amount, Private/Public
- [ ] M08 · How to find a token contract address in Bread Wallet? · step 1 · Homepage, selecting a token
- [ ] M09 · How to find a token contract address in Bread Wallet? · step 2 · Token Information section
- [ ] M10 · How do I restore my wallet with a recovery phrase? · step 1 · Welcome to Bread! with "Recover your account"
- [ ] M11 · How do I restore my wallet with a recovery phrase? · step 2 · Import type choice
- [ ] M12 · How do I restore my wallet with a recovery phrase? · step 3 · Recovery-phrase entry
- [ ] M13 · How do I restore my wallet with a recovery phrase? · step 4 · Guardian operator list
- [ ] M14 · How do I restore my wallet with a recovery phrase? · step 5 · "Your Wallet is ready!"

## Terminology reconciliation — pending Ivan

Recorded 2026-09-10 while adding the glossary. Nothing here has been changed: the glossary ships as
approved, and the article bodies, `content-source/`, the guards and `CLAUDE.md` are Ivan's to
reconcile in a separate approved pass on article bodies.

### The drift predates the glossary

The glossary names the key the recovery phrase recreates the **emergency key**, and keeps **recovery
phrase** for the phrase itself. "emergency key" appears nowhere else in the repository.

"recovery key" is the term `CLAUDE.md` prescribes and the replacement the key-structure guard
suggests for a retired term, yet the shipped articles already use it in two incompatible senses:

- `02:16` — "Your seed phrase is your recovery key": the recovery key *is* the phrase.
- `12:23` — "an everyday key plus a separate recovery key": the recovery key is *a second key*.

### Every occurrence of "recovery key" (17)

Line numbers as of the glossary commit. This entry's own mentions are not counted.

| Location | Count | Lines |
| --- | --- | --- |
| `src/help-center/content/02-how-do-i-create-a-bread-wallet.md` | 3 | 16 (x3) |
| `src/help-center/content/12-how-do-i-keep-my-wallet-secure.md` | 1 | 23 |
| `src/help-center/content/13-what-should-i-do-if-i-lose-my-recovery-phrase.md` | 1 | 17 |
| `content-source/extension.md` | 5 | 32 (x3), 148, 170 |
| `content-source/mobile.md` | 2 | 152, 174 |
| `CLAUDE.md` | 1 | 38 |
| `src/help-center/content.test.ts` | 3 | 515 (comment), 529 (`instead: 'recovery key'`), 538 (test name) |
| `tasks/article-review-what-is-guardian-2026-09-07.md` | 1 | 52 |

### Where the glossary contradicts a shipped article

1. **Seed phrase vs `02:16`.** Glossary, Seed phrase: "The phrase is the backup used to rebuild the
   key, rather than the key itself." Article: "Your seed phrase is your recovery key used to rotate
   device keys". The same question, answered both ways.
2. **Key vs `12:23`.** Glossary, Key: "Bread uses the everyday and emergency keys for wallet
   actions". Article: "an everyday key plus a separate recovery key". The same pair, named two ways.

### Not contradictions, for the same pass

- **Guardian operator visibility is new disclosure, not a conflict.** Glossary, Guardian: "the
  operator can see the state of a Guardian-backed account". No article says so and none denies it:
  `19` rules out holding the phrase or key and moving funds, and `16` scopes its privacy claim to
  "the network" while its own Guardian section says Guardian backs the data up. Decide whether an
  article should say it too. Settled 2026-09-11: the Mobile steps of How do I create a Bread Wallet? now
  carry the sentence its Extension steps already had.
- **offchain / off-chain is a style question.** The glossary writes "offchain" and "crosschain"; the
  articles write "off-chain" and "on-chain". Pick one form for the site. Settled 2026-09-11: the articles
  use off-chain, on-chain and cross-chain. The glossary keeps "offchain" and "crosschain" deliberately,
  because its text ships as supplied, and `glossary.ts` says so. The Earn diagram keeps "Crosschain
  route" until it is redrawn.

## Glossary, anchor offsets and header overflow — preview deployment

Commits `8b40137` (glossary), `d75b56f` (On this page links under the sticky header) and `879338f` (home
page overflow at 621–655px), deployed together on 2026-09-10.

### Before deploying

- `yarn verify` passed on `879338f` with a clean tree: typecheck, 200 unit tests, 24 end-to-end tests, build.
- Built with `PLACEHOLDERS_OK=1`. Nothing in the repository or its history reads that variable, so the build
  is identical without it; there is no placeholder guard to satisfy yet (see the SAMPLE badge note above).
- Drift check was clean. The preview served `index-BdXWbtZo.js` and `index-DdiDnrTb.css`, the same pair a
  fresh build of `5281a82` produces, and Cloudflare's latest deployment (`f32707ad`) named `5281a82` as its
  source, so nobody deployed underneath this work. The last baseline recorded here (`index-Cu-L4AIR.js` /
  `index-CV0MyHVA.css`) was out of date: the deploys after it never wrote theirs down.

### Deployment

- Preview deployment ID: `bdf256df-d58b-4405-9439-4b5731688f5f`.
- Environment `Preview`, branch `help-center-shell`, source commit `879338f`. Branch and commit were passed
  explicitly; production has still never been deployed.
- Atomic deployment: `https://bdf256df.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: `https://help-center-shell.bread-wallet-help-center-preview.pages.dev`, HTTP 200 with
  `X-Robots-Tag: noindex`.
- The feedback Worker health check that earlier deploys ran was not run: it is outside the Help Center.

### New drift-check baseline

`index-Ctm-NWe6.js` and `index-jUdAmq4h.css`, byte-identical on the alias and in the local build:

- `index-Ctm-NWe6.js` sha256 `ee9f87d7c5faf5644f5d81df39235f3240e75fb88f01ef9f182da408fff07d03`
- `index-jUdAmq4h.css` sha256 `e37bece1f06d72e21c5e6614bb0856ff68f3a100a6817ad161ae4b2b026346b7`

### Checklist — measured on the alias, awaiting Ivan's eye

1. `#glossary` at 1440: 12 terms from Private account to Bridge, the curly apostrophe in Solver, and the
   sidebar link marked as the current page.
2. A shared `#glossary-commitment` on a cold load: at 1440 the term rests 31.8px from the top of the
   viewport; at 390 it rests 16.5px below the sticky header.
3. The home card in placement B at 1440: below the support panel, under the Reference heading, with no
   count. Whether it looks right is a judgment, not a measurement.
4. A long article's On this page link at 900 (`how-do-i-keep-my-wallet-secure`, first section): the heading
   rests 16.2px below the sticky header.
5. The home page at 630: no sideways scroll, pills hidden, and the button inside the header's padding.

## Sidebar numbers and highlight — preview deployment

Commits `78a9fec` (the sidebar names categories without numbering them) and `80568fb` (the sidebar
highlight follows the last thing clicked, every time), deployed together on 2026-09-10.

### Before deploying

- `yarn verify` passed on each commit's own tree: 25 end-to-end tests on `78a9fec`, 30 on `80568fb`, and
  200 unit tests on both.
- Built with `PLACEHOLDERS_OK=1`, which nothing reads.
- Drift check was clean: the preview still served the `879338f` baseline recorded above.

### Deployment

- Preview deployment ID: `7853efa2-26d9-482e-b367-33aca21b6b59`.
- Environment `Preview`, branch `help-center-shell`, source commit `80568fb`. Branch and commit were passed
  explicitly; production has still never been deployed.
- Atomic deployment: `https://7853efa2.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: HTTP 200 with `X-Robots-Tag: noindex`.

### New drift-check baseline

`index-TEvPQeWx.js` and `index-a0XNijHB.css`, byte-identical on the alias, on the atomic URL, and in the
local build:

- `index-TEvPQeWx.js` sha256 `a72c8de8d57a69fca40c10a04b6cb3a27814a6d5281905e9074d37af0ee9dd8d`
- `index-a0XNijHB.css` sha256 `97fb9a8a82949b790ac2d4aaaaba60628b10cbba729f70d633e4577b18e1efe9`

### A false alarm worth knowing about

The first post-deploy hash check of the CSS failed. What it had downloaded was the site's HTML fallback,
served for the stylesheet's path in the seconds before the new file reached that edge; fresh fetches from
the alias and the atomic URL both matched. The check waited for `index.html` to name the new assets, not
for the assets themselves to be served. Wait for both next time.

### Measured on the live alias

- No number badges, in the served bundle or in the rendered sidebar.
- The 41-sequence highlight reproduction, which found 36 wrong before the fix, finds none wrong.
- On `#common-issues-and-support`, clicking Getting started and then the open page leaves only that page
  lit. On `#glossary`, clicking a heading leaves only the heading lit.

## Glossary card removal — preview deployment

Commit `48e7713` (remove the Glossary card from the home page), deployed on 2026-09-10.

### Before deploying

- `yarn verify` passed on the change: 200 unit tests, 30 end-to-end tests, and the build.
- Built with `PLACEHOLDERS_OK=1`, which nothing reads, from a clean tree: the uncommitted README update
  was stashed for the build and the deploy, then restored.
- Drift check was clean: the preview still served the `80568fb` baseline recorded above.

### Deployment

- Preview deployment ID: `ab94e0a2-bb00-41bf-bef1-75f18a774f98`.
- Environment `Preview`, branch `help-center-shell`, source commit `48e7713`. Branch and commit were passed
  explicitly; production has still never been deployed.
- Atomic deployment: `https://ab94e0a2.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: HTTP 200 with `X-Robots-Tag: noindex`.

### New drift-check baseline

`index-DonXsder.js` and `index-DQRKyS3c.css`, byte-identical on the alias, on the atomic URL, and in the
local build. Both assets were fetched and hashed, not only named by `index.html`:

- `index-DonXsder.js` sha256 `e43fac59c43366174c95af06dfa190e414a0abc5fea442df5b91a6eeabb617e1`
- `index-DQRKyS3c.css` sha256 `757f76a218612ae9cd0f2f786fe132e9b38d0f61012f0d306d37a1c29ba66d38`

### Measured on the live alias

- The home page shows the five category cards and no Glossary card or Reference heading, at 1440 and 390.
- It ends at the support panel, 64px above the footer at both widths, with no sideways scroll.
- The only Glossary link on the home page is the footer's.

## Previous and next numbers — preview deployment

Commit `a7ae53c` (the previous and next cards name their direction without numbering it), deployed on
2026-09-10.

### Before deploying

- `yarn verify` passed on the change: 200 unit tests, 31 end-to-end tests, and the build. The new test
  failed first, on `03Previous article`.
- Built with `PLACEHOLDERS_OK=1`, which nothing reads, from a clean tree.
- Drift check was clean: the preview still served the `48e7713` baseline recorded above.

### Deployment

- Preview deployment ID: `668e6c66-cb30-4ee0-9bae-d60d6bf65f63`.
- Environment `Preview`, branch `help-center-shell`, source commit `a7ae53c`. Branch and commit were passed
  explicitly; production has still never been deployed.
- Atomic deployment: `https://668e6c66.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: HTTP 200 with `X-Robots-Tag: noindex`.

### New drift-check baseline

`index-D8hjvt4e.js` and `index-BfpqgW7m.css`, byte-identical on the alias, on the atomic URL, and in the
local build. Both assets were fetched and hashed, not only named by `index.html`:

- `index-D8hjvt4e.js` sha256 `981df8f51c6796f2c8434e0d1248f4d40004288018e2a65190c5b75e4d634dcc`
- `index-BfpqgW7m.css` sha256 `63aae4e2dd91f63c1853dc6ebb11c95ad0970b264d101c6cc291b8fc4f9fa8d4`

### Measured on the live alias

- On `how-do-i-keep-my-wallet-secure` and on `#security-and-recovery`, at 1440 and 390, the Previous and
  Next labels carry no number. Titles, the category marker and the arrows are unchanged.
- The cards measure 83px on the article and 68px on the subcategory page at 1440, with no sideways scroll.

## Hidden article under the glossary and search — preview deployment

Commit `6ffb185` (the glossary and search results show alone, never over a hidden article), deployed on
2026-09-10.

### Before deploying

- `yarn verify` passed on the change: 200 unit tests, 33 end-to-end tests, and the build. Both new tests
  failed first: two visible page headings on the glossary, and the article body visible under results.
- Built with `PLACEHOLDERS_OK=1`, which nothing reads, from a clean tree.
- Drift check was clean: the preview still served the `a7ae53c` baseline recorded above.

### Deployment

- Preview deployment ID: `91f9ed47-5e82-42c8-928f-81f060a298d3`.
- Environment `Preview`, branch `help-center-shell`, source commit `6ffb185`. Branch and commit were passed
  explicitly; production has still never been deployed.
- Atomic deployment: `https://91f9ed47.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: HTTP 200 with `X-Robots-Tag: noindex`.

### New drift-check baseline

`index-BkMyQeYo.js` and `index-DpKKABVZ.css`, byte-identical on the alias, on the atomic URL, and in the
local build. Both assets were fetched and hashed, not only named by `index.html`:

- `index-BkMyQeYo.js` sha256 `981df8f51c6796f2c8434e0d1248f4d40004288018e2a65190c5b75e4d634dcc`
- `index-DpKKABVZ.css` sha256 `b2188faa156c3996b344ec56ca7c3c89832917c6d1db5ed44b04d175f911a338`

### Measured on the live alias

- From `my-token-is-stuck-on-consuming-receiver-address` to the glossary, at 1440 and 2000, and after back
  and forward: one visible heading, Glossary, and no article body. No `hidden` element is displayed.
- From the same article to a search for guardian: the results alone, with no article body.

## FAQ, glossary table, full-size diagrams, optimised images and article column — preview deployment

Commits `70b4b67` to `215908c`, deployed on 2026-09-11:

- `70b4b67` feat: add the 17 approved FAQ articles and the Cross-chain and Earn category
- `c808a85` feat: the glossary reads as an interactive table with a filter
- `5a8f694` feat: diagrams open full size
- `239ff6d` perf: losslessly optimise FAQ diagrams
- `2cdfd2d` fix: article column narrows between 1180px and 1440px
- `215908c` docs: note when the sidebar highlight test has outgrown one run

### Before deploying

- `yarn verify` passed on `215908c`: typecheck, 230 unit tests, 45 end-to-end tests, and the build. The new
  article column test failed first, at 1180px, where the column fell from 680px to 476px.
- Built with `PLACEHOLDERS_OK=1`, which nothing reads, from a clean tree.
- Drift check was clean: the preview still served the `6ffb185` baseline recorded above.
- `npx --no-install wrangler` no longer runs: npx now resolves wrangler 4.131.0 from the registry and will
  not fetch it. The deploy ran the cached wrangler 4.130.0 binary directly, the version the previous
  deployments used, so nothing was downloaded.

### Deployment

- Preview deployment ID: `0e7db3d8-4614-4eb1-b437-aecb4482dc03`.
- Environment `Preview`, branch `help-center-shell`, source commit `215908c`. Branch and commit were passed
  explicitly; production has still never been deployed.
- Atomic deployment: `https://0e7db3d8.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: HTTP 200 with `X-Robots-Tag: noindex`.

### New drift-check baseline

`index-BnBz5jmv.js` and `index-MI-99V1I.css`, byte-identical on the alias, on the atomic URL, and in the
local build. Both assets were fetched and hashed, not only named by `index.html`:

- `index-BnBz5jmv.js` sha256 `dd9a0194ceb50153600742f796a8a2e8239877ff514d4ce73c69faaba70b43e5`
- `index-MI-99V1I.css` sha256 `e9a52be714f96d9759b18ae4a8aab05f48d86afb14eb5b75b561cafdd469ecfe`

The five diagrams on the alias match the local build byte for byte:

- `across-chains-two-routes-DwxXL67v.png` sha256 `c9d13ce161a0d9d775cf51ac7fd12beea3a49b09f1419346ac510d8e3fc19908`
- `earn-across-the-privacy-line-BCCd4NFD.png` sha256 `f7f78bf566d1b6c02def52782da9ff97ed185c79b24bedcc2d0d3489dd1d9df4`
- `guardian-backed-or-more-private-Ms5sfsCs.png` sha256 `713222abba2fc26efe1d52fc359356ba0c0e3d6a155cc1293eff9a8bd9d9eee0`
- `private-from-other-users-XakPte1D.png` sha256 `961be0e5b83a46dee16ad083b50fec5d26e5ccaaac21f7c525ab02fdc751dde6`
- `three-keys-always-in-control-Dx4AEGwR.png` sha256 `fc42a88be1b62e32d3197304ea0622daa1e88c07b34e220a70be40cb99345518`

### Measured on the live alias

- The solver route article at 390px and 1440px: the diagram loads at its 1024px natural width and renders
  at 350px and 680px with no sideways scroll. Its full-size link opens in a new tab and serves the PNG, 200.
- On Mobile, the How to install Bread Wallet reference in What is Bread Wallet? keeps `?platform=mobile` and
  opens the mobile instructions.
- The Cross-chain and Earn card shows its approved description and 5 articles, and opens Moving across
  chains. Earn shows its approved description, with Bread Wallet.
- The glossary shows 12 terms, 3 for a filter of key, the empty state for a term with no match, and one
  visible heading.
- The article column on What is Guardian? is 680px at 1179, 1180, 1200 and 1383px with the rail below it,
  and 680px at 1384, 1440 and 1600px with the rail beside it.

## Key terminology reconciliation — preview deployment

Commits `a2a7b1f` to `38bfb3c`, deployed on 2026-09-11:

- `a2a7b1f` docs: correct the breakpoint list after the container-query fix
- `e354731` content: reconcile key terminology to the three-key standard
- `38bfb3c` test: guard retires recovery key and device key

### Before deploying

- Each article change was built from the committed file with only the approved replacement applied, and
  the word diff showed nothing else: 02 (Extension step 2) with `content-source/extension.md`, and 12 and
  13 with both source pages.
- The guard was mutation-tested before its commit. Recovery key injected into article 12 and both source
  pages, and device-keys into a component, each failed the guard while fidelity stayed green. Each new
  pattern, weakened by one spelling or widened past key, failed its case.
- `yarn verify` passed on `38bfb3c`: typecheck, 231 unit tests, 45 end-to-end tests, and the build.
- Built with `PLACEHOLDERS_OK=1`, which nothing reads, from a clean tree.
- Drift check was clean twice, the second immediately before deploying: the preview still served the
  `215908c` baseline recorded above.
- Deployed with the cached wrangler 4.130.0 binary, as for `215908c`.

### Deployment

- Preview deployment ID: `4e987ea0-e97d-416f-a51a-79311d14d92b`.
- Environment `Preview`, branch `help-center-shell`, source commit `38bfb3c`. Branch and commit were passed
  explicitly; production has still never been deployed.
- Atomic deployment: `https://4e987ea0.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: HTTP 200 with `X-Robots-Tag: noindex`.

### New drift-check baseline

`index-DrjAaeDE.js` and `index-MI-99V1I.css`, byte-identical on the alias, on the atomic URL, and in the
local build. Both assets were fetched and hashed, not only named by `index.html`. The stylesheet is the
same file as at `215908c`, because its only edits were comments, which the build strips; the five diagrams
are unchanged too.

- `index-DrjAaeDE.js` sha256 `334c7e084c98f46572d995faf0ccbaa818ee200e5786ddb7bebd348d5ec7f476`
- `index-MI-99V1I.css` sha256 `e9a52be714f96d9759b18ae4a8aab05f48d86afb14eb5b75b561cafdd469ecfe`

### Measured on the live alias

- How do I create a Bread Wallet?, Extension tab, step 2: the approved sentences, and no retired key name.
- How do I keep my wallet secure? and What should I do if I lose my recovery phrase?, with
  `?platform=extension-desktop` at 1440px and `?platform=mobile` at 390px: the approved wording on both, no
  retired key name, and the platform kept in the URL. Neither shows platform tabs, by design: an article
  offers them only when its text differs by platform.
- What are the three keys in a Guardian-backed account? names the everyday, emergency and Guardian keys,
  for comparison.
- The first checklist run expected tabs on 12 and 13 and failed those four checks, with the wording on them
  already right. The corrected checklist passed 7 of 7.

## Category split, grid rule and glossary colours — preview deployment

Commits `f898007` to `3c07f90`, deployed on 2026-09-11:

- `f898007` test: terminology guard covers the glossary and CLAUDE.md
- `96a05ee` fix: CLAUDE.md commits run the checks
- `f9506b8` style: glossary takes the article cards' blue
- `31bbad6` feat: Cross-chain and Earn become two categories
- `3c07f90` docs: the enforcement sentence names the FAQ source

### Before deploying

- Each new guard lens was mutation-tested before its commit. A retired term in a new glossary entry, a
  glossary comment, CLAUDE.md prose (also split across a line break) and the FAQ source's header each
  passed the suite before its lens existed and failed only that lens after. Deleting or weakening the
  approved vocabulary sentence failed the CLAUDE.md lens; reverting the filter line failed the moved row.
- The grid rule was mutation-tested. Dropping the three- or two-column rule failed the centring test;
  widening either to every last card, or dropping either reset, failed the full-row test.
- The split changed no article prose. All 40 article bodies and all 17 FAQ bodies hash identically before
  and after; article frontmatter changed only in five `mainCategory` lines, and the FAQ source only in its
  placement table, line 27 and five `Category:` lines.
- `yarn verify` passed on `3c07f90`: typecheck, 234 unit tests, 53 end-to-end tests, and the build.
- Built with `PLACEHOLDERS_OK=1`, which nothing reads, from a clean tree.
- Drift check was clean twice, the second immediately before deploying: the preview still served the
  `38bfb3c` baseline recorded above.
- Deployed with the cached wrangler 4.130.0 binary, as for `38bfb3c`.

### Deployment

- Preview deployment ID: `1d8a5a2d-440e-46fd-8aa2-bc6da9d8da57`.
- Environment `Preview`, branch `help-center-shell`, source commit `3c07f90`. Branch and commit were passed
  explicitly; production has still never been deployed.
- Atomic deployment: `https://1d8a5a2d.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: HTTP 200 with `X-Robots-Tag: noindex`.

### New drift-check baseline

`index-COfNRdII.js` and `index-Cyg1-008.css`, byte-identical on the alias, on the atomic URL, and in the
local build. Both assets were fetched and hashed, not only named by `index.html`. The five diagrams are
unchanged.

- `index-COfNRdII.js` sha256 `7f3a8278ebd2aabd765fb802453d832467bed5de488e26a00261c16e3373ab05`
- `index-Cyg1-008.css` sha256 `63dde1addd7d8a0a0855e9e97401ace23c049e914857cda102e3e79327f4048c`

### Measured on the live alias

- Home grid: seven cards in rows of 3+3+1 at 1440px and 2+2+2+1 at 800px, the lone card 0.0px off the
  grid's centre and as wide as the rest; one column at 390px. The heading reads 39 articles across 7
  topics, which the cards' own counts add up to: the held-back article is not counted.
- Cross-chain card: the approved description, 3 articles, the passing arrows; it opens Moving across
  chains. Earn card: the approved description, 2 articles, the new icon; it opens Earning yield.
- On `#earn` the sidebar's last two groups are Cross-chain and Earn, with Earning yield shown, current and
  highlighted.
- The `#earn` link in the body of Can I earn yield in Bread? leads to Are my funds private while they
  earn?, at 1440px, and at 390px on Mobile with the platform kept.
- Glossary: header and linked row `rgba(145, 172, 193, 0.14)`, stripe `0.08`, and the linked row's bar
  `rgb(59, 90, 114)`.
- The first checklist run passed 7 of 10, on two wrong expectations: 40 articles in the heading, which
  counts published articles only, and an article title read the moment the hash moved, before the page
  had rendered. Corrected, it passed 10 of 10; the title settled 55ms after the hash.

## Chrome Web Store link — preview deployment

Commit `8cce73e` on `fix-chrome-store-link`, pull request #8, deployed on 2026-09-11 for review before it
merges.

### Before deploying

- `yarn verify` passed on `8cce73e` in the pre-push hook: typecheck, 237 unit tests, 53 end-to-end tests,
  build.
- Built with `PLACEHOLDERS_OK=1`, which nothing reads, and deployed with the cached wrangler 4.130.0 binary.
- Drift check was clean. The alias served `index-COfNRdII.js` and `index-Cyg1-008.css` with the sha256
  recorded for `1d8a5a2d` above, and its `index.html` matched the build of `ae76cb0`, which differs from
  `main` only under `tasks/`. Nobody deployed underneath this work.

### Deployment

- Preview deployment ID: `de6ee6d1-4283-44d2-93a7-a1ccf53b1587`.
- Environment `Preview`, branch `help-center-shell`, source commit `8cce73e`. Branch and commit were passed
  explicitly; production has still never been deployed.
- Atomic deployment: `https://de6ee6d1.bread-wallet-help-center-preview.pages.dev`.
- Stable alias: HTTP 200 with `X-Robots-Tag: noindex`.

### New drift-check baseline

`index-DDyvGMGX.js` and `index-Cyg1-008.css`, byte-identical on the alias, on the atomic URL, and in the
local build. Only the script changed; the stylesheet is the one `1d8a5a2d` served.

- `index-DDyvGMGX.js` sha256 `bee33716e1b5b1c4c6957721fe321c89fa1891d8471e4ae6e347f86edb08d961`
- `index-Cyg1-008.css` sha256 `63dde1addd7d8a0a0855e9e97401ace23c049e914857cda102e3e79327f4048c`

### Measured on the live alias

- How to install Bread Wallet, Extension: both Chrome Web Store links in the body go to the live listing.
- How to install Bread Wallet, Mobile: its one Chrome Web Store link goes to the live listing.
- Home footer: one Chrome Web Store download, to the live listing.
- No link on either page carries the old ID, and the served `index-DDyvGMGX.js` holds it 0 times, against
  4 for the live listing's URL.
- 4 of 4 checks passed on the first run.

## Security headers — preview deployment

Commit `d8ae80f` on `security/csp-headers`, for issue #3, deployed on 2026-09-14 for review before it
merges. The branch sits on `f91a0aa` (issue #4, Vite 8.0.16), so this bundle is built with the patched Vite.

### Before deploying

- `yarn verify` passed on `d8ae80f`: typecheck, 237 unit tests, 56 end-to-end tests (53 before, plus the
  three in `e2e/security-headers.spec.ts`), build.
- Built from a clean tree with Vite 8.0.16; `dist/_headers` present.
- Deployed to its own branch alias, `security-csp-headers`, so `help-center-shell` kept serving `main`.

### Deployment

- Preview deployment ID: `99ced49f`, environment `Preview`, branch `security-csp-headers`, commit hash
  passed explicitly. Production has still never been deployed.
- Atomic deployment: `https://99ced49f.bread-wallet-help-center-preview.pages.dev`.
- Branch alias: `https://security-csp-headers.bread-wallet-help-center-preview.pages.dev`.
- `index-MNhCComl.js` and `index-BNQdlkJT.css`, byte-identical on the alias, on the atomic URL and in the
  local build.
  - `index-MNhCComl.js` sha256 `b6e4645395102b2225010a96c4640f78d50cfdf3d743b0beb8b413096baa4a6e`
  - `index-BNQdlkJT.css` sha256 `db71805b8239a8391b90bbd23d320a6b99035b54acda865b435135c590538cc4`

### Measured on the preview

- The document response carries the `Content-Security-Policy`, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` declared in
  `public/_headers`, and Cloudflare's own `X-Robots-Tag: noindex`.
- Chromium on home, a subcategory (`#setup-and-basic-use`), an article with diagrams (What are the three
  keys in a Guardian-backed account?), the glossary, a shared search link and a search typed on home: no
  CSP violation, no console error or warning, no failed request; Nunito and Inter loaded, no broken
  image, stylesheet applied.
- Framed from another page, the Help Center does not render.
- The same check reports an inline script and an off-site image injected into the page as blocked, so a
  clean run is not a detector that sees nothing.
