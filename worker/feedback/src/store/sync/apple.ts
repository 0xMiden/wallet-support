/**
 * App Store review sync — one page of customer reviews per run, through the
 * same ingestion core as Google Play.
 *
 * What is Apple's lives here: the signed token, finding the app, and the page
 * request. Paging, checkpoints, retries, dedup and edit history are the core's,
 * exactly as for Google, so the two stores cannot disagree about what a
 * duplicate is.
 */
import { runIngest } from '../ingest';
import type { FetchPage } from '../paginate';
import { normalizeAppStore } from '../normalize';
import { defaultFetch, type FetchLike } from '../auth/google';
import { parseAppStoreKey, signAppStoreJwt } from '../auth/apple';
import { classifyApple, markFailure } from '../failure';
import type { PhaseResult } from './google';

/** Every request goes here and nowhere else. See cursorFrom(). */
export const APP_STORE_CONNECT_API = 'https://api.appstoreconnect.apple.com';

/**
 * Reviews per page. ONE page per run.
 *
 * The D1 budget is Google's — the same core writes the same statements — and
 * allows more. It is 5 for the reason GOOGLE_PLAY_PAGE_SIZE is: CPU, 10 ms per
 * cron invocation on the free plan, which no local test enforces. Apple's run
 * signs with ECDSA, which is cheaper than RSA, but it also makes a second
 * request and parses a second body: the app lookup. Raise it only after reading
 * real CPU time, and never past what test AS14 allows.
 */
export const APP_STORE_PAGE_SIZE = 5;

export class AppStoreError extends Error {}

export interface AppStoreSyncEnv {
  DB: D1Database;
  STORE_SYNC_ENABLED?: string;
  APP_STORE_SYNC_ENABLED?: string;
  APP_STORE_BUNDLE_ID?: string;
  APPLE_ASC_KEY_ID?: string;
  APPLE_ASC_ISSUER_ID?: string;
  APPLE_ASC_PRIVATE_KEY?: string;
}

/**
 * A short machine code from an App Store Connect error body, or nothing.
 *
 * Apple's codes are dotted — FORBIDDEN_ERROR, PARAMETER_ERROR.INVALID — and the
 * code is what tells a missing role from an unsigned agreement. `title` and
 * `detail` are not kept: they are upstream prose, with no business in a stored
 * error.
 */
export function appleErrorCode(body: unknown): string {
  const code = (body as any)?.errors?.[0]?.code;
  return typeof code === 'string' && code.length <= 80 && /^[A-Za-z_]+(\.[A-Za-z_]+)*$/.test(code)
    ? `, ${code}` : '';
}

/**
 * Every refusal from Apple goes through here — the app lookup as well as the
 * page request.
 *
 * BOTH SITES, DELIBERATELY. The lookup runs before every page, so a key that
 * has expired fails there and never reaches the reviews endpoint at all.
 * Classifying only the page request would leave exactly the dead-credential
 * case retrying for ever, which is the case worth stopping.
 */
async function refused(res: Response, stage: string, nowMs: number): Promise<AppStoreError> {
  let body: unknown = null;
  try { body = await res.json(); } catch { /* the status is reported either way */ }
  return markFailure(
    new AppStoreError(`${stage} failed (HTTP ${res.status}${appleErrorCode(body)})`),
    classifyApple(res.status, res.headers, body, nowMs)
  );
}

const bearer = (token: string): RequestInit => ({ headers: { authorization: `Bearer ${token}` } });

/**
 * App Store Connect's own ID for the app, found by bundle ID.
 *
 * LOOKED UP, NOT CONFIGURED. The reviews endpoint takes Apple's opaque app
 * resource ID, and Apple's documentation says to take it from this list. A
 * configured ID could name some other app the key can read and nothing would
 * notice; matching the bundle ID is the check. Exactly one app must match
 * exactly — a sibling such as `<bundle ID>.widget` does not count.
 *
 * Once per run, never cached: a cached ID is state that can go stale, against
 * one request there is ample budget for.
 */
