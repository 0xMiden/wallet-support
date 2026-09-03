# Bread Wallet Help Center

A category-first Help Center shell for Bread Wallet. This initial phase contains the website structure and seven approved categories, but no support articles.

## Local commands

```bash
yarn install
yarn dev
yarn build
```

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
