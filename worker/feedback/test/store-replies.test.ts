/**
 * Phase 6, second half — the reply actions and the sender, against simulated
 * stores. No real store is ever contacted: every outbound request goes through
 * a fake that answers the way the documented endpoints do.
 *
 * The properties that matter most, because each would put the wrong words in
 * public under Bread Wallet's name or misreport what happened:
 *   RS1       switched off, nothing is sent and nothing moves
 *   RS5/RS10  an outcome the store did not confirm is "Delivery unconfirmed",
 *             never "Not sent", and is never resent without checking first
 *   RS6/RS7   the store's current reply is checked before every send; a reply
 *             we did not write or know about is never overwritten
 *   RS12      two senders racing publish once
 *   RS14      after a send the store never confirmed, no message says nothing was sent
 *   RA2/RA6   an action needs the CSRF token, and applies only to the reply the
 *             person was looking at
 *   RA11      no console action talks to a store
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { callWorker, installFetchStub, recordedCalls, restoreFetch, route, runCron, seedAdmin, seedStoreReview,
  adminCookie, adminCsrf, ADMIN_EMAIL, withEnv } from './helpers';
import { runReplyAction, runReplySender, SEND_LEASE_MS, PENDING_RECHECK_MS, MAX_SEND_ATTEMPTS } from '../src/store/reply-flow';
import { parseReplyError, replyPanel } from '../src/store/reply-panel';
import { STORE_PHASES, STORE_TICK_MS, storePhases, phaseFor } from '../src/store/cron';
import { STORE_CRON } from '../src/crons';

const BASE = 'https://mfv2.test';
const NOW = Date.parse('2026-09-15T08:00:00Z');
const PKG = 'com.miden.wallet';
const GP_HOST = 'androidpublisher.googleapis.com';
const AS_HOST = 'api.appstoreconnect.apple.com';

let gpKey = '';
let asKey = '';
const b64 = (u: Uint8Array) => { let s = ''; for (const b of u) s += String.fromCharCode(b); return btoa(s); };
const pem = (der: ArrayBuffer) =>
  `-----BEGIN PRIVATE KEY-----\n${b64(new Uint8Array(der)).match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`;

beforeAll(async () => {
  installFetchStub();
  const rsa = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  gpKey = JSON.stringify({ type: 'service_account', project_id: 'p', private_key_id: 'k',
    private_key: pem(await crypto.subtle.exportKey('pkcs8', rsa.privateKey) as ArrayBuffer),
    client_email: 'replies@p.iam.gserviceaccount.com' });
  const ec = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  asKey = pem(await crypto.subtle.exportKey('pkcs8', ec.privateKey) as ArrayBuffer);
});

beforeEach(async () => {
  await seedAdmin();
  for (const t of ['store_review_events', 'store_review_versions', 'store_review_replies', 'store_reviews']) {
    await env.DB.prepare(`DELETE FROM ${t}`).run();
  }
});
afterEach(() => { restoreFetch(); installFetchStub(); });

const senderEnv = (over: Record<string, string> = {}) => ({
  DB: env.DB, STORE_REPLY_ENABLED: 'true', GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: gpKey,
  APPLE_ASC_KEY_ID: 'T3STK3Y9QX', APPLE_ASC_ISSUER_ID: '57246542-96fe-1a63-e053-0824d011072a', APPLE_ASC_PRIVATE_KEY: asKey,
  ...over,
});

// ---- simulated stores ------------------------------------------------------

type Answer = Response | 'throw' | 'timeout';
interface FakeStore {
  calls: Array<{ method: string; url: URL; body: any }>;
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
}

/** Google Play: token, reviews.get (the reply it holds now), reviews.reply. */
function fakeGoogle(opts: { current?: () => Answer; reply?: (text: string) => Answer } = {}): FakeStore {
  const calls: FakeStore['calls'] = [];
  let live: string | null = null;
  const fetch = async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body).startsWith('{') ? String(init.body) : '{}') : null;
    calls.push({ method, url, body });
    const answer = (a: Answer) => {
      if (a === 'throw') throw new TypeError('network');
      if (a === 'timeout') { const e = new Error('t'); e.name = 'TimeoutError'; throw e; }
      return a;
    };
    if (url.host === 'oauth2.googleapis.com') return Response.json({ access_token: 'ya29.t', expires_in: 3599 });
    if (url.host === GP_HOST && method === 'GET') {
      if (opts.current) return answer(opts.current());
      return Response.json({ reviewId: 'gp-1', comments: [
        { userComment: { text: 'Fails', starRating: 2, lastModified: { seconds: '1788000000' } } },
        ...(live ? [{ developerComment: { text: live, lastModified: { seconds: '1788300000' } } }] : []),
      ] });
    }
    if (url.host === GP_HOST && method === 'POST' && url.pathname.endsWith(':reply')) {
      if (opts.reply) return answer(opts.reply(body.replyText));
      live = body.replyText;
      return Response.json({ result: { replyText: body.replyText, lastEdited: { seconds: '1788300000', nanos: 0 } } });
    }
    throw new Error(`unexpected ${method} ${input}`);
  };
  return { calls, fetch };
}

