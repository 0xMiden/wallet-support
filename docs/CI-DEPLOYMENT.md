# Support deployment draft

Preview and production are separate services. `help-center-shell` is the preview alias of the Cloudflare Pages project `bread-wallet-help-center-preview`; it serves the frontend only. It does not deploy the `wallet-support` Worker or exercise the production feedback APIs. Production is the Worker at `support.miden.xyz`, with D1, R2, Workers AI, Durable Objects, secrets and scheduled jobs.

## What this draft does

`deploy-preview.yml` follows the current bridge-portal pattern: successful checks on main → checkout that run's exact SHA → build/deploy → bounded health checks. Support's `Verify` already covers frontend typechecks, unit tests, Playwright, build, Worker typechecks and tests. Only a successful **push** run from this repository's main branch qualifies. PRs, forks, failed runs and cancelled runs cannot access this deploy job. External-links checks remain independent because third-party URL availability is not a release gate.

The preview job is **off by default**, gated by `SUPPORT_PREVIEW_AUTO_DEPLOY == 'true'`. It serializes deploys without cancelling uploads, refuses a SHA superseded at checkout time, uses read-only GitHub permissions and does not persist checkout credentials. A newer push after this check can briefly leave the preview on the prior tested SHA until its own successful release. Main code executes with a preview token, so review main changes and restrict that token and environment accordingly.

The existing preview script keeps its clean-tree, pushed-commit, frozen-lockfile, full verification, preview-branch, asset-hash and security-header checks. It now also rejects a reported project mismatch. In GitHub Actions it writes the deployment ledger into RUNNER_TEMP; the workflow retains it as an artifact even when a health check fails. Manual use still appends tasks/deployments.jsonl. CI never commits records or pushes, preventing deployment-record commit loops. The served deploy-record.json and artifact record include commit SHA, asset hashes, deployment ID and immutable deployment URL for rollback investigation. No extra PR/comment/deployment-status permissions are needed.

`deploy-production.yml.disabled` is an **inactive review template**, not a workflow loaded by GitHub. It rechecks/builds with the real public site key, calls the existing Worker deployment script (including its canonical-target and required-secret-name preflight), then checks `/health` for `ok: true` and the tested commit. The local configuration guard fails on today's D1 placeholder, missing real site key/account ID, wrong Worker name or enabled external-write/store switches. Neither workflow runs database migrations, uploads secrets, installs Apps or enables publication/store switches. Do not bypass the existing deploy script with ALLOW_DIRTY or SKIP_SECRET_CHECK.

## Preview activation prerequisites

1. Review and merge this draft through the normal repository process. Confirm `Verify` is the main push check and review pinned Actions/runtime compatibility.
2. Verify the existing Pages project, its owning account, production branch `main`, and preview alias `help-center-shell` with read-only Cloudflare metadata. Local ledger evidence establishes those names, but does not verify current cloud state. The preview alias is overwritten by future successful main pushes.
3. Supply the verified account ID as `CLOUDFLARE_ACCOUNT_ID` in the `support-preview` GitHub environment and an existing, narrowly scoped Pages deployment token as its `CLOUDFLARE_API_TOKEN` secret. Restrict the environment to main; choose required reviewers if desired. Check the token can deploy this existing project without granting Worker, D1, repository-write or production capabilities. Cloudflare account-level Pages permissions may cover multiple projects; verify that scope and isolate the account if existing infrastructure permits.
4. After explicit activation approval, set the repository variable `SUPPORT_PREVIEW_AUTO_DEPLOY=true`. It remains unset/false in this task. The next successful main push Verify triggers preview. Check the artifact, immutable URL and alias; `/deploy-record.json` must name the tested SHA. The always-pass Turnstile key is for this isolated frontend preview only.

## Production blockers and activation prerequisites

Do **not** rename the disabled template or set `SUPPORT_PRODUCTION_AUTO_DEPLOY` yet. Missing/unverified inputs are:

- Actual Miden Cloudflare account ID and an existing suitably scoped Worker deployment token. The environment `support-production` needs main-only access and an agreed review policy. Verify permissions for Worker deployment/assets, binding inspection and secret-name listing; do not assume a preview Pages token suffices.
- A real public `VITE_TURNSTILE_SITE_KEY` restricted to `support.miden.xyz`, paired with the existing Worker `TURNSTILE_SECRET`. CI's always-pass key must never reach production.
- The verified D1 database UUID replacing `REPLACE_WITH_MIDEN_D1_DATABASE_ID`, with the expected schema/migration state already applied through a separately approved process. Never let deploy CI initialize or migrate D1.
- Read-only confirmation of existing Worker `wallet-support`, its ownership and `support.miden.xyz` domain mapping. There is no checked-in production route/account mapping; preserve an existing mapping rather than guessing or creating one. Confirm assets and the public `/health` contract.
- Read-only confirmation of D1 `wallet-support-feedback`, R2 `wallet-support-feedback-attachments`, Workers AI and Durable Object bindings. The checked-in Durable Object migration `v1` must already be applied and compatible. Wrangler deploy can apply DO migrations: review them separately before enabling CI, and block future migration changes until separately approved. This template contains no D1 migration command.
- All secret **names** in `worker/feedback/wrangler.jsonc` must exist on that exact Worker. Existing deploy.sh verifies names, never values. Missing credentials are an operator provisioning blocker, not something this draft creates. Review `worker/feedback/docs/MIDEN-CUTOVER.md` and `SAFETY-CONTROLS.md`, GitHub App installation/access, OAuth setup and allowed admins through their existing processes.
- Confirm live publication/store switch state. Checked-in PUBLISH_ENABLED, STORE_SYNC_ENABLED, APP_STORE_SYNC_ENABLED, STORE_REPLY_ENABLED and STORE_HANDOFF_ENABLED are false; deploying rewrites vars and could disable a live store collector. Resolve any drift separately before activation. This draft does not enable or change any switch.

Once these are verified and a production change is explicitly authorized, review the template again, resolve migration protection in the release policy, rename to `.yml`, supply environment variables/secrets, and enable `SUPPORT_PRODUCTION_AUTO_DEPLOY=true`. A static guard is not evidence that cloud provisioning is correct. Production checks verify health and serving SHA; failure marks CI red but does not automatically roll back a deployment or database state.

## Rollback and recommended next step

Start with preview automation after reviewing this local diff and verifying the existing Pages account/token metadata. Complete production prerequisites as a separate release task.

Disable the corresponding auto-deploy variable to stop future releases. An already running upload is not cancelled. Keep the deployment artifact and the previous good deployment ID/immutable URL. An operator can restore the prior Pages deployment/alias through the established Cloudflare process. For production, inspect Cloudflare deployment/version history and health SHA, then explicitly restore a compatible previous version; database/DO compatibility must be checked before rollback. Do not rerun old Verify runs as a rollback: the stale-main guard deliberately rejects them. Artifacts expire after 30 days; retain release evidence elsewhere under the existing process if longer traceability is needed.
