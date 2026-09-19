/**
 * Google Play review sync — one page of `reviews.list` per tick, through the
 * ingestion core.
 *
 * Paging, checkpoints, retries, dedup and edit history are already built and
 * tested in ingest.ts and its neighbours. This file supplies what is Google's:
 * the credential and the page request.
 */
import { runIngest, type IngestReport } from '../ingest';
import type { FetchPage } from '../paginate';
import { normalizeGooglePlay } from '../normalize';
import {
  defaultFetch, mintAccessToken, parseServiceAccount, upstreamCode, type FetchLike,
} from '../auth/google';
import { classifyGoogle, markFailure } from '../failure';

/** Workers Free: D1 queries per invocation. Every statement in a batch counts. */
export const D1_QUERIES_PER_INVOCATION = 50;

/**
 * Reviews per page. ONE page per tick.
 *
 * The query budget: runIngest spends 3 on its checkpoint, and a brand-new
 * review spends 5 (look-up, insert, read-back, version, event), so 50 queries
 * would allow 9. It is 5 because CPU is the tighter and less visible limit —
 * 10 ms per cron invocation on the free plan, which no local test enforces,
 * against an RSA signature plus hashing and scanning each review. Raise it only
 * after reading real CPU time from the Worker's observability, and never past
 * what test GP12 allows.
 *
 * A CONSTANT, NOT A VAR, so configuration can never break the query budget.
 */
export const GOOGLE_PLAY_PAGE_SIZE = 5;

export class GooglePlayError extends Error {}

export interface GooglePlaySyncEnv {
  DB: D1Database;
  STORE_SYNC_ENABLED?: string;
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?: string;
  GOOGLE_PLAY_PACKAGE_NAME?: string;
}

/** What one store phase did: skipped with a reason, or ran with a report. */
export interface PhaseResult {
  skipped: string | null;
  report: IngestReport | null;
}

function listUrl(packageName: string, pageToken: string | null): string {
  const url = new URL(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/reviews`
  );
  url.searchParams.set('maxResults', String(GOOGLE_PLAY_PAGE_SIZE));
  if (pageToken) url.searchParams.set('token', pageToken);
  return url.toString();
}

export function googlePlayFetcher(
  packageName: string,
  getToken: () => Promise<string>,
  fetchImpl: FetchLike = defaultFetch,
  /** Only for reading a `Retry-After` given as a date. The run's clock. */
  nowMs: number = Date.now()
): FetchPage<unknown> {
  const request = async (pageToken: string | null) =>
    fetchImpl(listUrl(packageName, pageToken), {
      headers: { authorization: `Bearer ${await getToken()}` },
    });

  return async (pageToken) => {
    let res = await request(pageToken);

    /**
     * A STALE CURSOR MUST NOT WEDGE THE SYNC.
     *
     * The cursor is Google's page token, kept between runs — through backoff,
     * through deploys. If Google stops honouring it, the failure is recorded
     * with that same token as the resume point, and every retry would ask for
     * it again: a sync that never recovers. So a refused token restarts the
     * pass from the first page, once. Re-reading costs nothing but time —
     * upsertReview is idempotent.
     */
    let restarted = false;
    if (res.status === 400 && pageToken) {
      res = await request(null);
      // The pass has started over, and the tokens that follow are the ones it
      // has already used. Said out loud so the cycle check reads a restart as a
      // restart rather than as the store sending us round in a circle.
      restarted = true;
    }

    if (!res.ok) {
      let err: any = null;
      try { err = await res.json(); } catch { /* the status is reported either way */ }
      /**
       * The message is for a person; the disposition is for the scheduler, and
       * it is read from the STATUS AND THE REASON CODE rather than from this
       * text. Google answers 403 both for "you may not" and for "not so fast",
       * so the code is the only thing that tells a revoked key from a busy
       * afternoon. See classifyGoogle.
       */
      throw markFailure(
        new GooglePlayError(`reviews.list failed (HTTP ${res.status}${upstreamCode(err?.error?.status)})`),
        classifyGoogle(res.status, res.headers, err, nowMs)
      );
    }

    let body: any;
    try {
      body = await res.json();
    } catch {
      throw new GooglePlayError('reviews.list returned a body that is not JSON');
    }

    /**
     * A BODY THAT IS NOT AN OBJECT IS NOT AN EMPTY PAGE.
     *
     * `reviews` being absent IS legitimate — Google omits empty repeated
     * fields, so an app with no reviews in the window answers `{}`, which GP6
     * pins. But that tolerance has to stop at the shape of the body itself.
     * Read loosely, `null`, `[]` or a bare string all come out as "no reviews,
     * no next page" — an exhausted source — and runIngest then records a
     * SUCCESS, which resets `last_success_at`. That column is the 7-day
     * data-loss alarm. A malformed response must never be able to silence it.
     */
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new GooglePlayError('reviews.list returned a body that is not an object');
    }

    const reviews: unknown = body.reviews ?? [];
    if (!Array.isArray(reviews)) {
      throw new GooglePlayError('reviews.list returned reviews that are not a list');
    }

    /**
     * MORE THAN WE ASKED FOR IS A FAILURE, NOT A BONUS.
     *
     * The page size is what keeps a tick inside its query budget. Past it,
     * writes start failing, and runIngest counts a failed write as one rejected
     * review and moves on — so the cursor would advance past reviews that were
     * never stored, on every pass. Throwing keeps the cursor where it is and
     * puts the reason in last_error. Truncating would be the loss: the next
     * page token already points beyond whatever was cut.
     */
    if (reviews.length > GOOGLE_PLAY_PAGE_SIZE) {
      throw new GooglePlayError(
        `reviews.list returned ${reviews.length} reviews after asking for at most ${GOOGLE_PLAY_PAGE_SIZE}`
      );
    }

    const next = body?.tokenPagination?.nextPageToken;
    return {
      items: reviews,
      nextToken: typeof next === 'string' && next ? next : null,
      restarted,
    };
  };
}

/**
 * One Google Play sync run: at most one page, written through the core.
 *
 * `db` and `fetchImpl` are parameters so a test can count queries and stand in
 * for Google; production passes neither.
 */
export async function syncGooglePlay(
  env: GooglePlaySyncEnv,
  nowMs: number,
  db: D1Database = env.DB,
  fetchImpl: FetchLike = defaultFetch
): Promise<PhaseResult> {
  // Anything but the literal "true" is off, the convention every switch here follows.
  if (env.STORE_SYNC_ENABLED !== 'true') {
    return { skipped: 'STORE_SYNC_ENABLED is not "true"', report: null };
  }

  const packageName = env.GOOGLE_PLAY_PACKAGE_NAME?.trim();
  const keyFile = env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!packageName || !keyFile) {
    // Not configured is not failing. Nothing is written, so the console keeps
    // saying "not collecting yet" instead of showing a sync that never started.
    return { skipped: 'Google Play is not configured', report: null };
  }

  // Minted on first use, shared by the stale-cursor retry, never stored. A key
  // that will not parse rejects here, inside the page fetch, so runIngest
  // records it like any other failed run.
  let token: Promise<string> | null = null;
  const getToken = () =>
    (token ??= (async () => mintAccessToken(parseServiceAccount(keyFile), nowMs, fetchImpl))());

  const report = await runIngest(db, {
    source: 'google_play',
    appId: packageName,
    fetchPage: googlePlayFetcher(packageName, getToken, fetchImpl, nowMs),
    normalize: normalizeGooglePlay,
  }, nowMs, { maxPages: 1 });

  return { skipped: null, report };
}
