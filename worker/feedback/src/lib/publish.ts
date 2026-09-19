/**
 * GitHub WRITE path. The only module in this service permitted to mutate
 * anything on GitHub.
 *
 * Credential: classic token, scope `public_repo` ONLY. Never a token that
 * reaches private repositories — this code runs in the same service that
 * processes anonymous, attacker-controlled input.
 *
 * Every write here is gated by:
 *   1. the kill switch (PUBLISH_ENABLED)
 *   2. the global volume cap (PublishGate durable object)
 *   3. an idempotency check against D1 + the on-issue marker
 */

import { isRateLimit, retryAfterMs, permissionHint } from './gh-status';
import { sniffType } from './sniff';

const UA = 'bread-feedback-form';
const API = 'https://api.github.com';

export class RateLimited extends Error {
  constructor(public retryAfterMs: number) { super(`rate limited ${retryAfterMs}ms`); }
}
export class CapExceeded extends Error {
  constructor(public resetAt: number) { super('volume cap reached'); }
}

function headers(token: string): Record<string, string> {
  return {
    'User-Agent': UA,
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function gh(path: string, token: string, init: RequestInit): Promise<any> {
  const res = await fetch(`${API}${path}`, { ...init, headers: headers(token) });

  // Only a 403 GitHub identifies as a limit is treated as one. A 403 meaning
  // "this token may not" must NOT become a RateLimited, because that is a
  // defer and defers do not spend attempts — the row would retry forever and
  // never appear in needsAttention.failed. See lib/gh-status.ts.
  if (isRateLimit(res)) {
    // Continuing to hammer while limited gets integrations banned.
    throw new RateLimited(retryAfterMs(res));
  }

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error(JSON.stringify({
      job: 'publish', path, status: res.status,
      credential: res.status === 403 || res.status === 404 ? 'suspect' : 'ok',
    }));
    throw new Error(`GitHub ${res.status} ${path}: ${detail}${permissionHint(res.status)}`);
  }
  return res.json();
}

export interface IssueSpec {
  title: string;
  body: string;
  labels: string[];
}

export async function createIssue(repo: string, token: string, spec: IssueSpec): Promise<number> {
  const data = await gh(`/repos/${repo}/issues`, token, {
    method: 'POST',
    body: JSON.stringify(spec),
  });
  return data.number as number;
}

export async function createComment(repo: string, token: string, issue: number, body: string): Promise<number> {
  const data = await gh(`/repos/${repo}/issues/${issue}/comments`, token, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return data.id as number;
}

export async function updateComment(repo: string, token: string, commentId: number, body: string): Promise<void> {
  await gh(`/repos/${repo}/issues/comments/${commentId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
}

/** Additive only. Never replaces or removes labels the pipeline did not set. */
export async function addLabels(repo: string, token: string, issue: number, labels: string[]): Promise<void> {
  if (labels.length === 0) return;
  await gh(`/repos/${repo}/issues/${issue}/labels`, token, {
    method: 'POST',
    body: JSON.stringify({ labels }),
  });
}

/**
 * Upload a file to GitHub's user-attachments store.
 *
 * PORTED VERBATIM from the v1 relay (worker.js:477-528), which is the only
 * implementation known to return 201 with a PAT. The endpoint is UNDOCUMENTED,
 * so the details below are load-bearing and were each a bug once:
 *
 *   - Content-Type MUST be set. fetch does not set one for a Uint8Array body,
 *     and omitting it is a 400 "Invalid Content-Type" — this is why an earlier
 *     version silently never worked.
 *   - The media type comes from the file's MAGIC BYTES, not its declared type.
 *     Mislabelling is the same 400 as omitting the header.
 *   - The response field is `url`. Reading it as `href` yielded
 *     ![screenshot](undefined) on every success.
 *   - repository_id comes from GET /repos/{repo} — the endpoint takes the
 *     numeric id, not the owner/name string.
 *
 * It lives in this module because it is a GitHub write, and every GitHub write
 * lives in publish.ts. Callers get a URL or null; it never throws.
 */
export async function uploadAttachment(
  bytes: Uint8Array,
  repo: string,
  token: string
): Promise<{ url: string; video: boolean } | null> {
  try {
    const kind = sniffType(bytes);
    if (!kind) return null;

    const repoMeta = await gh(`/repos/${repo}`, token, { method: 'GET' });
    const params = new URLSearchParams({
      name: kind.name,
      content_type: kind.mime,
      repository_id: String(repoMeta.id),
    });

    const res = await fetch(`https://uploads.github.com/user-attachments/assets?${params}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': UA,
        'Content-Type': kind.mime,
      },
      body: bytes,
    });

    if (!res.ok) return null;
    const { url } = (await res.json().catch(() => ({}))) as { url?: string };
    return url ? { url, video: kind.video } : null;
  } catch {
    // An issue never fails to file because an attachment failed to upload.
    return null;
  }
}

/**
 * Kept as a named re-export so the GitHub upload path and admission cannot
 * drift apart. There was one sniff here and none at admission; now there is
 * one implementation and both use it.
 */
export { sniffType as attachmentType } from './sniff';

/**
 * Last-resort idempotency guard.
 *
 * D1 is the primary defence, but if D1 were restored from a stale snapshot
 * we could re-publish something already on GitHub. The marker is embedded in
 * every issue body, so the mirror can answer "does this already exist".
 */
export async function markerAlreadyPublished(db: D1Database, submissionId: string): Promise<number | null> {
  const row = await db
    .prepare('SELECT number FROM issue_mirror WHERE marker = ? LIMIT 1')
    .bind(submissionId)
    .first<{ number: number }>();
  return row?.number ?? null;
}
