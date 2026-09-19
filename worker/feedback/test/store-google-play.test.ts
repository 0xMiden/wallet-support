/**
 * Phase 1 — Google Play sync: the key file, the token, the page request, and
 * the cron that runs them.
 *
 * Google is never called. Each test either passes its own fetch to the code
 * under test, or registers routes on the shared stub, and a real RSA key is
 * generated per run so signatures are checked rather than assumed.
 *
 * Properties that matter more than the rest, because each fails silently in
 * production and loudly nowhere else:
 *   GP8      a page larger than requested is a failure, never a partial write
 *   GP12     a full page of new reviews fits the free plan's 50-query limit
 *   GP14     every registered cron has a dispatch string, and the reverse
 *   GP16-18  sync runs only on the literal "true", and ships off
 *   GP19-21  runs walk a backlog page by page, resume where a failure stopped,
 *            and a new pass catches what moved during the last one
 *   GP22     the stored original is enough to re-derive every column
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import wranglerConfig from '../wrangler.jsonc?raw';
import {
  callsTo, countingDb, installFetchStub, recordedCalls, restoreFetch, route, runCron, seedSubmission, withEnv,
} from './helpers';
import { DRAIN_CRON, MIRROR_CRON, STORE_CRON } from '../src/crons';
import {
  ANDROID_PUBLISHER_SCOPE, GOOGLE_TOKEN_URL, GoogleAuthError,
  mintAccessToken, parseServiceAccount, signServiceAccountJwt,
} from '../src/store/auth/google';
import {
  D1_QUERIES_PER_INVOCATION, GOOGLE_PLAY_PAGE_SIZE, GooglePlayError,
  googlePlayFetcher, syncGooglePlay,
} from '../src/store/sync/google';
import { STORE_TICK_MS, phaseFor } from '../src/store/cron';
import {
  loadCheckpoint, PARK_REPROBE_MS, CYCLE_PERIOD_MS, cycleStart,
} from '../src/store/checkpoint';
import { syncHealth } from '../src/store/health';
import { fromGooglePlay, hashRaw } from '../src/store/normalize';

const PKG = 'com.miden.wallet';
const NOW = 1_788_300_000_000;
const SA_EMAIL = 'reviews-sync@bread-test.iam.gserviceaccount.com';
/** Planted in key material and upstream prose; must never reach an error. */
const MARKER = 'KEY-MATERIAL-MARKER-7c1e';
/**
 * The store cron picks its phase from the five-minute slot of the scheduled
 * time, so a cron test names its slot rather than inheriting the wall clock.
 */
const GOOGLE_SLOT = 6 * STORE_TICK_MS;
const APPLE_SLOT = 7 * STORE_TICK_MS;

let keyFile: string;
let pem: string;
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

beforeAll(async () => {
  installFetchStub();

  // A real key, wrapped the way Google Cloud's key file wraps it — including a
  // token_uri pointing somewhere it must never be sent.
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
  ) as CryptoKeyPair;
  publicKey = pair.publicKey;
  const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey) as ArrayBuffer);
  pem = `-----BEGIN PRIVATE KEY-----\n${toBase64(der).match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`;
  keyFile = JSON.stringify({
    type: 'service_account', project_id: 'bread-test', private_key_id: 'k1',
    private_key: pem, client_email: SA_EMAIL,
    token_uri: 'https://attacker.example/token',
  }, null, 2);
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

/** A review in the shape `reviews.list` documents. */
function review(id: string, text = 'Private send fails since the update.') {
  return {
    reviewId: id,
    authorName: 'A. Tester',
    comments: [{
      userComment: {
        text,
        lastModified: { seconds: '1788190000', nanos: 0 },
        starRating: 3,
        reviewerLanguage: 'en',
        appVersionCode: 11519,
        appVersionName: '1.15.19',
      },
    }],
  };
}

const page = (reviews: unknown[], next?: string) =>
  Response.json({ reviews, ...(next ? { tokenPagination: { nextPageToken: next } } : {}) });

type Call = { url: URL; init?: RequestInit };

/** Stands in for Google: the token endpoint, and a list answered per page token. */
function fakeGoogle(list: (token: string | null) => Response) {
  const calls: Call[] = [];
  const fetchImpl = async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    calls.push({ url, init });
    if (url.host === 'oauth2.googleapis.com') {
      return Response.json({ access_token: 'ya29.test-token', expires_in: 3599, token_type: 'Bearer' });
    }
    if (url.host === 'androidpublisher.googleapis.com') return list(url.searchParams.get('token'));
    throw new Error(`unexpected fetch: ${input}`);
  };
  return { fetchImpl, calls };
}

const syncEnv = (over: Record<string, string | undefined> = {}) => ({
  DB: env.DB,
  STORE_SYNC_ENABLED: 'true',
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: keyFile,
  GOOGLE_PLAY_PACKAGE_NAME: PKG,
  ...over,
});

describe('the key file', () => {
  it('GP1. reads the key file as downloaded, and as a form that flattened it', () => {
    const sa = parseServiceAccount(keyFile);
    expect(sa.clientEmail).toBe(SA_EMAIL);
    expect(sa.pkcs8.length).toBeGreaterThan(1000);

    // One line, with the key's line breaks surviving only as the characters "\n".
    const flattened = JSON.stringify({ ...JSON.parse(keyFile), private_key: pem.replace(/\n/g, '\\n') });
    expect(parseServiceAccount(flattened).pkcs8).toEqual(sa.pkcs8);
  });

  it('GP2. a malformed key never quotes itself into an error', () => {
    const cases = [
      `{"private_key": "${MARKER}`,
      JSON.stringify({ client_email: SA_EMAIL, private_key: `-----BEGIN PRIVATE KEY-----\n${MARKER}!!\n-----END PRIVATE KEY-----` }),
      JSON.stringify({ private_key: pem, note: MARKER }),
    ];
    for (const raw of cases) {
      let message = '';
      try {
        parseServiceAccount(raw);
      } catch (err) {
        expect(err).toBeInstanceOf(GoogleAuthError);
        message = (err as Error).message;
      }
      expect(message).not.toBe('');
      expect(message).not.toContain(MARKER);
    }

    const pkcs1 = JSON.stringify({
      client_email: SA_EMAIL,
      private_key: '-----BEGIN RSA PRIVATE KEY-----\nAAAA\n-----END RSA PRIVATE KEY-----',
    });
    expect(() => parseServiceAccount(pkcs1)).toThrow(/PKCS#1/);
    expect(() => parseServiceAccount('')).toThrow(/not set/);
  });
});

describe('signing in to Google', () => {
  it('GP3. the JWT is RS256, scoped to the Play API, and verifies against the key', async () => {
    const jwt = await signServiceAccountJwt(parseServiceAccount(keyFile), NOW);
    const [header, claims, signature] = jwt.split('.');
    const text = new TextDecoder();

    expect(JSON.parse(text.decode(fromBase64url(header)))).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(text.decode(fromBase64url(claims)))).toEqual({
      iss: SA_EMAIL,
      scope: ANDROID_PUBLISHER_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: Math.floor(NOW / 1000),
      exp: Math.floor(NOW / 1000) + 3600,
    });

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', publicKey, fromBase64url(signature), new TextEncoder().encode(`${header}.${claims}`)
    );
    expect(valid).toBe(true);
  });

  it("GP4. the token request goes to Google's pinned endpoint, never the key file's token_uri", async () => {
    const google = fakeGoogle(() => page([]));
    const token = await mintAccessToken(parseServiceAccount(keyFile), NOW, google.fetchImpl);

    expect(token).toBe('ya29.test-token');
    expect(google.calls).toHaveLength(1);
    expect(google.calls[0].url.toString()).toBe(GOOGLE_TOKEN_URL);
    const form = new URLSearchParams(String(google.calls[0].init?.body));
    expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    expect(form.get('assertion')?.split('.')).toHaveLength(3);
  });

  it("GP5. a refused key reports the status and Google's code, never Google's prose", async () => {
    const refuse = async () => Response.json(
      { error: 'invalid_grant', error_description: `Invalid JWT Signature ${MARKER}` }, { status: 400 }
    );
    const err = await mintAccessToken(parseServiceAccount(keyFile), NOW, refuse).catch((e) => e);

    expect(err).toBeInstanceOf(GoogleAuthError);
    expect(err.message).toBe('Google refused the Play key (HTTP 400, invalid_grant)');
    expect(err.message).not.toContain(MARKER);
  });
});

