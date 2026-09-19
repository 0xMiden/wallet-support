/**
 * Plan §10 tests 30-42 — the review queue (Phase 6).
 *
 * ACCESS IS OPEN by Ivan's decision of 2026-08-25: no token, no session, no
 * CSRF. The authorization tests that used to live here are gone because the
 * thing they tested is gone. Test 38 now pins the OPPOSITE property, so that
 * if a credential ever reappears on this page it is because someone chose it,
 * not because a refactor quietly reinstated one.
 *
 * What survives is everything that is still true and still matters: the page
 * renders attacker-controlled text, so no submitter text may reach it as
 * markup; an attachment is resolved from the ROW, never from the URL; and
 * confirmed spam still needs two separate actions to become publishable.
 */
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  callWorker, runDrain, installFetchStub, restoreFetch, mockClassifier, mockCreateIssue,
  seedSubmission, getSubmission, getStateLog, resetGlobalGate,
  seedAdmin, adminHeaders, adminCsrf, ADMIN_EMAIL,
} from './helpers';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });
beforeEach(async () => { await resetGlobalGate(); await seedAdmin(); });

const BASE = 'https://mfv2.test';

/** Every request here is made by a signed-in admin, as of 2026-09-02. */
async function get(path: string) {
  return callWorker(new Request(`${BASE}${path}`, {
    method: 'GET', headers: await adminHeaders(),
  }));
}

/** The same request with NO session, for the tests that pin the gate. */
function getSignedOut(path: string) {
  return callWorker(new Request(`${BASE}${path}`, { method: 'GET' }));
}

/**
 * A signed-in POST, carrying the CSRF token the page would have put in the
 * form. Both halves are required now: the session says who, the token says the
 * request came from our own page.
 */
async function post(path: string, fields: Record<string, string> = {}) {
  const form = new FormData();
  form.set('csrf', await adminCsrf());
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return callWorker(new Request(`${BASE}${path}`, {
    method: 'POST', body: form,
    headers: { 'cf-connecting-ip': '203.0.113.9', cookie: (await adminHeaders()).cookie },
  }));
}

describe('review — the gate', () => {
  /**
   * 38 and 38b are REVERSED, on purpose.
   *
   * They used to pin that this page took no credential — written that way so a
   * refactor could not quietly reinstate one. That decision held while the
   * repository was private and one person used it; the repository is public and
   * the team is bigger, so on 2026-09-02 it was reversed deliberately. The
   * tests keep their numbers and now pin the opposite, so the reversal is
   * visible rather than a deletion.
   */
  it('38. signed out, the queue is a sign-in page and nothing else', async () => {
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });

    const queue = await getSignedOut('/admin/review?q=suspected');
    const html = await queue.text();
    expect(html).toContain('Continue with Google');
    // The reports themselves must not be on the page a signed-out visitor sees.
    expect(html).not.toContain(id);
    expect(html).not.toContain('Release');
  });

  it('38b. a signed-out action changes nothing, and does not bounce to a form', async () => {
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });

    const res = await callWorker(new Request(
      `${BASE}/admin/review/${id}/release`, { method: 'POST', body: new FormData() }));
    // 403, not a redirect to the sign-in page: bouncing a POST would discard
    // what it was submitting and look like the button did nothing.
    expect(res.status).toBe(403);
    expect((await getSubmission(id)).state).toBe('suspected_spam');
  });

  it('38c. a signed-in reviewer sees the queue and can act', async () => {
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });

    const queue = await get('/admin/review?q=suspected');
    expect(queue.status).toBe(200);
    expect(await queue.text()).toContain(id);

    const res = await post(`/admin/review/${id}/release`);
    expect(res.status).toBe(303);
    expect((await getSubmission(id)).state).toBe('received');
  });

  it('38d. a removed reviewer is out immediately, not when their cookie expires', async () => {
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });
    // Same valid, unexpired cookie throughout — only the allowlist changes.
    await seedAdmin(ADMIN_EMAIL, { disabled_at: Date.now() });

    const queue = await get('/admin/review?q=suspected');
    expect(await queue.text()).toContain('Continue with Google');

    const res = await post(`/admin/review/${id}/release`);
    expect(res.status).toBe(403);
    expect((await getSubmission(id)).state).toBe('suspected_spam');
  });

  it('38e. an action without the CSRF token is refused', async () => {
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });

    // A valid session, but the form token is missing — the shape of a
    // cross-site POST from a page that could not read our markup.
    const res = await callWorker(new Request(`${BASE}/admin/review/${id}/release`, {
      method: 'POST', body: new FormData(),
      headers: { cookie: (await adminHeaders()).cookie },
    }));
    expect(res.status).toBe(403);
    expect((await getSubmission(id)).state).toBe('suspected_spam');
  });

  it('42. attachments render through the proxy, never as a public URL', async () => {
    const stored = JSON.stringify({
      key: 'attachments/x/shot.png', name: 'shot.png', type: 'image/png',
      size: 4, githubUrl: 'https://github.example/leaked.png',
      r2Url: 'https://r2.example/leaked.png', video: false,
    });
    const id = await seedSubmission({
      state: 'suspected_spam', spam_status: 'suspected', attachment_keys: JSON.stringify([stored]),
    });

    const html = await (await get('/admin/review?q=suspected')).text();
    // The page is open, but the R2 and GitHub URLs still must not appear in it:
    // those are durable links that keep working after the report is dealt with
    // and outlive anyone's knowledge of this page.
    expect(html).toContain(`/admin/review/attachment/${id}/shot.png`);
    expect(html).not.toContain('r2.example');
    expect(html).not.toContain('github.example');
  });

  it('42b. the proxy will not serve an attachment belonging to another submission', async () => {
    const other = JSON.stringify({ key: 'attachments/secret/other.png', name: 'other.png', type: 'image/png', size: 1, githubUrl: null, r2Url: null, video: false });
    await seedSubmission({ state: 'suspected_spam', attachment_keys: JSON.stringify([other]) });
    const mine = await seedSubmission({ state: 'suspected_spam', attachment_keys: '[]' });

    // The R2 key comes from the ROW, never the URL, so naming someone else's
    // file selects nothing rather than reaching it.
    for (const name of ['other.png', '../secret/other.png', '..%2Fsecret%2Fother.png']) {
      const res = await get(`/admin/review/attachment/${mine}/${encodeURIComponent(name)}`);
      expect(res.status, name).toBe(404);
    }
  });
});

