/**
 * READ-ONLY GitHub client — mirror sync only.
 *
 * Writes live in src/lib/publish.ts and nowhere else. Keeping the read and
 * write paths in separate modules is deliberate: it makes the boundary
 * visible in the file tree, so an added POST is obvious in review.
 *
 * If you are about to add a write method here, put it in publish.ts instead.
 */

import { isRateLimit, retryAfterMs, permissionHint } from './gh-status';

const UA = 'bread-feedback-form';

export interface MirrorIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: string[];
  author: string | null;
  created_at: number;
  updated_at: number;
  marker: string | null;
}

function extractMarker(body: string | null): string | null {
  const m = body?.match(/<!--\s*(?:mfv2|miden-feedback):([0-9a-f-]{36})\s*-->/i);
  return m ? m[1] : null;
}

/**
 * Page issues updated since a cursor. Uses the list endpoint, never
 * /search/issues — search is capped at 30 req/min and is lexically blind
 * to paraphrase, which is the exact problem dedup has to solve.
 */
export async function listIssuesSince(
  repo: string,
  since: string | null,
  token?: string
): Promise<MirrorIssue[]> {
  const out: MirrorIssue[] = [];
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  for (let page = 1; page <= 20; page++) {
    const url = new URL(`https://api.github.com/repos/${repo}/issues`);
    url.searchParams.set('state', 'all');
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'updated');
    url.searchParams.set('direction', 'asc');
    if (since) url.searchParams.set('since', since);

    const res = await fetch(url, { headers });

    // Same 403 conflation as the write path had, and the same shape of harm:
    // a scope problem would present as a permanent rate limit, the mirror
    // would quietly stop syncing, and dedup would degrade to whatever the
    // stale mirror still held — with no error surfaced anywhere.
    if (isRateLimit(res)) throw new RateLimited(retryAfterMs(res));
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      throw new Error(`GitHub ${res.status}: ${detail}${permissionHint(res.status)}`);
    }

    const batch = (await res.json()) as any[];
    if (batch.length === 0) break;

    for (const it of batch) {
      // Pull requests come back from the issues endpoint. Exclude them.
      if (it.pull_request) continue;
      out.push({
        number: it.number,
        title: it.title,
        body: it.body ?? null,
        state: it.state,
        labels: (it.labels ?? []).map((l: any) => (typeof l === 'string' ? l : l.name)),
        author: it.user?.login ?? null,
        created_at: Date.parse(it.created_at),
        updated_at: Date.parse(it.updated_at),
        marker: extractMarker(it.body ?? null),
      });
    }
    if (batch.length < 100) break;
  }
  return out;
}

/**
 * Who does the write token belong to, and what may it do?
 *
 * A read of GET /user — no repository is touched. It exists because reading
 * the mirror proves almost nothing about the ability to WRITE: GitHub serves
 * public issues to a token with no useful scope at all, so a successful sync
 * of 180 issues and a token that cannot open one are indistinguishable until
 * the first real report tries and 401s.
 *
 * One call answers four questions:
 *   - valid?              200 vs 401
 *   - whose?              login
 *   - what scopes?        the x-oauth-scopes header
 *   - classic or fine-grained?  fine-grained PATs omit that header entirely,
 *                         and hard invariant (1) says classic + public_repo.
 */
export async function tokenIdentity(token: string): Promise<{
  ok: boolean; status: number; login: string | null;
  scopes: string[] | null; kind: 'classic' | 'fine-grained-or-app';
}> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'user-agent': UA,
    },
  });
  // Absent header means the token is not a classic PAT. Present-but-empty is
  // a classic token carrying no scopes, which is a different failure.
  const raw = res.headers.get('x-oauth-scopes');
  const body = res.ok ? ((await res.json()) as { login?: string }) : null;
  return {
    ok: res.ok,
    status: res.status,
    login: body?.login ?? null,
    scopes: raw === null ? null : raw.split(',').map((s) => s.trim()).filter(Boolean),
    kind: raw === null ? 'fine-grained-or-app' : 'classic',
  };
}

export class RateLimited extends Error {
  constructor(public retryAfterMs: number) {
    super(`rate limited, retry in ${retryAfterMs}ms`);
  }
}
