# Unified Bread support and feedback design

Date: 2026-09-18

## Objective

Turn wallet-support into the Miden-owned source and deployment for:

1. A visually continuous Bread Help Center.
2. A Bread-styled feedback form at support.miden.xyz/feedback.
3. Protected feedback and store-review consoles under
   support.miden.xyz/admin/*.
4. The existing feedback ingestion, review, store-sync, and GitHub issue
   pipeline, migrated from Ivanlomoljo26/Bread-feedback.

The Help Center, All topics, article, and feedback views must feel like one
product. Privileged operational pages may use a denser layout but must share
the Bread visual tokens and remain clearly separated from public navigation.

## Source baselines

- 0xMiden/wallet-support main:
  204261113abb47628ac2476422fb49d163bc90de
- Ivanlomoljo26/Bread-feedback master:
  48b563b4f2d64b85c7e7e012b460407e168d2bb6
- 0xMiden/wallet main used for visual and product alignment:
  905bb47637bcb67b446103933e2d4d992292eb94

The feedback source is imported as code, documentation, tests, and database
migrations. Cloudflare resource IDs, deployment ownership, secrets, and GitHub
credentials are replaced with Miden-owned configuration.

## Decisions

### Keep the Vite and React application

The current content model, Markdown parser, routing, search, accessibility
tests, and static build remain. The project will borrow layout conventions
from Fumadocs rather than migrate to another framework.

A framework migration would replace working behavior while leaving the main
design problem—view-to-view continuity—to custom implementation anyway.

### Use one Cloudflare Worker and one hostname

The final deployment is a Worker with static assets, not a drag-and-drop
static deployment. The Worker serves the Vite build for public routes and
handles feedback APIs, protected admin routes, cron triggers, and Cloudflare
bindings.

| Route | Owner | Purpose |
| --- | --- | --- |
| / | React | Help Center home |
| /topics | React | Complete grouped article index |
| /feedback | React | Public feedback form and submission status |
| /admin/review | Worker HTML | Protected feedback review |
| /admin/store | Worker HTML | Protected store-review console |
| /api/feedback/submit | Worker API | Turnstile-protected submission |
| /api/feedback/status | Worker API | Reporter status lookup |
| /health | Worker API | Deployment and pipeline health |

Existing /submit and /status routes remain temporarily as compatibility
aliases. They return deprecation headers and use the same handlers.

### Keep privileged code separate from the public UI

The imported Worker lives under worker/feedback/. It retains its own
TypeScript configuration, migrations, Worker tests, and Cloudflare-specific
dependencies. The root remains the Vite application.

The deploy command builds the Vite app first, then deploys the Worker with
dist/ as its asset directory. The Worker handles API and admin paths first and
delegates every public application route to the asset binding.

### Use a repository-scoped GitHub App

Do not create a personal GitHub account named Bread and do not use Ivan's
personal token.

The issue publisher accepts a credential provider. Production uses a GitHub
App installed only on 0xMiden/wallet, with:

- Repository metadata: read
- Issues: read and write

The Worker mints short-lived installation tokens from GITHUB_APP_ID,
GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY. The application
identity appears on issues and comments. The private key stays in Cloudflare
secrets.

## Public experience

### Persistent shell

Every public view uses the same shell:

1. Bread lockup and Help Center product label.
2. Global search.
3. Primary navigation: Help Center, All topics, Send feedback.
4. Consistent page ground, width, footer, and responsive breakpoints.

Only the content region changes. Navigation never replaces the header or
changes the site width.

### Help Center home

The home page remains the curated entry point:

- Search-led hero.
- Popular tasks.
- Bread-colored category panels.
- A quiet feedback callout near the end of the page.

### All topics

All topics is a grouped index inside the same shell. It uses a denser
two-column layout at desktop widths and one column on mobile. Each group shows
its articles without introducing the article sidebar.

The selected All topics tab, header, search, background, and footer remain
visually identical to the home page.

### Article view

Desktop articles use three regions within the persistent shell:

- Category navigation.
- Reading column.
- In-page contents rail when headings warrant it.

The reading column remains dominant. On smaller screens, category navigation
becomes a drawer and the contents rail collapses into an inline disclosure.

### Feedback view

The feedback form becomes a React view using the public shell. It preserves
the existing submission contract and safety behavior:

- Feedback type, platform, wallet version, title, description, attachments.
- Turnstile in managed, interaction-only mode.
- Local install ID and submission-status polling.
- Clear accepted, queued, matched, published, and failed states.
- Secret-material warning before submission.

The form posts to /api/feedback/submit on the same origin. It never receives
GitHub, Cloudflare, store, OAuth, or LLM credentials.

## Visual system

The visual language comes from the current Bread Wallet:

- Primary orange: #E77537
- Primary hover: #C95A21
- Page surface: #FBFBFB
- Primary text: #3F3F3F
- Secondary surface: #F9F9F9
- Border: #E9EBEF
- Wallet accents: blue #91ACC1, sage #99AC94, slate #777487,
  lavender #BEACD2

Nunito remains the display face and Inter the reading face.

Interaction rules:

- Hover changes surface and border first; motion supports the change.
- Cards move at most two pixels and do not gain generic floating shadows.
- Directional icons translate no more than three pixels.
- Primary buttons darken on hover and compress slightly on press.
- Keyboard focus uses a three-pixel Bread-orange ring with visible offset.
- Navigation active states use an orange edge plus a warm tint.
- Reduced-motion mode removes translation and compression while preserving
  color and border changes.

The existing loaf-shaped card corners remain a Bread-specific motif.

## Worker integration

### Imported modules

Preserve the feedback system's:

- Submission validation and sanitization.
- BIP-39 and secret-material quarantine.
- Turnstile verification.
- Rate limiter and publication gate Durable Objects.
- D1 schema and migrations.
- R2 attachment quarantine.
- Duplicate detection, classification, retries, and state machine.
- Feedback review console.
- Store-review ingestion, decisions, reply flow, and admin console.
- Health endpoint and scheduled drains.

The standalone public/index.html form is retired after its behavior is ported
to React. It remains a comparison fixture until parity tests pass.

### Route namespace

New public APIs use /api/feedback/*. Administrative routes remain under
/admin/*. Store callbacks and OAuth callbacks remain administrative routes and
are never handled by the React router.

The Worker route table is explicit. Unknown /api/* and /admin/* paths return
404 and never fall through to the SPA.

### Security headers

The Help Center retains its restrictive CSP. The feedback route receives
narrow Turnstile allowances for https://challenges.cloudflare.com.

The Worker sets route-aware headers:

- /feedback permits the Turnstile script, frame, and required connection.
- Other public routes retain the current same-origin-only CSP.
- /admin/* denies framing and uses the admin console's existing CSP.

No global CSP relaxation is allowed.

## Cloudflare resources

The Miden Cloudflare account owns:

- Worker wallet-support
- D1 database
- R2 attachment bucket
- Rate-limiter Durable Object
- Publish-gate Durable Object
- Cron triggers
- Turnstile site and secret keys
- Worker secrets
- support.miden.xyz custom domain

Resource names are configuration. IDs are not copied from Ivan's account into
the repository.

### Data migration

The existing database and attachments must be preserved:

1. Set GitHub publication and store replies off on the existing deployment.
2. Export the existing D1 database.
3. Create Miden-owned D1, R2, Durable Object, and Turnstile resources.
4. Initialize the empty Miden D1 database once from `schema.sql`; do not replay
   numbered migrations on top of that final schema.
5. Import a data-only export and verify table counts and critical state rows.
6. Copy referenced R2 objects and verify object counts and checksums.
7. Provision new secrets without reading or copying secret values from source
   control.
8. Deploy to a Workers development hostname with publication disabled.
9. Run health, login, form, status, review, store-console, and dry-run pipeline
   checks.
10. Attach support.miden.xyz.
11. Keep publication, store sync, replies, and store-to-issue handoff disabled
    until their individual production checks pass.

The executable account-safe procedure, including the separate fresh,
data-migration, and incremental-upgrade paths, lives in
`worker/feedback/docs/MIDEN-CUTOVER.md`.

The existing Worker remains intact until the new domain and data have been
verified. DNS cutover is the rollback boundary.

## Safe defaults

- PUBLISH_ENABLED=false
- STORE_SYNC_ENABLED=false
- APP_STORE_SYNC_ENABLED=false
- STORE_REPLY_ENABLED=false
- STORE_HANDOFF_ENABLED=false

The feedback intake and storage path may run while all external write paths
are disabled.

Admin access remains Google OAuth with an explicit Miden allowlist and optional
miden.team domain fence. OAuth redirect URIs change to the final support
domain.

## CI

Pull requests run:

1. Root typecheck, unit tests, browser tests, link check, and production build.
2. Worker migration validation, schema drift check, typecheck, and Worker
   tests.
3. A route-boundary test proving unknown privileged routes cannot fall through
   to the public SPA.
4. A CSP test for ordinary, feedback, and admin responses.
5. GitHub credential-provider tests with no network access.

The existing CodeQL workflow covers both application and Worker TypeScript.

## Acceptance criteria

### Unified public UI

- Switching between Help Center, All topics, feedback, and an article does not
  replace or resize the global shell.
- Interactive controls have distinct rest, hover, active, focus, and disabled
  states where applicable.
- Keyboard navigation, mobile navigation, and reduced-motion behavior pass.
- Existing content, search, glossary, routing, and deep links remain working.

### Feedback

- A Turnstile-verified submission is stored exactly once.
- Status polling reports pipeline states in plain language.
- Secret-like submissions are quarantined before ordinary persistence.
- Attachments remain private until publication policy permits them.
- Admin routes require a valid allowlisted session.
- Publication-disabled mode performs no GitHub writes.

### Operations

- The Worker serves the Vite application and protected routes from one
  hostname.
- Miden owns the Cloudflare resources and GitHub App.
- No personal access token is required in production.
- Data migration is count-checked and reversible before DNS cutover.
- Static ZIP upload is retired as the production deployment method only after
  Worker cutover.

## Delivery sequence

1. Unified shell and interaction redesign.
2. Worker source import with behavior unchanged.
3. React feedback form with parity tests.
4. Worker asset routing and route-aware CSP.
5. GitHub App credential provider.
6. Combined CI and deployment scripts.
7. Miden Cloudflare resource provisioning and dry-run deployment.
8. Data migration and verification.
9. Custom-domain cutover.
10. Separately enable publication and store integrations.

Each step is reviewable before the external deployment boundary. No production
secret, database migration, DNS change, or GitHub App installation occurs
merely by merging application code.