describe('reading a page of reviews', () => {
  it('GP6. maps reviews and the next token, asking Google for one page-size', async () => {
    const google = fakeGoogle((token) => (token === 't2' ? page([]) : page([review('a'), review('b')], 't2')));
    const fetchPage = googlePlayFetcher(PKG, async () => 'ya29.test-token', google.fetchImpl);

    const first = await fetchPage(null);
    expect(first.items).toHaveLength(2);
    expect(first.nextToken).toBe('t2');

    const req = google.calls[0];
    expect(req.url.pathname).toBe(`/androidpublisher/v3/applications/${PKG}/reviews`);
    expect(req.url.searchParams.get('maxResults')).toBe(String(GOOGLE_PLAY_PAGE_SIZE));
    expect(req.url.searchParams.has('token')).toBe(false);
    expect(new Headers(req.init?.headers).get('authorization')).toBe('Bearer ya29.test-token');

    expect(await fetchPage('t2')).toEqual({ items: [], nextToken: null, restarted: false });
    expect(google.calls[1].url.searchParams.get('token')).toBe('t2');

    // An app with no reviews at all answers with an empty object.
    const empty = googlePlayFetcher(PKG, async () => 't', async () => Response.json({}));
    expect(await empty(null)).toEqual({ items: [], nextToken: null, restarted: false });
  });

  it('GP7. a stale cursor restarts the pass instead of wedging the sync', async () => {
    const google = fakeGoogle((token) => (token
      ? Response.json({ error: { status: 'INVALID_ARGUMENT' } }, { status: 400 })
      : page([review('a')], 'fresh')));
    const fetchPage = googlePlayFetcher(PKG, async () => 't', google.fetchImpl);

    // `restarted` says the pass began again, so the cycle check reads the
    // tokens that follow as a fresh pass rather than as a loop (GP29b).
    expect(await fetchPage('expired')).toEqual({ items: [review('a')], nextToken: 'fresh', restarted: true });
    expect(google.calls.map((c) => c.url.searchParams.get('token'))).toEqual(['expired', null]);

    // If the first page is refused too, that is a real failure and it says so.
    const broken = googlePlayFetcher(PKG, async () => 't', async () =>
      Response.json({ error: { status: 'INVALID_ARGUMENT' } }, { status: 400 }));
    await expect(broken('expired')).rejects.toThrow('HTTP 400, INVALID_ARGUMENT');
  });

  it('GP8. more reviews than asked for fails loudly, and nothing moves', async () => {
    const tooMany = Array.from({ length: GOOGLE_PLAY_PAGE_SIZE + 1 }, (_, i) => review(`over-${i}`));
    const google = fakeGoogle(() => page(tooMany, 'next'));

    const result = await syncGooglePlay(syncEnv(), NOW, env.DB, google.fetchImpl);

    expect(result.report?.error).toContain('asking for at most');
    expect(result.report?.created).toBe(0);
    const cp = await loadCheckpoint(env.DB, `google_play:${PKG}`);
    expect(cp?.consecutive_failures).toBe(1);
    expect(cp?.cursor).toBeNull();
    const stored = await env.DB.prepare('SELECT COUNT(*) AS n FROM store_reviews').first<{ n: number }>();
    expect(stored?.n).toBe(0);
  });

  it("GP9. a refused page reports the status and code, never the token or Google's prose", async () => {
    const denied = googlePlayFetcher(PKG, async () => 'ya29.secret-token', async () => Response.json(
      { error: { code: 403, status: 'PERMISSION_DENIED', message: 'ya29.secret-token lacks access' } }, { status: 403 }
    ));
    const err = await denied(null).catch((e) => e);
    expect(err).toBeInstanceOf(GooglePlayError);
    expect(err.message).toBe('reviews.list failed (HTTP 403, PERMISSION_DENIED)');
    expect(err.message).not.toContain('ya29');

    const garbled = googlePlayFetcher(PKG, async () => 't', async () => new Response('<html>', { status: 200 }));
    await expect(garbled(null)).rejects.toThrow('not JSON');
  });
});

describe('a sync run', () => {
  it('GP10. switched on but unconfigured, a run calls nobody and writes nothing', async () => {
    const google = fakeGoogle(() => page([review('a')]));
    for (const over of [
      { GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: undefined },
      { GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: '' },
      { GOOGLE_PLAY_PACKAGE_NAME: undefined },
      { GOOGLE_PLAY_PACKAGE_NAME: '' },
    ]) {
      const result = await syncGooglePlay(syncEnv(over), NOW, env.DB, google.fetchImpl);
      expect(result.report).toBeNull();
      expect(result.skipped).toBeTruthy();
    }
    expect(google.calls).toHaveLength(0);
    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM store_sync_state').first<{ n: number }>();
    expect(rows?.n).toBe(0);
  });

  it('GP11. a run stores one page and checkpoints where Google left off', async () => {
    const google = fakeGoogle((token) => (token === 't2' ? page([review('c')]) : page([review('a'), review('b')], 't2')));

    const first = await syncGooglePlay(syncEnv(), NOW, env.DB, google.fetchImpl);
    expect(first.report).toMatchObject({ created: 2, rejected: 0, pages: 1, error: null });
    let cp = await loadCheckpoint(env.DB, `google_play:${PKG}`);
    expect(cp).toMatchObject({ cursor: 't2', last_success_at: NOW, consecutive_failures: 0 });

    const second = await syncGooglePlay(syncEnv(), NOW + STORE_TICK_MS, env.DB, google.fetchImpl);
    expect(second.report).toMatchObject({ created: 1, rejected: 0, exhausted: true });
    cp = await loadCheckpoint(env.DB, `google_play:${PKG}`);
    expect(cp?.cursor).toBeNull();

    // One token and one page per run.
    expect(google.calls.filter((c) => c.url.host === 'oauth2.googleapis.com')).toHaveLength(2);
    expect(google.calls.filter((c) => c.url.host === 'androidpublisher.googleapis.com')).toHaveLength(2);
  });

  it('GP11b. a key that will not parse is a failed run, recorded without the key', async () => {
    const google = fakeGoogle(() => page([review('a')]));
    const result = await syncGooglePlay(
      syncEnv({ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: `{"private_key":"${MARKER}` }), NOW, env.DB, google.fetchImpl
    );

    expect(result.report?.error).toContain('not valid JSON');
    expect(google.calls).toHaveLength(0);
    const cp = await loadCheckpoint(env.DB, `google_play:${PKG}`);
    expect(cp?.consecutive_failures).toBe(1);
    expect(cp?.last_error).not.toContain(MARKER);
  });

  it("GP12. SYNC-BUDGET: a full page of brand-new reviews stays inside the free plan's query limit", async () => {
    // All-new is the worst case: a new review costs the most statements.
    const fresh = Array.from({ length: GOOGLE_PLAY_PAGE_SIZE }, (_, i) => review(`new-${i}`, `Review number ${i}`));
    const google = fakeGoogle(() => page(fresh, 'more'));
    const counted = countingDb(env.DB);

    const result = await syncGooglePlay(syncEnv(), NOW, counted.db, google.fetchImpl);

    expect(result.report?.created).toBe(GOOGLE_PLAY_PAGE_SIZE);
    // Positive control: the counter really sees the writes.
    expect(counted.count()).toBeGreaterThan(GOOGLE_PLAY_PAGE_SIZE);
    expect(counted.count()).toBeLessThanOrEqual(D1_QUERIES_PER_INVOCATION);
    // Outbound: one token, one page.
    expect(google.calls).toHaveLength(2);
  });
});

