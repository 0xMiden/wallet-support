/**
 * Phase 2 — App Store review sync: the team API key, the signed token, finding
 * the app, the page request, and the store-cron slot that runs them.
 *
 * Apple is never called. Each test either passes its own fetch to the code
 * under test, or registers routes on the shared stub, and a real P-256 key is
 * generated per run so signatures are checked rather than assumed.
 *
 * Properties that matter more than the rest, because each fails silently in
 * production and loudly nowhere else:
 *   AS6      the next-page link is never followed; only a pinned cursor is kept
 *   AS8      a page larger than requested is a failure, never a partial write
 *   AS14     a full page of new reviews fits the free plan's 50-query limit
 *   AS15     Apple is contacted only when both switches are the literal "true"
 *   AS16-17  runs walk a backlog page by page and resume where a failure stopped
 *   AS18     a review seen again is one row, and an edit is a version of it
 *   AS19     the stored original is enough to re-derive every column
 *   AS21     switched on, the deploy cannot go out without the Apple secrets
 *   AS22     nothing logged or stored carries a key, an ID or a token
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
import wranglerConfig from '../wrangler.jsonc?raw';
import {
  callsTo, countingDb, installFetchStub, recordedCalls, restoreFetch, route, runCron, seedSubmission, withEnv,
} from './helpers';
import { STORE_CRON } from '../src/crons';
import {
  APPLE_TOKEN_LIFETIME_S, AppleAuthError, parseAppStoreKey, signAppStoreJwt,
} from '../src/store/auth/apple';
import {
  APP_STORE_CONNECT_API, APP_STORE_PAGE_SIZE, AppStoreError, appStoreFetcher, resolveAppId, syncAppStore,
} from '../src/store/sync/apple';
import { D1_QUERIES_PER_INVOCATION } from '../src/store/sync/google';
import { STORE_TICK_MS, phaseFor, runStoreTick } from '../src/store/cron';
import { loadCheckpoint, PARK_REPROBE_MS, CYCLE_PERIOD_MS } from '../src/store/checkpoint';
import { DEFAULT_DEFER_MS, MAX_DEFER_MS } from '../src/store/failure';
import { upsertReview } from '../src/store/upsert';
import { NormalizeError, fromAppStore, hashRaw, normalizeGooglePlay } from '../src/store/normalize';

const BUNDLE = 'com.miden.bread';
/** A stand-in. Production never configures this: it is looked up by bundle ID. */
const APP_ID = '1234567890';
const HOST = 'api.appstoreconnect.apple.com';
const KEY_ID = 'T3STK3Y9QX';
const ISSUER = '57246542-96fe-1a63-e053-0824d011072a';
const NOW = 1_788_300_000_000;
const CHECKPOINT = `app_store:${BUNDLE}`;
/** The App Store has the odd store-cron slots, so its runs are ten minutes apart. */
const APPLE_SLOT = 7 * STORE_TICK_MS;
const APPLE_RUN_MS = 2 * STORE_TICK_MS;
/** Planted in key material and upstream prose; must never reach an error or a log. */
const MARKER = 'KEY-MATERIAL-MARKER-a91f';

let p8: string;
let wrongCurveP8: string;
let publicKey: CryptoKey;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64url(part: string): Uint8Array {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

const decodeJson = (part: string) => JSON.parse(new TextDecoder().decode(fromBase64url(part)));

async function pkcs8Pem(key: CryptoKey): Promise<string> {
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', key) as ArrayBuffer);
  return `-----BEGIN PRIVATE KEY-----\n${toBase64(der).match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`;
}

beforeAll(async () => {
  installFetchStub();

  // A real key, in the PEM form of Apple's AuthKey_<KEYID>.p8 download.
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
  ) as CryptoKeyPair;
  publicKey = pair.publicKey;
  p8 = await pkcs8Pem(pair.privateKey);

  const wrong = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-384' }, true, ['sign', 'verify']
  ) as CryptoKeyPair;
  wrongCurveP8 = await pkcs8Pem(wrong.privateKey);
});

async function clearStoreTables() {
  await env.DB.prepare('DELETE FROM store_review_events').run();
  await env.DB.prepare('DELETE FROM store_review_versions').run();
  await env.DB.prepare('DELETE FROM store_reviews').run();
  await env.DB.prepare('DELETE FROM store_sync_state').run();
}

beforeEach(clearStoreTables);
afterEach(async () => {
  restoreFetch();
  installFetchStub();
  // After, too: the console's empty state reads store_sync_state, and CI runs
  // the suite shuffled.
  await clearStoreTables();
});

/** A customer review in the shape App Store Connect documents. */
function review(id: string, body = 'Private send fails since the update.', attributes: Record<string, unknown> = {}) {
  return {
    type: 'customerReviews',
    id,
    attributes: {
      rating: 3,
      title: 'Send fails',
      body,
      reviewerNickname: 'a-tester',
      createdDate: '2026-09-01T08:10:34-07:00',
      territory: 'USA',
      ...attributes,
    },
    relationships: { response: { links: { related: `${APP_STORE_CONNECT_API}/v1/customerReviews/${id}/response` } } },
    links: { self: `${APP_STORE_CONNECT_API}/v1/customerReviews/${id}` },
  };
}

const reviewsEndpoint = `${APP_STORE_CONNECT_API}/v1/apps/${APP_ID}/customerReviews`;

/** A page of reviews; `links.next` is shaped the way Apple documents it. */
const page = (reviews: unknown[], cursor?: string) => Response.json({
  data: reviews,
  links: {
    self: reviewsEndpoint,
    ...(cursor ? { next: `${reviewsEndpoint}?cursor=${encodeURIComponent(cursor)}&limit=${APP_STORE_PAGE_SIZE}` } : {}),
  },
  meta: { paging: { total: 100, limit: APP_STORE_PAGE_SIZE } },
});

const apps = (...list: Array<{ id: string; bundleId: string }>) => Response.json({
  data: list.map((a) => ({
    type: 'apps', id: a.id, attributes: { bundleId: a.bundleId },
    links: { self: `${APP_STORE_CONNECT_API}/v1/apps/${a.id}` },
  })),
  links: { self: `${APP_STORE_CONNECT_API}/v1/apps` },
});

const appleError = (status: number, code: string, prose = 'An error occurred.') => Response.json(
  { errors: [{ id: 'e1', status: String(status), code, title: prose, detail: prose }] }, { status }
);

type Call = { url: URL; init?: RequestInit };
type Answer = Response | Promise<Response>;

