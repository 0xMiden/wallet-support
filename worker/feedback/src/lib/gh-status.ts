/**
 * Is this GitHub response a rate limit, or a refusal?
 *
 * A pure predicate over response headers — no fetch, no credential, no repo.
 * It lives outside both github.ts and publish.ts on purpose: it is neither a
 * read nor a write, and importing either module into the other would blur the
 * boundary those two files exist to make visible.
 *
 * GitHub overloads 403. It is the status for a primary rate limit, for a
 * secondary (abuse-detection) limit, AND for "this token may not do that".
 * Only the headers separate them, and conflating them is not cosmetic:
 *
 *   RateLimited is a DEFER, and defers deliberately do not spend an attempt.
 *
 * So treating every 403 as a rate limit turns a PERMANENT auth failure into an
 * infinite retry — the submission defers, re-defers, and defers again forever,
 * while needsAttention.failed sits at 0 and nothing anywhere reports that the
 * credential is wrong. That is the same silent-failure shape as the unreadable
 * D1 vectors: a broken thing and a quiet thing looking identical from outside.
 *
 * Documented rate-limit signals:
 *   - 429                        always a limit
 *   - x-ratelimit-remaining: 0   primary limit exhausted
 *   - retry-after present        secondary limit / abuse detection
 *
 * Any other 403 is a permission problem and must surface as a failure that
 * spends attempts and parks the row in `failed`, where /health reports it.
 */
export function isRateLimit(res: {
  status: number;
  headers: { get(name: string): string | null };
}): boolean {
  if (res.status === 429) return true;
  if (res.status !== 403) return false;
  return (
    res.headers.get('retry-after') !== null ||
    res.headers.get('x-ratelimit-remaining') === '0'
  );
}

/**
 * How long to back off, from whatever the response was willing to say.
 * Falls back to a minute — continuing to hammer while limited is what gets
 * integrations banned outright.
 */
export function retryAfterMs(res: { headers: { get(name: string): string | null } }): number {
  const retryAfter = res.headers.get('retry-after');
  if (retryAfter) return Number(retryAfter) * 1000;
  const reset = res.headers.get('x-ratelimit-reset');
  if (reset) return Math.max(0, Number(reset) * 1000 - Date.now());
  return 60_000;
}

/**
 * A 403 that is not a rate limit, or a 404 on a repo that plainly exists, both
 * mean the credential cannot do this. GitHub answers 404 rather than 403 when
 * a truthful 403 would confirm something the caller may not see, so on a
 * public repo a 404 from a write is a permissions answer wearing a disguise.
 * Say so in the error, because "GitHub 404 /repos/0xMiden/wallet/issues" reads
 * like a malformed path rather than a bad token.
 */
export function permissionHint(status: number): string {
  return status === 403 || status === 404
    ? ' — this reads as a credential problem, not a bad path; check scopes with GET /admin/whoami'
    : '';
}