describe('review — actions', () => {
  it('40. records who acted on a release, and writes its own audit row', async () => {
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });

    const res = await post(`/admin/review/${id}/release`);
    expect(res.status).toBe(303);

    const row = await getSubmission(id);
    expect(row.state).toBe('received');
    expect(row.spam_status).toBe('clean');
    // With no session there is no identity to record. The request IP is all
    // that is known, and the audit row says exactly that rather than inventing
    // an actor.
    expect(row.spam_reviewed_by).toBe(`user:${ADMIN_EMAIL}`);
    expect(row.spam_reviewed_at).toBeGreaterThan(0);

    // 36 — every review action writes its own state_log row.
    const log = await getStateLog(id);
    expect(log[log.length - 1]).toMatchObject({ from_state: 'suspected_spam', to_state: 'received' });
    expect(log[log.length - 1].detail).toContain('review:release');
  });

  it('30. a released report re-enters the pipeline and publishes', async () => {
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });
    await post(`/admin/review/${id}/release`);

    mockClassifier();
    mockCreateIssue(4400);
    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    expect(row.published_issue).toBe(4400);
  });

  it('33/34. confirmed spam needs TWO separate actions to become publishable', async () => {
    const id = await seedSubmission({ state: 'spam', spam_status: 'spam' });

    // No route offers a one-step path, and asking for one directly is refused.
    // Openness does not widen the state machine: `spam -> received` is absent
    // from ALLOWED_EDGES, so it stays impossible for anyone at all.
    const direct = await post(`/admin/review/${id}/release`);
    expect(direct.status).toBe(409);
    expect((await getSubmission(id)).state).toBe('spam');

    // The page offers Restore and nothing else.
    const spamHtml = await (await get('/admin/review?q=spam')).text();
    expect(spamHtml).toContain('Restore for review');
    expect(spamHtml).not.toContain('>Release<');

    // Step one: restore. Still gated -- 'suspected', not 'clean'.
    await post(`/admin/review/${id}/restore`);
    let row = await getSubmission(id);
    expect(row.state).toBe('suspected_spam');
    expect(row.spam_status).toBe('suspected');

    // 32 — still not drain-eligible after a restore.
    mockClassifier();
    mockCreateIssue(4401);
    await runDrain();
    expect((await getSubmission(id)).state).toBe('suspected_spam');

    // Step two, a separate action, before it can publish.
    await post(`/admin/review/${id}/release`);
    row = await getSubmission(id);
    expect(row.state).toBe('received');
    expect(row.spam_status).toBe('clean');
  });

  it('36b. confirm writes its own audit row too', async () => {
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });

    await post(`/admin/review/${id}/confirm`);

    const row = await getSubmission(id);
    expect(row.state).toBe('spam');
    expect(row.spam_status).toBe('spam');
    expect((await getStateLog(id)).pop().detail).toContain('review:confirm');
  });

  it('37. a quarantined row shows the redaction and offers no action', async () => {
    const id = await seedSubmission({
      state: 'quarantined', body_sanitized: '[redacted — secret material detected]',
    });

    const html = await (await get('/admin/review?q=quarantined')).text();
    expect(html).toContain('[redacted');
    expect(html).toContain('No actions available');
    expect(html).not.toContain('>Release<');
    expect(html).not.toContain('>Restore for review<');
  });
});