export async function resolveAppId(
  bundleId: string, token: string, fetchImpl: FetchLike = defaultFetch,
  /** Only for reading a `Retry-After` given as a date. The run's clock. */
  nowMs: number = Date.now()
): Promise<string> {
  const url = new URL('/v1/apps', APP_STORE_CONNECT_API);
  url.searchParams.set('filter[bundleId]', bundleId);
  url.searchParams.set('fields[apps]', 'bundleId');
  url.searchParams.set('limit', '50');

  const res = await fetchImpl(url.toString(), bearer(token));
  if (!res.ok) throw await refused(res, 'App Store app lookup', nowMs);

  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new AppStoreError('App Store app lookup returned a body that is not JSON');
  }
  if (!Array.isArray(body?.data)) {
    throw new AppStoreError('App Store app lookup returned apps that are not a list');
  }

  const matches = body.data.filter((app: any) => app?.type === 'apps' && app?.attributes?.bundleId === bundleId);
  if (matches.length === 0) {
    throw new AppStoreError(`App Store app lookup found no app with bundle ID ${bundleId}`);
  }
  if (matches.length > 1) {
    throw new AppStoreError(`App Store app lookup found more than one app with bundle ID ${bundleId}`);
  }
  const id = matches[0].id;
  // Numeric, because it goes into a URL path.
  if (typeof id !== 'string' || !/^[0-9]{1,20}$/.test(id)) {
    throw new AppStoreError('App Store app lookup returned an app ID that is not numeric');
  }
  return id;
}

const reviewsPath = (appId: string) => `/v1/apps/${appId}/customerReviews`;

function reviewsUrl(appId: string, cursor: string | null): string {
  const url = new URL(reviewsPath(appId), APP_STORE_CONNECT_API);
  url.searchParams.set('sort', '-createdDate');
  url.searchParams.set('limit', String(APP_STORE_PAGE_SIZE));
  if (cursor) url.searchParams.set('cursor', cursor);
  return url.toString();
}

/**
 * The cursor from `links.next`, and nothing else from it.
 *
 * THE LINK IS NEVER FOLLOWED. It is an absolute URL chosen by the response, and
 * the bearer token goes with every request: following it is how a credential
 * would leave the pinned host. So it must name exactly the endpoint just
 * called, only its cursor is kept, and the next request is rebuilt from
 * APP_STORE_CONNECT_API. The checkpoint stores a cursor, never a URL.
 *
 * A link that fails is an ERROR, not the end of the list. Reading it as "no
 * next page" would look like a finished backlog and silently cut the pass short.
 */
function cursorFrom(next: unknown, appId: string): string | null {
  if (next === undefined || next === null) return null;

  let url: URL | null = null;
  try { url = typeof next === 'string' ? new URL(next) : null; } catch { url = null; }
  const pinned = new URL(APP_STORE_CONNECT_API);
  if (!url || url.protocol !== pinned.protocol || url.host !== pinned.host
      || url.username || url.password || url.pathname !== reviewsPath(appId)) {
    throw new AppStoreError('customerReviews returned a next link outside the reviews endpoint');
  }

  const cursor = url.searchParams.get('cursor');
  if (!cursor || cursor.length > 1000) {
    throw new AppStoreError('customerReviews returned a next link without a usable cursor');
  }
  return cursor;
}