/** Stands in for Apple: the app lookup, and customer reviews answered per cursor. */
function fakeApple(
  list: (cursor: string | null) => Answer,
  lookup: () => Answer = () => apps({ id: APP_ID, bundleId: BUNDLE })
) {
  const calls: Call[] = [];
  const fetchImpl = async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    calls.push({ url, init });
    if (url.host === HOST && url.pathname === '/v1/apps') return lookup();
    if (url.host === HOST && url.pathname === `/v1/apps/${APP_ID}/customerReviews`) {
      return list(url.searchParams.get('cursor'));
    }
    throw new Error(`unexpected fetch: ${input}`);
  };
  return { fetchImpl, calls };
}

type FakeApple = ReturnType<typeof fakeApple>;

const lookups = (apple: FakeApple) => apple.calls.filter((c) => c.url.pathname === '/v1/apps').length;
const reviewCursors = (apple: FakeApple) => apple.calls
  .filter((c) => c.url.pathname.endsWith('/customerReviews'))
  .map((c) => c.url.searchParams.get('cursor'));

const syncEnv = (over: Record<string, string | undefined> = {}) => ({
  DB: env.DB,
  STORE_SYNC_ENABLED: 'true',
  APP_STORE_SYNC_ENABLED: 'true',
  APP_STORE_BUNDLE_ID: BUNDLE,
  APPLE_ASC_KEY_ID: KEY_ID,
  APPLE_ASC_ISSUER_ID: ISSUER,
  APPLE_ASC_PRIVATE_KEY: p8,
  ...over,
});

/** Rows a run could have written, across every store table it touches. */
async function rowsWritten(): Promise<number> {
  let total = 0;
  for (const table of ['store_reviews', 'store_review_versions', 'store_review_events', 'store_sync_state']) {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
    total += row?.n ?? 0;
  }
  return total;
}

const storedIds = async () => (await env.DB
  .prepare("SELECT platform_review_id AS id FROM store_reviews WHERE source = 'app_store' ORDER BY id")
  .all<{ id: string }>()).results.map((r) => r.id);

describe('the team API key', () => {
  it('AS1. reads the .p8 as downloaded, and however a form or dashboard field kept its line breaks', () => {
    const key = parseAppStoreKey(KEY_ID, ISSUER, p8);
    expect(key).toMatchObject({ keyId: KEY_ID, issuerId: ISSUER });
    expect(key.pkcs8.length).toBeGreaterThan(100);

    for (const variant of [
      p8.replace(/\n/g, '\r\n'),
      p8.replace(/\n/g, '\\n'),
      p8.replace(/\n/g, ' '),
      p8.replace(/\n/g, ''),
    ]) {
      expect(parseAppStoreKey(KEY_ID, ISSUER, variant).pkcs8).toEqual(key.pkcs8);
    }
    // Copied IDs often bring a space or a newline with them.
    expect(parseAppStoreKey(` ${KEY_ID}\n`, `${ISSUER} `, p8)).toMatchObject({ keyId: KEY_ID, issuerId: ISSUER });
  });

  it('AS2. a missing or malformed key or ID is named, and never quoted into the error', async () => {
    const cases: Array<[string | undefined, string | undefined, string | undefined, string]> = [
      [undefined, ISSUER, p8, 'APPLE_ASC_KEY_ID is not set'],
      [KEY_ID, '', p8, 'APPLE_ASC_ISSUER_ID is not set'],
      [KEY_ID, ISSUER, '  ', 'APPLE_ASC_PRIVATE_KEY is not set'],
      [MARKER, ISSUER, p8, 'APPLE_ASC_KEY_ID is not a 10-character App Store Connect key ID'],
      [ISSUER, KEY_ID, p8, 'APPLE_ASC_KEY_ID is not a 10-character App Store Connect key ID'],
      [KEY_ID, MARKER, p8, 'APPLE_ASC_ISSUER_ID is not an App Store Connect issuer ID'],
      [KEY_ID, ISSUER, MARKER, 'APPLE_ASC_PRIVATE_KEY is not a .p8 private key; paste the whole file, BEGIN and END lines included'],
      [KEY_ID, ISSUER, `-----BEGIN PRIVATE KEY-----\n${MARKER}\n-----END PRIVATE KEY-----`, 'APPLE_ASC_PRIVATE_KEY is not valid base64'],
      [KEY_ID, ISSUER, `-----BEGIN EC PRIVATE KEY-----\n${MARKER}\n-----END EC PRIVATE KEY-----`, 'APPLE_ASC_PRIVATE_KEY is a SEC1 key; paste the .p8 file exactly as Apple issued it'],
      [KEY_ID, ISSUER, `-----BEGIN RSA PRIVATE KEY-----\n${MARKER}\n-----END RSA PRIVATE KEY-----`, 'APPLE_ASC_PRIVATE_KEY is not a .p8 private key; paste the whole file, BEGIN and END lines included'],
    ];
    for (const [kid, iss, key, expected] of cases) {
      let message = '';
      try {
        parseAppStoreKey(kid, iss, key);
      } catch (err) {
        expect(err).toBeInstanceOf(AppleAuthError);
        message = (err as Error).message;
      }
      expect(message).toBe(expected);
      expect(message).not.toContain(MARKER);
    }

    // A well-formed PKCS#8 key on the wrong curve parses, and fails at signing.
    const err = await signAppStoreJwt(parseAppStoreKey(KEY_ID, ISSUER, wrongCurveP8), NOW).catch((e) => e);
    expect(err).toBeInstanceOf(AppleAuthError);
    expect(err.message).toBe('APPLE_ASC_PRIVATE_KEY could not be imported as a P-256 signing key');
  });
});