/** App Store Connect: the review's response, and creating one. */
function fakeApple(opts: { state?: 'PUBLISHED' | 'PENDING_PUBLISH'; current?: () => Answer } = {}): FakeStore & { publish(): void; drop(): void } {
  const calls: FakeStore['calls'] = [];
  let live: { text: string; state: string } | null = null;
  const resource = () => ({ data: { type: 'customerReviewResponses', id: 'resp-1',
    attributes: { responseBody: live!.text, lastModifiedDate: '2026-09-15T08:00:00Z', state: live!.state } } });
  const fetch = async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ method, url, body });
    if (url.host !== AS_HOST) throw new Error(`unexpected ${input}`);
    if (method === 'GET') {
      if (opts.current) { const a = opts.current(); if (a === 'throw') throw new TypeError('n'); return a as Response; }
      return live ? Response.json(resource()) : Response.json({ errors: [{ code: 'NOT_FOUND' }] }, { status: 404 });
    }
    live = { text: body.data.attributes.responseBody, state: opts.state ?? 'PENDING_PUBLISH' };
    return Response.json(resource(), { status: 201 });
  };
  return { calls, fetch, publish: () => { live!.state = 'PUBLISHED'; }, drop: () => { live = null; } };
}

// ---- fixtures --------------------------------------------------------------

async function review(over: Record<string, unknown> = {}) {
  return seedStoreReview({ platform_review_id: 'gp-1', review_state: 'awaiting_review', ...over });
}

