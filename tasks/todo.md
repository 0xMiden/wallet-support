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
