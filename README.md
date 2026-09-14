# Bread Wallet Help Center

Project guidance for anyone working on this repository, including Claude Code, is in
[`CLAUDE.md`](CLAUDE.md). Read it before making structural changes.

The Help Center for Bread Wallet. Readers browse main categories and subcategories, read articles
written for Extension, Mobile, or both, search article titles and text (results can be shared as
`?q=` links), and look up terms in the glossary. It is a standalone React, Vite and TypeScript site,
previewed on Cloudflare Pages.

## Local commands

```bash
yarn install
yarn dev
yarn build
```

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

`.github/workflows/verify.yml` runs the same `yarn verify` on every pull request and every push to
`main`, after `yarn install --frozen-lockfile`, which fails when `yarn.lock` does not match
`package.json`. The hooks can be skipped or never enabled; the workflow cannot, so it is the check a
merge waits for.

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

This project is separate from the `miden-feedback-v2` Cloudflare Worker and does not use any of its bindings or routes.