describe('the sync switch', () => {
  /** Rows a run could have written, across every store table it touches. */
  async function rowsWritten(): Promise<number> {
    let total = 0;
    for (const table of ['store_reviews', 'store_review_versions', 'store_review_events', 'store_sync_state']) {
      const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
      total += row?.n ?? 0;
    }
    return total;
  }

  it('GP16. missing, empty, false, or anything but the literal "true" means no sync', async () => {
    const google = fakeGoogle(() => page([review('a')]));
    const values = [undefined, '', 'false', 'FALSE', '0', 'no', 'off', 'TRUE', 'True', ' true', 'true ', '1', 'yes', 'on'];

    for (const value of values) {
      const result = await syncGooglePlay(syncEnv({ STORE_SYNC_ENABLED: value }), NOW, env.DB, google.fetchImpl);
      expect(result, `STORE_SYNC_ENABLED=${JSON.stringify(value)}`)
        .toEqual({ skipped: 'STORE_SYNC_ENABLED is not "true"', report: null });
    }

    // The key and package were configured every time. Only the switch said no.
    expect(google.calls).toHaveLength(0);
    expect(await rowsWritten()).toBe(0);
  });

  it('GP17. the literal "true" is what turns it on', async () => {
    const google = fakeGoogle(() => page([review('a')]));
    const result = await syncGooglePlay(syncEnv({ STORE_SYNC_ENABLED: 'true' }), NOW, env.DB, google.fetchImpl);

    expect(result.skipped).toBeNull();
    expect(result.report).toMatchObject({ created: 1, rejected: 0, error: null });
    expect(google.calls.map((c) => c.url.host)).toEqual(['oauth2.googleapis.com', 'androidpublisher.googleapis.com']);
    expect(await rowsWritten()).toBeGreaterThan(0);
  });

  it('GP18. switched off, the store cron contacts nobody, even with the key present', async () => {
    // Both slots: with the store switch off, no store's phase may call out.
    for (const slot of [GOOGLE_SLOT, APPLE_SLOT]) {
      await withEnv({ STORE_SYNC_ENABLED: 'false', GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: keyFile }, () => runCron(STORE_CRON, slot));
    }
    expect(recordedCalls()).toHaveLength(0);
    expect(await rowsWritten()).toBe(0);

    // And with the variable absent altogether.
    const saved = (env as any).STORE_SYNC_ENABLED;
    (env as any).STORE_SYNC_ENABLED = undefined;
    try {
      for (const slot of [GOOGLE_SLOT, APPLE_SLOT]) {
        await withEnv({ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: keyFile }, () => runCron(STORE_CRON, slot));
      }
    } finally {
      (env as any).STORE_SYNC_ENABLED = saved;
    }
    expect(recordedCalls()).toHaveLength(0);
    expect(await rowsWritten()).toBe(0);
  });
});

describe('working through a backlog', () => {
  /**
   * A store holding `reviews` newest first, paged by OFFSET. The pessimistic
   * model: anything that moves shifts every page after it. `failOnce` names
   * page tokens that answer 503 the first time they are asked for.
   */
  function backlog(reviews: () => unknown[], failOnce: Set<string> = new Set()) {
    return fakeGoogle((token) => {
      if (token && failOnce.delete(token)) {
        return Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 });
      }
      const all = reviews();
      const offset = token ? Number(token) : 0;
      const end = offset + GOOGLE_PLAY_PAGE_SIZE;
      return page(all.slice(offset, end), end < all.length ? String(end) : undefined);
    });
  }

  /**
   * Run N of a sequence, five minutes apart, and where it left the checkpoint.
   *
   * `cycle` moves the clock on by whole collection cycles. A pass that has
   * reached the end is finished for its cycle, so a run that re-scans from the
   * top belongs to the NEXT one — twelve hours later, not five minutes.
   */
  async function tick(n: number, google: ReturnType<typeof fakeGoogle>, cycle = 0) {
    const at = NOW + cycle * CYCLE_PERIOD_MS + n * STORE_TICK_MS;
    const result = await syncGooglePlay(syncEnv(), at, env.DB, google.fetchImpl);
    const cp = await loadCheckpoint(env.DB, `google_play:${PKG}`);
    return { report: result.report!, cursor: cp?.cursor ?? null };
  }

  const storedIds = async () => (await env.DB
    .prepare('SELECT platform_review_id AS id FROM store_reviews ORDER BY id')
    .all<{ id: string }>()).results.map((r) => r.id);

  const listCalls = (google: ReturnType<typeof fakeGoogle>) => google.calls
    .filter((c) => c.url.host === 'androidpublisher.googleapis.com')
    .map((c) => c.url.searchParams.get('token'));

  const reviews = (n: number) => Array.from({ length: n }, (_, i) => review(`r${String(i).padStart(2, '0')}`));

  it('GP19. a backlog bigger than a page is walked to the end, one page per run, then re-scanned from the top', async () => {
    const twelve = reviews(12);
    const google = backlog(() => twelve);

    // Three ticks walk this cycle's pass to the end; the re-scan is the next
    // cycle's business, twelve hours later.
    const runs = [await tick(0, google), await tick(1, google), await tick(2, google),
                  await tick(0, google, 1)];

    // Each run starts where the last one stopped. The run that reaches the end
    // clears the cursor, so the one after it begins a new pass at the top.
    expect(listCalls(google)).toEqual([null, '5', '10', null]);
    expect(runs.map((r) => r.cursor)).toEqual(['5', '10', null, '5']);
    expect(runs.map((r) => r.report.created)).toEqual([5, 5, 2, 0]);
    expect(runs[3].report.unchanged).toBe(5);
    expect(runs.map((r) => r.report.rejected)).toEqual([0, 0, 0, 0]);
    expect(await storedIds()).toEqual(twelve.map((r) => r.reviewId));
  });

  it('GP20. a failed run resumes at the page that failed, not at the top and not past it', async () => {
    const twelve = reviews(12);
    const google = backlog(() => twelve, new Set(['5']));

    expect((await tick(0, google)).cursor).toBe('5');

    const failed = await tick(1, google);
    expect(failed.report.error).toContain('HTTP 503');
    expect(failed.cursor).toBe('5');
    expect(await storedIds()).toHaveLength(5);

    // Backoff after one failure is a minute and a tick is five, so the next run
    // is due, and it asks for the same page again.
    const resumed = await tick(2, google);
    expect(resumed.report).toMatchObject({ created: 5, error: null });
    expect(resumed.cursor).toBe('10');

    expect((await tick(3, google)).cursor).toBeNull();
    expect(listCalls(google)).toEqual([null, '5', '5', '10']);
    expect(await storedIds()).toEqual(twelve.map((r) => r.reviewId));
  });

  it('GP21. a review that moves mid-pass can be missed by that pass, and the next pass catches it', async () => {
    // The pessimistic case: an edit lifts a review the pass has not reached to
    // the top, behind the cursor, and offset paging shifts it out of this pass.
    let order = reviews(10);
    const google = backlog(() => order);

    await tick(0, google);
    const edited = review('r07', 'Edited: private send works again.');
    order = [edited, ...order.filter((r) => r.reviewId !== 'r07')];

    const endOfPass = await tick(1, google);
    expect(endOfPass.cursor).toBeNull();
    expect(await storedIds()).not.toContain('r07');

    // The next pass, which is the next cycle.
    const nextPass = await tick(0, google, 1);
    expect(nextPass.report.created).toBe(1);
    expect(await storedIds()).toEqual(reviews(10).map((r) => r.reviewId));
  });
});

