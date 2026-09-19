/**
 * The Google ingestion core — normalisation, hashing, paging, the idempotent
 * upsert, edit history, retries and checkpoints.
 *
 * NO CREDENTIAL EXISTS YET, AND THAT IS THE POINT. The fetcher is injected, so
 * everything hard about syncing a store is exercised here against fixtures
 * built from Google's documented response shape. When the service account
 * arrives, Phase 1 supplies one function that returns a page and this whole
 * path is already proven.
 *
 * The headline property, which several tests approach from different sides:
 * RE-SYNCING A WINDOW WRITES NOTHING. Everything else — resuming a cursor,
 * retrying a failed page, re-importing an overlapping CSV range later — is
 * only safe because that holds.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import {
  canonicalize, hashRaw, fromGooglePlay, normalizeGooglePlay, NormalizeError,
} from '../src/store/normalize';
import { upsertReview } from '../src/store/upsert';
import { paginate } from '../src/store/paginate';
import {
  fingerprint, parsePassTokens, serializePassTokens, withPassToken, MAX_PASS_TOKENS,
} from '../src/store/pass';
import { runIngest } from '../src/store/ingest';
import {
  loadCheckpoint, backoffMs, isDue, holdReason, windowConsumed, MAX_BACKOFF_MS, PARK_REPROBE_MS,
  cycleStart, cycleDone, CYCLE_PERIOD_MS, CYCLE_OFFSET_MS,
} from '../src/store/checkpoint';
import {
  classifyApple, classifyGoogle, dispositionOf, retryAfterMs,
  DEFAULT_DEFER_MS, MAX_DEFER_MS, MIN_DEFER_MS,
} from '../src/store/failure';

const APP = 'com.miden.wallet';
const NOW = 1_788_300_000_000;

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM store_review_events').run();
  await env.DB.prepare('DELETE FROM store_review_versions').run();
  await env.DB.prepare('DELETE FROM store_reviews').run();
  await env.DB.prepare('DELETE FROM store_sync_state').run();
});

/** A review in the shape Google's `reviews.list` documents. */
function gpReview(over: Record<string, any> = {}) {
  return {
    reviewId: over.reviewId ?? 'gp-1',
    authorName: over.authorName ?? 'M. Reyes',
    comments: [
      {
        userComment: {
          text: over.text ?? 'Private send fails every time since the update.',
          // `in`, not `??` — an explicit null must actually remove the field.
          // With `??` this fixture silently kept the default and N4 asserted
          // nothing at all.
          lastModified: 'lastModified' in over ? over.lastModified : { seconds: '1788190000', nanos: 0 },
          starRating: over.starRating ?? 2,
          reviewerLanguage: 'en',
          device: 'panther',
          androidOsVersion: 34,
          appVersionCode: 11519,
          appVersionName: '1.15.19',
          deviceMetadata: { productName: 'Pixel 7' },
          ...(over.userComment ?? {}),
        },
      },
      ...(over.developerReply
        ? [{ developerComment: { text: over.developerReply, lastModified: { seconds: '1788200000' } } }]
        : []),
    ],
  };
}

const rowOf = (id: string) => env.DB
  .prepare('SELECT * FROM store_reviews WHERE platform_review_id = ?').bind(id).first<any>();
const versionsOf = (srid: string) => env.DB
  .prepare('SELECT * FROM store_review_versions WHERE store_review_id = ? ORDER BY id').bind(srid).all<any>();
const eventsOf = (srid: string) => env.DB
  .prepare('SELECT * FROM store_review_events WHERE store_review_id = ? ORDER BY id').bind(srid).all<any>();

describe('normalisation', () => {
  it('N1. maps a documented Google payload onto the canonical record', async () => {
    const r = await normalizeGooglePlay(gpReview(), APP, NOW);
    expect(r.platformReviewId).toBe('gp-1');
    expect(r.platform).toBe('android');
    expect(r.source).toBe('google_play');
    expect(r.reviewBody).toContain('Private send fails');
    expect(r.rating).toBe(2);
    expect(r.reviewerName).toBe('M. Reyes');
    expect(r.appVersion).toBe('1.15.19');
    expect(r.appVersionCode).toBe(11519);
    expect(r.deviceProduct).toBe('Pixel 7');
    expect(r.osVersion).toBe('34');
    expect(r.language).toBe('en');
    // A language is not a country and must never be stored as one.
    expect(r.territory).toBeNull();
    expect(r.reviewCreatedAt).toBe(1_788_190_000_000);
  });

  it('N2. refuses a review with no reviewId rather than inventing one', async () => {
    // A synthesised id would be unique every run, so re-importing would create
    // a second row for every review — the exact failure the unique index
    // exists to prevent, arriving through the back door.
    expect(() => fromGooglePlay({ authorName: 'x', comments: [] }, APP, NOW))
      .toThrow(NormalizeError);
    expect(() => fromGooglePlay(null, APP, NOW)).toThrow(NormalizeError);
  });

  it('N3. the hash is stable when keys move, and changes when content does', async () => {
    // JSON key order is not guaranteed. Hashing raw text would make an
    // unchanged review look edited whenever a key moved, filling the version
    // history with identical copies of itself.
    const a = { reviewId: 'x', authorName: 'a', comments: [{ n: 1 }] };
    const b = { comments: [{ n: 1 }], authorName: 'a', reviewId: 'x' };
    expect(canonicalize(a)).toBe(canonicalize(b));
    expect(await hashRaw(a)).toBe(await hashRaw(b));
    expect(await hashRaw({ ...a, authorName: 'z' })).not.toBe(await hashRaw(a));
  });

  it('N4. a payload with no usable timestamp still gets an ordering key', async () => {
    // review_created_at is NOT NULL because every queue orders by it. An
    // ordering column that can be null makes the order undefined.
    const r = await normalizeGooglePlay(gpReview({ lastModified: null }), APP, NOW);
    expect(r.reviewCreatedAt).toBe(NOW);
    expect(r.reviewUpdatedAt).toBeNull();
  });

  it('N5. a reply already on the store is captured', async () => {
    const r = await normalizeGooglePlay(gpReview({ developerReply: 'Sorry — fixed in 1.15.20.' }), APP, NOW);
    expect(r.existingReplyText).toBe('Sorry — fixed in 1.15.20.');
    expect(r.existingReplyAt).toBe(1_788_200_000_000);
  });
});

