# Bread Wallet Help Center

Project guidance for anyone working on this repository, including Claude Code, is in
[`CLAUDE.md`](CLAUDE.md). Read it before making structural changes.

The Help Center for Bread Wallet. Readers browse main categories and subcategories, read articles
written for Extension, Mobile, or both, search article titles and text (results can be shared as
`?q=` links), look up terms in the glossary, and send feedback. React and Vite build the public
application; a Cloudflare Worker serves it alongside feedback APIs and protected operations pages.

## Local commands

```bash
yarn install
yarn dev
VITE_TURNSTILE_SITE_KEY=<public-site-key> yarn build
VITE_TURNSTILE_SITE_KEY=<public-site-key> yarn verify:all
```

Production builds fail unless `VITE_TURNSTILE_SITE_KEY` is set. Configure the
public Turnstile site key for `support.miden.xyz` in the build environment; its
matching `TURNSTILE_SECRET` remains a Worker secret. Local browser tests inject
Cloudflare's public always-pass test key and never need the production value.

Run the tests with the binary directly rather than `yarn test`, which trips this host's Jest worker
guard:

```bash
NODE_OPTIONS=--max-old-space-size=1536 ./node_modules/.bin/vitest run --no-file-parallelism
```

The suite prints a coverage report — articles per subcategory per platform. The default reporter hides
test output, so ask for it explicitly:

```bash
NODE_OPTIONS=--max-old-space-size=1536 ./node_modules/.bin/vitest run --no-file-parallelism \
  -t 'prints the coverage report' --reporter=verbose
```

An empty subcategory is warned about, never fatal. Malformed data fails: an article referencing a
subcategory that does not exist, filed under the wrong main category, declaring a platform it has no
body for, or duplicating an id or title.

## Content

Articles live in `src/help-center/content/` as one Markdown file per article, migrated verbatim from
`content-source/` per `tasks/content-proposal.md`. Frontmatter carries `id`, `title`, `mainCategory`,
`subcategory`, and `platforms`. An article can also carry `hidden: true` and a `hiddenReason`: it is
then left out of the site, search and counts, while the content checks still run over it. A body
that differs per platform is split with `<!-- platform: extension-desktop -->` markers. Articles are
keyed on subcategory **ids**, never on display titles. `content.test.ts` compares every migrated body
back against `content-source/`.

The FAQ articles come from `tasks/faq/bread-faq-content.md`, and their images from
`tasks/faq/faq-images/`, shipped as losslessly optimised, pixel-identical copies in
`src/help-center/assets/faq/`. Each FAQ
body must match its section of that file byte for byte once its links to other articles and its
image alt text are taken back out.

## Pre-commit checks

`.githooks/pre-commit` runs `yarn typecheck` and the test suite before each commit. It is tracked in
the repository, but Git does not enable a hooks directory automatically, so enable it once per clone:

```bash
git config core.hooksPath .githooks
```

The hook is local and offline: `tsc` and `vitest` come from `node_modules` and nothing contacts a
network or an external service. It skips the checks only when every staged path is under `tasks/` or
is Markdown that no test reads (`src/help-center/content/`, `content-source/`, `CLAUDE.md` and the
FAQ source in `tasks/faq/` always run them), so documentation commits stay instant. Use `git commit --no-verify` to skip a single commit
deliberately.

The rule, in `.githooks/skippable.sh`, names what does not ship rather than what does. It used to be
a list of the file types that should run the checks, and that list left out CSS, so a stylesheet-only
commit skipped every check even though a unit test reads the stylesheets. `CLAUDE.md` was the same
gap once the terminology guard began reading it. `content.test.ts` now exercises the rule directly.

### Why the checks are split

Two hooks, deliberately, because the two halves cost very different amounts:

| | Runs | Wall clock |
| --- | --- | --- |
| `pre-commit` | typecheck + vitest | **~4.1s** |
| `pre-push` | `yarn verify` — typecheck + vitest + Playwright + build | **~59s** |

Playwright is ~50s of that, and it is consistent: three consecutive runs on 2026-09-10 measured 51.3,
50.0 and 50.3 seconds, for 200 unit tests and 30 end-to-end tests. Part of the cost is deliberate:
`webServer` runs `yarn build` first, because reusing a stale `dist/` would let the suite pass against
a page that is not the one in the tree. The single largest cost was one test: the sidebar-highlight
case that clicked through every category, ~22s on its own. It now runs as one test per group.

So the end-to-end suite runs before anything leaves the machine, and never between typing a commit
message and getting the prompt back. `yarn verify` is the same command by hand, and is what a deploy
should call: **nothing should be deployed that has not had `yarn verify` pass**.

Skip a single push with `git push --no-verify`.

### On GitHub

`.github/workflows/verify.yml` runs the public application and Worker suites on every pull request
and every push to `main`. It validates the feedback database migration chain, typechecks both
packages, runs their unit suites and browser tests, and builds the production assets.

## Feedback Worker

The imported feedback service lives in `worker/feedback/`. It keeps its D1 migrations, private R2
attachment storage, Durable Object rate limits, review consoles, store-review pipeline, and regression suite
separate from the public React package.

Public submissions use `/api/feedback/submit`; status checks use `/api/feedback/status`. `/submit`
and `/status` are temporary compatibility aliases. Unknown `/api/*` and `/admin/*` paths return 404
from the Worker and never fall through to the public SPA.