describe('the stored original', () => {
  it('GP22. is the review exactly as sent, and re-deriving it reproduces every column', async () => {
    // Fields nothing reads today are kept anyway, so a later fix can use them.
    // `text` holds a tab, which may be Google separating a title from the body:
    // the normaliser does not split it today (an ASSUMPTION), and the original
    // keeps it either way.
    const sent = {
      reviewId: 'keep-1',
      authorName: 'R. Ortega',
      comments: [
        {
          userComment: {
            text: 'Swap crashes\tIt closes when I open the swap screen.',
            originalText: 'Se cierra al abrir el intercambio.',
            lastModified: { seconds: '1788190000', nanos: 250000000 },
            starRating: 1,
            reviewerLanguage: 'es',
            device: 'panther',
            androidOsVersion: 34,
            appVersionCode: 11519,
            appVersionName: '1.15.19',
            thumbsUpCount: 3,
            thumbsDownCount: 0,
            deviceMetadata: { productName: 'Pixel 7', manufacturer: 'Google', ramMb: 8192, screenDensityDpi: 420 },
            aFieldGoogleAddsLater: { nested: [1, 'two', null] },
          },
        },
        { developerComment: { text: 'Thanks, fixed in 1.15.20.', lastModified: { seconds: '1788200000', nanos: 0 } } },
      ],
    };
    const google = fakeGoogle(() => page([sent]));
    await syncGooglePlay(syncEnv(), NOW, env.DB, google.fetchImpl);

    const row = await env.DB.prepare('SELECT * FROM store_reviews WHERE platform_review_id = ?')
      .bind('keep-1').first<any>();
    expect(row.raw_json).toBe(JSON.stringify(sent));

    const version = await env.DB.prepare('SELECT raw_json, raw_hash FROM store_review_versions WHERE store_review_id = ?')
      .bind(row.store_review_id).first<any>();
    expect(version.raw_json).toBe(row.raw_json);
    expect(version.raw_hash).toBe(row.raw_hash);

    // Everything derived is recomputable from stored columns alone: the
    // original, the app id, and first_seen_at standing in for the clock.
    const again = fromGooglePlay(JSON.parse(row.raw_json), row.app_id, row.first_seen_at);
    expect({
      review_title: again.reviewTitle, review_body: again.reviewBody, rating: again.rating,
      reviewer_name: again.reviewerName, territory: again.territory, language: again.language,
      review_created_at: again.reviewCreatedAt, review_updated_at: again.reviewUpdatedAt,
      app_version: again.appVersion, app_version_code: again.appVersionCode,
      device: again.device, device_product: again.deviceProduct, os_version: again.osVersion,
    }).toEqual({
      review_title: row.review_title, review_body: row.review_body, rating: row.rating,
      reviewer_name: row.reviewer_name, territory: row.territory, language: row.language,
      review_created_at: row.review_created_at, review_updated_at: row.review_updated_at,
      app_version: row.app_version, app_version_code: row.app_version_code,
      device: row.device, device_product: row.device_product, os_version: row.os_version,
    });
    expect(await hashRaw(JSON.parse(row.raw_json))).toBe(row.raw_hash);
  });
});