describe('the single dedup path', () => {
  it('U1. a first sight creates the row, one version, and an event', async () => {
    const r = await normalizeGooglePlay(gpReview(), APP, NOW);
    const res = await upsertReview(env.DB, r, NOW);
    expect(res.outcome).toBe('created');

    const row = await rowOf('gp-1');
    expect(row.review_state).toBe('new');
    expect(row.eligibility).toBe('undecided');
    expect(row.handoff_state).toBe('none');
    expect((await versionsOf(res.storeReviewId)).results).toHaveLength(1);
    expect((await eventsOf(res.storeReviewId)).results).toHaveLength(1);
  });

  it('U2. re-syncing the same review writes nothing but the clock', async () => {
    const r = await normalizeGooglePlay(gpReview(), APP, NOW);
    const first = await upsertReview(env.DB, r, NOW);

    const again = await normalizeGooglePlay(gpReview(), APP, NOW + 1000);
    const second = await upsertReview(env.DB, again, NOW + 1000);

    expect(second.outcome).toBe('unchanged');
    expect(second.storeReviewId).toBe(first.storeReviewId);
    // A run seeing a thousand unchanged reviews must not write a thousand rows
    // saying so.
    expect((await versionsOf(first.storeReviewId)).results).toHaveLength(1);
    expect((await eventsOf(first.storeReviewId)).results).toHaveLength(1);
    expect((await rowOf('gp-1')).last_synced_at).toBe(NOW + 1000);
  });

  it('U3. an edit adds a version and keeps the original readable', async () => {
    const first = await upsertReview(env.DB, await normalizeGooglePlay(gpReview(), APP, NOW), NOW);
    const edited = gpReview({ text: 'Actually it works now, my network was down.', starRating: 4 });
    const res = await upsertReview(env.DB, await normalizeGooglePlay(edited, APP, NOW + 5000), NOW + 5000);

    expect(res.outcome).toBe('updated');
    expect(res.storeReviewId).toBe(first.storeReviewId);

    const row = await rowOf('gp-1');
    expect(row.review_body).toContain('Actually it works now');
    expect(row.rating).toBe(4);
    // The ordering anchor does not move for a correction — a reviewer's list
    // must not reshuffle under them.
    expect(row.review_created_at).toBe(1_788_190_000_000);

    const versions = (await versionsOf(first.storeReviewId)).results;
    expect(versions).toHaveLength(2);
    // The first row is the original as received and is never rewritten.
    expect(JSON.parse(versions[0].raw_json).comments[0].userComment.text)
      .toContain('Private send fails');
    expect(versions[0].rating).toBe(2);
  });

  it('U4. an edit never overwrites a human decision', async () => {
    const first = await upsertReview(env.DB, await normalizeGooglePlay(gpReview(), APP, NOW), NOW);
    await env.DB.prepare(
      `UPDATE store_reviews SET review_state='not_actionable', eligibility='not_eligible',
              human_labels='["praise"]', human_decided_at=?, human_decided_by='ivan'
        WHERE store_review_id=?`
    ).bind(NOW + 100, first.storeReviewId).run();

    await upsertReview(
      env.DB,
      await normalizeGooglePlay(gpReview({ text: 'THE APP STOLE MY FUNDS' }), APP, NOW + 200),
      NOW + 200
    );

    const row = await rowOf('gp-1');
    // A review's author must not be able to move it through our pipeline, in
    // either direction, by editing what they wrote.
    expect(row.review_state).toBe('not_actionable');
    expect(row.eligibility).toBe('not_eligible');
    expect(row.human_labels).toBe('["praise"]');
    expect(row.human_decided_by).toBe('ivan');
    // But it is said out loud, because it is what a human needs to notice.
    const detail = (await eventsOf(first.storeReviewId)).results.map((e: any) => e.detail).join(' ');
    expect(detail).toContain('AFTER a human decision');
  });

  it('U5. a review containing a seed phrase is flagged, and the secret is not copied', async () => {
    const seed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const res = await upsertReview(
      env.DB,
      await normalizeGooglePlay(gpReview({ text: `help me ${seed}` }), APP, NOW),
      NOW
    );
    expect(res.flagged).toBe(true);

    const row = await rowOf('gp-1');
    expect(row.secret_scan_status).toBe('flagged');
    // Reason CODES only. Recording the secret in order to record that we found
    // a secret would defeat the point of finding it.
    expect(row.secret_scan_reasons).not.toContain('abandon');
    expect(JSON.parse(row.secret_scan_reasons).length).toBeGreaterThan(0);
  });

  it('U6. the same review id on two stores is two reviews', async () => {
    await upsertReview(env.DB, await normalizeGooglePlay(gpReview({ reviewId: 'shared' }), APP, NOW), NOW);
    const apple = await normalizeGooglePlay(gpReview({ reviewId: 'shared' }), APP, NOW);
    // Identity is (source, app_id, platform_review_id) — never the id alone.
    const res = await upsertReview(
      env.DB, { ...apple, source: 'app_store', platform: 'ios' }, NOW
    );
    expect(res.outcome).toBe('created');
    const { results } = await env.DB
      .prepare('SELECT source FROM store_reviews WHERE platform_review_id = ?').bind('shared').all<any>();
    expect(results).toHaveLength(2);
  });

  it('U7. a record built by hand, without normalising, is refused', async () => {
    const r = await normalizeGooglePlay(gpReview(), APP, NOW);
    // An empty rawHash would make every future sync of this review look like
    // an edit. The guard runs for every producer, not just the careful ones.
    await expect(upsertReview(env.DB, { ...r, rawHash: '' }, NOW)).rejects.toThrow(NormalizeError);
    await expect(upsertReview(env.DB, { ...r, platformReviewId: '' }, NOW)).rejects.toThrow(NormalizeError);
  });
});

