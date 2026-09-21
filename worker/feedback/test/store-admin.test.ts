/**
 * Phase 0 — the Store Reviews pages and the console shell they share.
 *
 * Two things are being pinned here, and they are different in kind.
 *
 * The first is the NEW surface: the Android and iOS pages render, they render
 * attacker-controlled text inertly, and a review the secret scanner flagged is
 * never shown. A store review is a stranger's text in a public listing — it
 * gets exactly the treatment a submitted report gets, and that has to be true
 * from the first commit rather than added once there is real data to lose.
 *
 * The second is the BOUNDARY. Phase 0 added tables, a nav group and two pages,
 * and none of it may touch the feedback form's pipeline. The tests at the end
 * assert the negative: no submissions row appears, and an unrecognised cron
 * does nothing rather than quietly running the drain a second time.
 */
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import {
  callWorker, installFetchStub, restoreFetch, runCron, runDrain,
  mockClassifier, mockCreateIssue, resetGlobalGate,
  seedStoreReview, seedSubmission, countSubmissions, seedAdmin, adminHeaders,
} from './helpers';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });

/**
 * REQUIRED, not tidiness. D1 does not roll back between tests in this pool —
 * the same fact review.test.ts records about Durable Object storage — so a row
 * one test seeds is still there for the next one. SR5 and SR6 assert opposite
 * things about whether a sync has ever succeeded, and `--sequence.shuffle`
 * duly failed SR5 when it ran second. Clearing both store tables makes every
 * test in this file start from the state it actually describes.
 */
beforeEach(async () => {
  await seedAdmin();
  await env.DB.prepare('DELETE FROM store_reviews').run();
  await env.DB.prepare('DELETE FROM store_sync_state').run();
});

const BASE = 'https://mfv2.test';
/** Signed in — /admin/* has required a session since 2026-09-02. */
const get = async (path: string) => callWorker(new Request(`${BASE}${path}`, {
  method: 'GET', headers: await adminHeaders(),
}));

describe('store reviews — the pages exist and are reachable', () => {
  it('SR1. /admin/store defaults to Android rather than erroring', async () => {
    const res = await get('/admin/store');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Android — Google Play');
  });

  it('SR2. each platform renders its own page', async () => {
    const android = await get('/admin/store?platform=android');
    const ios = await get('/admin/store?platform=ios');
    expect(android.status).toBe(200);
    expect(ios.status).toBe(200);
    expect(await android.text()).toContain('Android — Google Play');
    expect(await ios.text()).toContain('iOS — Apple App Store');
  });

  it('SR3. an unknown platform falls back instead of reaching SQL or the page', async () => {
    const res = await get("/admin/store?platform=' OR 1=1--");
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/store?platform=android');
  });

  it('SR4. a path under /admin/store that is not a page is a 404, not a fallthrough', async () => {
    const res = await get('/admin/store/anything');
    expect(res.status).toBe(404);
  });
});

describe('store reviews — the empty state tells the truth', () => {
  it('SR5. with no sync ever, it says collection has not started', async () => {
    const html = await (await get('/admin/store?platform=ios')).text();
    // "No reviews" and "not collecting" are opposite situations. The first is
    // good news; the second is an outage wearing its clothes.
    expect(html).toContain('Not collecting yet');
    expect(html).not.toContain('No reviews to show');
  });

  it('SR6. once a sync has succeeded, the same emptiness reads as good news', async () => {
    await env.DB.prepare(
      `INSERT INTO store_sync_state (key, last_success_at, consecutive_failures, updated_at)
       VALUES (?,?,0,?)`
    ).bind('app_store:6789341854', Date.now(), Date.now()).run();

    const html = await (await get('/admin/store?platform=ios')).text();
    expect(html).toContain('No reviews to show');
    expect(html).not.toContain('Not collecting yet');
  });
});