async function reply(reviewId: string, over: Record<string, unknown> = {}): Promise<string> {
  const id = (over.reply_id as string) ?? crypto.randomUUID();
  const f = { body: 'Thanks, a fix is coming.', source: 'human', state: 'approved', created_at: NOW - 60_000,
    created_by: ADMIN_EMAIL, approved_at: NOW - 30_000, approved_by: ADMIN_EMAIL, published_at: null,
    external_state: null, attempts: 0, next_attempt_at: null, last_error: null, ...over };
  await env.DB.prepare(
    `INSERT INTO store_review_replies (reply_id, store_review_id, body, source, state, created_at, created_by,
       approved_at, approved_by, published_at, external_state, attempts, next_attempt_at, last_error)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, reviewId, f.body, f.source, f.state, f.created_at, f.created_by, f.approved_at, f.approved_by,
    f.published_at, f.external_state, f.attempts, f.next_attempt_at, f.last_error).run();
  if (over.current !== false) {
    await env.DB.prepare('UPDATE store_reviews SET current_reply_id = ?, reply_state = ? WHERE store_review_id = ?')
      .bind(id, f.state === 'draft' ? 'drafted' : f.state, reviewId).run();
  }
  return id;
}

const row = (id: string) => env.DB.prepare('SELECT * FROM store_review_replies WHERE reply_id = ?').bind(id).first<any>();
const rev = (id: string) => env.DB.prepare('SELECT reply_state, current_reply_id FROM store_reviews WHERE store_review_id = ?').bind(id).first<any>();
const posts = (s: FakeStore) => s.calls.filter((c) => c.method === 'POST' && c.url.host !== 'oauth2.googleapis.com');

async function post(path: string, fields: Record<string, string>, csrf = true) {
  const form = new FormData();
  if (csrf) form.set('csrf', await adminCsrf());
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return callWorker(new Request(`${BASE}${path}`, { method: 'POST', body: form, headers: { cookie: await adminCookie() } }));
}

// ---- the human half ----------------------------------------------------------

describe('reply actions in the console', () => {
  it('RA1. saving a draft creates it, points the review at it, and records who', async () => {
    const id = await review();
    const res = await post(`/admin/store/${id}/reply/draft`, { reply_id: '', body: '  Thanks for the report.  ' });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`/admin/store/${id}#reply`);
    const r = await rev(id);
    expect(r.reply_state).toBe('drafted');
    const d = await row(r.current_reply_id);
    expect(d).toMatchObject({ state: 'draft', body: 'Thanks for the report.', created_by: ADMIN_EMAIL });
    const ev = await env.DB.prepare("SELECT detail, actor FROM store_review_events WHERE store_review_id = ? AND kind = 'reply'").bind(id).first<any>();
    expect(ev).toEqual({ detail: 'Draft saved', actor: ADMIN_EMAIL });
  });

  it('RA2. no CSRF token, no change; signed out, no change', async () => {
    const id = await review();
    expect((await post(`/admin/store/${id}/reply/draft`, { reply_id: '', body: 'x' }, false)).status).toBe(403);
    const form = new FormData(); form.set('csrf', await adminCsrf()); form.set('body', 'x'); form.set('reply_id', '');
    expect((await callWorker(new Request(`${BASE}/admin/store/${id}/reply/draft`, { method: 'POST', body: form }))).status).toBe(403);
    expect((await rev(id)).current_reply_id).toBeNull();
  });

  it('RA3. the limit is enforced on the server: empty and over-long replies are refused', async () => {
    const id = await review();
    const empty = await post(`/admin/store/${id}/reply/draft`, { reply_id: '', body: '   ' });
    expect(empty.status).toBe(400);
    expect(await empty.text()).toContain('Write a reply before saving.');
    // 351 characters as a person counts them; the emoji would be 702 UTF-16 units.
    const long = await post(`/admin/store/${id}/reply/draft`, { reply_id: '', body: '👋'.repeat(351) });
    expect(long.status).toBe(400);
    expect(await long.text()).toContain('Up to 350 characters.');
    expect((await post(`/admin/store/${id}/reply/draft`, { reply_id: '', body: '👋'.repeat(350) })).status).toBe(303);
  });

  it('RA4. approving locks the submitted text and records the approver; the same form cannot act twice', async () => {
    const id = await review();
    const d = await reply(id, { state: 'draft', approved_at: null, approved_by: null });
    const res = await post(`/admin/store/${id}/reply/approve`, { reply_id: d, body: 'Final text.' });
    expect(res.status).toBe(303);
    expect(await row(d)).toMatchObject({ state: 'approved', body: 'Final text.', approved_by: ADMIN_EMAIL });
    expect((await rev(id)).reply_state).toBe('approved');

    for (const act of ['approve', 'draft']) {
      const again = await post(`/admin/store/${id}/reply/${act}`, { reply_id: d, body: 'Sneaky edit.' });
      expect(again.status).toBe(409);
      expect(await again.text()).toContain('This reply changed since the page loaded. Reload to see the latest.');
    }
    expect((await row(d)).body).toBe('Final text.');
  });

  it('RA5. an action on a reply that is no longer the current one is refused', async () => {
    const id = await review();
    const old = await reply(id, { state: 'draft', current: false });
    await reply(id, { state: 'draft' });
    expect((await post(`/admin/store/${id}/reply/approve`, { reply_id: old, body: 'x' })).status).toBe(409);
    expect((await row(old)).state).toBe('draft');
  });

  it('RA6. changing an approved reply supersedes it and starts a draft with the same text', async () => {
    const id = await review();
    const a = await reply(id, { state: 'approved', body: 'Approved words.' });
    expect((await post(`/admin/store/${id}/reply/change`, { reply_id: a })).status).toBe(303);
    expect((await row(a)).state).toBe('superseded');
    const r = await rev(id);
    expect(r.current_reply_id).not.toBe(a);
    expect(await row(r.current_reply_id)).toMatchObject({ state: 'draft', body: 'Approved words.' });
    expect(r.reply_state).toBe('drafted');
  });

  it('RA7. discarding a draft falls back to the reply that is still live', async () => {
    const id = await review();
    const live = await reply(id, { state: 'published', published_at: NOW - 1000, current: false });
    const d = await reply(id, { state: 'draft' });
    expect((await post(`/admin/store/${id}/reply/discard`, { reply_id: d })).status).toBe(303);
    expect(await row(d)).toBeNull();
    expect(await rev(id)).toEqual({ reply_state: 'published', current_reply_id: live });

    // A review answered outside the console keeps its "published" badge when a draft is dropped.
    const outside = await review({ platform_review_id: 'gp-4', raw_json: JSON.stringify({ reviewId: 'gp-4', comments: [
      { userComment: { text: 'Hi' } }, { developerComment: { text: 'From Play Console.' } }] }) });
    const d3 = await reply(outside, { state: 'draft' });
    expect((await post(`/admin/store/${outside}/reply/discard`, { reply_id: d3 })).status).toBe(303);
    expect(await rev(outside)).toEqual({ reply_state: 'published', current_reply_id: null });

    const bare = await review({ platform_review_id: 'gp-2' });
    const d2 = await reply(bare, { state: 'draft' });
    await post(`/admin/store/${bare}/reply/discard`, { reply_id: d2 });
    expect(await rev(bare)).toEqual({ reply_state: 'none', current_reply_id: null });
  });

  it('RA8. editing a live reply starts a draft and leaves the live one published', async () => {
    const id = await review();
    const live = await reply(id, { state: 'published', published_at: NOW - 1000, body: 'Live words.' });
    expect((await post(`/admin/store/${id}/reply/edit`, { reply_id: live })).status).toBe(303);
    expect((await row(live)).state).toBe('published');
    const r = await rev(id);
    expect(await row(r.current_reply_id)).toMatchObject({ state: 'draft', body: 'Live words.' });

    // A reply written outside the console is edited from the stored original.
    const outside = await review({ platform_review_id: 'gp-3', reply_state: 'published', raw_json: JSON.stringify({
      reviewId: 'gp-3', comments: [{ userComment: { text: 'Hi', starRating: 5 } },
        { developerComment: { text: 'Written in Play Console.', lastModified: { seconds: '1788000000' } } }] }) });
    expect((await post(`/admin/store/${outside}/reply/edit`, { reply_id: '' })).status).toBe(303);
    expect(await row((await rev(outside)).current_reply_id)).toMatchObject({ state: 'draft', body: 'Written in Play Console.' });
  });

  it('RA9. retry puts a failed reply back in the queue; check brings an unconfirmed one forward', async () => {
    const id = await review();
    const f = await reply(id, { state: 'failed', attempts: 2, last_error: 'x' });
    expect((await post(`/admin/store/${id}/reply/retry`, { reply_id: f })).status).toBe(303);
    expect(await row(f)).toMatchObject({ state: 'approved', attempts: 0, last_error: null });

    const id2 = await review({ platform_review_id: 'gp-2' });
    const u = await reply(id2, { state: 'unconfirmed', next_attempt_at: NOW + 999_999 });
    const before = Date.now();
    expect((await post(`/admin/store/${id2}/reply/check`, { reply_id: u })).status).toBe(303);
    const after = await row(u);
    expect(after.state).toBe('unconfirmed');
    expect(after.next_attempt_at).toBeGreaterThanOrEqual(before);
  });

  it('RA10. only POST reaches an action, and only a known action', async () => {
    const id = await review();
    const get = await callWorker(new Request(`${BASE}/admin/store/${id}/reply/draft`, { headers: { cookie: await adminCookie() } }));
    expect(get.status).toBe(404);
    expect((await post(`/admin/store/${id}/reply/publish-now`, { reply_id: '' })).status).toBe(404);
  });

  it('RA11. no console action talks to a store, even with sending switched on', async () => {
    await withEnv({ STORE_REPLY_ENABLED: 'true', GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: gpKey }, async () => {
      const id = await review();
      await post(`/admin/store/${id}/reply/draft`, { reply_id: '', body: 'Draft.' });
      const d = (await rev(id)).current_reply_id;
      await post(`/admin/store/${id}/reply/approve`, { reply_id: d, body: 'Draft.' });
      await post(`/admin/store/${id}/reply/change`, { reply_id: d });
    });
    expect(recordedCalls()).toHaveLength(0);
  });

  it('RA12. a save refused because someone else changed the reply keeps what was typed, escaped', async () => {
    const id = await review();
    await reply(id, { state: 'draft', body: 'Their words.' });
    for (const act of ['draft', 'approve']) {
      const res = await post(`/admin/store/${id}/reply/${act}`, { reply_id: crypto.randomUUID(), body: '<b>My words</b>' });
      expect(res.status).toBe(409);
      const page = await res.text();
      expect(page).toContain('This reply changed since the page loaded. Reload to see the latest.');
      expect(page).toContain('What you typed (not saved)');
      expect(page).toContain('&lt;b&gt;My words&lt;/b&gt;');
      expect(page).not.toContain('<b>My words</b>');
      expect(page).toContain('Their words.');
    }
    // Only for a refused save: not for other refusals, and not when nothing was typed.
    const empty = await post(`/admin/store/${id}/reply/draft`, { reply_id: '', body: '  ' });
    expect(await empty.text()).not.toContain('What you typed');
    const discard = await post(`/admin/store/${id}/reply/discard`, { reply_id: crypto.randomUUID(), body: 'x' });
    expect(discard.status).toBe(409);
    expect(await discard.text()).not.toContain('What you typed');
  });
});