describe('review — rendering safety', () => {
  it('35. renders a body containing markup as text, never as markup', async () => {
    const nasty = `<script>alert(1)</script><img src=x onerror=alert(2)>"'&`;
    const id = await seedSubmission({
      state: 'suspected_spam', spam_status: 'suspected', body_sanitized: nasty,
    });

    const html = await (await get('/admin/review?q=suspected')).text();

    // The danger is an unescaped TAG, not the attribute text -- the escaped
    // form legitimately contains the substring `onerror=alert(2)` as inert
    // characters inside a <pre>. Assert on what a browser would actually parse.
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
    // Quotes and ampersands escaped too, or an attribute could be broken out of.
    expect(html).toContain('&quot;&#39;&amp;');
    expect(html).toContain(id);
  });

  it('35b. sends headers that neutralise the page even if escaping failed', async () => {
    const res = await get('/admin/review?q=suspected');

    const csp = res.headers.get('content-security-policy') ?? '';
    // No script can run at all -- the page has none, so this costs nothing and
    // makes an escaping bug unexploitable rather than merely unlikely.
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toContain('script-src');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    // Unpublished user reports must not sit in any cache.
    expect(res.headers.get('cache-control')).toContain('no-store');
    // Not a control -- it gates nobody. With the page open it is the only
    // thing keeping held reports out of a search index.
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
  });

  it('43. every queue carries its own count, and the open one is marked current', async () => {
    const a = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });
    const b = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });
    await seedSubmission({ state: 'spam', spam_status: 'spam' });

    const html = await (await get('/admin/review?q=spam')).text();

    // aria-current, not a colour alone -- the active queue has to be announced.
    expect(html).toMatch(/<a class="q" href="\/admin\/review\?q=spam" aria-current="page">/);
    expect(html).not.toMatch(/href="\/admin\/review\?q=suspected" aria-current/);

    // Counts come from a grouped query over the WHOLE table, so the Suspected
    // entry still reports its backlog while the Spam queue is the one rendered.
    // Asserted as a floor, not an equality: D1 rows do not roll back between
    // tests, so an exact number here would only be measuring test order.
    const suspectedCount = html.match(/Suspected<span class="n(?: zero)?">(\d+)<\/span>/);
    expect(suspectedCount, 'Suspected count').not.toBeNull();
    expect(Number(suspectedCount![1])).toBeGreaterThanOrEqual(2);

    // ...and the two suspected reports are NOT rendered while viewing Spam.
    expect(html).not.toContain(a);
    expect(html).not.toContain(b);
  });

  it('43b. an empty queue explains itself instead of saying nothing', async () => {
    // "Nothing here" reads identically whether the filter caught nothing all
    // week or everything has been dealt with. Those are opposite situations.
    const html = await (await get('/admin/review?q=failed')).text();
    expect(html).toContain('Nothing failed');
    expect(html).toContain('every retry');
    expect(html).not.toContain('Nothing here.');
  });

  it('35d. queues are listed separately so spam cannot bury a false positive', async () => {
    const suspected = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });
    const confirmed = await seedSubmission({ state: 'spam', spam_status: 'spam' });

    const sHtml = await (await get('/admin/review?q=suspected')).text();
    expect(sHtml).toContain(suspected);
    expect(sHtml).not.toContain(confirmed);

    const cHtml = await (await get('/admin/review?q=spam')).text();
    expect(cHtml).toContain(confirmed);
    expect(cHtml).not.toContain(suspected);
  });
});