describe('paging', () => {
  const pager = (pages: Array<{ items: any[]; nextToken: string | null }>) => {
    let i = 0;
    return async () => pages[i++] ?? { items: [], nextToken: null };
  };

  it('P1. walks to the end and reports exhaustion', async () => {
    const out = await paginate(pager([
      { items: [1, 2], nextToken: 't1' },
      { items: [3], nextToken: null },
    ]));
    expect(out.items).toEqual([1, 2, 3]);
    expect(out.exhausted).toBe(true);
    expect(out.nextToken).toBeNull();
    expect(out.pages).toBe(2);
  });

  it('P2. stops at the page budget and hands back a resume token', async () => {
    const out = await paginate(pager([
      { items: [1], nextToken: 'a' }, { items: [2], nextToken: 'b' }, { items: [3], nextToken: 'c' },
    ]), { maxPages: 2 });
    expect(out.items).toEqual([1, 2]);
    expect(out.exhausted).toBe(false);
    expect(out.nextToken).toBe('b');
  });

  it('P3. a failing page keeps what was already collected', async () => {
    let n = 0;
    const out = await paginate(async () => {
      n += 1;
      if (n === 1) return { items: ['a', 'b'], nextToken: 'page2' };
      throw new Error('502 upstream');
    });
    // Discarding good pages because a later one failed risks reviews that
    // Google's 7-day window may never offer again.
    expect(out.items).toEqual(['a', 'b']);
    expect(out.error).toBeTruthy();
    // The cursor points at the page that failed, so the retry resumes there.
    expect(out.nextToken).toBe('page2');
  });

  it('P4. a token pointing at itself is reported as a cycle, not as the end of the data', async () => {
    const out = await paginate(async () => ({ items: [1], nextToken: 'same' }), { maxPages: 100 });
    expect(out.pages).toBeLessThanOrEqual(2);
    expect(out.cycle).toBe(true);
    // NOT exhausted. It used to say it was, which had the caller record a
    // success — a sync going in circles reading as one finishing a pass.
    expect(out.exhausted).toBe(false);
  });

  it("P6. the pass's memory is bounded, and survives a column it cannot read", async () => {
    // Written on every tick, so it cannot grow with the backlog. The cap is
    // what a cycle has to be shorter than to be caught — a real limit, and the
    // reason it is 200 rather than 5.
    let tokens: string[] = [];
    for (let i = 0; i < MAX_PASS_TOKENS + 50; i++) tokens = withPassToken(tokens, `t${i}`);
    expect(tokens).toHaveLength(MAX_PASS_TOKENS);
    // The OLDEST are dropped: a cycle is recent by nature.
    expect(tokens[tokens.length - 1]).toBe(`t${MAX_PASS_TOKENS + 49}`);
    expect(tokens).not.toContain('t0');

    // Fingerprints are stable, short, and differ for tokens that differ.
    const a = await fingerprint('AQ.AMt2C-Ulong-opaque-cursor');
    expect(a).toHaveLength(16);
    expect(await fingerprint('AQ.AMt2C-Ulong-opaque-cursor')).toBe(a);
    expect(await fingerprint('AQ.AMt2C-Ulong-opaque-cursox')).not.toBe(a);

    // A column that will not parse is no memory rather than a failed sync: the
    // cost of forgetting is a cycle caught one pass later, not data.
    expect(parsePassTokens('not json')).toEqual([]);
    expect(parsePassTokens(null)).toEqual([]);
    expect(parsePassTokens('{"not":"an array"}')).toEqual([]);
    expect(parsePassTokens(JSON.stringify(['a', 7, 'b']))).toEqual(['a', 'b']);
    expect(serializePassTokens([])).toBeNull();
  });

  it('P7. a backlog longer than the pass memory finishes, without a single reset', async () => {
    /**
     * THE FALSE POSITIVE THE CAP MUST NOT CAUSE. The pass memory holds 200
     * cursors and drops the oldest past that, so a pass longer than 200 pages
     * is walking with a partial memory. Legitimate cursors are unique, so
     * nothing in it can match — but "should not" is not "does not", and a wrong
     * answer here is a backlog that resets for ever and never reaches its tail.
     *
     * 260 pages, one per run, exactly as the store cron walks them.
     */
    const TOTAL = 260;
    const source = {
      source: 'google_play' as const,
      appId: APP,
      normalize: normalizeGooglePlay,
      fetchPage: async (token: string | null) => {
        const n = token === null ? 0 : Number(token);
        return { items: [], nextToken: n + 1 < TOTAL ? String(n + 1) : null };
      },
    };

    let cycles = 0;
    const ended: number[] = [];
    for (let tick = 0; tick < TOTAL; tick++) {
      // maxPages: 1 — the store cron's shape, and the shape that makes the pass
      // memory the only thing that can see across pages.
      const report = await runIngest(env.DB, source, NOW + tick * 60_000, { force: true, maxPages: 1 });
      if (report.cycle) cycles += 1;
      // A pass that ends before the tail is a reset: the next tick would start
      // again at the top and the backlog would never finish.
      if (report.exhausted) ended.push(tick);
    }

    expect(cycles).toBe(0);
    expect(ended).toEqual([TOTAL - 1]);

    const cp = await loadCheckpoint(env.DB, `google_play:${APP}`);
    // It reached the end, and the end cleared the pass: cursor, memory and the
    // open-pass clock all gone, with the completion recorded.
    expect(cp?.cursor).toBeNull();
    expect(cp?.cycle_at).toBeNull();
    expect(cp?.pass_tokens).toBeNull();
    expect(cp?.pass_started_at).toBeNull();
    expect(cp?.last_pass_at).toBe(NOW + (TOTAL - 1) * 60_000);

    // And the memory really was capped while it ran, rather than growing to 260.
    const mid = parsePassTokens(JSON.stringify(Array.from({ length: 260 }, (_, i) => `f${i}`)));
    expect(mid).toHaveLength(MAX_PASS_TOKENS);
  }, 30_000);

  it('P5. a page fetched after a refused cursor says the pass started over', async () => {
    // The flag travels with the page, because only the client knows it gave up
    // on the cursor it was handed. Without it, the tokens that follow look like
    // a store sending the pass back round.
    const out = await paginate(async () => ({ items: [1], nextToken: null, restarted: true }));
    expect(out.restarted).toBe(true);
    expect(out.cycle).toBe(false);
    expect(out.exhausted).toBe(true);

    const ordinary = await paginate(async () => ({ items: [1], nextToken: null }));
    expect(ordinary.restarted).toBe(false);
  });
});

describe('a sync run', () => {
  const source = (fetchPage: any) => ({
    source: 'google_play' as const, appId: APP, fetchPage, normalize: normalizeGooglePlay,
  });

  it('I1. a clean run stores the reviews and checkpoints its success', async () => {
    const report = await runIngest(env.DB, source(async () => ({
      items: [gpReview({ reviewId: 'a' }), gpReview({ reviewId: 'b' })], nextToken: null,
    })), NOW);

    expect(report.created).toBe(2);
    expect(report.error).toBeNull();
    expect(report.exhausted).toBe(true);

    const cp = await loadCheckpoint(env.DB, `google_play:${APP}`);
    expect(cp?.last_success_at).toBe(NOW);
    expect(cp?.consecutive_failures).toBe(0);
  });

  it('I2. RE-RUNNING THE SAME WINDOW WRITES NO DUPLICATES', async () => {
    // The property everything else rests on. A lost cursor, a crashed run, a
    // re-imported CSV range: all cost time, not correctness.
    const page = async () => ({ items: [gpReview({ reviewId: 'a' }), gpReview({ reviewId: 'b' })], nextToken: null });
    await runIngest(env.DB, source(page), NOW);
    // The next collection cycle: the first pass finished, so the same window is
    // re-read twelve hours later rather than a minute later.
    const second = await runIngest(env.DB, source(page), NOW + CYCLE_PERIOD_MS);

    expect(second.created).toBe(0);
    expect(second.unchanged).toBe(2);
    const { results } = await env.DB.prepare('SELECT store_review_id FROM store_reviews').all<any>();
    expect(results).toHaveLength(2);
  });

  it('I3. a partial failure stores what it got and resumes at the failing page', async () => {
    let n = 0;
    const report = await runIngest(env.DB, source(async () => {
      n += 1;
      if (n === 1) return { items: [gpReview({ reviewId: 'a' })], nextToken: 'p2' };
      throw new Error('503 from Google');
    }), NOW);

    expect(report.created).toBe(1);
    expect(report.error).toContain('503');

    const cp = await loadCheckpoint(env.DB, `google_play:${APP}`);
    expect(cp?.consecutive_failures).toBe(1);
    expect(cp?.cursor).toBe('p2');
    // A failed run never claims success — that is what the staleness alarm reads.
    expect(cp?.last_success_at).toBeNull();
  });

  it('I4. one unusable payload does not block the good ones behind it', async () => {
    const report = await runIngest(env.DB, source(async () => ({
      items: [gpReview({ reviewId: 'ok1' }), { authorName: 'no id here' }, gpReview({ reviewId: 'ok2' })],
      nextToken: null,
    })), NOW);

    expect(report.created).toBe(2);
    expect(report.rejected).toBe(1);
    // A single malformed record must not hold every good review behind it, on
    // a clock.
    expect(report.error).toBeNull();
  });

  it('I5. backoff skips a run that is not due, and force overrides it', async () => {
    let calls = 0;
    const failing = source(async () => { calls += 1; throw new Error('down'); });
    await runIngest(env.DB, failing, NOW);
    expect(calls).toBe(1);

    // One minute after the first failure, the next tick must not hammer it.
    const skipped = await runIngest(env.DB, failing, NOW + 1000);
    expect(skipped.ran).toBe(false);
    expect(skipped.skipped).toContain('backing off');
    expect(calls).toBe(1);

    const forced = await runIngest(env.DB, failing, NOW + 2000, { force: true });
    expect(forced.ran).toBe(true);
    expect(calls).toBe(2);
  });

  it('I6. backoff is capped far below the 7-day window', async () => {
    // Unbounded doubling reaches days within a dozen failures, and a day of
    // backoff against a 168-hour window is a day of reviews at risk.
    expect(backoffMs(0)).toBe(0);
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(50)).toBe(MAX_BACKOFF_MS);
    expect(MAX_BACKOFF_MS).toBeLessThan(7 * 24 * 3_600_000 / 24);

    // A source that has never run is always due; the first run must not be
    // delayed by a backoff computed from no history.
    expect(isDue(null, NOW)).toBe(true);
  });

  it('I7. the staleness measure is a countdown against the window, not a health check', async () => {
    expect(windowConsumed(null, NOW)).toBeNull();          // never synced != data lost
    const half = { last_success_at: NOW - 3.5 * 24 * 3_600_000 } as any;
    expect(windowConsumed(half, NOW)).toBeCloseTo(0.5, 2);
    const gone = { last_success_at: NOW - 8 * 24 * 3_600_000 } as any;
    expect(windowConsumed(gone, NOW)!).toBeGreaterThan(1);  // reviews now unreachable
  });
});