describe('signing in to App Store Connect', () => {
  it('AS3. the token is ES256, names the key and the team, lives under 20 minutes, and verifies against the key', async () => {
    const jwt = await signAppStoreJwt(parseAppStoreKey(KEY_ID, ISSUER, p8), NOW);
    expect(jwt).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const [header, claims, signature] = jwt.split('.');

    expect(decodeJson(header)).toEqual({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' });
    const iat = Math.floor(NOW / 1000);
    expect(decodeJson(claims)).toEqual({ iss: ISSUER, iat, exp: iat + APPLE_TOKEN_LIFETIME_S, aud: 'appstoreconnect-v1' });
    expect(APPLE_TOKEN_LIFETIME_S).toBeGreaterThan(0);
    expect(APPLE_TOKEN_LIFETIME_S).toBeLessThanOrEqual(20 * 60);

    // JWS wants the raw 64-byte r||s for ES256, not a DER structure.
    const sig = fromBase64url(signature);
    expect(sig.length).toBe(64);
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, publicKey, sig, new TextEncoder().encode(`${header}.${claims}`)
    );
    expect(valid).toBe(true);
  });
});

describe('finding the app', () => {
  it('AS4. by bundle ID at the pinned endpoint, and only one exact, numeric match counts', async () => {
    const apple = fakeApple(
      () => page([]),
      () => apps({ id: '999', bundleId: `${BUNDLE}.widget` }, { id: APP_ID, bundleId: BUNDLE })
    );
    expect(await resolveAppId(BUNDLE, 'signed.jwt', apple.fetchImpl)).toBe(APP_ID);

    const req = apple.calls[0];
    expect(`${req.url.origin}${req.url.pathname}`).toBe(`${APP_STORE_CONNECT_API}/v1/apps`);
    expect(req.url.searchParams.get('filter[bundleId]')).toBe(BUNDLE);
    expect(new Headers(req.init?.headers).get('authorization')).toBe('Bearer signed.jwt');

    const cases: Array<[() => Response, string]> = [
      [() => apps(), 'App Store app lookup found no app with bundle ID com.miden.bread'],
      [() => apps({ id: '999', bundleId: `${BUNDLE}.widget` }), 'App Store app lookup found no app with bundle ID com.miden.bread'],
      [() => apps({ id: '1', bundleId: BUNDLE }, { id: '2', bundleId: BUNDLE }), 'App Store app lookup found more than one app with bundle ID com.miden.bread'],
      [() => apps({ id: '../../users', bundleId: BUNDLE }), 'App Store app lookup returned an app ID that is not numeric'],
      [() => Response.json({ data: { id: APP_ID } }), 'App Store app lookup returned apps that are not a list'],
      [() => new Response('<html>', { status: 200 }), 'App Store app lookup returned a body that is not JSON'],
    ];
    for (const [answer, message] of cases) {
      const err = await resolveAppId(BUNDLE, 'signed.jwt', async () => answer()).catch((e) => e);
      expect(err).toBeInstanceOf(AppStoreError);
      expect(err.message).toBe(message);
    }
  });
});

describe('reading a page of reviews', () => {
  it('AS5. asks for one page-size, newest first, with the token, and maps the cursor', async () => {
    const cursor = 'AQ.AMt2C-U';
    const apple = fakeApple((c) => (c === cursor ? page([]) : page([review('a'), review('b')], cursor)));
    const fetchPage = appStoreFetcher(BUNDLE, async () => 'signed.jwt', apple.fetchImpl);

    const first = await fetchPage(null);
    expect(first.items).toHaveLength(2);
    expect(first.nextToken).toBe(cursor);

    const req = apple.calls[1];
    expect(`${req.url.origin}${req.url.pathname}`).toBe(reviewsEndpoint);
    expect(req.url.searchParams.get('limit')).toBe(String(APP_STORE_PAGE_SIZE));
    expect(req.url.searchParams.get('sort')).toBe('-createdDate');
    expect(req.url.searchParams.has('cursor')).toBe(false);
    expect(new Headers(req.init?.headers).get('authorization')).toBe('Bearer signed.jwt');

    expect(await fetchPage(cursor)).toEqual({ items: [], nextToken: null, restarted: false });
    expect(reviewCursors(apple)).toEqual([null, cursor]);
    // Found once, not once per page.
    expect(lookups(apple)).toBe(1);
  });

  it('AS6. the next-page link is never followed: only a cursor from the same endpoint is kept', async () => {
    const outside: unknown[] = [
      `https://attacker.example/v1/apps/${APP_ID}/customerReviews?cursor=x`,
      `https://${HOST}.attacker.example/v1/apps/${APP_ID}/customerReviews?cursor=x`,
      `http://${HOST}/v1/apps/${APP_ID}/customerReviews?cursor=x`,
      `https://user:pass@${HOST}/v1/apps/${APP_ID}/customerReviews?cursor=x`,
      `https://${HOST}/v1/apps/999/customerReviews?cursor=x`,
      `https://${HOST}/v1/apps/${APP_ID}/customerReviews/../../../users?cursor=x`,
      'not a url',
      42,
    ];
    for (const next of outside) {
      const apple = fakeApple(() => Response.json({ data: [review('a')], links: { self: reviewsEndpoint, next } }));
      const err = await appStoreFetcher(BUNDLE, async () => 't', apple.fetchImpl)(null).catch((e) => e);
      expect(err, JSON.stringify(next)).toBeInstanceOf(AppStoreError);
      expect(err.message).toBe('customerReviews returned a next link outside the reviews endpoint');
    }

    const noCursor = fakeApple(() => Response.json({ data: [], links: { self: reviewsEndpoint, next: `${reviewsEndpoint}?limit=5` } }));
    await expect(appStoreFetcher(BUNDLE, async () => 't', noCursor.fetchImpl)(null))
      .rejects.toThrow('customerReviews returned a next link without a usable cursor');

    // In a run, a bad link stores nothing and moves nothing.
    const hostile = fakeApple(() => Response.json({ data: [review('a')], links: { self: reviewsEndpoint, next: outside[0] } }));
    const run = await syncAppStore(syncEnv(), NOW, env.DB, hostile.fetchImpl);
    expect(run.report).toMatchObject({ created: 0, error: 'customerReviews returned a next link outside the reviews endpoint' });
    expect(await loadCheckpoint(env.DB, CHECKPOINT)).toMatchObject({ cursor: null, consecutive_failures: 1 });
    expect(await storedIds()).toEqual([]);
  });

  it('AS7. a stale cursor restarts the pass instead of wedging the sync', async () => {
    const apple = fakeApple((cursor) => (cursor
      ? appleError(400, 'PARAMETER_ERROR.INVALID')
      : page([review('a')], 'fresh')));
    const fetchPage = appStoreFetcher(BUNDLE, async () => 't', apple.fetchImpl);

    // `restarted` marks the pass as begun again, so the tokens that follow are
    // read as a fresh pass rather than as paging going round in a circle.
    expect(await fetchPage('expired')).toEqual({ items: [review('a')], nextToken: 'fresh', restarted: true });
    expect(reviewCursors(apple)).toEqual(['expired', null]);

    // If the first page is refused too, that is a real failure and it says so.
    const broken = fakeApple(() => appleError(400, 'PARAMETER_ERROR.INVALID'));
    await expect(appStoreFetcher(BUNDLE, async () => 't', broken.fetchImpl)('expired'))
      .rejects.toThrow('customerReviews failed (HTTP 400, PARAMETER_ERROR.INVALID)');
  });

  it('AS8. more reviews than asked for fails loudly, and nothing moves', async () => {
    const tooMany = Array.from({ length: APP_STORE_PAGE_SIZE + 1 }, (_, i) => review(`over-${i}`));
    const apple = fakeApple(() => page(tooMany, 'next'));

    const result = await syncAppStore(syncEnv(), NOW, env.DB, apple.fetchImpl);

    expect(result.report?.error).toBe(
      `customerReviews returned ${APP_STORE_PAGE_SIZE + 1} reviews after asking for at most ${APP_STORE_PAGE_SIZE}`
    );
    expect(result.report?.created).toBe(0);
    expect(await loadCheckpoint(env.DB, CHECKPOINT)).toMatchObject({ cursor: null, consecutive_failures: 1 });
    expect(await storedIds()).toEqual([]);
  });

  it("AS9. a refused request names the stage, the status and Apple's code, never the token or Apple's prose", async () => {
    const prose = `The token signed.secret-token for ${KEY_ID} is not valid ${MARKER}`;

    const lookup401 = await resolveAppId(BUNDLE, 'signed.secret-token', async () => appleError(401, 'NOT_AUTHORIZED', prose))
      .catch((e) => e);
    expect(lookup401).toBeInstanceOf(AppStoreError);
    expect(lookup401.message).toBe('App Store app lookup failed (HTTP 401, NOT_AUTHORIZED)');

    const forbidden = fakeApple(() => appleError(403, 'FORBIDDEN_ERROR', prose));
    const reviews403 = await appStoreFetcher(BUNDLE, async () => 'signed.secret-token', forbidden.fetchImpl)(null)
      .catch((e) => e);
    expect(reviews403).toBeInstanceOf(AppStoreError);
    expect(reviews403.message).toBe('customerReviews failed (HTTP 403, FORBIDDEN_ERROR)');

    // Apple's codes are dotted, and the dotted ones are the informative ones.
    const agreements = await resolveAppId(BUNDLE, 't', async () =>
      appleError(403, 'FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED', prose)).catch((e) => e);
    expect(agreements.message).toBe('App Store app lookup failed (HTTP 403, FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED)');

    // A "code" that is really prose is dropped, and so is a body that is not JSON.
    const prosey = await resolveAppId(BUNDLE, 't', async () => appleError(429, prose)).catch((e) => e);
    expect(prosey.message).toBe('App Store app lookup failed (HTTP 429)');
    const html = await resolveAppId(BUNDLE, 't', async () => new Response('<html>', { status: 502 })).catch((e) => e);
    expect(html.message).toBe('App Store app lookup failed (HTTP 502)');

    for (const err of [lookup401, reviews403, agreements, prosey, html]) {
      expect(err.message).not.toContain(MARKER);
      expect(err.message).not.toContain('secret-token');
      expect(err.message).not.toContain(KEY_ID);
    }

    const garbled = fakeApple(() => new Response('<html>', { status: 200 }));
    await expect(appStoreFetcher(BUNDLE, async () => 't', garbled.fetchImpl)(null))
      .rejects.toThrow('customerReviews returned a body that is not JSON');
  });
});

describe('the canonical record', () => {
  it('AS10. maps a customer review onto the record every source produces, and refuses one with no id', () => {
    const r = fromAppStore(
      review('rev-1', '  It crashes on launch.  ', { createdDate: '2017-11-15T08:10:34-08:00', rating: 4, title: ' Crash ', territory: 'GBR' }),
      BUNDLE, NOW
    );
    expect(r).toEqual({
      platformReviewId: 'rev-1', platform: 'ios', source: 'app_store', appId: BUNDLE,
      raw: expect.any(Object), rawHash: '',
      reviewTitle: 'Crash', reviewBody: 'It crashes on launch.', rating: 4, reviewerName: 'a-tester',
      territory: 'GBR', language: null,
      reviewCreatedAt: Date.UTC(2017, 10, 15, 16, 10, 34), reviewUpdatedAt: null,
      appVersion: null, appVersionCode: null, device: null, deviceProduct: null, osVersion: null,
      existingReplyText: null, existingReplyAt: null,
    });

    // A date that is not ISO 8601 falls back to the clock rather than a guess.
    expect(fromAppStore(review('rev-2', 'b', { createdDate: '11/15/2017' }), BUNDLE, NOW).reviewCreatedAt).toBe(NOW);
    expect(fromAppStore(review('rev-3', 'b', { createdDate: undefined }), BUNDLE, NOW).reviewCreatedAt).toBe(NOW);

    expect(() => fromAppStore({ type: 'customerReviews', attributes: {} }, BUNDLE, NOW)).toThrow(NormalizeError);
    expect(() => fromAppStore({ type: 'apps', id: APP_ID }, BUNDLE, NOW)).toThrow(NormalizeError);
    expect(() => fromAppStore(null, BUNDLE, NOW)).toThrow(NormalizeError);
  });
});

describe('a sync run', () => {
  it('AS11. switched on but unconfigured, a run names what is missing, calls nobody and writes nothing', async () => {
    const apple = fakeApple(() => page([review('a')]));
    const cases: Array<[Record<string, string | undefined>, string]> = [
      [{ APP_STORE_BUNDLE_ID: undefined }, 'App Store is not configured: APP_STORE_BUNDLE_ID is not set'],
      [{ APPLE_ASC_KEY_ID: '' }, 'App Store is not configured: APPLE_ASC_KEY_ID is not set'],
      [{ APPLE_ASC_ISSUER_ID: undefined }, 'App Store is not configured: APPLE_ASC_ISSUER_ID is not set'],
      [{ APPLE_ASC_PRIVATE_KEY: ' \n' }, 'App Store is not configured: APPLE_ASC_PRIVATE_KEY is not set'],
      [{ APPLE_ASC_KEY_ID: undefined, APPLE_ASC_PRIVATE_KEY: undefined },
        'App Store is not configured: APPLE_ASC_KEY_ID, APPLE_ASC_PRIVATE_KEY are not set'],
    ];
    for (const [over, skipped] of cases) {
      const result = await syncAppStore(syncEnv(over), NOW, env.DB, apple.fetchImpl);
      expect(result).toEqual({ skipped, report: null });
      // What IS set never appears in the reason.
      expect(skipped).not.toContain(ISSUER);
    }
    expect(apple.calls).toHaveLength(0);
    expect(await rowsWritten()).toBe(0);
  });

  it('AS12. a run finds the app, stores one page as iOS reviews, and checkpoints where Apple left off', async () => {
    const apple = fakeApple((cursor) => (cursor === 'c2' ? page([review('c')]) : page([review('a'), review('b')], 'c2')));

    const first = await syncAppStore(syncEnv(), NOW, env.DB, apple.fetchImpl);
    expect(first.skipped).toBeNull();
    expect(first.report).toMatchObject({ key: CHECKPOINT, created: 2, rejected: 0, pages: 1, error: null });
    expect(await loadCheckpoint(env.DB, CHECKPOINT))
      .toMatchObject({ cursor: 'c2', last_success_at: NOW, consecutive_failures: 0 });

    const second = await syncAppStore(syncEnv(), NOW + APPLE_RUN_MS, env.DB, apple.fetchImpl);
    expect(second.report).toMatchObject({ created: 1, rejected: 0, exhausted: true, error: null });
    expect((await loadCheckpoint(env.DB, CHECKPOINT))?.cursor).toBeNull();

    // One lookup and one page per run.
    expect(lookups(apple)).toBe(2);
    expect(reviewCursors(apple)).toEqual([null, 'c2']);

    const rows = await env.DB.prepare('SELECT DISTINCT platform, source, app_id FROM store_reviews').all();
    expect(rows.results).toEqual([{ platform: 'ios', source: 'app_store', app_id: BUNDLE }]);
  });

  it('AS13. a key that will not sign, or a token Apple refuses, is a failed run recorded without any secret', async () => {
    const apple = fakeApple(() => page([review('a')]));
    const broken = await syncAppStore(
      syncEnv({ APPLE_ASC_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${MARKER}\n-----END PRIVATE KEY-----` }),
      NOW, env.DB, apple.fetchImpl
    );
    expect(broken.report?.error).toBe('APPLE_ASC_PRIVATE_KEY is not valid base64');
    expect(apple.calls).toHaveLength(0);
    let cp = await loadCheckpoint(env.DB, CHECKPOINT);
    expect(cp?.consecutive_failures).toBe(1);
    expect(cp?.last_error).not.toContain(MARKER);

    // Refused at the first request: no review request follows it.
    const refused = fakeApple(() => page([review('a')]), () => appleError(401, 'NOT_AUTHORIZED', `bad ${MARKER}`));
    const denied = await syncAppStore(syncEnv(), NOW + APPLE_RUN_MS, env.DB, refused.fetchImpl);
    expect(denied.report?.error).toBe('App Store app lookup failed (HTTP 401, NOT_AUTHORIZED)');
    expect(reviewCursors(refused)).toEqual([]);
    cp = await loadCheckpoint(env.DB, CHECKPOINT);
    expect(cp?.consecutive_failures).toBe(2);
    expect(cp?.last_error).toContain('App Store app lookup failed (HTTP 401, NOT_AUTHORIZED)');
    expect(cp?.last_error).not.toContain(MARKER);
    expect(await storedIds()).toEqual([]);
  });

  it("AS14. SYNC-BUDGET: a full page of brand-new reviews stays inside the free plan's query limit", async () => {
    // All-new is the worst case: a new review costs the most statements.
    const fresh = Array.from({ length: APP_STORE_PAGE_SIZE }, (_, i) => review(`new-${i}`, `Review number ${i}`));
    const apple = fakeApple(() => page(fresh, 'more'));
    const counted = countingDb(env.DB);

    const result = await syncAppStore(syncEnv(), NOW, counted.db, apple.fetchImpl);

    expect(result.report?.created).toBe(APP_STORE_PAGE_SIZE);
    // Positive control: the counter really sees the writes.
    expect(counted.count()).toBeGreaterThan(APP_STORE_PAGE_SIZE);
    expect(counted.count()).toBeLessThanOrEqual(D1_QUERIES_PER_INVOCATION);
    // Outbound: one lookup, one page.
    expect(apple.calls).toHaveLength(2);
  });
});

describe('the App Store switch', () => {
  it('AS15. Apple is contacted only when both switches are the literal "true"', async () => {
    const apple = fakeApple(() => page([review('a')]));
    const values = [undefined, '', 'false', 'FALSE', '0', 'no', 'off', 'TRUE', 'True', ' true', 'true ', '1', 'yes', 'on'];

    for (const value of values) {
      expect(await syncAppStore(syncEnv({ APP_STORE_SYNC_ENABLED: value }), NOW, env.DB, apple.fetchImpl),
        `APP_STORE_SYNC_ENABLED=${JSON.stringify(value)}`)
        .toEqual({ skipped: 'APP_STORE_SYNC_ENABLED is not "true"', report: null });
      expect(await syncAppStore(syncEnv({ STORE_SYNC_ENABLED: value }), NOW, env.DB, apple.fetchImpl),
        `STORE_SYNC_ENABLED=${JSON.stringify(value)}`)
        .toEqual({ skipped: 'STORE_SYNC_ENABLED is not "true"', report: null });
    }
    // Every secret and the bundle ID were set every time. Only a switch said no.
    expect(apple.calls).toHaveLength(0);
    expect(await rowsWritten()).toBe(0);

    const on = await syncAppStore(syncEnv(), NOW, env.DB, apple.fetchImpl);
    expect(on.skipped).toBeNull();
    expect(on.report).toMatchObject({ created: 1, rejected: 0, error: null });
    expect(apple.calls.map((c) => c.url.host)).toEqual([HOST, HOST]);
  });
});

describe('working through a backlog', () => {
  /**
   * A store holding `reviews` newest first, whose cursor is an offset. The
   * pessimistic model: anything that moves shifts every page after it.
   * `failOnce` names cursors that answer 503 the first time they are asked for.
   */
  function backlog(reviews: () => unknown[], failOnce: Set<string> = new Set()) {
    return fakeApple((cursor) => {
      if (cursor && failOnce.delete(cursor)) return appleError(503, 'SERVICE_UNAVAILABLE');
      const all = reviews();
      const offset = cursor ? Number(cursor) : 0;
      const end = offset + APP_STORE_PAGE_SIZE;
      return page(all.slice(offset, end), end < all.length ? String(end) : undefined);
    });
  }

  /** Run N of a sequence, one App Store slot apart, and where it left the checkpoint. */
  /**
   * `cycle` moves the clock on by whole collection cycles. A pass that has
   * reached the end is finished for its cycle, so a run that re-scans from the
   * top belongs to the NEXT one — twelve hours later, not ten minutes.
   */
  async function tick(n: number, apple: FakeApple, cycle = 0) {
    const at = NOW + cycle * CYCLE_PERIOD_MS + n * APPLE_RUN_MS;
    const result = await syncAppStore(syncEnv(), at, env.DB, apple.fetchImpl);
    const cp = await loadCheckpoint(env.DB, CHECKPOINT);
    return { report: result.report!, cursor: cp?.cursor ?? null };
  }

  const reviews = (n: number) => Array.from({ length: n }, (_, i) => review(`r${String(i).padStart(2, '0')}`));

  it('AS16. a backlog bigger than a page is walked to the end, one page per run, then re-scanned from the top', async () => {
    const twelve = reviews(12);
    const apple = backlog(() => twelve);

    // Three ticks walk this cycle's pass to the end; the re-scan is the next
    // cycle's business.
    const runs = [await tick(0, apple), await tick(1, apple), await tick(2, apple),
                  await tick(0, apple, 1)];

    expect(reviewCursors(apple)).toEqual([null, '5', '10', null]);
    expect(runs.map((r) => r.cursor)).toEqual(['5', '10', null, '5']);
    expect(runs.map((r) => r.report.created)).toEqual([5, 5, 2, 0]);
    expect(runs[3].report.unchanged).toBe(5);
    expect(runs.map((r) => r.report.rejected)).toEqual([0, 0, 0, 0]);
    expect(await storedIds()).toEqual(twelve.map((r) => r.id));
  });

  it('AS17. a failed run resumes at the page that failed, not at the top and not past it', async () => {
    const twelve = reviews(12);
    const apple = backlog(() => twelve, new Set(['5']));

    expect((await tick(0, apple)).cursor).toBe('5');

    const failed = await tick(1, apple);
    expect(failed.report.error).toBe('customerReviews failed (HTTP 503, SERVICE_UNAVAILABLE)');
    expect(failed.cursor).toBe('5');
    expect(await storedIds()).toHaveLength(5);

    // Backoff after one failure is a minute and an App Store run is ten, so the
    // next run is due, and it asks for the same page again.
    const resumed = await tick(2, apple);
    expect(resumed.report).toMatchObject({ created: 5, error: null });
    expect(resumed.cursor).toBe('10');

    expect((await tick(3, apple)).cursor).toBeNull();
    expect(reviewCursors(apple)).toEqual([null, '5', '5', '10']);
    expect(await storedIds()).toEqual(twelve.map((r) => r.id));
  });
});

describe('one dedup path', () => {
  it('AS18. a review seen again is the same row, an edit is a new version of it, and identity includes the store', async () => {
    let current = [review('dup-1', 'Original text'), review('dup-2')];
    const apple = fakeApple(() => page(current));

    expect((await syncAppStore(syncEnv(), NOW, env.DB, apple.fetchImpl)).report)
      .toMatchObject({ created: 2, updated: 0, unchanged: 0, rejected: 0 });
    // Each of these single-page passes finishes, so the next one is the next
    // collection cycle rather than the next tick.
    expect((await syncAppStore(syncEnv(), NOW + CYCLE_PERIOD_MS, env.DB, apple.fetchImpl)).report)
      .toMatchObject({ created: 0, updated: 0, unchanged: 2, rejected: 0 });

    current = [review('dup-1', 'Edited text'), review('dup-2')];
    expect((await syncAppStore(syncEnv(), NOW + 2 * CYCLE_PERIOD_MS, env.DB, apple.fetchImpl)).report)
      .toMatchObject({ created: 0, updated: 1, unchanged: 1, rejected: 0 });

    const row = await env.DB.prepare(
      "SELECT store_review_id, review_body FROM store_reviews WHERE source = 'app_store' AND platform_review_id = ?"
    ).bind('dup-1').first<{ store_review_id: string; review_body: string }>();
    expect(row?.review_body).toBe('Edited text');
    const versions = await env.DB.prepare('SELECT COUNT(*) AS n FROM store_review_versions WHERE store_review_id = ?')
      .bind(row!.store_review_id).first<{ n: number }>();
    expect(versions?.n).toBe(2);
    expect(await storedIds()).toEqual(['dup-1', 'dup-2']);

    // The same id from Google Play is a different review, through the same write.
    const android = await normalizeGooglePlay({
      reviewId: 'dup-1', authorName: 'A. Tester',
      comments: [{ userComment: { text: 'Fine on Android.', starRating: 5, lastModified: { seconds: '1788190000' } } }],
    }, 'com.miden.wallet', NOW);
    expect((await upsertReview(env.DB, android, NOW)).outcome).toBe('created');
    const bySource = await env.DB.prepare(
      "SELECT source, COUNT(*) AS n FROM store_reviews WHERE platform_review_id = 'dup-1' GROUP BY source ORDER BY source"
    ).all();
    expect(bySource.results).toEqual([{ source: 'app_store', n: 1 }, { source: 'google_play', n: 1 }]);
  });
});

describe('the stored original', () => {
  it('AS19. is the review exactly as sent, and re-deriving it reproduces every column', async () => {
    // Fields nothing reads today are kept anyway, so a later mapping fix can use them.
    const sent = {
      type: 'customerReviews',
      id: 'keep-1',
      attributes: {
        rating: 1,
        title: 'Swap crashes',
        body: 'It closes when I open the swap screen.\nEvery time.',
        reviewerNickname: 'r.ortega',
        createdDate: '2026-09-02T23:59:59-07:00',
        territory: 'ESP',
        aFieldAppleAddsLater: { nested: [1, 'two', null] },
      },
      relationships: { response: { links: { self: `${APP_STORE_CONNECT_API}/v1/customerReviews/keep-1/relationships/response`, related: `${APP_STORE_CONNECT_API}/v1/customerReviews/keep-1/response` } } },
      links: { self: `${APP_STORE_CONNECT_API}/v1/customerReviews/keep-1` },
    };
    const apple = fakeApple(() => page([sent]));
    await syncAppStore(syncEnv(), NOW, env.DB, apple.fetchImpl);

    const row = await env.DB.prepare('SELECT * FROM store_reviews WHERE platform_review_id = ?')
      .bind('keep-1').first<any>();
    expect(row.raw_json).toBe(JSON.stringify(sent));

    const version = await env.DB.prepare('SELECT raw_json, raw_hash FROM store_review_versions WHERE store_review_id = ?')
      .bind(row.store_review_id).first<any>();
    expect(version.raw_json).toBe(row.raw_json);
    expect(version.raw_hash).toBe(row.raw_hash);

    // Everything derived is recomputable from stored columns alone: the
    // original, the app id, and first_seen_at standing in for the clock.
    const again = fromAppStore(JSON.parse(row.raw_json), row.app_id, row.first_seen_at);
    expect({
      platform: again.platform, source: again.source, app_id: again.appId,
      review_title: again.reviewTitle, review_body: again.reviewBody, rating: again.rating,
      reviewer_name: again.reviewerName, territory: again.territory, language: again.language,
      review_created_at: again.reviewCreatedAt, review_updated_at: again.reviewUpdatedAt,
      app_version: again.appVersion, app_version_code: again.appVersionCode,
      device: again.device, device_product: again.deviceProduct, os_version: again.osVersion,
    }).toEqual({
      platform: row.platform, source: row.source, app_id: row.app_id,
      review_title: row.review_title, review_body: row.review_body, rating: row.rating,
      reviewer_name: row.reviewer_name, territory: row.territory, language: row.language,
      review_created_at: row.review_created_at, review_updated_at: row.review_updated_at,
      app_version: row.app_version, app_version_code: row.app_version_code,
      device: row.device, device_product: row.device_product, os_version: row.os_version,
    });
    expect(row).toMatchObject({ platform: 'ios', review_title: 'Swap crashes', territory: 'ESP' });
    expect(await hashRaw(JSON.parse(row.raw_json))).toBe(row.raw_hash);
  });
});

describe('the store cron', () => {
  const secrets = () => ({ APPLE_ASC_KEY_ID: KEY_ID, APPLE_ASC_ISSUER_ID: ISSUER, APPLE_ASC_PRIVATE_KEY: p8 });

  it('AS20. the store trigger gives the App Store its slot, and does not run the drain', async () => {
    expect([6, 7, 8, 9].map((n) => phaseFor(n * STORE_TICK_MS).name))
      .toEqual(['sync:google_play', 'sync:app_store', 'sync:google_play', 'sync:app_store']);

    const id = await seedSubmission({ state: 'received' });
    route({
      match: (u, m) => u.host === HOST && u.pathname === '/v1/apps' && m === 'GET',
      respond: () => apps({ id: APP_ID, bundleId: BUNDLE }),
    });
    route({
      match: (u, m) => u.host === HOST && u.pathname === `/v1/apps/${APP_ID}/customerReviews` && m === 'GET',
      respond: () => page([review('cron-ios-1')]),
    });

    try {
      // The bundle ID is the shipped one, from wrangler.jsonc.
      await withEnv(
        { STORE_SYNC_ENABLED: 'true', APP_STORE_SYNC_ENABLED: 'true', ...secrets() },
        () => runCron(STORE_CRON, APPLE_SLOT)
      );

      expect(callsTo(HOST)).toHaveLength(2);
      expect(recordedCalls().filter((c) => new URL(c.url).host !== HOST)).toHaveLength(0);
      const stored = await env.DB.prepare('SELECT source, platform, app_id FROM store_reviews WHERE platform_review_id = ?')
        .bind('cron-ios-1').first();
      expect(stored).toEqual({ source: 'app_store', platform: 'ios', app_id: BUNDLE });

      const sub = await env.DB.prepare('SELECT state FROM submissions WHERE submission_id = ?')
        .bind(id).first<{ state: string }>();
      expect(sub?.state).toBe('received');
    } finally {
      await env.DB.prepare('DELETE FROM submissions WHERE submission_id = ?').bind(id).run();
    }
  });

  it('AS21. SYNC-WIRING: wired to Bread Wallet, secrets kept as secrets, and switched on it cannot deploy without them', () => {
    // Read exactly the way scripts/deploy.sh reads it.
    const config = JSON.parse(wranglerConfig.replace(/^\s*\/\/.*$/gm, ''));
    const appleSecrets = ['APPLE_ASC_KEY_ID', 'APPLE_ASC_ISSUER_ID', 'APPLE_ASC_PRIVATE_KEY'];

    expect(config.vars.APP_STORE_BUNDLE_ID).toBe(BUNDLE);
    // Ships off until the Apple credentials are tested live; turning it on is a
    // reviewed change to this line.
    expect(config.vars.APP_STORE_SYNC_ENABLED).toBe('false');
    for (const name of appleSecrets) {
      expect(config.vars, `${name} is a secret and must never be a var`).not.toHaveProperty(name);
    }

    if (config.vars.APP_STORE_SYNC_ENABLED === 'true') {
      for (const name of appleSecrets) {
        expect(
          config.secrets.required,
          `APP_STORE_SYNC_ENABLED is "true", so ${name} must be in secrets.required, or the deploy preflight cannot refuse a Worker that lacks it`
        ).toContain(name);
      }
    }
  });

  it('AS22. nothing a store tick logs or stores carries a key, an ID, or a token', async () => {
    const logged: string[] = [];
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(((...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      }) as any));

    let refuse = true;
    route({
      match: (u, m) => u.host === HOST && u.pathname === '/v1/apps' && m === 'GET',
      respond: () => (refuse
        ? appleError(401, 'NOT_AUTHORIZED', `token for ${KEY_ID} of ${ISSUER} rejected ${MARKER}`)
        : apps({ id: APP_ID, bundleId: BUNDLE })),
    });
    route({
      match: (u, m) => u.host === HOST && u.pathname === `/v1/apps/${APP_ID}/customerReviews` && m === 'GET',
      respond: () => page([review('log-1')], 'AQ.AMt2C-U'),
    });

    const on = { STORE_SYNC_ENABLED: 'true', APP_STORE_SYNC_ENABLED: 'true', APPLE_ASC_KEY_ID: KEY_ID, APPLE_ASC_ISSUER_ID: ISSUER };
    const hour = 60 * 60 * 1000;
    try {
      // Apple refuses the token; then the key will not parse; then a run succeeds.
      //
      // The ticks are a probe interval apart because the first one PAUSES the
      // sync: a 401 is a refused credential, and the runs in between a pause
      // and its next probe do not call anybody — which is the point of it.
      await withEnv({ ...on, APPLE_ASC_PRIVATE_KEY: p8 }, () => runStoreTick(env as any, APPLE_SLOT, NOW));
      await withEnv({ ...on, APPLE_ASC_PRIVATE_KEY: `${p8.slice(0, 60)}${MARKER}${p8.slice(60)}` },
        () => runStoreTick(env as any, APPLE_SLOT, NOW + PARK_REPROBE_MS + hour));
      refuse = false;
      await withEnv({ ...on, APPLE_ASC_PRIVATE_KEY: p8 },
        () => runStoreTick(env as any, APPLE_SLOT, NOW + 2 * PARK_REPROBE_MS + 2 * hour));
    } finally {
      for (const spy of spies) spy.mockRestore();
    }

    const state = JSON.stringify((await env.DB.prepare('SELECT * FROM store_sync_state').all()).results);
    const everything = `${logged.join('\n')}\n${state}`;

    // Positive controls: all three ticks ran, and their outcomes were logged and stored.
    expect(logged.filter((l) => l.includes('store tick sync:app_store'))).toHaveLength(3);
    expect(everything).toContain('App Store app lookup failed (HTTP 401, NOT_AUTHORIZED)');
    expect(everything).toContain('APPLE_ASC_PRIVATE_KEY is not valid base64');
    expect(everything).toContain('"created":1');

    const body = p8.split('\n').slice(1, -2).join('');
    const [jwtHeader, jwtClaims] = (await signAppStoreJwt(parseAppStoreKey(KEY_ID, ISSUER, p8), NOW)).split('.');
    for (const secret of [KEY_ID, ISSUER, MARKER, body.slice(0, 32), body.slice(-32), jwtHeader, jwtClaims.slice(0, 40), 'Bearer']) {
      expect(everything, 'a secret reached a log line or store_sync_state').not.toContain(secret);
    }
  });

  it('AS23. switched off, neither store slot contacts anyone, even with every Apple secret present', async () => {
    for (const slot of [6, 7]) {
      await withEnv({ ...secrets(), STORE_SYNC_ENABLED: 'false', APP_STORE_SYNC_ENABLED: 'true' },
        () => runCron(STORE_CRON, slot * STORE_TICK_MS));
    }
    // The store switch on and Apple's off: the App Store slot still calls nobody.
    await withEnv({ ...secrets(), STORE_SYNC_ENABLED: 'true', APP_STORE_SYNC_ENABLED: 'false' },
      () => runCron(STORE_CRON, APPLE_SLOT));
    // And as the suite ships, with neither switch touched.
    await withEnv(secrets(), () => runCron(STORE_CRON, APPLE_SLOT));

    expect(recordedCalls()).toHaveLength(0);
    expect(await rowsWritten()).toBe(0);
  });
});

/**
 * WHAT A REFUSAL MEANS — Apple's half. The rules and the reasoning are
 * store-google-play's GP23-GP25; what is Apple's is WHERE a refusal lands.
 */
describe('a refusal that is not an ordinary failure', () => {
  const state = () => loadCheckpoint(env.DB, CHECKPOINT);
  const run = (apple: FakeApple, at: number) => syncAppStore(syncEnv(), at, env.DB, apple.fetchImpl);

  const rateLimited = (retryAfter?: string) => Response.json(
    { errors: [{ id: 'e1', status: '429', code: 'RATE_LIMIT_EXCEEDED', title: 'Too many requests', detail: 'Slow down.' }] },
    { status: 429, ...(retryAfter ? { headers: { 'retry-after': retryAfter } } : {}) }
  );

  it('AS24. a rate limit is waited out, for as long as Apple asked and no longer than an hour', async () => {
    // Apple answers 429 with a Retry-After, in seconds or as an HTTP-date, and
    // customerReviews is one of the endpoints that does it under load.
    const far = new Date(NOW + 3 * 24 * 60 * 60 * 1000).toUTCString();
    const apple = fakeApple(() => rateLimited(far));

    const deferred = await run(apple, NOW);
    expect(deferred.report).toMatchObject({ disposition: 'defer', created: 0 });
    expect(deferred.report?.error).toContain('HTTP 429');
    expect(await state()).toMatchObject({ consecutive_failures: 0, last_error: null, paused_at: null });

    /**
     * CLAMPED, because Retry-After is upstream-controlled input on its way into
     * a scheduling column. checkpoint.ts caps our own backoff at an hour so a
     * longer wait cannot put reviews at risk of ageing out of the 7-day window;
     * a number chosen by the store cannot be allowed to do what we refuse to do
     * to ourselves. Three days becomes an hour.
     */
    expect((await state())?.defer_until).toBe(NOW + MAX_DEFER_MS);

    // Said nothing about when: a sensible wait rather than an immediate retry.
    await env.DB.prepare('DELETE FROM store_sync_state').run();
    const silent = fakeApple(() => rateLimited());
    await run(silent, NOW);
    expect((await state())?.defer_until).toBe(NOW + DEFAULT_DEFER_MS);
  });

  it('AS25. a credential refused at the app lookup pauses the sync, before a page is ever asked for', async () => {
    /**
     * THE LOOKUP IS THE FIRST PLACE AN EXPIRED KEY SHOWS UP. It runs before
     * every page request, so classifying only the reviews response would leave
     * exactly the dead-credential case retrying for ever — the case worth
     * stopping.
     */
    let expired = true;
    const apple = fakeApple(
      () => page([review('as-1')]),
      () => (expired
        ? appleError(401, 'NOT_AUTHORIZED', `token for ${MARKER} is expired`)
        : apps({ id: APP_ID, bundleId: BUNDLE }))
    );

    const refused = await run(apple, NOW);
    expect(refused.report).toMatchObject({ disposition: 'park', created: 0 });
    const paused = await state();
    expect(paused?.paused_at).toBe(NOW);
    expect(paused?.paused_reason).toBe('App Store app lookup failed (HTTP 401, NOT_AUTHORIZED)');
    expect(JSON.stringify(paused)).not.toContain(MARKER);
    expect(reviewCursors(apple)).toHaveLength(0);

    // The ticks in between ask nobody: the answer to every one of them is known.
    for (let n = 1; n <= 4; n++) {
      expect((await run(apple, NOW + n * APPLE_RUN_MS)).report?.skipped).toContain('paused');
    }
    expect(lookups(apple)).toBe(1);

    // A rotated key resumes the sync on the next probe, with nobody touching D1.
    expired = false;
    const probe = await run(apple, NOW + PARK_REPROBE_MS);
    expect(probe.report).toMatchObject({ created: 1, error: null });
    expect(await state()).toMatchObject({ paused_at: null, paused_reason: null, consecutive_failures: 0 });
  });
});

describe('what one tick costs', () => {
  async function cost(reviews: unknown[], cursor?: string, at = NOW): Promise<number> {
    const apple = fakeApple(() => page(reviews, cursor));
    const counted = countingDb(env.DB);
    await syncAppStore(syncEnv(), at, counted.db, apple.fetchImpl);
    return counted.count();
  }

  it('AS26. SYNC-BUDGET: the same costs as Google, because it is the same core', async () => {
    /**
     * The write path is shared, so the per-review numbers are GP31's — that is
     * the point of one ingestion core. Measured here anyway, because "it must
     * be the same" is how two stores quietly stop being the same.
     */
    const fresh = Array.from({ length: APP_STORE_PAGE_SIZE }, (_, i) => review(`c-${i}`, `Review number ${i}`));

    expect(await cost([], undefined, NOW)).toBe(3);

    await env.DB.prepare('DELETE FROM store_sync_state').run();
    expect(await cost(fresh, 'more', NOW)).toBe(3 + APP_STORE_PAGE_SIZE * 4);
    expect(await cost(fresh, 'more', NOW + APPLE_RUN_MS)).toBe(3 + APP_STORE_PAGE_SIZE * 3);

    const edited = fresh.map((_, i) => review(`c-${i}`, `Review number ${i}, corrected`));
    expect(await cost(edited, 'more', NOW + 2 * APPLE_RUN_MS)).toBe(3 + APP_STORE_PAGE_SIZE * 5);
    expect(3 + APP_STORE_PAGE_SIZE * 5).toBe(28);
  });

  it('AS27. SYNC-BUDGET: a tick spends two subrequests, three when a cursor is refused', async () => {
    // One app lookup, one page. Apple's JWT is signed locally — unlike Google's
    // token, it costs no subrequest at all.
    const apple = fakeApple(() => page([review('t-1')], 'more'));
    await syncAppStore(syncEnv(), NOW, env.DB, apple.fetchImpl);
    expect(apple.calls).toHaveLength(2);
    expect(lookups(apple)).toBe(1);

    // A refused cursor restarts the pass once: one more request, not a wedge.
    const stale = fakeApple((cursor) => (cursor
      ? appleError(400, 'PARAMETER_ERROR.INVALID')
      : page([review('t-2')], 'more')));
    await syncAppStore(syncEnv(), NOW + APPLE_RUN_MS, env.DB, stale.fetchImpl);
    expect(stale.calls).toHaveLength(3);
  });
});