describe('store reviews — rendering safety', () => {
  it('SR7. a review full of markup renders as text, never as markup', async () => {
    await seedStoreReview({
      platform: 'android',
      review_title: '<script>alert(1)</script>',
      review_body: '<img src=x onerror=alert(2)> and "\'&',
      reviewer_name: '<b>not bold</b>',
    });

    const html = await (await get('/admin/store?platform=android')).text();
    // Assert on what a browser would actually parse, not on the source string.
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
    expect(html).toContain('&quot;&#39;&amp;');
    expect(html).toContain('&lt;b&gt;not bold&lt;/b&gt;');
  });

  it('SR8. a review the secret scanner flagged is never rendered', async () => {
    const secret = 'abandon abandon abandon abandon abandon abandon ability';
    await seedStoreReview({
      platform: 'android',
      review_title: secret,
      review_body: `my seed is ${secret} please help`,
      secret_scan_status: 'flagged',
    });

    const html = await (await get('/admin/store?platform=android')).text();
    // The scanner runs at sync precisely so the material is not copied onto a
    // second screen. Not the body, and not the title either — a title is just
    // a shorter place to paste the same thing.
    expect(html).not.toContain(secret);
    expect(html).not.toContain('abandon abandon');
    expect(html).toContain('[redacted');
  });

  it('SR9. the page allows exactly one script, by a fresh nonce, and nothing inline', async () => {
    const res = await get('/admin/store?platform=android');
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("base-uri 'none'");
    // The script directive is a nonce and nothing else: no 'unsafe-inline', no
    // 'unsafe-eval', no host. default-src 'none' still covers connect-src.
    const directive = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src')) ?? '';
    const nonce = directive.match(/^script-src 'nonce-([0-9a-f]{32})'$/)?.[1];
    expect(nonce, directive).toBeTruthy();
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('connect-src');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
    // One script tag: the served file, carrying that nonce, with no inline body.
    const tags = [...(await res.text()).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(tags).toHaveLength(1);
    expect(tags[0][1]).toContain(`nonce="${nonce}"`);
    expect(tags[0][1]).toContain('src="/admin/store/review.js"');
    expect(tags[0][2]).toBe('');
    // A nonce that repeats is a nonce an attacker can learn.
    const again = (await get('/admin/store?platform=android')).headers.get('content-security-policy') ?? '';
    expect(again).not.toContain(nonce!);
  });

  it('SR10. a platform page shows only its own platform', async () => {
    await seedStoreReview({ platform: 'android', review_body: 'ANDROID-ONLY-MARKER' });
    await seedStoreReview({ platform: 'ios', source: 'app_store', review_body: 'IOS-ONLY-MARKER' });

    const android = await (await get('/admin/store?platform=android')).text();
    const ios = await (await get('/admin/store?platform=ios')).text();
    expect(android).toContain('ANDROID-ONLY-MARKER');
    expect(android).not.toContain('IOS-ONLY-MARKER');
    expect(ios).toContain('IOS-ONLY-MARKER');
    expect(ios).not.toContain('ANDROID-ONLY-MARKER');
  });

  it('SR10b. opposite verdicts do not render as the same badge', async () => {
    // Caught by looking at a screenshot, not by a test: every review_state was
    // rendering amber, so "Actionable" and "Not actionable" — opposite calls
    // about the same review — were indistinguishable at a glance. The badge is
    // the fastest thing on a card and it only earns that if it distinguishes.
    await seedStoreReview({ platform: 'android', review_state: 'actionable' });
    await seedStoreReview({ platform: 'android', review_state: 'not_actionable' });

    const html = await (await get('/admin/store?platform=android')).text();
    expect(html).toContain('class="badge b-actionable">Actionable<');
    expect(html).toContain('class="badge b-queued">Not actionable<');
  });

  it('SR10c. a person\'s labels are qualified apart from the labels; the AI\'s are not shown', async () => {
    await seedStoreReview({ platform: 'android', human_labels: '["ux_issue"]', review_body: 'PERSON' });
    await seedStoreReview({ platform: 'android', ai_labels: '["bug"]', review_body: 'AI-ONLY' });
    const html = await (await get('/admin/store?platform=android')).text();
    expect(html).toContain('<span class="chips-by">Labels</span><span class="tag">ux_issue</span>');
    expect(html).not.toContain('Your labels');
    expect(html).not.toContain('AI suggests');
    expect(html).not.toContain('<span class="tag">bug</span>');
  });
});

describe('the console shell — one rail, three groups, same everywhere', () => {
  /** The order in the brief. Not alphabetical, and not the order they were built. */
  const ORDER = ['Store Reviews', 'Delivery', 'Spam Review'];

  function railOrder(html: string): string[] {
    return ORDER
      .map((label) => [label, html.indexOf(`>${label}`)] as const)
      .filter(([, i]) => i >= 0)
      .sort((a, b) => a[1] - b[1])
      .map(([label]) => label);
  }

  it('SR11. the store page shows all three groups in the brief’s order', async () => {
    const html = await (await get('/admin/store?platform=android')).text();
    expect(railOrder(html)).toEqual(ORDER);
  });

  it('SR12. the EXISTING review queue shows the same rail, unchanged otherwise', async () => {
    const id = await seedStoreReview({ platform: 'android' });
    expect(id).toBeTruthy();
    const sub = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });

    const html = await (await get('/admin/review?q=suspected')).text();
    // The rail gained a group; the page still does its own job.
    expect(railOrder(html)).toEqual(ORDER);
    expect(html).toContain(sub);
    expect(html).toContain('Release');
    // And its actions carry a CSRF token now — the same reversal tests 38/38b
    // record. Asserted positively so a half-migration that renders the field
    // without the server checking it does not read as protection.
    expect(html).toContain('name="csrf"');
  });

  it('SR13. the rail counts only reviews still waiting on a human', async () => {
    await seedStoreReview({ platform: 'android', review_state: 'awaiting_review' });
    await seedStoreReview({ platform: 'android', review_state: 'new' });
    // Decided. It must not keep adding to a number that means "waiting on you".
    await seedStoreReview({ platform: 'android', review_state: 'not_actionable' });

    const html = await (await get('/admin/store?platform=android')).text();
    // The exact anchor, not "a 2 somewhere after the label" — the Delivery and
    // Spam counts render further down the same string and would satisfy that.
    expect(html).toContain('Android — Google Play<span class="n">2</span>');
    // The iOS row has none of them, and a zero is dimmed rather than absent.
    expect(html).toContain('iOS — Apple App Store<span class="n zero">0</span>');
  });
});

