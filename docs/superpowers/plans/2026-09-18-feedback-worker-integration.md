# Feedback Worker Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the feedback pipeline into wallet-support, serve the Vite app and APIs from one Worker, and constrain all issue writes to `0xMiden/wallet` using a repository-scoped GitHub App.

**Architecture:** The imported system remains an isolated package at `worker/feedback`. Its Worker dispatches API/admin routes before delegating public routes to an `ASSETS` binding. A credential provider mints short-lived GitHub App installation tokens while the existing tests can inject a static test token.

**Tech Stack:** Cloudflare Workers, D1, R2, Durable Objects, TypeScript, Wrangler, Vitest, GitHub REST API.

**Spec:** `docs/superpowers/specs/2026-09-18-unified-support-feedback-design.md`

## Global Constraints

- `TARGET_REPO` is exactly `0xMiden/wallet`; startup rejects every other value.
- Production has no personal access token or operator handle.
- `PUBLISH_ENABLED`, `STORE_SYNC_ENABLED`, `APP_STORE_SYNC_ENABLED`, `STORE_REPLY_ENABLED`, and `STORE_HANDOFF_ENABLED` default to `false`.
- Cloudflare IDs and secret values are absent from source control.
- `/submit` and `/status` remain aliases with deprecation headers.
- Unknown `/api/*` and `/admin/*` paths return 404 without asset fallback.

---

### Task 1: Import the feedback package without deployment ownership

**Files:**
- Create: `worker/feedback/src/**`
- Create: `worker/feedback/test/**`
- Create: `worker/feedback/migrations/**`
- Create: `worker/feedback/scripts/**`
- Create: `worker/feedback/schema.sql`
- Create: `worker/feedback/package.json`
- Create: `worker/feedback/tsconfig.json`
- Create: `worker/feedback/vitest.config.ts`
- Create: `worker/feedback/wrangler.jsonc`

**Interfaces:**
- Preserves all source pipeline, admin, store-review, migration, and test module interfaces.

- [ ] **Step 1: Copy code, tests, migrations, and operational documentation from source SHA `48b563b4f2d64b85c7e7e012b460407e168d2bb6`.**
- [ ] **Step 2: Exclude source `.git`, installed dependencies, Cloudflare state, and generated artifacts.**
- [ ] **Step 3: Replace Worker/D1/R2 identifiers with Miden-owned placeholders and remove `OPERATOR_HANDLE`.**
- [ ] **Step 4: Set all five external-write/sync flags to the literal string `false`.**
- [ ] **Step 5: Run migration/schema validation and existing Worker tests.**

### Task 2: Route namespace and asset fallback

**Files:**
- Modify: `worker/feedback/src/index.ts`
- Modify: `worker/feedback/wrangler.jsonc`
- Test: `worker/feedback/test/routes.test.ts`

**Interfaces:**
- Adds `ASSETS: Fetcher` to `Env`.
- Produces API routes `/api/feedback/submit` and `/api/feedback/status` plus aliases `/submit` and `/status`.

- [ ] **Step 1: Add tests for namespaced routes, deprecation headers, privileged 404s, and public asset fallback.**
- [ ] **Step 2: Run the route tests and confirm failure.**
- [ ] **Step 3: Dispatch namespaced and alias paths to the existing handlers.**
- [ ] **Step 4: Return JSON 404 for unknown `/api/*` and HTML 404 for unknown `/admin/*`; otherwise call `env.ASSETS.fetch(req)`.**
- [ ] **Step 5: Configure `../../dist` assets with binding `ASSETS` and SPA fallback.**
- [ ] **Step 6: Run route and existing Worker tests.**

### Task 3: Route-aware security headers

**Files:**
- Create: `worker/feedback/src/lib/security-headers.ts`
- Modify: `worker/feedback/src/index.ts`
- Test: `worker/feedback/test/security-headers.test.ts`

**Interfaces:**
- Produces: `withRouteSecurityHeaders(request: Request, response: Response): Response`.

- [ ] **Step 1: Add tests proving ordinary pages are same-origin only, `/feedback` permits only Cloudflare Turnstile additions, and admin pages deny framing.**
- [ ] **Step 2: Implement immutable response-header wrapping without altering status or body.**
- [ ] **Step 3: Apply the wrapper to every fetch response.**
- [ ] **Step 4: Run security-header and full Worker tests.**

### Task 4: GitHub App credential provider and wallet target guard

**Files:**
- Create: `worker/feedback/src/lib/github-auth.ts`
- Modify: `worker/feedback/src/index.ts`
- Modify: `worker/feedback/src/pipeline.ts`
- Modify: `worker/feedback/src/cron.ts`
- Modify: `worker/feedback/src/lib/attachments.ts`
- Test: `worker/feedback/test/github-auth.test.ts`
- Test: `worker/feedback/test/publish-guard.test.ts`

**Interfaces:**
- Produces: `getGitHubToken(env: GitHubAuthEnv): Promise<string>` and `assertWalletTarget(repo: string): void`.
- Environment: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`; test-only fallback `GITHUB_WRITE_TOKEN` remains optional.

- [ ] **Step 1: Add tests for RS256 JWT claims, installation-token exchange, cached expiry, static test-token fallback, and rejection of any repo except `0xMiden/wallet`.**
- [ ] **Step 2: Implement GitHub App JWT signing with Web Crypto and token caching before expiry.**
- [ ] **Step 3: Resolve one token per request/job and pass it into existing GitHub helpers.**
- [ ] **Step 4: Call `assertWalletTarget` before every GitHub write and at fetch/scheduled entry.**
- [ ] **Step 5: Replace required secret names in Wrangler; remove `GITHUB_WRITE_TOKEN` from production requirements.**
- [ ] **Step 6: Run auth, publish guard, and full Worker tests with network mocked.**

### Task 5: Combined scripts and CI

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/verify.yml`
- Modify: `.github/workflows/links.yml`
- Create: `scripts/build-worker.mjs`
- Modify: `README.md`

**Interfaces:**
- Produces root scripts `worker:test`, `worker:typecheck`, `build:worker`, and `verify:all`.

- [ ] **Step 1: Add root scripts that use `npm --prefix worker/feedback` after the root build.**
- [ ] **Step 2: Extend CI to install and verify both packages, validate migrations/schema, and run route/CSP/auth tests.**
- [ ] **Step 3: Document local development, safe defaults, required GitHub App permissions, and Cloudflare resource provisioning without IDs.**
- [ ] **Step 4: Run root `yarn verify`, `yarn build`, Worker typecheck, and Worker tests.**

### Task 6: Commit and open a PR

**Files:** all files in Tasks 1–5.

- [ ] **Step 1: Confirm no key, token, Cloudflare resource ID, Ivan operator handle, or personal GitHub credential is present.**
- [ ] **Step 2: Commit with `feat: integrate wallet feedback worker`.**
- [ ] **Step 3: Push `brian/unified-support-feedback` and open a PR against `main` with validation results and rollout notes.**

