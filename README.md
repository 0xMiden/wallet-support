# Bread Wallet Help Center

Project guidance for anyone working on this repository, including Claude Code, is in
[`CLAUDE.md`](CLAUDE.md). Read it before making structural changes.

A category-first Help Center shell for Bread Wallet. This initial phase contains the website structure and seven approved categories, but no support articles.

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
`subcategory`, and `platforms`; a body that differs per platform is split with
`<!-- platform: extension-desktop -->` markers. Articles are keyed on subcategory **ids**, never on
display titles. `content.test.ts` compares every migrated body back against `content-source/`.

## Pre-commit checks

`.githooks/pre-commit` runs `yarn typecheck` and the test suite before each commit. It is tracked in
the repository, but Git does not enable a hooks directory automatically, so enable it once per clone:

```bash
git config core.hooksPath .githooks
```

The hook is local and offline: `tsc` and `vitest` come from `node_modules` and nothing contacts a
network or an external service. Commits that stage no TypeScript, `package.json`, `yarn.lock`,
`tsconfig.json`, or `vite.config.ts` change skip the checks, so documentation commits stay instant.
Use `git commit --no-verify` to skip a single commit deliberately.

## Portability

The Help Center is isolated in `src/help-center/`:

- `HelpCenter.tsx` contains the reusable React shell.
- `navigation.ts` derives every rendered position from the category hierarchy. Nothing else may
  compute an index, a total, or a previous/next relationship.
- `navigation.test.ts` covers those rules. It is the only file here that imports a dev dependency
  (`vitest`); a host integrating the shell can leave it behind without affecting the component.
- `categories.ts` contains the category navigation data.
- `types.ts` defines the small content contract.
- `help-center.css` contains styles scoped under `.help-center-shell`.
- `assets/bread-mark.svg` is the official Bread mark sourced from the Bread Wallet repository.

The shell has no router, CMS, analytics, or network dependency. Categories use hash links in the standalone preview; a host website can map the category IDs to its own routing system when integrating the component.

## Current scope

- Website shell and category navigation only
- Extension and desktop / mobile platform tabs
- Category search
- Responsive navigation
- Previous and next category navigation
- Persistent security reminder

Article records and article content will be added only after the category structure is approved.

## Temporary review deployment

The category shell is available as a non-production Cloudflare Pages preview:

<https://help-center-shell.bread-wallet-help-center-preview.pages.dev>

Cloudflare project: `bread-wallet-help-center-preview`  
Preview branch: `help-center-shell`

This project is separate from the `miden-feedback-v2` Cloudflare Worker and does not use any of its bindings or routes.