/**
 * The three holds, as pure functions. Each one stops a tick for a different
 * reason, and reading them back the wrong way round is how a paused sync ends
 * up hammering or a rate-limited one ends up ignored.
 */
describe('when a sync may run', () => {
  const base = {
    key: 'google_play:app', cursor: null, last_success_at: null, last_attempt_at: NOW,
    consecutive_failures: 0, last_error: null, updated_at: NOW,
    defer_until: null, paused_at: null, paused_reason: null,
    pass_tokens: null, cycle_at: null, last_pass_at: null, pass_started_at: null, run_id: null,
  };

  it('I8. a pause outranks a wait, a wait outranks backoff, and each says which it is', () => {
    expect(holdReason(null, NOW)).toBeNull();
    expect(holdReason({ ...base }, NOW)).toBeNull();

    // A wait the STORE asked for holds even with no failures recorded — being
    // due on our clock is not permission on theirs.
    const waiting = { ...base, defer_until: NOW + 60_000 };
    expect(isDue(waiting, NOW)).toBe(false);
    expect(holdReason(waiting, NOW)).toBe('deferred');
    expect(isDue(waiting, NOW + 60_000)).toBe(true);

    // A pause outranks everything below it, INCLUDING a backoff that has
    // expired: while a credential is refused, the answer is already known. One
    // failure backs off for a minute; the pause still holds five minutes later.
    const paused = { ...base, paused_at: NOW, consecutive_failures: 1, last_attempt_at: NOW };
    expect(backoffMs(1)).toBeLessThan(PARK_REPROBE_MS);
    expect(holdReason(paused, NOW + 5 * 60_000)).toBe('paused');
    expect(isDue(paused, NOW + PARK_REPROBE_MS - 1)).toBe(false);

    // But it is a cadence, not an off switch: it probes, so a rotated key
    // resumes the sync without anyone touching the database.
    expect(isDue(paused, NOW + PARK_REPROBE_MS)).toBe(true);

    // And the probe is the SAME ceiling a failing sync already reaches, so a
    // paused sync never costs more requests than an ordinary broken one.
    expect(PARK_REPROBE_MS).toBe(MAX_BACKOFF_MS);
    const long = { ...base, paused_at: NOW, consecutive_failures: 30, last_attempt_at: NOW };
    expect(isDue(long, NOW + PARK_REPROBE_MS)).toBe(true);

    expect(holdReason({ ...base, consecutive_failures: 1 }, NOW + 1000)).toBe('backoff');
  });

  it('I15. a cycle begins at midnight and midday in Manila, and ends when the pass does', () => {
    /**
     * COLLECTION IS TWICE A DAY, and the cycle is a clock fact rather than a
     * stored one — nothing to race, nothing an invocation can leave set.
     *
     * Manila is UTC+8 all year, so 00:00 and 12:00 there are 16:00 and 04:00
     * UTC, with no daylight saving to drift against. Checked against real
     * instants rather than against the arithmetic that produces them.
     */
    const manila = (iso: string) => Date.parse(iso);   // written with the +08:00 offset
    expect(CYCLE_PERIOD_MS).toBe(12 * 3_600_000);
    expect(CYCLE_OFFSET_MS).toBe(4 * 3_600_000);

    // Midnight in Manila, and one minute either side of it.
    const midnight = manila('2026-09-17T00:00:00+08:00');
    expect(cycleStart(midnight)).toBe(midnight);
    expect(cycleStart(midnight + 60_000)).toBe(midnight);
    expect(cycleStart(midnight - 60_000)).toBe(manila('2026-09-16T12:00:00+08:00'));

    // Midday, twelve hours on.
    const midday = manila('2026-09-17T12:00:00+08:00');
    expect(cycleStart(midday)).toBe(midday);
    expect(midday - midnight).toBe(CYCLE_PERIOD_MS);

    // Every instant in between belongs to the cycle that opened before it.
    for (const h of [1, 4, 8, 11.9]) {
      expect(cycleStart(midnight + h * 3_600_000), `${h}h after midnight`).toBe(midnight);
    }

    // A source is finished for the cycle once a pass has COMPLETED in it —
    // last_pass_at, which only a pass reaching the end of the source moves.
    const cp = (last_pass_at: number | null) => ({ ...base, last_pass_at } as any);
    expect(cycleDone(null, midnight)).toBe(false);
    expect(cycleDone(cp(null), midnight)).toBe(false);
    expect(cycleDone(cp(midnight - 1), midnight)).toBe(false);      // last cycle's
    expect(cycleDone(cp(midnight), midnight)).toBe(true);
    expect(cycleDone(cp(midnight + 3_600_000), midnight + 2 * 3_600_000)).toBe(true);
    // And it expires with the cycle, without anything being written.
    expect(cycleDone(cp(midnight), midday)).toBe(false);

    expect(holdReason(cp(midnight), midnight + 60_000)).toBe('cycle-done');
    expect(isDue(cp(midnight), midday)).toBe(true);
  });

  it('I16. a cycle collects EVERY store, and each one stops on its own', async () => {
    /**
     * "Twice a day, both stores" is two properties, and this is the second: the
     * cycle gate is per source, so finishing Google's pass says nothing about
     * Apple's. One store going quiet must never stop the other being collected,
     * and one store with a backlog must not hold the other open.
     */
    const page = (id: string) => async () => ({ items: [gpReview({ reviewId: id })], nextToken: null });
    const backlog = async (token: string | null) => (token
      ? { items: [gpReview({ reviewId: 'as-2' })], nextToken: null }
      : { items: [gpReview({ reviewId: 'as-1' })], nextToken: 'p2' });

    const google = { source: 'google_play' as const, appId: APP, normalize: normalizeGooglePlay, fetchPage: page('gp-1') };
    const apple = { source: 'app_store' as const, appId: 'com.miden.bread', normalize: normalizeGooglePlay, fetchPage: backlog };

    const open = cycleStart(NOW);
    // Google finishes on its first tick. Apple needs two.
    expect((await runIngest(env.DB, google, open, { maxPages: 1 })).exhausted).toBe(true);
    expect((await runIngest(env.DB, apple, open + 300_000, { maxPages: 1 })).exhausted).toBe(false);

    // Google is done for this cycle and asks nobody again...
    const held = await runIngest(env.DB, google, open + 600_000, { maxPages: 1 });
    expect(held.ran).toBe(false);
    expect(held.skipped).toContain("cycle's pass is complete");

    // ...while Apple, in the same cycle, carries on to the end of its pass.
    const finished = await runIngest(env.DB, apple, open + 900_000, { maxPages: 1 });
    expect(finished).toMatchObject({ ran: true, exhausted: true, created: 1 });

    const gp = await loadCheckpoint(env.DB, `google_play:${APP}`);
    const as = await loadCheckpoint(env.DB, 'app_store:com.miden.bread');
    // Both collected, in the same cycle, each finishing when its own pass did.
    expect(cycleStart(gp!.last_pass_at!)).toBe(open);
    expect(cycleStart(as!.last_pass_at!)).toBe(open);
    expect(gp!.last_pass_at).not.toBe(as!.last_pass_at);

    // And now both are quiet until the next cycle opens.
    for (const src of [google, apple]) {
      expect((await runIngest(env.DB, src, open + 3 * 3_600_000, { maxPages: 1 })).ran).toBe(false);
    }
    expect((await runIngest(env.DB, google, open + CYCLE_PERIOD_MS, { maxPages: 1 })).ran).toBe(true);
  });

  it('I9. a wait Retry-After asks for is honoured, floored, capped, or ignored', () => {
    // Seconds and HTTP-dates are both in the spec and both are served.
    expect(retryAfterMs('900', NOW)).toBe(900_000);
    expect(retryAfterMs(new Date(NOW + 900_000).toUTCString(), NOW)).toBe(900_000);

    // Floored: a 429 answered three seconds later is how a sync stays rate
    // limited. A minute costs nothing against a 7-day window.
    expect(retryAfterMs('3', NOW)).toBe(MIN_DEFER_MS);
    expect(retryAfterMs(new Date(NOW - 60_000).toUTCString(), NOW)).toBe(MIN_DEFER_MS);

    // Capped at our own backoff ceiling: a number the STORE chose must not do
    // what checkpoint.ts refuses to do to itself.
    expect(retryAfterMs('999999', NOW)).toBe(MAX_DEFER_MS);
    expect(MAX_DEFER_MS).toBe(MAX_BACKOFF_MS);

    // Nothing usable is not a wait of zero.
    for (const header of [null, undefined, '', '   ', 'soon', '-5', '12.5']) {
      expect(retryAfterMs(header, NOW), JSON.stringify(header)).toBeNull();
    }
  });

  it('I10. a disposition is read from the response, never from the message', () => {
    // The message is written for a person and will be reworded; matching on it
    // is how classification quietly stops working.
    expect(dispositionOf(new Error('reviews.list failed (HTTP 429)'))).toEqual({ disposition: 'retry' });
    expect(dispositionOf(null)).toEqual({ disposition: 'retry' });

    expect(classifyGoogle(503, null, { error: { status: 'UNAVAILABLE' } }, NOW).disposition).toBe('retry');
    expect(classifyGoogle(429, null, null, NOW).disposition).toBe('defer');
    expect(classifyGoogle(403, null, { error: { status: 'PERMISSION_DENIED' } }, NOW).disposition).toBe('park');
    expect(classifyGoogle(401, null, null, NOW).disposition).toBe('park');
    // Google's 403 is overloaded: the reason code is the discriminator.
    expect(classifyGoogle(403, null, { error: { errors: [{ reason: 'quotaExceeded' }] } }, NOW).disposition).toBe('defer');
    expect(classifyGoogle(403, null, { error: { status: 'RESOURCE_EXHAUSTED' } }, NOW).disposition).toBe('defer');
    // A refused key surfaces at the token endpoint as a 400, not a 401.
    expect(classifyGoogle(400, null, { error: 'invalid_grant' }, NOW).disposition).toBe('park');
    expect(classifyGoogle(400, null, { error: { status: 'INVALID_ARGUMENT' } }, NOW).disposition).toBe('retry');

    expect(classifyApple(429, null, null, NOW).disposition).toBe('defer');
    expect(classifyApple(403, null, { errors: [{ code: 'FORBIDDEN_ERROR' }] }, NOW).disposition).toBe('park');
    expect(classifyApple(429, new Headers({ 'retry-after': '300' }), null, NOW).deferMs).toBe(300_000);
    expect(classifyApple(500, null, null, NOW).disposition).toBe('retry');
  });
});