describe('the boundary — Phase 0 cannot reach the feedback pipeline', () => {
  it('SR14. rendering store pages writes no submissions row', async () => {
    const before = await countSubmissions();
    await seedStoreReview({ platform: 'android' });
    await get('/admin/store?platform=android');
    await get('/admin/store?platform=ios');
    await get('/admin/store');
    expect(await countSubmissions()).toBe(before);
  });

  it('SR15b. the drain still runs on the cron it IS registered for', async () => {
    // The other half of the pair. SR15 pins that an unknown schedule does
    // nothing; without this one, "does nothing" would also be satisfied by a
    // dispatch that had stopped draining altogether.
    await resetGlobalGate();
    mockClassifier({ verdict: 'new' });
    mockCreateIssue(9910);
    const id = await seedSubmission({ state: 'received' });

    await runDrain();

    const row = await env.DB.prepare('SELECT state FROM submissions WHERE submission_id = ?')
      .bind(id).first<{ state: string }>();
    expect(row?.state).not.toBe('received');
  });

  it('SR15. an unrecognised cron does nothing — it does not run the drain', async () => {
    // The regression this pins: `scheduled()` used to treat every cron that
    // was not the mirror's as the drain. Adding the store sync trigger would
    // have silently run the drain a second time, on a second schedule, and
    // the symptom would have looked like the publish caps closing early.
    //
    // `*/5` IS that trigger now (store-google-play.test.ts pins what it does),
    // so this fires a schedule nothing is registered for.
    const id = await seedSubmission({ state: 'received' });

    await runCron('0 3 * * *');

    const row = await env.DB.prepare('SELECT state FROM submissions WHERE submission_id = ?')
      .bind(id).first<{ state: string }>();
    expect(row?.state).toBe('received');
  });
});