Production GitHub access uses a GitHub App installed only on `0xMiden/wallet`, with repository
metadata read and issues read/write permissions. Configure `GITHUB_APP_ID`,
`GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY` as Cloudflare secrets. The pipeline
rejects any `TARGET_REPO` other than `0xMiden/wallet` before processing or publishing. The static
`GITHUB_WRITE_TOKEN` path exists only for hermetic tests and is not a required production secret.

The checked-in Worker configuration contains no live Cloudflare resource IDs. Replace the D1
placeholder only while provisioning the Miden-owned environment. Keep these flags set to `false`
through initial deployment and data verification:

- `PUBLISH_ENABLED`
- `STORE_SYNC_ENABLED`
- `APP_STORE_SYNC_ENABLED`
- `STORE_REPLY_ENABLED`
- `STORE_HANDOFF_ENABLED`

Use [`worker/feedback/docs/MIDEN-CUTOVER.md`](worker/feedback/docs/MIDEN-CUTOVER.md)
for fresh setup, source-data migration, incremental upgrades, verification, and
rollback. Imported migration notes contain historical source-account commands
and are not the Miden deployment procedure.

Run Worker checks with Node 22 or newer:

```bash
npm ci --prefix worker/feedback
npm --prefix worker/feedback run typecheck
npm --prefix worker/feedback test
```

`main` is protected by a repository ruleset: a change arrives only through a pull
request, merged with a merge commit, and only once the `verify` check has passed; `main` cannot be
force-pushed or deleted, and nobody is on the bypass list.

The ruleset requires **no approving review**, deliberately. The repository has one maintainer, and
GitHub does not let an author approve their own pull request, so a review requirement would block
every pull request and end with the rule being switched off. Add the review requirement when there is
a second reviewer, not before (Ivan, 2026-09-14).

## Portability

The Help Center is isolated in `src/help-center/`:

- `HelpCenterHome.tsx` is the home page. `HelpCenter.tsx` is everything else: subcategories,
  articles, the glossary and search results. `HelpCenterFooter.tsx`, `HelpCenterGlossary.tsx` and
  `HelpCenterBackToTop.tsx` are the pieces they share or embed.
- `navigation.ts` derives every rendered position from the category hierarchy. Nothing else may
  compute an index, a total, or a previous/next relationship.
- `routing.ts` reads the URL: the hash picks the page, `?q=` carries a search and `?platform=` the
  platform.
- `categories.ts` holds the category tree and `glossary.ts` the glossary entries. Articles live in
  `content/`; `content.ts` loads them and `markdown.ts` renders them.
- `search.ts` matches article titles and text. `links.ts` holds every destination outside the Help
  Center.
- `types.ts` defines the small content contract.
- `tokens.css` holds every design value and loads the two self-hosted fonts. `help-center.css` holds
  the component rules, scoped under `.help-center-shell` and `.help-center-home`.
- `assets/` holds the Bread mark (`bread-mark.png`) and the Nunito and Inter font files.
- The `*.test.ts` files are the only ones that import a dev dependency (`vitest`); a host integrating
  the Help Center can leave them behind without affecting the components.

The Help Center has no router library, CMS, analytics, or network dependency; its only runtime
dependencies are `react` and `react-dom`, and support, download and social destinations are plain
links. Pages use hash links in the standalone preview; a host website can map the category, article
and glossary ids to its own routing system when integrating the components.

## Current scope

- Home page with the main categories, popular searches and a Contact Support panel
- Main categories and subcategories, in a sidebar on wide screens and a drawer below 900px
- Articles for Extension, Mobile, or both, with platform tabs where a subcategory covers both
- Search over article titles and text, shareable as `?q=` links
- A glossary page, with a shareable link to each entry
- Previous and next links through the reading order
- On each article, a Was this helpful? prompt (nothing is recorded; answering No links to Contact
  Support) and a Copy link button
- A security reminder on every page except the home page

## Temporary review deployment

The Help Center is available as a non-production Cloudflare Pages preview:

<https://help-center-shell.bread-wallet-help-center-preview.pages.dev>

Cloudflare project: `bread-wallet-help-center-preview`  
Preview branch: `help-center-shell`

This Pages project predates the combined Worker deployment and remains a temporary visual-review target only.

### Deploying a preview

```bash
yarn deploy:preview <preview-branch>
```

Run it from a clean checkout of a commit that is already on GitHub. It runs `yarn verify`, deploys
`dist/` to that branch of the Pages project with the commit passed explicitly, and refuses `main`,
the production branch. The same run writes the deploy record, so no record is typed by hand:

- **`/deploy-record.json` on the deployment itself:** the commit, its subject, when it was built and
  the sha256 of every built file. What a preview is serving can be read from the preview.
- **One line in `tasks/deployments.jsonl`:** that record, plus the deployment id, URL, alias,
  environment and timestamp that Wrangler reports, and the result of fetching every built file and
  the security headers back from the new deployment and comparing them with the build. Commit it in
  the pull request being previewed; a deploy of `main` to `help-center-shell` gets a pull request of
  its own.

The command exits non-zero when anything does not match, after writing the record, so a mismatch is
recorded rather than lost. The prose deploy records in `tasks/todo.md` end on 2026-09-14.

`public/_headers` sets the security headers on every response: a Content-Security-Policy that allows
only the site's own scripts, styles, fonts and images, `frame-ancestors 'none'` with
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` and
`Referrer-Policy: strict-origin-when-cross-origin`. The build copies it into `dist/`, and
`vite preview` serves the same headers, so `yarn e2e` runs the built page under the policy and
`e2e/security-headers.spec.ts` fails on any violation. Anything the site newly loads from somewhere
else needs a matching change to the policy.
