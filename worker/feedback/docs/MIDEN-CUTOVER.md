# Miden production cutover

This is the authoritative runbook for moving the feedback service to Miden's
Cloudflare account. The imported `MIGRATION-*` and release notes describe the
source service at the time each change was written; their old database names,
accounts, commit IDs, and authorization notes are historical context only.

Do not combine the three database paths below. A fresh database receives
`schema.sql` once. A migrated database receives `schema.sql` followed by a
data-only import. An existing Miden database receives only migrations that have
not already been applied.

## Prerequisites

- Node.js 22 or newer.
- Separate Wrangler profiles for the source account and Miden account.
- The Miden-owned Worker, D1 database, R2 bucket, Durable Objects, Turnstile
  widget, Google OAuth client, and repository-scoped GitHub App.
- `VITE_TURNSTILE_SITE_KEY` set to the public widget key for
  `support.miden.xyz`; `TURNSTILE_SECRET` stored as a Worker secret.
- `FEEDBACK_PUBLIC_ORIGIN` set to the HTTPS origin serving the combined Worker
  (production: `https://support.miden.xyz`). Keep the `ATTACHMENTS` R2 bucket
  private; no public bucket URL is required. See [Feedback media](../MEDIA.md).
- Every external-write switch remains `false` in `wrangler.jsonc`.

Confirm account context before every remote command:

```bash
npx wrangler whoami --profile <source-profile>
npx wrangler whoami --profile <miden-profile>
```

## Path A: new empty service

1. Create the Miden database and put the returned ID in the D1 binding in
   `wrangler.jsonc`:

   ```bash
   npx wrangler d1 create wallet-support-feedback --profile <miden-profile>
   ```

2. Initialize it exactly once from the current schema:

   ```bash
   npm run db:init -- --profile <miden-profile>
   ```

3. Skip every numbered migration. `schema.sql` already contains their final
   result.

## Path B: preserve source data

1. On the source deployment, keep publication, store sync, replies, and
   store-to-issue handoff disabled. Leave the source Worker and domain intact.
2. Export data only from the source database:

   ```bash
   npx wrangler d1 export <source-db-name> --remote --no-schema \
     --output ./source-data.sql --profile <source-profile>
   ```

3. Create and initialize the Miden database using Path A.
4. Import the data-only export into the empty Miden schema:

   ```bash
   npx wrangler d1 execute wallet-support-feedback --remote \
     --file ./source-data.sql --profile <miden-profile>
   ```

5. Copy every R2 object referenced by `submissions.attachment_keys` from the
   source bucket to the Miden bucket. Use account-scoped R2 credentials and a
   copy tool that preserves object bytes, content types, and custom metadata.
   Keep a manifest of keys, sizes, and checksums; do not make the destination
   bucket public during the copy.
6. Treat the SQL export, object manifest, and transfer credentials as private
   migration material. Do not commit them.

## Path C: upgrade an existing Miden database

1. Export a rollback snapshot before changing schema:

   ```bash
   npx wrangler d1 export wallet-support-feedback --remote \
     --output ./wallet-support-feedback-before.sql --profile <miden-profile>
   ```

2. Inspect `PRAGMA table_info(...)` and the migration files to identify the
   first migration that is not present. Apply only pending files, in numeric
   order. Never run `schema.sql` against an existing database.
3. Apply one pending file at a time:

   ```bash
   npx wrangler d1 execute wallet-support-feedback --remote \
     --file ./migrations/0013_store_sync_run_claim.sql --profile <miden-profile>
   ```

4. Run the verification below before applying the next file or deploying code
   that depends on it.

## Verification

The local migration replay must pass before any remote change:

```bash
npm run check:migrations
```

Compare source and destination counts for the tables that carry user or
pipeline state:

```bash
npx wrangler d1 execute <database-name> --remote --profile <profile> --command \
  "SELECT 'submissions' AS table_name, COUNT(*) AS rows FROM submissions
   UNION ALL SELECT 'state_log', COUNT(*) FROM state_log
   UNION ALL SELECT 'dup_links', COUNT(*) FROM dup_links
   UNION ALL SELECT 'store_reviews', COUNT(*) FROM store_reviews
   UNION ALL SELECT 'store_sync_state', COUNT(*) FROM store_sync_state
   UNION ALL SELECT 'admin_allowed', COUNT(*) FROM admin_allowed;"
```

For a data migration, require matching counts and matching R2 key/size/checksum
manifests. Then deploy to the Workers development hostname with every external
write switch still disabled and verify:

- `/health`, `/feedback`, `/feedback/`, submit, and status routes;
- Google sign-in, review queue, attachment proxy, and store console;
- `/admin/whoami` reports the GitHub App installed only on `0xMiden/wallet`;
- a dry-run submission with PNG/JPEG/MP4 evidence stores data without a GitHub
  request; its `/api/feedback/media/<submission-id>/<stored-name>` URLs remain
  404 while unpublished, including HEAD requests;
- migrated published attachments load only for their exact recorded keys;
  verify image MIME/nosniff/sandbox headers, MP4 playback and `Range: bytes=0-7`
  (206), and confirm an unrecorded key still returns 404;
- no unknown `/api/*` or `/admin/*` path reaches the SPA.

Attach `support.miden.xyz` only after those checks pass. Enable publication,
store sync, replies, and handoff separately after their own production checks.
When publication is explicitly enabled, verify an authorized report appears on
`0xMiden/wallet` with inline images and working video links, and that a matching
follow-up's evidence appears in the rolling duplicate comment. Use existing
published evidence or an explicitly approved test report; do not enable writes
or create a test issue merely to complete deployment smoke checks.

## Rollback

Before DNS cutover, rollback means discarding the new deployment and leaving
the source service untouched. After cutover, immediately disable all external
writes, move the custom domain back to the last verified Worker, and investigate
against the preserved Miden database and R2 copies.

Schema migrations are additive and have no down migration. For a failed
incremental upgrade, provision a replacement D1 database from the pre-change
export rather than trying to remove columns in place. Never delete the source
database, source bucket, exports, or manifests until the Miden deployment and
data have been verified and a separate retention decision is approved.