describe('the store cron', () => {
  it('GP13. the store trigger reaches the Google Play sync on its slot, and does not run the drain', async () => {
    const id = await seedSubmission({ state: 'received' });
    route({
      match: (u, m) => u.host === 'oauth2.googleapis.com' && m === 'POST',
      respond: () => Response.json({ access_token: 'ya29.test-token', expires_in: 3599 }),
    });
    route({
      match: (u, m) => u.host === 'androidpublisher.googleapis.com' && m === 'GET',
      respond: () => page([review('cron-1')]),
    });

    try {
      await withEnv(
        { STORE_SYNC_ENABLED: 'true', GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: keyFile },
        () => runCron(STORE_CRON, GOOGLE_SLOT)
      );

      expect(callsTo('oauth2.googleapis.com')).toHaveLength(1);
      expect(callsTo('androidpublisher.googleapis.com')).toHaveLength(1);
      const stored = await env.DB.prepare('SELECT source, app_id FROM store_reviews WHERE platform_review_id = ?')
        .bind('cron-1').first<{ source: string; app_id: string }>();
      expect(stored).toEqual({ source: 'google_play', app_id: PKG });

      const sub = await env.DB.prepare('SELECT state FROM submissions WHERE submission_id = ?')
        .bind(id).first<{ state: string }>();
      expect(sub?.state).toBe('received');
    } finally {
      await env.DB.prepare('DELETE FROM submissions WHERE submission_id = ?').bind(id).run();
    }
  });

  it('GP14. SYNC-WIRING: every registered cron has a dispatch string, and every string a trigger', () => {
    // Read exactly the way scripts/deploy.sh reads it: whole-line comments
    // stripped, then JSON.parse. An inline comment or a trailing comma fails
    // here instead of failing the deploy.
    const config = JSON.parse(wranglerConfig.replace(/^\s*\/\/.*$/gm, ''));

    expect([...config.triggers.crons].sort()).toEqual([DRAIN_CRON, MIRROR_CRON, STORE_CRON].sort());
    expect(config.secrets.required).toContain('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
    // Sync ships OFF. It is turned on by a reviewed change to this file once
    // production is verified, never by default (SAFETY-CONTROLS.md §12).
    expect(config.vars.STORE_SYNC_ENABLED).toBe('false');
    expect(config.vars.GOOGLE_PLAY_PACKAGE_NAME).toBe(PKG);
  });

  it('GP33. the trigger is two windows a day, at midnight and midday in Manila', () => {
    /**
     * The store cron is no longer a clock that never stops. It fires in two
     * four-hour windows, and 04:00 / 16:00 UTC are 12:00 / 00:00 in Manila —
     * UTC+8 all year, so the two never drift apart.
     */
    const [minute, hour, ...rest] = STORE_CRON.split(' ');
    expect(minute).toBe('*/5');
    expect(hour).toBe('4-7,16-19');
    expect(rest).toEqual(['*', '*', '*']);

    // The hours the windows open are exactly the cycle starts, so a tick can
    // never fire in a cycle it is not the window for.
    for (const utcHour of [4, 16]) {
      const at = Date.parse(`2026-09-17T${String(utcHour).padStart(2, '0')}:00:00Z`);
      expect(cycleStart(at), `${utcHour}:00 UTC opens a cycle`).toBe(at);
    }
    // In Manila those are midnight and midday.
    expect(new Date(Date.parse('2026-09-17T16:00:00Z')).toLocaleString('en-US', {
      timeZone: 'Asia/Manila', hour: '2-digit', hour12: false,
    })).toContain('00');
    expect(new Date(Date.parse('2026-09-17T04:00:00Z')).toLocaleString('en-US', {
      timeZone: 'Asia/Manila', hour: '2-digit', hour12: false,
    })).toContain('12');
  });

  it('GP35. a pass that outlasts its window continues in the next cycle, never in parallel', async () => {
    /**
     * OVERLAP IS IMPOSSIBLE BY CONSTRUCTION, which is why there is no lock. A
     * cycle is derived from the clock, and a source that has not finished its
     * pass simply keeps the cursor it had: the next cycle RESUMES that pass
     * rather than opening a second one beside it. There is only ever one pass
     * per source, and one cursor.
     */
    // Six pages: more than one window's worth of ticks for this test's purpose.
    const thirty = Array.from({ length: 30 }, (_, i) => review(`p${String(i).padStart(2, '0')}`));
    const google = fakeGoogle((token) => {
      const offset = token ? Number(token) : 0;
      const end = offset + GOOGLE_PLAY_PAGE_SIZE;
      return page(thirty.slice(offset, end), end < thirty.length ? String(end) : undefined);
    });
    const listCallsFor = (g: ReturnType<typeof fakeGoogle>) => g.calls
      .filter((c) => c.url.host === 'androidpublisher.googleapis.com')
      .map((c) => c.url.searchParams.get('token'));

    const open = cycleStart(NOW + CYCLE_PERIOD_MS);
    // Two ticks, then the window ends with the pass still open.
    await syncGooglePlay(syncEnv(), open, env.DB, google.fetchImpl);
    await syncGooglePlay(syncEnv(), open + STORE_TICK_MS, env.DB, google.fetchImpl);
    const midPass = await loadCheckpoint(env.DB, `google_play:${PKG}`);
    expect(midPass?.cursor).toBe('10');
    expect(midPass?.last_pass_at).toBeNull();
    expect(midPass?.pass_started_at).toBe(open);

    // The next cycle picks up the same pass at the same cursor — not a new one
    // from the top, and not a second one alongside it.
    const next = open + CYCLE_PERIOD_MS;
    const resumed = await syncGooglePlay(syncEnv(), next, env.DB, google.fetchImpl);
    expect(resumed.report).toMatchObject({ created: 5, error: null });
    expect(listCallsFor(google)).toEqual([null, '5', '10']);
    // The pass is still the one that began in the previous cycle.
    expect((await loadCheckpoint(env.DB, `google_play:${PKG}`))?.pass_started_at).toBe(open);
  });

  it('GP15. phases rotate by the clock, one per five-minute slot', () => {
    const a = { name: 'a', run: async () => ({ skipped: 'a', report: null }) };
    const b = { name: 'b', run: async () => ({ skipped: 'b', report: null }) };
    const slot = (n: number) => n * STORE_TICK_MS;

    expect([0, 1, 2, 3].map((n) => phaseFor(slot(n), [a, b]).name)).toEqual(['a', 'b', 'a', 'b']);
    // A tick that fires late, inside the same slot, runs the same phase.
    expect(phaseFor(slot(1) + 59_000, [a, b]).name).toBe('b');
    // The shipped rotation: Google Play on even slots, the App Store on odd ones.
    expect([6, 7].map((n) => phaseFor(slot(n)).name)).toEqual(['sync:google_play', 'sync:app_store']);
  });
});

/**
 * WHAT A REFUSAL MEANS.
 *
 * Every failure used to be handled identically: count it, back off, retry. The
 * two cases below are the ones where that is wrong, and both fail silently —
 * a rate limit answered by retrying harder, and a dead key retried for ever
 * while `last_error` says only "401".
 */
describe('a refusal that is not an ordinary failure', () => {
  const NEXT_TICK = STORE_TICK_MS;
  const key = `google_play:${PKG}`;

  /** List calls only; the token endpoint is a different question. */
  const listCalls = (google: ReturnType<typeof fakeGoogle>) => google.calls
    .filter((c) => c.url.host === 'androidpublisher.googleapis.com')
    .map((c) => c.url.searchParams.get('token'));

  const state = () => loadCheckpoint(env.DB, key);
  const run = (google: ReturnType<typeof fakeGoogle>, at: number) =>
    syncGooglePlay(syncEnv(), at, env.DB, google.fetchImpl);

  const reviews = (n: number) => Array.from({ length: n }, (_, i) => review(`r${String(i).padStart(2, '0')}`));

  const storedIds = async () => (await env.DB
    .prepare('SELECT platform_review_id AS id FROM store_reviews ORDER BY id')
    .all<{ id: string }>()).results.map((r) => r.id);

  it('GP23. a rate limit is a wait, not a failure: it is not counted, and nothing asks again inside it', async () => {
    let limited = true;
    const google = fakeGoogle(() => (limited
      ? Response.json({ error: { status: 'RESOURCE_EXHAUSTED' } }, { status: 429, headers: { 'retry-after': '900' } })
      : page(reviews(3))));

    const refused = await run(google, NOW);
    expect(refused.report).toMatchObject({ disposition: 'defer', created: 0 });
    expect(refused.report?.error).toContain('HTTP 429');

    // NOT COUNTED. consecutive_failures drives our backoff and, on /health, the
    // question "is this sync broken" — a busy afternoon is not a broken sync.
    // last_error is left alone for the same reason: the last thing that went
    // wrong is still the last thing that went wrong.
    const deferred = await state();
    expect(deferred).toMatchObject({ consecutive_failures: 0, last_error: null });
    expect(deferred?.defer_until).toBe(NOW + 900_000);

    // Inside the wait, the tick calls nobody. Skipping the counter alone would
    // have left the run DUE and asking again five minutes later — worse than
    // counting it.
    const held = await run(google, NOW + NEXT_TICK);
    expect(held.report?.skipped).toContain('rate limit');
    expect(listCalls(google)).toHaveLength(1);

    // And when the wait is over it resumes at the page it never read.
    limited = false;
    const resumed = await run(google, NOW + 900_000);
    expect(resumed.report).toMatchObject({ created: 3, error: null, disposition: null });
    expect(listCalls(google)).toEqual([null, null]);
    expect(await state()).toMatchObject({ defer_until: null, consecutive_failures: 0 });
  });

  it('GP24. a 403 that is a quota waits; a 403 that is a permission stops', async () => {
    // THE STATUS IS NOT THE DISCRIMINATOR. androidpublisher answers 403 both
    // for "you may not" and for "not so fast", so reading the status alone
    // would stop the sync for hours because Google was briefly busy.
    const quota = fakeGoogle(() => Response.json(
      { error: { code: 403, status: 'PERMISSION_DENIED', errors: [{ reason: 'rateLimitExceeded' }] } },
      { status: 403 }
    ));
    expect((await run(quota, NOW)).report?.disposition).toBe('defer');
    expect(await state()).toMatchObject({ consecutive_failures: 0, paused_at: null });
    expect((await state())?.defer_until).toBeGreaterThan(NOW);

    await env.DB.prepare('DELETE FROM store_sync_state').run();

    const denied = fakeGoogle(() => Response.json(
      { error: { code: 403, status: 'PERMISSION_DENIED', message: `${MARKER} lacks access` } }, { status: 403 }
    ));
    expect((await run(denied, NOW)).report?.disposition).toBe('park');
    const paused = await state();
    expect(paused?.paused_at).toBe(NOW);
    expect(paused?.paused_reason).toBe('reviews.list failed (HTTP 403, PERMISSION_DENIED)');
    expect(JSON.stringify(paused)).not.toContain(MARKER);
  });

  it('GP25. a refused key stops the cadence, and a rotated one brings the sync back by itself', async () => {
    // The refusal that matters happens at the TOKEN endpoint: a deleted service
    // account never reaches the reviews API at all.
    let revoked = true;
    const calls: URL[] = [];
    const fetchImpl = async (input: string) => {
      const url = new URL(input);
      calls.push(url);
      if (url.host === 'oauth2.googleapis.com') {
        return revoked
          ? Response.json({ error: 'invalid_grant', error_description: `${MARKER} is not valid` }, { status: 400 })
          : Response.json({ access_token: 'ya29.test-token', expires_in: 3599 });
      }
      return page(reviews(2));
    };
    const sync = (at: number) => syncGooglePlay(syncEnv(), at, env.DB, fetchImpl);

    const refused = await sync(NOW);
    expect(refused.report).toMatchObject({ disposition: 'park', created: 0 });
    const paused = await state();
    expect(paused?.paused_at).toBe(NOW);
    expect(paused?.paused_reason).toContain('HTTP 400, invalid_grant');
    // Google's prose about the key never reaches the column that renders.
    expect(JSON.stringify(paused)).not.toContain(MARKER);

    // No number of retries changes a 401, so the ticks in between ask nobody.
    for (let n = 1; n <= 6; n++) {
      const held = await sync(NOW + n * NEXT_TICK);
      expect(held.report?.skipped).toContain('paused');
    }
    expect(calls).toHaveLength(1);

    // But a pause is a slower cadence, NOT an off switch: it probes again, and
    // a key rotated in the meantime resumes the sync with nobody touching D1.
    revoked = false;
    const probe = await sync(NOW + PARK_REPROBE_MS);
    expect(probe.report).toMatchObject({ created: 2, error: null });
    expect(await state()).toMatchObject({
      paused_at: null, paused_reason: null, consecutive_failures: 0, last_error: null,
    });
    expect((await state())?.last_success_at).toBe(NOW + PARK_REPROBE_MS);
  });

  it('GP26. an odd body is a failed run, never an exhausted one, and an empty page is not the end', async () => {
    /**
     * THE ALARM MUST NOT BE SILENCEABLE BY A BAD RESPONSE. Read loosely, each
     * of these comes out as "no reviews, no next page" — an exhausted source —
     * and a run that exhausts the source records a SUCCESS, which resets
     * last_success_at: the column the 7-day data-loss alarm is a query against.
     */
    for (const body of [null, [], 'nope', 42]) {
      await env.DB.prepare('DELETE FROM store_sync_state').run();
      const odd = fakeGoogle(() => Response.json(body));
      const result = await run(odd, NOW);

      expect(result.report?.error, JSON.stringify(body)).toContain('not an object');
      expect(result.report?.exhausted).toBe(false);
      expect(await state()).toMatchObject({ last_success_at: null, consecutive_failures: 1 });
    }

    // An app with no reviews in the window answers `{}` — Google omits empty
    // repeated fields — and that IS an exhausted source, not a malformed body.
    await env.DB.prepare('DELETE FROM store_sync_state').run();
    const quiet = fakeGoogle(() => Response.json({}));
    expect((await run(quiet, NOW)).report).toMatchObject({ fetched: 0, exhausted: true, error: null });
    expect((await state())?.last_success_at).toBe(NOW);

    // An empty page WITH a next token is the middle of a pass, not the end of
    // one: the cursor moves on instead of the pass restarting from the top.
    await env.DB.prepare('DELETE FROM store_sync_state').run();
    const sparse = fakeGoogle((token) => (token ? page(reviews(1)) : page([], 'more')));
    const first = await run(sparse, NOW);
    expect(first.report).toMatchObject({ fetched: 0, exhausted: false, error: null });
    expect((await state())?.cursor).toBe('more');
    expect((await run(sparse, NOW + NEXT_TICK)).report?.created).toBe(1);
  });

  it('GP27. a body that is not JSON writes nothing, and one unusable review does not take the page with it', async () => {
    const garbled = fakeGoogle(() => new Response('<!DOCTYPE html><h1>502</h1>', { status: 200 }));
    const failed = await run(garbled, NOW);

    expect(failed.report?.error).toContain('not JSON');
    expect(failed.report).toMatchObject({ created: 0, updated: 0, rejected: 0 });
    // Nothing partial: no review row, no version row, no event.
    for (const table of ['store_reviews', 'store_review_versions', 'store_review_events']) {
      const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
      expect(n?.n, table).toBe(0);
    }
    expect(await state()).toMatchObject({ cursor: null, consecutive_failures: 1, last_success_at: null });

    // A single unusable review inside a GOOD page is counted and skipped. The
    // alternative — throwing — lets one malformed record block every review
    // behind it, on a 7-day clock.
    await env.DB.prepare('DELETE FROM store_sync_state').run();
    const mixed = fakeGoogle(() => page([review('ok-1'), { authorName: 'no id at all' }, review('ok-2')]));
    const partial = await run(mixed, NOW);

    expect(partial.report).toMatchObject({ created: 2, rejected: 1, error: null });
    const stored = await env.DB.prepare('SELECT platform_review_id AS id FROM store_reviews ORDER BY id')
      .all<{ id: string }>();
    expect(stored.results.map((r) => r.id)).toEqual(['ok-1', 'ok-2']);
    // Every stored review kept its original, so the rejected one left no trace
    // anywhere rather than half of one.
    const versions = await env.DB.prepare('SELECT COUNT(*) AS n FROM store_review_versions').first<{ n: number }>();
    expect(versions?.n).toBe(2);
  });

  it('GP28. a cursor pointing at the page it came from is a cycle, and the pass resets', async () => {
    /**
     * The one-page case. It is caught inside a single invocation, and what
     * matters is what it is REPORTED as: it used to be dressed up as an
     * exhausted source, which cleared the cursor and recorded a success.
     */
    const stuck = fakeGoogle(() => page(reviews(2), 'same-token'));

    const first = await run(stuck, NOW);
    expect(first.report).toMatchObject({ created: 2, error: null, cycle: false });
    expect((await state())?.cursor).toBe('same-token');

    const caught = await run(stuck, NOW + NEXT_TICK);
    expect(caught.report?.cycle).toBe(true);
    expect(caught.report?.error).toContain('already read');

    const cp = await state();
    // RECOVERY: the pass is reset, so the next tick starts from the top rather
    // than resuming inside the loop.
    expect(cp?.cursor).toBeNull();
    expect(cp?.pass_tokens).toBeNull();
    // NOT a success. The countdown that matters does not move, and the failure
    // is counted like any other.
    expect(cp?.last_success_at).toBe(NOW);
    expect(cp?.last_pass_at).toBeNull();
    expect(cp?.consecutive_failures).toBe(1);
    expect(cp?.cycle_at).toBe(NOW + NEXT_TICK);
  });

  it('GP29. a two-page cycle is caught across runs, and cannot keep the health signal fresh', async () => {
    /**
     * THE CASE A SINGLE INVOCATION CANNOT SEE. A store answering A -> B and
     * then B -> A walks a page it has not walked in THAT run every time, so
     * nothing repeats within any one invocation and every request succeeds.
     * What gives it away is the cursor returning to a value the PASS has
     * already held, which is why the pass remembers across runs.
     */
    const twoPage = fakeGoogle((token) => (token === 'B'
      ? page([review('b-1')], 'A')
      : page([review('a-1')], 'B')));

    const cursors: Array<string | null> = [];
    const reports = [];
    for (let n = 0; n < 4; n++) {
      const r = (await run(twoPage, NOW + n * NEXT_TICK)).report!;
      reports.push(r);
      cursors.push((await state())?.cursor ?? null);
    }

    // Two ticks walk forward; the third returns to A, which this pass has
    // already used, and is caught. The fourth starts a fresh pass from the top.
    expect(reports.map((r) => r.cycle)).toEqual([false, false, true, false]);
    expect(cursors).toEqual(['B', 'A', null, 'B']);
    expect(listCalls(twoPage)).toEqual([null, 'B', 'A', null]);

    /**
     * AND THE HEALTH SIGNAL CANNOT LOOK LIKE PROGRESS. The ticks in between
     * fetch pages without error, so last_success_at does keep moving — that is
     * honest, the requests worked. What a cycling sync can never reach is a
     * COMPLETED pass, so last_pass_at stays null, `stalled` stays set until one
     * happens, and windowConsumed — measured from the pass, not the fetch —
     * never resets.
     */
    const cp = await state();
    expect(cp?.last_pass_at).toBeNull();
    expect(cp?.cycle_at).toBe(NOW + 2 * NEXT_TICK);
    // Sticky: the successful fourth tick did not clear it.
    expect(reports[3].error).toBeNull();
    expect(cp?.last_success_at).toBe(NOW + 3 * NEXT_TICK);

    const health = await syncHealth(env.DB, { STORE_SYNC_ENABLED: 'true' }, NOW + 4 * NEXT_TICK);
    expect(health.google_play.state).toBe('stalled');
    expect(health.google_play.lastCompletedPassHours).toBeNull();
    // The one number that still looks fine, which is why it is not the alarm.
    expect(health.google_play.lastSuccessHours).toBeLessThan(0.1);
    // The coverage gap runs from when the attempt began, NOT from the last page
    // that loaded, so it keeps climbing while this goes round — and it is not
    // null, which is what a sync that has never completed a pass used to report.
    expect(health.google_play.coverageGapHours).toBeGreaterThan(0);
    expect(health.google_play.windowConsumed).toBeGreaterThan(0);

    // Only a pass that reaches the end clears it.
    const settled = fakeGoogle(() => page([review('c-1')]));
    await run(settled, NOW + 5 * NEXT_TICK);
    const done = await state();
    expect(done?.cycle_at).toBeNull();
    expect(done?.last_pass_at).toBe(NOW + 5 * NEXT_TICK);
    expect((await syncHealth(env.DB, { STORE_SYNC_ENABLED: 'true' }, NOW + 5 * NEXT_TICK)).google_play)
      .toMatchObject({ state: 'ok', lastCompletedPassHours: 0, coverageGapHours: 0, windowConsumed: 0 });
    // The completed pass also stops the open-pass clock.
    expect((await state())?.pass_started_at).toBeNull();
  });

  it('GP29b. the same tokens on a NEW pass are ordinary, not a cycle', async () => {
    /**
     * THE FALSE POSITIVE THIS MUST NOT HAVE. Re-walking the same pages is not a
     * fault — it is what a pass over a 7-day window is supposed to do, every
     * time it comes round. The memory that catches a cycle is cleared by a pass
     * reaching the end, and that clearing is the entire difference between a
     * loop and a re-scan.
     */
    const twoPages = fakeGoogle((token) => (token === 'p2'
      ? page([review('r-2')])
      : page([review('r-1')], 'p2')));

    // Three complete passes over the same two pages, tokens identical each time.
    // Each pass is its own collection cycle: a finished pass is finished until
    // the next one, which is what makes the repeat legitimate.
    const seen = [];
    let last = NOW;
    for (let pass = 0; pass < 3; pass++) {
      for (let n = 0; n < 2; n++) {
        last = NOW + pass * CYCLE_PERIOD_MS + n * NEXT_TICK;
        seen.push((await run(twoPages, last)).report!.cycle);
      }
    }
    expect(seen).toEqual([false, false, false, false, false, false]);
    expect(listCalls(twoPages)).toEqual([null, 'p2', null, 'p2', null, 'p2']);

    const cp = await state();
    expect(cp?.cycle_at).toBeNull();
    // Three passes completed, and the memory is empty between them.
    expect(cp?.last_pass_at).toBe(last);
    expect(cp?.pass_tokens).toBeNull();
    expect(await storedIds()).toEqual(['r-1', 'r-2']);
  });

  it('GP29c. a cursor the store refuses restarts the pass; it is not a cycle', async () => {
    /**
     * The other legitimate repeat. A refused cursor makes the fetcher go back
     * to the first page, so the tokens after it are ones the pass has already
     * used — indistinguishable from a loop unless the restart says so.
     */
    let refuse = false;
    const google = fakeGoogle((token) => {
      if (token && refuse) return Response.json({ error: { status: 'INVALID_ARGUMENT' } }, { status: 400 });
      return token === 'p2' ? page([review('s-2')]) : page([review('s-1')], 'p2');
    });

    expect((await run(google, NOW)).report?.cycle).toBe(false);
    expect((await state())?.cursor).toBe('p2');

    // Now p2 is refused: the fetcher restarts from the top and comes back with
    // p2 again — the very token the pass is holding.
    refuse = true;
    const restarted = await run(google, NOW + NEXT_TICK);
    expect(restarted.report).toMatchObject({ cycle: false, error: null });
    expect((await state())?.cursor).toBe('p2');
    // The memory was reset by the restart rather than tripped by it.
    expect((await state())?.cycle_at).toBeNull();
    expect((await state())?.pass_tokens).toBeNull();
  });

  it('GP29d. a transient failure on the page the pass is holding is not a cycle', async () => {
    // When a page throws, the cursor stays on it so the retry resumes there —
    // which means the token matches the pass memory by construction. Reading
    // that as a loop would turn every 503 into a reset pass.
    let fail = false;
    const google = fakeGoogle((token) => {
      if (fail) return Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 });
      return token === 'p2' ? page([review('t-2')]) : page([review('t-1')], 'p2');
    });

    await run(google, NOW);
    fail = true;
    const failed = await run(google, NOW + NEXT_TICK);
    expect(failed.report?.cycle).toBe(false);
    expect(failed.report?.error).toContain('HTTP 503');
    expect((await state())?.cursor).toBe('p2');
    expect((await state())?.cycle_at).toBeNull();

    // And the retry, once the store recovers, finishes the pass normally.
    fail = false;
    const resumed = await run(google, NOW + 10 * NEXT_TICK);
    expect(resumed.report).toMatchObject({ cycle: false, error: null, exhausted: true });
    expect((await state())?.last_pass_at).toBe(NOW + 10 * NEXT_TICK);
  });

  it('GP30. the switch still outranks everything: a probe that is due contacts nobody when it is off', async () => {
    /**
     * A pause makes a run DUE again once the probe interval is up, so the new
     * scheduling has to sit entirely underneath the kill switch — not beside
     * it. The switch is read before any of it, and this is the case that would
     * catch a refactor putting the holds first.
     */
    const google = fakeGoogle(() => page([review('never-asked-for')]));
    const sync = (over: Record<string, string>, at: number) =>
      syncGooglePlay(syncEnv(over), at, env.DB, google.fetchImpl);

    // Park it for real, with the switch on.
    const denied = fakeGoogle(() => Response.json({ error: { status: 'PERMISSION_DENIED' } }, { status: 403 }));
    await syncGooglePlay(syncEnv(), NOW, env.DB, denied.fetchImpl);
    expect((await state())?.paused_at).toBe(NOW);

    // Now switch it off and let the probe come due, twice over.
    for (const off of ['false', '', 'TRUE', '1']) {
      const held = await sync({ STORE_SYNC_ENABLED: off }, NOW + 2 * PARK_REPROBE_MS);
      expect(held, `STORE_SYNC_ENABLED=${JSON.stringify(off)}`)
        .toEqual({ skipped: 'STORE_SYNC_ENABLED is not "true"', report: null });
    }
    expect(google.calls).toHaveLength(0);

    // The same for a deferral that has expired.
    await env.DB.prepare('DELETE FROM store_sync_state').run();
    const limited = fakeGoogle(() => Response.json({}, { status: 429, headers: { 'retry-after': '60' } }));
    await syncGooglePlay(syncEnv(), NOW, env.DB, limited.fetchImpl);
    expect((await state())?.defer_until).toBe(NOW + 60_000);

    const afterWait = await sync({ STORE_SYNC_ENABLED: 'false' }, NOW + 120_000);
    expect(afterWait.report).toBeNull();
    expect(google.calls).toHaveLength(0);
  });
});

