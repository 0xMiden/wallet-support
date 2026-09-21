/**
 * Scheduled mirror sync. Read-only.
 *
 * Pulls issues updated since the last cursor into issue_mirror. Includes
 * closed issues — regressions are the highest-value dedup target — and
 * includes v1-relay and human-filed issues.
 */

import type { Env } from './index';
import { listIssuesSince, RateLimited } from './lib/github';
import { embedMissing } from './lib/embed';

/** Issues embedded per pass. Small on purpose — see lib/embed.ts on CPU. */
export const EMBED_BATCH = 25;

/** What one sync actually did. Callers add their own passes to `embedded`. */
export interface SyncResult {
  /** Issues FETCHED from GitHub — not rows changed. A full sync refetches all. */
  issues: number;
  /** Embedded by this call's own pass. */
  embedded: number;
}

/**
 * @param full  Ignore the cursor and pull every issue, open and closed. Used
 *              by the one-shot backfill route; the scheduled sync is always
 *              incremental.
 */
export async function syncMirror(env: Env, full = false): Promise<SyncResult> {
  const cursorRow = full
    ? null
    : await env.DB.prepare("SELECT value FROM sync_state WHERE key='issues_since'").first<{ value: string }>();
  const since = cursorRow?.value ?? null;

  let issues;
  try {
    // The write token reads public issues fine, so the mirror reuses it rather
    // than introducing a second secret to store, rotate and expire.
    issues = await listIssuesSince(env.TARGET_REPO, since, env.GITHUB_WRITE_TOKEN);
  } catch (err) {
    if (err instanceof RateLimited) {
      console.warn('rate limited, skipping cycle');
      return { issues: 0, embedded: 0 };
    }
    throw err;
  }
  if (issues.length === 0) return { issues: 0, embedded: 0 };

  const now = Date.now();
  await env.DB.batch(
    issues.map((i) =>
      env.DB.prepare(
        `INSERT INTO issue_mirror (number,title,body,state,labels,author,created_at,updated_at,marker,synced_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(number) DO UPDATE SET
           title=excluded.title, body=excluded.body, state=excluded.state,
           labels=excluded.labels, updated_at=excluded.updated_at,
           marker=excluded.marker, synced_at=excluded.synced_at,
           -- Invalidate the vector only when the embedded text actually
           -- changed. A label edit or a close should not pay to re-embed.
           -- IS NOT rather than != so a NULL body compares correctly.
           embedding = CASE
             WHEN issue_mirror.title IS NOT excluded.title
               OR issue_mirror.body  IS NOT excluded.body
             THEN NULL ELSE issue_mirror.embedding END`
      ).bind(i.number, i.title, i.body, i.state, JSON.stringify(i.labels), i.author,
             i.created_at, i.updated_at, i.marker, now)
    )
  );

  const newest = new Date(Math.max(...issues.map((i) => i.updated_at))).toISOString();
  await env.DB.prepare(
    `INSERT INTO sync_state (key,value,at) VALUES ('issues_since',?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, at=excluded.at`
  ).bind(newest, now).run();

  // Embed whatever the upsert invalidated, bounded so one sync cannot blow
  // the invocation's CPU budget. Anything left over is picked up next cycle —
  // embedding lag degrades retrieval for a few minutes, it never drops a row.
  let embedded = 0, remaining = 0;
  try {
    ({ embedded, remaining } = await embedMissing(env, EMBED_BATCH));
  } catch (err) {
    console.warn('embedding pass failed; rows stay NULL and retry next cycle', err);
  }

  console.log(JSON.stringify({
    job: 'mirror-sync', issues: issues.length, cursor: newest, embedded, remaining,
  }));
  return { issues: issues.length, embedded };
}