// ---- the sender half ---------------------------------------------------------

describe('the reply sender, against simulated stores', () => {
  it('RS1. switched off: skipped, no request, no row moves', async () => {
    const id = await review();
    const a = await reply(id);
    const g = fakeGoogle();
    const out = await runReplySender({ ...senderEnv(), STORE_REPLY_ENABLED: 'false' }, NOW, g.fetch);
    expect(out.skipped).toBe('STORE_REPLY_ENABLED is not "true"');
    expect(g.calls).toHaveLength(0);
    expect((await row(a)).state).toBe('approved');
  });

  it('RS2. Google: checks first, sends once, and the reply is published — replacing the one it supersedes', async () => {
    const id = await review();
    const old = await reply(id, { state: 'published', published_at: NOW - 5000, body: 'Old words.', current: false });
    const a = await reply(id, { body: 'New words.' });
    const g = fakeGoogle({ current: () => Response.json({ reviewId: 'gp-1', comments: [
      { userComment: { text: 'Fails', starRating: 2 } }, { developerComment: { text: 'Old words.' } }] }) });
    await runReplySender(senderEnv(), NOW, g.fetch);
    const methods = g.calls.filter((c) => c.url.host === GP_HOST).map((c) => c.method);
    expect(methods).toEqual(['GET', 'POST']);
    expect(posts(g)[0].url.pathname).toBe(`/androidpublisher/v3/applications/${PKG}/reviews/gp-1:reply`);
    expect(posts(g)[0].body).toEqual({ replyText: 'New words.' });
    expect(await row(a)).toMatchObject({ state: 'published', published_at: 1_788_300_000_000, attempts: 1 });
    expect((await row(old)).state).toBe('superseded');
    expect((await rev(id)).reply_state).toBe('published');
  });

  it('RS3. a store refusal is a confirmed "not sent", quoting the store', async () => {
    const id = await review();
    const a = await reply(id);
    const g = fakeGoogle({ reply: () => Response.json({ error: { status: 'PERMISSION_DENIED' } }, { status: 403 }) });
    await runReplySender(senderEnv(), NOW, g.fetch);
    const r = await row(a);
    expect(r.state).toBe('failed');
    expect(parseReplyError(r.last_error)).toEqual({ by: 'store', text: 'HTTP 403, PERMISSION_DENIED' });
    expect(replyPanel({ review: { store_review_id: id, source: 'google_play' }, current: r, history: [r],
      storeReply: null, csrf: 't', sendingEnabled: true }))
      .toContain('Not sent · 1 attempt');
    const panel = replyPanel({ review: { store_review_id: id, source: 'google_play' }, current: r, history: [r],
      storeReply: null, csrf: 't', sendingEnabled: true });
    expect(panel).toContain('Google Play said: HTTP 403, PERMISSION_DENIED');
  });

  it('RS4. a rate limit waits without spending an attempt', async () => {
    const id = await review();
    const a = await reply(id);
    await runReplySender(senderEnv(), NOW, fakeGoogle({ reply: () => new Response('', { status: 429 }) }).fetch);
    const r = await row(a);
    expect(r).toMatchObject({ state: 'approved', attempts: 0 });
    expect(r.next_attempt_at).toBeGreaterThan(NOW);
  });

  it('RS5. an unanswered send is "Delivery unconfirmed" — never "not sent", never resent blindly', async () => {
    for (const answer of ['throw', 'timeout', new Response('', { status: 503 }), new Response('', { status: 408 })] as Answer[]) {
      for (const t of ['store_review_events', 'store_review_replies', 'store_reviews']) {
        await env.DB.prepare(`DELETE FROM ${t}`).run();
      }
      const id = await review();
      const a = await reply(id);
      const g = fakeGoogle({ reply: () => answer });
      await runReplySender(senderEnv(), NOW, g.fetch);
      const r = await row(a);
      expect(r.state, String(answer)).toBe('unconfirmed');
      expect(parseReplyError(r.last_error)?.by).toBe('console');
      expect(parseReplyError(r.last_error)?.text, String(answer)).toMatch(
        /^(No answer from Google Play: the (request timed out|connection failed)\.|Google Play answered HTTP (503|408)\.)$/);
      expect((await rev(id)).reply_state).toBe('unconfirmed');

      // Due again: the next tick CHECKS and does not POST.
      const again = fakeGoogle({ current: () => Response.json({ reviewId: 'gp-1', comments: [
        { userComment: { text: 'Fails', starRating: 2 } }, { developerComment: { text: 'Thanks, a fix is coming.' } }] }) });
      await runReplySender(senderEnv(), r.next_attempt_at, again.fetch);
      expect(posts(again)).toHaveLength(0);
      expect((await row(a)).state).toBe('published');
    }
  });

  it('RS6. an unconfirmed reply the store does not have goes back to be sent — after the same check', async () => {
    const id = await review();
    const u = await reply(id, { state: 'unconfirmed', attempts: 1, next_attempt_at: NOW });
    const g = fakeGoogle();
    await runReplySender(senderEnv(), NOW, g.fetch);
    expect(posts(g)).toHaveLength(0);
    // The check found no matching reply, and says only that; the attempt stays unconfirmed.
    expect(await row(u)).toMatchObject({ state: 'approved', external_state: 'UNCONFIRMED' });
    const checked = await env.DB.prepare("SELECT detail FROM store_review_events WHERE store_review_id = ? ORDER BY id DESC").bind(id).first<any>();
    expect(checked.detail).toBe('Checked Google Play: this reply was not found, so it will be tried again');
    await runReplySender(senderEnv(), NOW, g.fetch);
    expect(g.calls.filter((c) => c.url.host === GP_HOST).map((c) => c.method)).toEqual(['GET', 'GET', 'POST']);
    expect((await row(u)).state).toBe('published');

    // And one where a different, unknown reply is live now: stop, do not send.
    const id2 = await review({ platform_review_id: 'gp-2' });
    const u2 = await reply(id2, { state: 'unconfirmed', next_attempt_at: NOW });
    const other = fakeGoogle({ current: () => Response.json({ reviewId: 'gp-2', comments: [
      { userComment: { text: 'x' } }, { developerComment: { text: 'Someone else wrote this.' } }] }) });
    await runReplySender(senderEnv(), NOW, other.fetch);
    expect(posts(other)).toHaveLength(0);
    const r2 = await row(u2);
    expect(r2).toMatchObject({ state: 'failed', external_state: 'UNCONFIRMED' });
    expect(parseReplyError(r2.last_error)?.text)
      .toBe('Google Play shows a different reply now. No further attempt was made. Delivery remains unconfirmed.');
  });

  it('RS7. a reply live on the store that we did not write or know about is never overwritten', async () => {
    const id = await review();
    const a = await reply(id);
    const g = fakeGoogle({ current: () => Response.json({ reviewId: 'gp-1', comments: [
      { userComment: { text: 'Fails' } }, { developerComment: { text: 'Written in Play Console today.' } }] }) });
    await runReplySender(senderEnv(), NOW, g.fetch);
    expect(posts(g)).toHaveLength(0);
    const r = await row(a);
    expect(r.state).toBe('failed');
    expect(parseReplyError(r.last_error)).toEqual({ by: 'console', text: 'Google Play shows a different reply now, so this one was not sent.' });

    // The outside reply we DID know about — it is in the stored original — may be replaced.
    const known = await review({ platform_review_id: 'gp-2', raw_json: JSON.stringify({ reviewId: 'gp-2', comments: [
      { userComment: { text: 'x' } }, { developerComment: { text: 'Known outside reply.' } }] }) });
    const k = await reply(known);
    const g2 = fakeGoogle({ current: () => Response.json({ reviewId: 'gp-2', comments: [
      { userComment: { text: 'x' } }, { developerComment: { text: 'Known outside reply.' } }] }) });
    await runReplySender(senderEnv(), NOW, g2.fetch);
    expect(posts(g2)).toHaveLength(1);
    expect((await row(k)).state).toBe('published');
  });

  it('RS8. a review Google does not return cannot be checked, so nothing is sent', async () => {
    const id = await review();
    const a = await reply(id);
    const g = fakeGoogle({ current: () => new Response('', { status: 404 }) });
    await runReplySender(senderEnv(), NOW, g.fetch);
    expect(posts(g)).toHaveLength(0);
    expect(parseReplyError((await row(a)).last_error)?.text)
      .toBe('Google Play did not return this review, so its current reply could not be checked. '
        + 'This can happen when a review has not been written or changed in the last week. Nothing was sent.');

    // Unconfirmed and not returned: stays unconfirmed, nothing sent, and says why it cannot tell.
    const id2 = await review({ platform_review_id: 'gp-2' });
    const u = await reply(id2, { state: 'unconfirmed', attempts: 1, next_attempt_at: NOW });
    const g2 = fakeGoogle({ current: () => new Response('', { status: 404 }) });
    await runReplySender(senderEnv(), NOW, g2.fetch);
    expect(posts(g2)).toHaveLength(0);
    const r = await row(u);
    expect(r.state).toBe('unconfirmed');
    expect(parseReplyError(r.last_error)?.text).toBe('Google Play did not return this review, so delivery could not be confirmed. '
      + 'This can happen when a review has not been written or changed in the last week.');
  });

  it('RS16. with sending on, Send says it queues; the page then shows waiting, sent to Apple and published only as each happens', async () => {
    const id = await review({ platform: 'ios', platform_review_id: 'as-9', app_id: 'com.miden.bread' });
    const page = async () => (await callWorker(new Request(`${BASE}/admin/store/${id}`,
      { headers: { cookie: await adminCookie() } }))).text();
    const on = <T>(fn: () => Promise<T>) => withEnv({ STORE_REPLY_ENABLED: 'true' }, fn);

    let html = await on(page);
    expect(html).toContain('formaction="/admin/store/' + id + '/reply/send">Send</button>');
    expect(html).toContain('This approves and queues your reply for public posting on the App Store. It will be sent exactly as written.');
    expect(html).not.toContain('Approve reply');

    expect((await on(() => post(`/admin/store/${id}/reply/send`, { reply_id: '', body: 'Thanks, fixed in 1.16.' }))).status).toBe(303);
    const { current_reply_id: replyId } = await rev(id);
    // Queued: approved and waiting. Nothing claims it was sent.
    html = await on(page);
    expect(html).toContain('Waiting to send.');
    for (const claim of ['Sent, waiting for Apple', 'Published on the App Store', 'Reply published']) expect(html).not.toContain(claim);

    // The sender sends: Apple accepted it, not yet public.
    const apple = fakeApple();
    const t0 = Date.now();
    await runReplySender(senderEnv(), t0, apple.fetch);
    expect((await row(replyId)).state).toBe('pending_publish');
    html = await on(page);
    expect(html).toContain('Sent, waiting for Apple');
    expect(html).not.toContain('Published on the App Store');

    // Apple publishes: published.
    apple.publish();
    await runReplySender(senderEnv(), t0 + PENDING_RECHECK_MS + 1, apple.fetch);
    html = await on(page);
    expect(html).toContain('Published on the App Store');
  });

  it('RS9. Apple: sent is "waiting for Apple" until Apple publishes; not published is not "not sent"', async () => {
    const id = await review({ platform: 'ios', platform_review_id: 'as-1', app_id: 'com.miden.bread' });
    const a = await reply(id, { body: 'Thanks!' });
    const apple = fakeApple();
    await runReplySender(senderEnv(), NOW, apple.fetch);
    expect(apple.calls.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
      'GET /v1/customerReviews/as-1/response', 'POST /v1/customerReviewResponses']);
    expect(apple.calls[1].body).toEqual({ data: { type: 'customerReviewResponses', attributes: { responseBody: 'Thanks!' },
      relationships: { review: { data: { type: 'customerReviews', id: 'as-1' } } } } });
    expect(await row(a)).toMatchObject({ state: 'pending_publish', external_id: 'resp-1', external_state: 'PENDING_PUBLISH' });
    expect((await rev(id)).reply_state).toBe('pending_publish');

    // Not yet due: nothing. Due and still pending: nothing moves. Published: published.
    await runReplySender(senderEnv(), NOW + 1000, apple.fetch);
    expect(apple.calls).toHaveLength(2);
    await runReplySender(senderEnv(), NOW + PENDING_RECHECK_MS, apple.fetch);
    expect((await row(a)).state).toBe('pending_publish');
    apple.publish();
    await runReplySender(senderEnv(), NOW + 2 * PENDING_RECHECK_MS + 1, apple.fetch);
    expect((await row(a)).state).toBe('published');

    // Accepted and then not published by Apple: failed, "Not published".
    const id2 = await review({ platform: 'ios', platform_review_id: 'as-2', app_id: 'com.miden.bread' });
    const b = await reply(id2, { body: 'Hello' });
    const apple2 = fakeApple();
    await runReplySender(senderEnv(), NOW, apple2.fetch);
    apple2.drop();
    await runReplySender(senderEnv(), NOW + PENDING_RECHECK_MS, apple2.fetch);
    const r = await row(b);
    expect(r.state).toBe('failed');
    const html = replyPanel({ review: { store_review_id: id2, source: 'app_store' }, current: r, history: [r],
      storeReply: null, csrf: 't', sendingEnabled: true });
    expect(html).toContain('Not published · 1 attempt');
    expect(html).toContain('The App Store no longer has this reply.');
    expect(html).not.toContain('said: The App Store');
    const last = await env.DB.prepare("SELECT detail FROM store_review_events WHERE store_review_id = ? ORDER BY id DESC").bind(id2).first<any>();
    expect(last.detail).toBe('Checked the App Store: this reply was not found');
  });

  it('RS10. a send interrupted mid-flight is reclaimed as unconfirmed, and checked before any resend', async () => {
    const id = await review();
    const p = await reply(id, { state: 'publishing', attempts: 1, next_attempt_at: NOW - 1 });
    const g = fakeGoogle({ current: () => Response.json({ reviewId: 'gp-1', comments: [{ userComment: { text: 'Fails' } }] }) });
    await runReplySender(senderEnv(), NOW, g.fetch);
    // Reclaimed, then — being due — checked in the same tick: the store has
    // nothing, so it is queued to be sent, not sent.
    expect(posts(g)).toHaveLength(0);
    expect(await row(p)).toMatchObject({ state: 'approved', external_state: 'UNCONFIRMED' });
    const details = (await env.DB.prepare("SELECT detail FROM store_review_events WHERE store_review_id = ? ORDER BY id").bind(id).all<any>())
      .results.map((e: any) => e.detail);
    expect(details).toEqual(['Delivery unconfirmed: sending was interrupted', 'Checked Google Play: this reply was not found, so it will be tried again']);
    // A claim still inside its lease is left alone.
    const id2 = await review({ platform_review_id: 'gp-2' });
    const q = await reply(id2, { state: 'publishing', next_attempt_at: NOW + SEND_LEASE_MS });
    await runReplySender(senderEnv(), NOW, fakeGoogle().fetch);
    expect((await row(q)).state).toBe('publishing');
  });

  it('RS11. a credential that fails before any request waits and retries, then stops as not sent', async () => {
    const id = await review();
    const a = await reply(id);
    const bad = senderEnv({ GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: '{"not":"a key"}' });
    const g = fakeGoogle();
    let t = NOW;
    for (let i = 0; i < MAX_SEND_ATTEMPTS; i++) {
      await runReplySender(bad, t, g.fetch);
      t = (await row(a)).next_attempt_at ?? t;
    }
    expect(g.calls.filter((c) => c.url.host === GP_HOST)).toHaveLength(0);
    const r = await row(a);
    expect(r.state).toBe('failed');
    expect(parseReplyError(r.last_error)?.text).toMatch(/^Stopped after 5 attempts\. Nothing was sent\. /);
  });

  it('RS14. after a send the store never confirmed, no later message says nothing was sent', async () => {
    const earlier = { state: 'approved', external_state: 'UNCONFIRMED', attempts: 1 };
    const cases: Array<[string, Record<string, unknown>, () => Answer, string]> = [
      ['not returned', earlier, () => new Response('', { status: 404 }),
        'Google Play did not return this review, so its current reply could not be checked. '
        + 'This can happen when a review has not been written or changed in the last week. '
        + 'No further attempt was made. Delivery remains unconfirmed.'],
      ['different reply', earlier, () => Response.json({ reviewId: 'gp-1', comments: [
        { userComment: { text: 'x' } }, { developerComment: { text: 'Someone else wrote this.' } }] }),
        'Google Play shows a different reply now. No further attempt was made. Delivery remains unconfirmed.'],
      ['last attempt', { ...earlier, attempts: MAX_SEND_ATTEMPTS - 1 }, () => 'throw',
        'Stopped after 5 attempts. No further attempt was made. Delivery remains unconfirmed. '
        + 'Could not check Google Play: the connection failed.'],
    ];
    for (const [name, fixture, current, text] of cases) {
      for (const t of ['store_review_events', 'store_review_replies', 'store_reviews']) await env.DB.prepare(`DELETE FROM ${t}`).run();
      const id = await review();
      const a = await reply(id, fixture);
      const g = fakeGoogle({ current });
      await runReplySender(senderEnv(), NOW, g.fetch);
      expect(posts(g), name).toHaveLength(0);
      const r = await row(a);
      expect(r.state, name).toBe('failed');
      expect(parseReplyError(r.last_error)?.text, name).toBe(text);
      const html = replyPanel({ review: { store_review_id: id, source: 'google_play' }, current: r, history: [r],
        storeReply: null, csrf: 't', sendingEnabled: true });
      expect(html, name).toMatch(/Delivery unconfirmed · \d attempts?/);
      expect(html, name).not.toMatch(/[Nn]ot sent|Nothing was sent/);
    }
  });

  it('RS15. a reply of ours the store may have taken can be replaced by the reply that follows it', async () => {
    const id = await review();
    await reply(id, { state: 'superseded', body: 'First words.', external_state: 'UNCONFIRMED', current: false });
    const b = await reply(id, { body: 'Second words.' });
    const g = fakeGoogle({ current: () => Response.json({ reviewId: 'gp-1', comments: [
      { userComment: { text: 'x' } }, { developerComment: { text: 'First words.' } }] }) });
    await runReplySender(senderEnv(), NOW, g.fetch);
    expect(posts(g)).toHaveLength(1);
    expect(posts(g)[0].body).toEqual({ replyText: 'Second words.' });
    expect((await row(b)).state).toBe('published');
  });

  it('RS12. two senders racing claim once, and the store sees one reply', async () => {
    const id = await review();
    const a = await reply(id);
    const g = fakeGoogle();
    await Promise.all([runReplySender(senderEnv(), NOW, g.fetch), runReplySender(senderEnv(), NOW, g.fetch)]);
    expect(posts(g)).toHaveLength(1);
    expect((await row(a)).state).toBe('published');
  });
});