/**
 * WHAT AN INTERRUPTED WRITE LEAVES BEHIND — and what the next run does about it.
 *
 * A review row and the original it was derived from are two writes. The
 * question is not whether a write can be interrupted, because it can: it is
 * whether the system converges afterwards. These pin both halves of the answer
 * — the batch that cannot commit half of a review, and the repair that runs on
 * every ordinary sync so a review missing its original gets it back.
 */
describe('a write that is interrupted part-way through', () => {
  const source = (fetchPage: any) => ({
    source: 'google_play' as const, appId: APP, fetchPage, normalize: normalizeGooglePlay,
  });

  /** env.DB, except that the FIRST batch commits and then reports a failure. */
  function commitsThenLosesTheAnswer(): D1Database {
    let tripped = false;
    return {
      prepare: (sql: string) => env.DB.prepare(sql),
      batch: async (stmts: D1PreparedStatement[]) => {
        const out = await env.DB.batch(stmts);
        if (!tripped) {
          tripped = true;
          throw new Error('D1_ERROR: network connection lost');
        }
        return out;
      },
    } as unknown as D1Database;
  }

  /** env.DB, except that no batch ever reaches the database. */
  const neverCommits = (): D1Database => ({
    prepare: (sql: string) => env.DB.prepare(sql),
    batch: async () => { throw new Error('D1_ERROR: network connection lost'); },
  } as unknown as D1Database);

  const counts = async () => ({
    reviews: (await env.DB.prepare('SELECT COUNT(*) AS n FROM store_reviews').first<{ n: number }>())?.n,
    versions: (await env.DB.prepare('SELECT COUNT(*) AS n FROM store_review_versions').first<{ n: number }>())?.n,
    events: (await env.DB.prepare('SELECT COUNT(*) AS n FROM store_review_events').first<{ n: number }>())?.n,
  });

  /** Every stored review has a version row for the payload it is holding. */
  async function invariantHolds(): Promise<void> {
    const orphans = await env.DB.prepare(
      `SELECT r.platform_review_id AS id FROM store_reviews r
        WHERE NOT EXISTS (SELECT 1 FROM store_review_versions v
                           WHERE v.store_review_id = r.store_review_id AND v.raw_hash = r.raw_hash)`
    ).all<{ id: string }>();
    expect(orphans.results.map((o) => o.id), 'reviews whose stored payload has no version row').toEqual([]);
  }

  it('I11. a write that commits and then loses the answer needs no repair, and the retry duplicates nothing', async () => {
    /**
     * THE CASE THE ATOMICITY IS FOR. The transaction reached the database and
     * committed; the response did not come back. The caller cannot tell that
     * from a write that never happened, so what matters is that it does not
     * have to: the review, its original and its arrival line all landed
     * together or not at all.
     */
    const page = async () => ({ items: [gpReview({ reviewId: 'commit-lost' })], nextToken: null });

    const interrupted = await runIngest(commitsThenLosesTheAnswer(), source(page), NOW);
    expect(interrupted.rejected).toBe(1);
    expect(interrupted.created).toBe(0);

    // All three rows are there. Nothing is half-written.
    expect(await counts()).toEqual({ reviews: 1, versions: 1, events: 1 });
    await invariantHolds();

    // The retry finds it complete, reports `unchanged`, and adds nothing —
    // not a second version row, and not a second arrival line.
    const retried = await runIngest(env.DB, source(page), NOW + 60_000, { force: true });
    expect(retried).toMatchObject({ unchanged: 1, created: 0, rejected: 0 });
    expect(await counts()).toEqual({ reviews: 1, versions: 1, events: 1 });

    const row = await rowOf('commit-lost');
    expect((await versionsOf(row.store_review_id)).results).toHaveLength(1);
    expect((await eventsOf(row.store_review_id)).results).toHaveLength(1);
    // And the clock still moved, so the sync is not stuck on it.
    expect(row.last_synced_at).toBe(NOW + 60_000);
  });

  it('I12. a write that never commits leaves nothing behind, and the next run creates it exactly once', async () => {
    const page = async () => ({ items: [gpReview({ reviewId: 'never-landed' })], nextToken: null });

    const lost = await runIngest(neverCommits(), source(page), NOW);
    expect(lost.rejected).toBe(1);
    // NOT a shell of a review. Before the write was one transaction, the row
    // could land without the original and nothing could put it back.
    expect(await counts()).toEqual({ reviews: 0, versions: 0, events: 0 });

    const retried = await runIngest(env.DB, source(page), NOW + 60_000, { force: true });
    expect(retried).toMatchObject({ created: 1, unchanged: 0, rejected: 0 });
    expect(await counts()).toEqual({ reviews: 1, versions: 1, events: 1 });
    await invariantHolds();
  });

  it('I12b. D1 really does roll a failed batch back — the assumption the rest of this rests on', async () => {
    // Asserted directly, because every claim above is only as good as this is.
    const before = await counts();
    await expect(env.DB.batch([
      env.DB.prepare(
        `INSERT INTO store_reviews
           (store_review_id, platform, source, app_id, platform_review_id, raw_json, raw_hash,
            first_seen_at, last_synced_at, review_created_at, review_state, reply_state,
            handoff_state, eligibility)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind('rollback-1', 'android', 'google_play', APP, 'rollback-1', '{}', 'h', NOW, NOW, NOW,
        'new', 'none', 'none', 'undecided'),
      // A foreign key that names no review: the row it points at does not exist.
      env.DB.prepare(
        `INSERT INTO store_review_versions (store_review_id, raw_hash, raw_json, rating, observed_at)
         VALUES (?,?,?,?,?)`
      ).bind('no-such-review', 'h', '{}', 3, NOW),
    ])).rejects.toThrow();

    expect(await counts()).toEqual(before);
    expect(await rowOf('rollback-1')).toBeNull();
  });

  it('I13. a review whose original is missing gets it back on the next ordinary sync', async () => {
    /**
     * CONVERGENCE, which is the half that atomicity cannot provide. However a
     * review came to be missing its original — a row written before this was
     * fixed, a commit whose outcome was never known, an operator deleting the
     * wrong thing — the next sync that sees it must put it back. It is the
     * only branch a review with a matching hash ever takes.
     */
    const page = async () => ({ items: [gpReview({ reviewId: 'orphaned' })], nextToken: null });
    await runIngest(env.DB, source(page), NOW);
    const row = await rowOf('orphaned');

    await env.DB.prepare('DELETE FROM store_review_versions WHERE store_review_id = ?')
      .bind(row.store_review_id).run();
    expect((await versionsOf(row.store_review_id)).results).toHaveLength(0);

    // An ordinary sync. The review has not changed, so this is the `unchanged`
    // branch doing the repair.
    const repaired = await runIngest(env.DB, source(page), NOW + 600_000, { force: true });
    expect(repaired).toMatchObject({ unchanged: 1, created: 0 });
    await invariantHolds();

    const versions = (await versionsOf(row.store_review_id)).results;
    expect(versions).toHaveLength(1);
    // The original as received, not a re-derivation: byte for byte what the
    // row holds, timed to when that payload was stored rather than to now.
    expect(versions[0].raw_json).toBe(row.raw_json);
    expect(versions[0].raw_hash).toBe(row.raw_hash);
    expect(versions[0].observed_at).toBe(NOW);

    // And it stays exactly one, however many times the sync comes round.
    for (const at of [NOW + 700_000, NOW + 800_000]) {
      await runIngest(env.DB, source(page), at, { force: true });
    }
    expect((await versionsOf(row.store_review_id)).results).toHaveLength(1);
    expect(await counts()).toEqual({ reviews: 1, versions: 1, events: 1 });
  });

  it('I14. an original that was never stored is rescued in the last moment before an edit overwrites it', async () => {
    /**
     * The worst ordering: the version row is missing AND the review is edited
     * upstream. The edit overwrites raw_json, which is the last copy of what
     * the reviewer actually wrote — after that it is gone from the system
     * entirely. So the repair runs BEFORE the UPDATE in the same transaction,
     * and both payloads end up on record.
     */
    const first = gpReview({ reviewId: 'edited-orphan', text: 'Private send fails every time.' });
    await runIngest(env.DB, source(async () => ({ items: [first], nextToken: null })), NOW);
    const row = await rowOf('edited-orphan');

    await env.DB.prepare('DELETE FROM store_review_versions WHERE store_review_id = ?')
      .bind(row.store_review_id).run();

    const edited = gpReview({ reviewId: 'edited-orphan', text: 'Fixed in 1.15.20 — thank you.' });
    const after = await runIngest(env.DB, source(async () => ({ items: [edited], nextToken: null })), NOW + 60_000, { force: true });
    expect(after).toMatchObject({ updated: 1, created: 0 });
    await invariantHolds();

    const versions = (await versionsOf(row.store_review_id)).results;
    expect(versions).toHaveLength(2);
    // The original first, as received, and the edit after it.
    expect(versions[0].raw_json).toContain('Private send fails every time.');
    expect(versions[0].observed_at).toBe(NOW);
    expect(versions[1].raw_json).toContain('Fixed in 1.15.20');
    expect(versions[1].observed_at).toBe(NOW + 60_000);

    // The human-facing row is the edit, and the audit trail says so.
    const updated = await rowOf('edited-orphan');
    expect(updated.review_body).toContain('Fixed in 1.15.20');
    const events = (await eventsOf(row.store_review_id)).results;
    expect(events.map((e: any) => e.detail)).toEqual(['first seen from google_play', 'edited upstream']);
  });
});

/**
 * TWO INVOCATIONS AT ONCE, against the same store and the same cursor.
 *
 * Cloudflare can deliver a cron tick while the previous one is still running,
 * and a retry is another. The cycle being derived from the clock says nothing
 * about this: it stops a second PASS opening beside an existing one, not two
 * runs walking the same one.
 *
 * The reviews are safe either way — upsertReview is idempotent and these tests
 * check that too — so what is at stake is the CHECKPOINT: the cursor walking
 * backwards, a pass memory losing the fingerprints a newer run added, and a
 * finished pass being reopened.
 */
describe('two runs at once', () => {
  const KEY = `google_play:${APP}`;
  const state = () => loadCheckpoint(env.DB, KEY);

  /** A fetcher whose page can be held open until the test lets it finish. */
  function heldPage(items: unknown[], nextToken: string | null) {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const fetchPage = async () => {
      await held;
      return { items, nextToken };
    };
    return { fetchPage, release };
  }

  const source = (fetchPage: any, runId?: string) => ({
    src: { source: 'google_play' as const, appId: APP, fetchPage, normalize: normalizeGooglePlay },
    opts: { maxPages: 1, force: true, ...(runId ? { newRunId: () => runId } : {}) },
  });

  /** Walk `n` pages to completion, so the test starts from a real mid-pass cursor. */
  const walk = async (at: number, from: number) => {
    const page = async (token: string | null) => {
      const offset = token ? Number(token) : from;
      return { items: [gpReview({ reviewId: `r${offset}` })], nextToken: String(offset + 1) };
    };
    const { src, opts } = source(page);
    return runIngest(env.DB, src, at, opts);
  };

  it('C1. a run overtaken by newer ones cannot walk the cursor backwards', async () => {
    await walk(NOW, 0);
    expect((await state())?.cursor).toBe('1');

    // The slow run reads cursor 1 and then hangs with its page open.
    const slow = heldPage([gpReview({ reviewId: 'slow' })], '2');
    const { src, opts } = source(slow.fetchPage, 'run-slow');
    const inFlight = runIngest(env.DB, src, NOW + 1000, opts);
    // Let it get past loadCheckpoint and its claim before anyone else starts.
    await new Promise((r) => setTimeout(r, 0));
    expect((await state())?.run_id).toBe('run-slow');

    // Two newer runs finish while it hangs, and take the pass to cursor 3.
    await walk(NOW + 2000, 1);
    await walk(NOW + 3000, 2);
    const ahead = await state();
    expect(ahead?.cursor).toBe('3');

    // Now the slow one completes. Its answer is stale: it would store 2.
    slow.release();
    const stale = await inFlight;
    expect(stale.created).toBe(1);        // its review WAS collected

    const after = await state();
    // The cursor did not move back, and the newer run still owns the row.
    expect(after?.cursor).toBe('3');
    expect(after?.run_id).not.toBe('run-slow');
    expect(after?.last_attempt_at).toBe(ahead?.last_attempt_at);

    // Nothing was lost: the stale run's review is stored, exactly once.
    const stored = await env.DB.prepare(
      'SELECT platform_review_id AS id FROM store_reviews ORDER BY id'
    ).all<{ id: string }>();
    expect(stored.results.map((r) => r.id)).toEqual(['r0', 'r1', 'r2', 'slow']);
  });

  it('C2. a stale run cannot reopen a pass another run has completed', async () => {
    await walk(NOW, 0);

    // The slow run reads a live cursor and hangs.
    const slow = heldPage([gpReview({ reviewId: 'late' })], '9');
    const { src, opts } = source(slow.fetchPage, 'run-late');
    const inFlight = runIngest(env.DB, src, NOW + 1000, opts);
    await new Promise((r) => setTimeout(r, 0));

    // A newer run reaches the end of the source: the pass COMPLETES.
    const done = source(async () => ({ items: [gpReview({ reviewId: 'last' })], nextToken: null }));
    await runIngest(env.DB, done.src, NOW + 2000, done.opts);
    const completed = await state();
    expect(completed?.cursor).toBeNull();
    expect(completed?.last_pass_at).toBe(NOW + 2000);
    expect(completed?.pass_started_at).toBeNull();

    // The stale run would store cursor 9 — a live cursor on a finished pass.
    slow.release();
    await inFlight;

    const after = await state();
    expect(after?.cursor).toBeNull();
    expect(after?.last_pass_at).toBe(NOW + 2000);
    // And the open-pass clock stays stopped, so coverage does not restart.
    expect(after?.pass_started_at).toBeNull();
    expect(cycleDone(after!, NOW + 3000)).toBe(true);
  });

  it('C3. the pass memory keeps what the newer runs added, not what the stale one read', async () => {
    /**
     * The quietest of the three. A stale run stores the pass memory as it was
     * when IT read the row, so the fingerprints the newer runs added would be
     * dropped — and the memory is what catches a paging cycle. The loss would
     * show up much later, as a cycle that went undetected.
     */
    await walk(NOW, 0);
    await walk(NOW + 1000, 1);
    const slow = heldPage([gpReview({ reviewId: 'stale-mem' })], '7');
    const { src, opts } = source(slow.fetchPage, 'run-mem');
    const inFlight = runIngest(env.DB, src, NOW + 2000, opts);
    await new Promise((r) => setTimeout(r, 0));

    await walk(NOW + 3000, 2);
    await walk(NOW + 4000, 3);
    const rich = parsePassTokens((await state())?.pass_tokens);
    expect(rich.length).toBeGreaterThanOrEqual(3);

    slow.release();
    await inFlight;

    const after = parsePassTokens((await state())?.pass_tokens);
    expect(after).toEqual(rich);
  });

  it('C4. two runs starting from the same cursor advance the pass once, not twice', async () => {
    // The simplest overlap, and the most likely: both read the same cursor,
    // both fetch the same page, both try to store its successor.
    await walk(NOW, 0);

    const a = heldPage([gpReview({ reviewId: 'same' })], '2');
    const b = heldPage([gpReview({ reviewId: 'same' })], '2');
    const runA = runIngest(env.DB, source(a.fetchPage, 'run-a').src, NOW + 1000, source(a.fetchPage, 'run-a').opts);
    await new Promise((r) => setTimeout(r, 0));
    const runB = runIngest(env.DB, source(b.fetchPage, 'run-b').src, NOW + 1001, source(b.fetchPage, 'run-b').opts);
    await new Promise((r) => setTimeout(r, 0));

    a.release(); b.release();
    await Promise.all([runA, runB]);

    const after = await state();
    // One advance, and it is the later claim's.
    expect(after?.cursor).toBe('2');
    expect(after?.run_id).toBe('run-b');
    // One row for the review both of them collected.
    const n = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM store_reviews WHERE platform_review_id = 'same'"
    ).first<{ n: number }>();
    expect(n?.n).toBe(1);
    const versions = await env.DB.prepare('SELECT COUNT(*) AS n FROM store_review_versions').first<{ n: number }>();
    expect(versions?.n).toBe(2);   // r0 and `same`, one original each
  });

  it('C5. a stale FAILURE cannot undo a newer run\'s progress either', async () => {
    // The failure paths write the checkpoint too: a stale recordFailure would
    // park the cursor on the page it was reading and count a failure against a
    // sync that is, by then, working.
    await walk(NOW, 0);

    let boom!: (e: Error) => void;
    const failing = new Promise<never>((_, reject) => { boom = reject; });
    const { src, opts } = source(() => failing, 'run-doomed');
    const inFlight = runIngest(env.DB, src, NOW + 1000, opts).catch(() => null);
    await new Promise((r) => setTimeout(r, 0));

    await walk(NOW + 2000, 1);
    const ahead = await state();

    boom(new Error('503 from Google'));
    await inFlight;

    const after = await state();
    expect(after?.cursor).toBe(ahead?.cursor);
    expect(after?.consecutive_failures).toBe(0);
    expect(after?.last_error).toBeNull();
  });
});

describe('a run that reads, waits, and only then claims', () => {
  const KEY = `google_play:${APP}`;
  const state = () => loadCheckpoint(env.DB, KEY);

  /** env.DB, with the claim statement held open until the test releases it. */
  function claimHeldOpen() {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const db = {
      prepare: (sql: string) => {
        const stmt = env.DB.prepare(sql);
        if (!sql.includes('consecutive_failures, updated_at, run_id')) return stmt;
        // beginAttempt: let the read happen, then wait before claiming.
        const wrap = (s: any): any => ({
          bind: (...a: unknown[]) => wrap(s.bind(...a)),
          run: async () => { await held; return s.run(); },
          first: async () => { await held; return s.first(); },
          all: async () => { await held; return s.all(); },
        });
        return wrap(stmt);
      },
      batch: (stmts: any[]) => env.DB.batch(stmts),
    } as unknown as D1Database;
    return { db, release };
  }

  const walk = async (at: number, from: number) => runIngest(
    env.DB,
    {
      source: 'google_play' as const, appId: APP, normalize: normalizeGooglePlay,
      fetchPage: async (token: string | null) => {
        const offset = token ? Number(token) : from;
        return { items: [gpReview({ reviewId: `w${offset}` })], nextToken: String(offset + 1) };
      },
    },
    at, { maxPages: 1, force: true }
  );

  it('C6. reading before another run finishes does not let it write that stale cursor', async () => {
    /**
     * THE ORDERING THE CLAIM ALONE DOES NOT COVER, and the reason the row this
     * run works from is the one it gets back FROM its claim rather than the one
     * it read a moment earlier.
     *
     *   A reads the checkpoint      cursor 1
     *   A waits
     *   B runs to completion        cursor 3
     *   A claims                    A now owns the row, legitimately — it is
     *                               the newest run, so the write guard passes
     *   A writes
     *
     * Guarding the write is not enough here: A's claim is the current one. What
     * saves it is that A's claim HANDS BACK the row, so A walks from cursor 3
     * and not from the 1 it read before waiting.
     */
    await walk(NOW, 0);
    expect((await state())?.cursor).toBe('1');

    const asked: Array<string | null> = [];
    const held = claimHeldOpen();
    const slow = runIngest(
      held.db,
      {
        source: 'google_play' as const, appId: APP, normalize: normalizeGooglePlay,
        fetchPage: async (token: string | null) => {
          asked.push(token);
          return { items: [gpReview({ reviewId: 'slow' })], nextToken: `${Number(token ?? 0) + 1}` };
        },
      },
      NOW + 1000, { maxPages: 1, force: true, newRunId: () => 'run-slow' }
    );
    await new Promise((r) => setTimeout(r, 0));

    // B takes the pass on while A is still waiting to claim.
    await walk(NOW + 2000, 1);
    await walk(NOW + 3000, 2);
    expect((await state())?.cursor).toBe('3');

    // Now A claims — as the newest run, so its write WILL be accepted.
    held.release();
    await slow;

    const after = await state();
    expect(after?.run_id).toBe('run-slow');
    // It asked for the page the row actually held, not the one it had read.
    expect(asked).toEqual(['3']);
    // So the cursor went forward, never back.
    expect(after?.cursor).toBe('4');
  });

  it('C7. a run that claims after another COMPLETED the pass does not start a new one', async () => {
    /**
     * The same ordering, with B finishing rather than advancing. A read a live
     * cursor; by the time it claims, the pass is done and the cycle with it.
     * Starting a fresh pass here would reopen a finished one — a live cursor on
     * a complete pass, the coverage clock restarted — and it would do it
     * holding a valid claim, so the write guard would allow every bit of it.
     *
     * The hold is therefore re-read against the CLAIMED row, not the one read
     * before waiting.
     */
    await walk(NOW, 0);

    const asked: Array<string | null> = [];
    const held = claimHeldOpen();
    const slow = runIngest(
      held.db,
      {
        source: 'google_play' as const, appId: APP, normalize: normalizeGooglePlay,
        fetchPage: async (token: string | null) => {
          asked.push(token);
          return { items: [gpReview({ reviewId: 'too-late' })], nextToken: '9' };
        },
      },
      NOW + 1000, { maxPages: 1, newRunId: () => 'run-late' }
    );
    await new Promise((r) => setTimeout(r, 0));

    // B finishes the pass, which finishes the cycle.
    await runIngest(
      env.DB,
      {
        source: 'google_play' as const, appId: APP, normalize: normalizeGooglePlay,
        fetchPage: async () => ({ items: [gpReview({ reviewId: 'final' })], nextToken: null }),
      },
      NOW + 2000, { maxPages: 1, force: true }
    );
    const completed = await state();
    expect(completed?.cursor).toBeNull();
    expect(completed?.last_pass_at).toBe(NOW + 2000);

    held.release();
    const late = await slow;

    // It claimed, found the cycle already done, and stopped without calling out.
    expect(late.ran).toBe(false);
    expect(late.skipped).toContain("cycle's pass is complete");
    expect(asked).toEqual([]);

    const after = await state();
    expect(after?.cursor).toBeNull();
    expect(after?.last_pass_at).toBe(NOW + 2000);
    expect(after?.pass_started_at).toBeNull();
    // The claim itself is honest about having happened.
    expect(after?.run_id).toBe('run-late');
    expect(after?.last_attempt_at).toBe(NOW + 1000);
  });
});