describe('what one tick costs', () => {
  const key = `google_play:${PKG}`;
  const state = () => loadCheckpoint(env.DB, key);
  const storedIdCount = async () => (await env.DB
    .prepare('SELECT COUNT(*) AS n FROM store_reviews').first<{ n: number }>())?.n;

  /** One sync run against a counted database. Returns the statement count. */
  async function cost(reviews: unknown[], next?: string, at = NOW): Promise<number> {
    const google = fakeGoogle(() => page(reviews, next));
    const counted = countingDb(env.DB);
    await syncGooglePlay(syncEnv(), at, counted.db, google.fetchImpl);
    return counted.count();
  }

  it('GP31. SYNC-BUDGET: every shape of tick, measured, with the numbers written down', async () => {
    /**
     * The free plan allows 50 D1 queries per invocation, and EVERY STATEMENT IN
     * A BATCH COUNTS — batching the writes made them atomic, not free. These
     * are the exact costs, pinned so a change to the write path has to come
     * past this test rather than past a reviewer's arithmetic.
     *
     * Three of them are fixed overhead per run, whatever the page holds:
     * loadCheckpoint, beginAttempt, and recordSuccess / recordFailure /
     * recordDeferral / recordPause — one statement each, on every path.
     *
     * THE RUN CLAIM COSTS NOTHING ON TOP OF THAT. It is beginAttempt: the same
     * single statement, which now also returns the row it claimed, so a run
     * works from what it owns rather than from what it read. A tick that finds
     * its pass already complete for the cycle costs ONE query — the look-up —
     * and never claims at all.
     */
    const fresh = Array.from({ length: GOOGLE_PLAY_PAGE_SIZE }, (_, i) => review(`b-${i}`, `Review number ${i}`));

    // Nothing to write: the three checkpoint statements and no more. The pass
    // memory and the run claim ride on those same statements — columns, not
    // queries.
    expect(await cost([], undefined, NOW)).toBe(3);

    // And a tick whose pass is already done for the cycle costs one look-up.
    expect(await cost([], undefined, NOW + STORE_TICK_MS)).toBe(1);

    // A full page of brand-new reviews — the worst case. Per review: the
    // identity look-up, then one batch of three (the row, its original, its
    // arrival line).
    await env.DB.prepare('DELETE FROM store_sync_state').run();
    const created = await cost(fresh, 'more', NOW);
    expect(created).toBe(3 + GOOGLE_PLAY_PAGE_SIZE * 4);
    expect(await storedIdCount()).toBe(GOOGLE_PLAY_PAGE_SIZE);

    // The steady state: the same page again, nothing changed. Per review: the
    // look-up, then a batch of two — the repair that writes nothing, and the
    // clock.
    expect(await cost(fresh, 'more', NOW + STORE_TICK_MS)).toBe(3 + GOOGLE_PLAY_PAGE_SIZE * 3);

    // Every review edited upstream — the most expensive per-review path.
    const edited = fresh.map((_, i) => review(`b-${i}`, `Review number ${i}, corrected`));
    expect(await cost(edited, 'more', NOW + 2 * STORE_TICK_MS)).toBe(3 + GOOGLE_PLAY_PAGE_SIZE * 5);

    /**
     * THE HEADROOM, STATED AS A NUMBER. The worst case is 28 of the 50 queries
     * an invocation gets — 56% — and the page size is what the margin is made
     * of: at 5 reviews a page, the all-edited case fits with 22 to spare, and
     * 9 is the largest page that still would. Anyone raising
     * GOOGLE_PLAY_PAGE_SIZE is spending this, and CPU runs out first anyway
     * (see docs/FREE-PLAN-HEADROOM.md).
     */
    expect(3 + GOOGLE_PLAY_PAGE_SIZE * 5).toBe(28);
    expect(Math.floor((D1_QUERIES_PER_INVOCATION - 3) / 5)).toBe(9);
    expect(GOOGLE_PLAY_PAGE_SIZE).toBeLessThanOrEqual(9);
    expect((await state())?.last_success_at).toBe(NOW + 2 * STORE_TICK_MS);
  });

  it('GP32. SYNC-BUDGET: a tick spends two subrequests, three when a cursor is refused', async () => {
    // The free plan allows 50 subrequests per invocation. A Google tick makes
    // two: mint an access token, fetch one page. The token is minted per run
    // and never stored, which is the deliberate trade — one subrequest against
    // a live bearer token at rest in D1.
    const google = fakeGoogle(() => page([review('s-1')], 'more'));
    await syncGooglePlay(syncEnv(), NOW, env.DB, google.fetchImpl);
    expect(google.calls.map((c) => c.url.host))
      .toEqual(['oauth2.googleapis.com', 'androidpublisher.googleapis.com']);

    // A cursor Google refuses costs one more: the pass restarts from the first
    // page, once. Still nowhere near the limit.
    const stale = fakeGoogle((token) => (token
      ? Response.json({ error: { status: 'INVALID_ARGUMENT' } }, { status: 400 })
      : page([review('s-2')], 'more')));
    await syncGooglePlay(syncEnv(), NOW + STORE_TICK_MS, env.DB, stale.fetchImpl);
    expect(stale.calls).toHaveLength(3);
  });
});