export function appStoreFetcher(
  bundleId: string,
  getToken: () => Promise<string>,
  fetchImpl: FetchLike = defaultFetch,
  /** Only for reading a `Retry-After` given as a date. The run's clock. */
  nowMs: number = Date.now()
): FetchPage<unknown> {
  // Found on the first page request and shared with the stale-cursor retry.
  let appId: Promise<string> | null = null;
  const getAppId = () => (appId ??= (async () => resolveAppId(bundleId, await getToken(), fetchImpl, nowMs))());

  const request = async (id: string, cursor: string | null) =>
    fetchImpl(reviewsUrl(id, cursor), bearer(await getToken()));

  return async (cursor) => {
    const id = await getAppId();
    let res = await request(id, cursor);

    // A STALE CURSOR MUST NOT WEDGE THE SYNC. The rule and the reasoning are
    // googlePlayFetcher's: a refused cursor restarts the pass from the first
    // page, once. upsertReview makes re-reading free of side effects.
    let restarted = false;
    if (res.status === 400 && cursor) {
      res = await request(id, null);
      // And the pass has started over — see googlePlayFetcher.
      restarted = true;
    }

    if (!res.ok) throw await refused(res, 'customerReviews', nowMs);

    let body: any;
    try {
      body = await res.json();
    } catch {
      throw new AppStoreError('customerReviews returned a body that is not JSON');
    }

    const reviews: unknown = body?.data;
    if (!Array.isArray(reviews)) {
      throw new AppStoreError('customerReviews returned reviews that are not a list');
    }

    // MORE THAN WE ASKED FOR IS A FAILURE, NOT A BONUS — see googlePlayFetcher.
    // Truncating would lose reviews behind a cursor that already points past them.
    if (reviews.length > APP_STORE_PAGE_SIZE) {
      throw new AppStoreError(
        `customerReviews returned ${reviews.length} reviews after asking for at most ${APP_STORE_PAGE_SIZE}`
      );
    }

    return { items: reviews, nextToken: cursorFrom(body?.links?.next, id), restarted };
  };
}

/** What a run needs, by variable name. */
const REQUIRED = ['APP_STORE_BUNDLE_ID', 'APPLE_ASC_KEY_ID', 'APPLE_ASC_ISSUER_ID', 'APPLE_ASC_PRIVATE_KEY'] as const;

/**
 * One App Store sync run: at most one page, written through the core.
 *
 * `db` and `fetchImpl` are parameters so a test can count queries and stand in
 * for Apple; production passes neither.
 */
export async function syncAppStore(
  env: AppStoreSyncEnv,
  nowMs: number,
  db: D1Database = env.DB,
  fetchImpl: FetchLike = defaultFetch
): Promise<PhaseResult> {
  // Two switches, each off unless the literal "true". STORE_SYNC_ENABLED stops
  // every store; APP_STORE_SYNC_ENABLED stops this one while Google carries on.
  if (env.STORE_SYNC_ENABLED !== 'true') {
    return { skipped: 'STORE_SYNC_ENABLED is not "true"', report: null };
  }
  if (env.APP_STORE_SYNC_ENABLED !== 'true') {
    return { skipped: 'APP_STORE_SYNC_ENABLED is not "true"', report: null };
  }

  // Not configured is not failing, as for Google: nothing is written. The
  // reason names what is missing — by name, never by value.
  const missing = REQUIRED.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    return {
      skipped: `App Store is not configured: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not set`,
      report: null,
    };
  }
  const bundleId = env.APP_STORE_BUNDLE_ID!.trim();

  // Minted on first use, shared by every request in the run, never stored. A
  // key that will not parse rejects here, inside the page fetch, so runIngest
  // records it like any other failed run.
  let token: Promise<string> | null = null;
  const getToken = () => (token ??= (async () => signAppStoreJwt(
    parseAppStoreKey(env.APPLE_ASC_KEY_ID, env.APPLE_ASC_ISSUER_ID, env.APPLE_ASC_PRIVATE_KEY), nowMs
  ))());

  const report = await runIngest(db, {
    source: 'app_store',
    // The bundle ID, not Apple's numeric ID: it is known before the run starts,
    // so a run that cannot find the app still checkpoints under the right key.
    appId: bundleId,
    fetchPage: appStoreFetcher(bundleId, getToken, fetchImpl, nowMs),
    normalize: normalizeAppStore,
  }, nowMs, { maxPages: 1 });

  return { skipped: null, report };
}