describe('the rotor', () => {
  it('RS13. switched off, the reply phase does not exist; switched on, it takes its own slot', async () => {
    expect(storePhases({ STORE_REPLY_ENABLED: 'false' })).toBe(STORE_PHASES);
    const on = storePhases({ STORE_REPLY_ENABLED: 'true' });
    expect(on.map((p) => p.name)).toEqual(['sync:google_play', 'sync:app_store', 'replies']);
    expect([6, 7, 8].map((n) => phaseFor(n * STORE_TICK_MS, on).name)).toEqual(['sync:google_play', 'sync:app_store', 'replies']);

    // End to end through the cron trigger, on the replies slot, against the stub.
    const id = await review();
    const a = await reply(id, { body: 'Via cron.' });
    route({ match: (u) => u.host === 'oauth2.googleapis.com', respond: () => Response.json({ access_token: 't', expires_in: 3599 }) });
    route({ match: (u, m) => u.host === GP_HOST && m === 'GET',
      respond: () => Response.json({ reviewId: 'gp-1', comments: [{ userComment: { text: 'Fails' } }] }) });
    route({ match: (u, m) => u.host === GP_HOST && m === 'POST',
      respond: () => Response.json({ result: { replyText: 'Via cron.', lastEdited: { seconds: '1788300000' } } }) });
    await withEnv({ STORE_REPLY_ENABLED: 'true', GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: gpKey }, () => runCron(STORE_CRON, 8 * STORE_TICK_MS));
    expect((await row(a)).state).toBe('published');

    // And with the shipped switch, the same slot is a sync slot: no reply goes anywhere.
    const b = await reply(await review({ platform_review_id: 'gp-9' }));
    restoreFetch(); installFetchStub();
    await runCron(STORE_CRON, 8 * STORE_TICK_MS);
    expect((await row(b)).state).toBe('approved');
    expect(recordedCalls()).toHaveLength(0);
  });
});
