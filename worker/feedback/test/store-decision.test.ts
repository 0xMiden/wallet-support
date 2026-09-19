/**
 * Phase 5 — a person's decision on a store review, and the handoff into the
 * existing pipeline. GitHub and the classifier are simulated; no issue is ever
 * filed anywhere real.
 *
 * The properties that matter most:
 *   DH3       eligibility is refused unless the review is actionable, carries a
 *             pipeline label and was not flagged — on a direct POST too
 *   DH6       switched off, no submissions row is written, whatever is posted
 *   DH7       a handoff writes the report /submit would, with spam released
 *             and nothing the flood check can count
 *   DH8       two clicks at once write one submission
 *   DH9/DH10  an ineligible, flagged or secret-carrying review never enters
 *   DH11      a review edited after its decision waits for a new decision
 *   DH13      the drain files it like any other report, and the spam model
 *             cannot park it
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import {
  callWorker, installFetchStub, restoreFetch, seedAdmin, seedStoreReview, adminCookie, adminCsrf, ADMIN_EMAIL,
  withEnv, runDrain, mockClassifier, mockCreateIssue, mockCreateComment, getSubmission, getStateLog, resetGlobalGate,
  seedSubmission, seedMirrorIssue, recordedCalls,
} from './helpers';
import { runHandoff, HANDOFF_LEASE_MS, MSG } from '../src/store/decision';

const BASE = 'https://mfv2.test';
const ON = { STORE_HANDOFF_ENABLED: 'true' };

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });
beforeEach(async () => {
  await seedAdmin();
  await resetGlobalGate();
  for (const t of ['store_review_events', 'store_review_versions', 'store_review_replies', 'store_reviews']) {
    await env.DB.prepare(`DELETE FROM ${t}`).run();
  }
  // Only the reports this suite wrote, so a drain run here sees none of the last test's.
  const mine = "reporter_kind = 'store' OR reporter_key LIKE 'dh-%'";
  await env.DB.prepare(`DELETE FROM state_log WHERE submission_id IN (SELECT submission_id FROM submissions WHERE ${mine})`).run();
  await env.DB.prepare(`DELETE FROM submissions WHERE ${mine}`).run();
});

async function post(path: string, fields: Array<[string, string]>, csrf = true) {
  const form = new FormData();
  if (csrf) form.set('csrf', await adminCsrf());
  for (const [k, v] of fields) form.append(k, v);
  return callWorker(new Request(`${BASE}${path}`, { method: 'POST', body: form, headers: { cookie: await adminCookie() } }));
}

const review = (id: string) => env.DB.prepare('SELECT * FROM store_reviews WHERE store_review_id = ?').bind(id).first<any>();
const events = async (id: string, kind: string) => ((await env.DB.prepare(
  'SELECT detail, actor FROM store_review_events WHERE store_review_id = ? AND kind = ? ORDER BY id').bind(id, kind).all<any>()).results);
const page = async (id: string) => (await callWorker(new Request(`${BASE}/admin/store/${id}`, { headers: { cookie: await adminCookie() } }))).text();

/** A review a person has already marked eligible, as the handoff expects it. */
async function eligible(over: Record<string, unknown> = {}) {
  const id = await seedStoreReview({ review_state: 'actionable', eligibility: 'eligible', human_labels: '["bug"]',
    app_version: '1.15.19', review_body: 'Private send fails every time after the update.', ...over });
  await env.DB.prepare('UPDATE store_reviews SET human_decided_at = ?, human_decided_by = ? WHERE store_review_id = ?')
    .bind((over.human_decided_at as number) ?? Date.now() - 60_000, ADMIN_EMAIL, id).run();
  return id;
}

const decide = (id: string, f: { triage?: string; labels?: string[]; note?: string; eligibility?: string; seen?: string }) =>
  post(`/admin/store/${id}/decide`, [
    ['seen', f.seen ?? ''],
    ...(f.triage ? [['triage', f.triage] as [string, string]] : []),
    ...(f.labels ?? []).map((l) => ['labels', l] as [string, string]),
    ['note', f.note ?? ''],
    ...(f.eligibility ? [['eligibility', f.eligibility] as [string, string]] : []),
  ]);

// ---- the decision ------------------------------------------------------------

describe('the decision', () => {
  it('DH1. saving a decision writes the human columns, records who, and logs it', async () => {
    const id = await seedStoreReview({ review_state: 'awaiting_review', ai_labels: '["bug"]' });
    const res = await decide(id, { triage: 'actionable', labels: ['ui_issue', 'bug', 'made_up'], note: '  Seen on Pixel.  ', eligibility: 'eligible' });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(`/admin/store/${id}#decision`);
    const r = await review(id);
    expect(r).toMatchObject({ review_state: 'actionable', eligibility: 'eligible', human_decision: 'Seen on Pixel.',
      human_decided_by: ADMIN_EMAIL, human_labels: '["bug","ui_issue"]' });
    expect(r.human_decided_at).toBeGreaterThan(0);
    // The AI's suggestion is left as it was.
    expect(r.ai_labels).toBe('["bug"]');
    expect(await events(id, 'human')).toEqual([{
      detail: 'Decision saved: Actionable, eligible to send to GitHub; labels bug, ui_issue', actor: ADMIN_EMAIL }]);
    // Eligibility is its own words, never the action of sending.
    const html = await page(id);
    expect(html).toContain('<span>Eligible to send to GitHub</span>');
    expect(html).not.toContain('<span>Eligible</span>');
  });

  it('DH2. no CSRF token, nothing changes', async () => {
    const id = await seedStoreReview({ review_state: 'awaiting_review' });
    const form = new FormData(); form.set('triage', 'actionable'); form.set('eligibility', 'not_eligible'); form.set('seen', '');
    const res = await callWorker(new Request(`${BASE}/admin/store/${id}/decide`, { method: 'POST', body: form, headers: { cookie: await adminCookie() } }));
    expect(res.status).toBe(403);
    expect((await review(id)).human_decided_at).toBeNull();
    expect((await callWorker(new Request(`${BASE}/admin/store/${id}/decide`, { headers: { cookie: await adminCookie() } }))).status).toBe(404);
  });

  it('DH3. eligible needs actionable, a pipeline label and a clean scan — on a direct POST too', async () => {
    const id = await seedStoreReview({ review_state: 'awaiting_review' });
    const cases: Array<[Parameters<typeof decide>[1], string]> = [
      [{ labels: ['bug'], eligibility: 'eligible' }, MSG.chooseTriage],
      [{ triage: 'actionable', labels: ['bug'] }, MSG.chooseEligibility],
      [{ triage: 'needs_info', labels: ['bug'], eligibility: 'eligible' }, MSG.eligibleNeeds],
      [{ triage: 'actionable', labels: ['praise', 'feature_request'], eligibility: 'eligible' }, MSG.eligibleNeeds],
      [{ triage: 'actionable', labels: ['bug'], eligibility: 'eligible', note: 'x'.repeat(1001) }, MSG.noteTooLong],
    ];
    for (const [f, message] of cases) {
      const res = await decide(id, f);
      expect(res.status, message).toBe(400);
      expect(await res.text(), message).toContain(esc(message));
    }
    expect((await review(id)).eligibility).toBe('undecided');

    const flagged = await seedStoreReview({ review_state: 'awaiting_review', secret_scan_status: 'flagged' });
    const res = await decide(flagged, { triage: 'actionable', labels: ['bug'], eligibility: 'eligible' });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain(esc(MSG.flaggedNotEligible));
    // Not eligible is always allowed, flagged or not.
    expect((await decide(flagged, { triage: 'actionable', labels: ['bug'], eligibility: 'not_eligible' })).status).toBe(303);
  });

  it('DH4. a refused save keeps what was submitted; a decision someone else changed is refused', async () => {
    const id = await seedStoreReview({ review_state: 'awaiting_review' });
    const res = await decide(id, { triage: 'needs_info', labels: ['bug'], note: '<b>my note</b>', eligibility: 'eligible' });
    const html = await res.text();
    expect(html).toContain('&lt;b&gt;my note&lt;/b&gt;');
    expect(html).not.toContain('<b>my note</b>');
    expect(html).toMatch(/value="needs_info" checked/);

    expect((await decide(id, { triage: 'actionable', labels: ['bug'], eligibility: 'not_eligible' })).status).toBe(303);
    // The same form again, still carrying "no decision yet".
    const stale = await decide(id, { triage: 'not_actionable', eligibility: 'not_eligible' });
    expect(stale.status).toBe(409);
    expect(await stale.text()).toContain(esc(MSG.decisionConflict));
    expect((await review(id)).review_state).toBe('actionable');
  });

  it('DH5. once in the pipeline, triage and eligibility are fixed; labels and the note are not', async () => {
    const id = await eligible({ handoff_state: 'accepted' });
    const seen = String((await review(id)).human_decided_at);
    const change = await decide(id, { seen, triage: 'actionable', labels: ['bug'], eligibility: 'not_eligible' });
    expect(change.status).toBe(409);
    expect(await change.text()).toContain(esc(MSG.lockedInPipeline));
    // The page's own form: eligibility disabled so not posted, triage carried hidden.
    expect((await decide(id, { seen, triage: 'actionable', labels: ['bug', 'ui_issue'], note: 'Filed.' })).status).toBe(303);
    expect(await review(id)).toMatchObject({ eligibility: 'eligible', human_labels: '["bug","ui_issue"]', human_decision: 'Filed.' });
  });
});

// ---- the handoff -------------------------------------------------------------

describe('the handoff', () => {
  it('DH6. switched off (as shipped): refused, no row, and no button to press', async () => {
    const id = await eligible();
    const before = await env.DB.prepare('SELECT COUNT(*) AS n FROM submissions').first<{ n: number }>();
    const res = await post(`/admin/store/${id}/handoff`, []);
    expect(res.status).toBe(409);
    expect(await res.text()).toContain(esc(MSG.handoffOff));
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM submissions').first<{ n: number }>())!.n).toBe(before!.n);
    expect((await review(id)).handoff_state).toBe('none');
    const html = await page(id);
    expect(html).toContain('Sending to GitHub is switched off.');
    expect(html).not.toContain('/handoff"');
    expect(recordedCalls()).toHaveLength(0);
  });

  it('DH7. switched on: writes the report /submit would, spam released, nothing for the flood check', async () => {
    const id = await eligible({ platform: 'ios', review_title: 'Stuck @everyone', review_body: 'See #12. Private send hangs.' });
    const res = await withEnv(ON, () => post(`/admin/store/${id}/handoff`, []));
    expect(res.status).toBe(303);
    const r = await review(id);
    expect(r).toMatchObject({ handoff_state: 'accepted', handoff_attempts: 1, handoff_error: null });
    const s = await getSubmission(r.handoff_submission_id);
    expect(s).toMatchObject({
      state: 'received', platform: 'ios', wallet_version: '1.15.19', network: null, route: null,
      reporter_kind: 'store', normalized_hash: null, spam_status: 'clean', spam_reviewed_by: ADMIN_EMAIL,
      attachment_keys: '[]', attempts: 0,
    });
    expect(s.spam_reviewed_at).toBeGreaterThan(0);
    // sanitize() ran: the title and body are there, and neither mention nor issue ref is live.
    expect(s.body_sanitized).toContain('Private send hangs.');
    expect(s.body_sanitized).not.toContain('@everyone');
    expect(s.body_sanitized).not.toMatch(/(^|\s)#12\b/);
    expect(s.reporter_key).toMatch(/^[0-9a-f]{64}$/);
    expect(s.fingerprint).toContain('ios');
    expect((await getStateLog(r.handoff_submission_id)).map((l: any) => l.to_state)).toEqual(['received']);
    expect(await events(id, 'handoff')).toEqual([{ detail: 'Queued for GitHub', actor: ADMIN_EMAIL }]);
    expect(recordedCalls()).toHaveLength(0);
  });

  it('DH8. two clicks at once write one submission', async () => {
    const id = await eligible();
    const envOn = { DB: env.DB, STORE_HANDOFF_ENABLED: 'true' };
    const now = Date.now();
    const out = await Promise.all([1, 2, 3].map(() => runHandoff(envOn, { reviewId: id, user: ADMIN_EMAIL, nowMs: now })));
    expect(out.filter((o) => o.ok)).toHaveLength(1);
    const r = await review(id);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM submissions WHERE submission_id = ?').bind(r.handoff_submission_id).first<{ n: number }>();
    expect(n!.n).toBe(1);
    expect(r.handoff_attempts).toBe(1);
    // And through the route, after the fact: already sent.
    const again = await withEnv(ON, () => post(`/admin/store/${id}/handoff`, []));
    expect(again.status).toBe(409);
    expect(await again.text()).toContain(esc(MSG.alreadySent));
  });

  it('DH9. an undecided, ineligible, not actionable or flagged review never enters, even by direct POST', async () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ eligibility: 'undecided' }, MSG.notEligible],
      [{ eligibility: 'not_eligible' }, MSG.notEligible],
      [{ review_state: 'needs_info' }, MSG.notEligible],
      // Columns forced past the decision rules, as a bad migration might leave them.
      [{ secret_scan_status: 'flagged' }, MSG.flaggedNotEligible],
    ];
    for (const [over, message] of cases) {
      const id = await eligible(over);
      const res = await withEnv(ON, () => post(`/admin/store/${id}/handoff`, []));
      expect(res.status, message).toBe(409);
      expect(await res.text(), message).toContain(esc(message));
      expect(await review(id), message).toMatchObject({ handoff_state: 'none', handoff_submission_id: null });
    }
    // No decision at all, even with the other columns set.
    const nobody = await seedStoreReview({ review_state: 'actionable', eligibility: 'eligible' });
    expect((await runHandoff({ DB: env.DB, STORE_HANDOFF_ENABLED: 'true' }, { reviewId: nobody, user: ADMIN_EMAIL, nowMs: Date.now() })).ok).toBe(false);
    expect((await review(nobody)).handoff_submission_id).toBeNull();
  });

  it('DH10. key or seed phrase material found at the handoff is a hard refusal, recorded without the text', async () => {
    // Six words in the title and six in the body: neither half is a phrase, the report text is.
    const id = await eligible({ platform: 'ios', review_title: 'abandon abandon abandon abandon abandon abandon',
      review_body: 'abandon abandon abandon abandon abandon about' });
    const res = await withEnv(ON, () => post(`/admin/store/${id}/handoff`, []));
    expect(res.status).toBe(422);
    expect(await res.text()).toContain(esc(MSG.secretRefused));
    const r = await review(id);
    expect(r).toMatchObject({ handoff_state: 'failed', handoff_submission_id: null });
    expect(r.handoff_error).toMatch(/^secret_material:/);
    expect(r.handoff_error).not.toContain('abandon');
    const html = await withEnv(ON, () => page(id));
    expect(html).not.toContain('Try again');
  });

  it('DH11. a review edited after its decision waits for a new decision', async () => {
    const decidedAt = Date.now() - 60_000;
    const id = await eligible({ source: 'google_play', human_decided_at: decidedAt });
    const raw = (text: string) => JSON.stringify({ reviewId: 'r', authorName: 'A', comments: [{ userComment: {
      text, starRating: 2, lastModified: { seconds: String(Math.floor((decidedAt - 3_600_000) / 1000)) } } }] });
    const ins = env.DB.prepare('INSERT INTO store_review_versions (store_review_id, raw_hash, raw_json, rating, observed_at) VALUES (?,?,?,?,?)');
    await ins.bind(id, 'h1', raw('Private send fails.'), 2, decidedAt - 3_600_000).run();
    // Edited upstream before the decision, but first seen by sync after it.
    await ins.bind(id, 'h2', raw('Private send fails every time.'), 2, decidedAt + 1000).run();

    const res = await withEnv(ON, () => post(`/admin/store/${id}/handoff`, []));
    expect(res.status).toBe(409);
    expect(await res.text()).toContain(esc(MSG.editedAfterDecision));
    expect((await review(id)).handoff_state).toBe('none');

    const seen = String((await review(id)).human_decided_at);
    expect((await decide(id, { seen, triage: 'actionable', labels: ['bug'], eligibility: 'eligible' })).status).toBe(303);
    expect((await withEnv(ON, () => post(`/admin/store/${id}/handoff`, []))).status).toBe(303);
  });

  it('DH12. an interrupted claim is taken over after its lease, keeping the same submission id', async () => {
    const id = await eligible();
    const envOn = { DB: env.DB, STORE_HANDOFF_ENABLED: 'true' };
    const kept = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare(`UPDATE store_reviews SET handoff_state = 'requested', handoff_submission_id = ?, handoff_requested_at = ?, handoff_attempts = 1
      WHERE store_review_id = ?`).bind(kept, now - 1000, id).run();
    expect(await runHandoff(envOn, { reviewId: id, user: ADMIN_EMAIL, nowMs: now })).toEqual({ ok: false, status: 409, message: MSG.alreadySent });

    expect((await runHandoff(envOn, { reviewId: id, user: ADMIN_EMAIL, nowMs: now + HANDOFF_LEASE_MS })).ok).toBe(true);
    const r = await review(id);
    expect(r).toMatchObject({ handoff_state: 'accepted', handoff_submission_id: kept, handoff_attempts: 2 });
    expect(await getSubmission(kept)).toMatchObject({ state: 'received' });
  });

  it('DH13. the drain files it as a store review — never as a form report — and the spam model cannot park it', async () => {
    const id = await eligible({ review_body: 'After updating, the wallet cannot reach the node at all.',
      reviewer_name: 'Jane Reviewer', rating: 2 });
    expect((await withEnv(ON, () => post(`/admin/store/${id}/handoff`, []))).status).toBe(303);
    const subId = (await review(id)).handoff_submission_id;

    // The gate on, and the model sure it is spam: a person already released it.
    mockClassifier({ verdict: 'new', title: 'Wallet cannot reach the node after update', spam_status: 'suspected', spam_score: 0.99 });
    mockCreateIssue(5001);
    await withEnv({ SPAM_GATE_ENABLED: 'true' }, () => runDrain());

    const s = await getSubmission(subId);
    expect(s).toMatchObject({ state: 'published', published_issue: 5001, spam_status: 'clean' });
    const call = recordedCalls().find((c) => c.method === 'POST' && c.url.endsWith('/issues') && (c.body ?? '').includes(`mfv2:${subId}`));
    const sent = JSON.parse(call!.body!);
    expect(sent.title).toBe('Wallet cannot reach the node after update');
    expect(sent.body).toContain('After updating, the wallet cannot reach the node at all.');
    expect(sent.body).toContain('\n## Store review\n\n- **Store:** Google Play\n- **Rating:** 2 of 5 stars\n');
    expect(sent.body).toContain('*Filed from a Google Play review after a maintainer reviewed it in the feedback console. Pipeline operated by the Miden support team; replies remain visible to maintainers.*');
    expect(sent.body).toContain(`<!-- mfv2:${subId} -->`);
    // Not a form report, and nothing about the reviewer.
    expect(sent.body).not.toContain('feedback form');
    expect(sent.body).not.toContain('Jane Reviewer');
    expect(sent.labels).toEqual([]);

    // The review's page now reads the report: filed, with a link to the issue.
    const html = await page(id);
    expect(html).toContain('On GitHub');
    expect(html).toContain('Filed as <a href="https://github.com/0xMiden/wallet/issues/5001">issue #5001</a>');
  });

  it('DH17. an App Store review without a rating says so, and shows no rating line', async () => {
    const id = await eligible({ platform: 'ios', rating: null, review_body: 'After updating, the wallet cannot reach the node.' });
    expect((await withEnv(ON, () => post(`/admin/store/${id}/handoff`, []))).status).toBe(303);
    const subId = (await review(id)).handoff_submission_id;
    mockClassifier({ verdict: 'new', title: 'Wallet cannot reach the node after the update' });
    mockCreateIssue(5003);
    await runDrain();
    const call = recordedCalls().find((c) => c.method === 'POST' && c.url.endsWith('/issues') && (c.body ?? '').includes(`mfv2:${subId}`));
    const body = JSON.parse(call!.body!).body as string;
    expect(body).toContain('\n## Store review\n\n- **Store:** App Store\n\n## Environment');
    expect(body).not.toContain('Rating');
    expect(body).toContain('*Filed from an App Store review after a maintainer reviewed it in the feedback console.');
  });

  it('DH18. added to a matching issue, the rolling comment names each report\'s source and rating', async () => {
    await seedMirrorIssue({ number: 601, title: 'Node unreachable on Android', state: 'open' });
    // A form report already on the issue.
    const form = await seedSubmission({ state: 'published', reporter_key: 'dh-form', body_sanitized: 'Form: the wallet cannot reach the node.' });
    await env.DB.prepare('INSERT INTO dup_links (submission_id, issue_number, confidence, linked_at) VALUES (?,?,?,?)')
      .bind(form, 601, 0.9, Date.now() - 60_000).run();

    const id = await eligible({ rating: 1, review_body: 'Store: after updating it cannot reach the node.' });
    expect((await withEnv(ON, () => post(`/admin/store/${id}/handoff`, []))).status).toBe(303);
    mockClassifier({ verdict: 'duplicate', issue_number: 601, confidence: 0.95 });
    mockCreateComment(601, 777);
    await runDrain();

    const r = await review(id);
    expect((await getSubmission(r.handoff_submission_id)).state).toBe('published');
    const call = recordedCalls().find((c) => c.method === 'POST' && c.url.endsWith('/issues/601/comments'));
    const body = JSON.parse(call!.body!).body as string;
    expect(body).toContain('### Additional reports from the in-app feedback form and store reviews');
    expect(body).toMatch(/\*\*1\.\*\* Google Play review · 1 of 5 stars · \d{4}-\d{2}-\d{2} · matched at 0\.95/);
    expect(body).toMatch(/\*\*2\.\*\* Android · \d{4}-\d{2}-\d{2} · matched at 0\.90/);
    expect(await page(id)).toContain('Added to <a href="https://github.com/0xMiden/wallet/issues/601">issue #601</a>');
    await env.DB.prepare("DELETE FROM dup_links WHERE issue_number = 601").run();
    await env.DB.prepare("DELETE FROM sync_state WHERE key = 'rollup:601'").run();
    await env.DB.prepare("DELETE FROM issue_mirror WHERE number = 601").run();
  });

  it('DH19. the page tells queued apart from on GitHub, from the report itself', async () => {
    const id = await eligible();
    const subId = crypto.randomUUID();
    await seedSubmission({ submission_id: subId, state: 'deferred', reporter_key: 'dh-q' });
    await env.DB.prepare(`UPDATE store_reviews SET handoff_state = 'accepted', handoff_submission_id = ?, handoff_accepted_at = ? WHERE store_review_id = ?`)
      .bind(subId, Date.now(), id).run();
    let html = await page(id);
    expect(html).toContain('Queued for GitHub');
    expect(html).toContain('Not on GitHub yet. It appears there once the pipeline files it.');
    expect(html).not.toContain('On GitHub<');

    await env.DB.prepare(`UPDATE submissions SET state = 'failed' WHERE submission_id = ?`).bind(subId).run();
    html = await page(id);
    expect(html).toContain('Not filed');
    expect(html).not.toContain('Not on GitHub yet');

    await env.DB.prepare(`UPDATE submissions SET state = 'published', published_issue = 4242 WHERE submission_id = ?`).bind(subId).run();
    html = await page(id);
    expect(html).toContain('On GitHub');
    expect(html).toContain('issue #4242');
    expect(html).not.toContain('Not on GitHub yet');
  });

  it('DH14. the Delivery tabs mark a report that came from Store Reviews', async () => {
    const id = await eligible({ platform: 'ios' });
    const subId = await seedSubmission({ state: 'deferred', body_sanitized: 'From a store review.', reporter_key: 'dh-1' });
    await env.DB.prepare(`UPDATE store_reviews SET handoff_state = 'accepted', handoff_submission_id = ? WHERE store_review_id = ?`).bind(subId, id).run();
    const other = await seedSubmission({ state: 'deferred', body_sanitized: 'From the in-app form.', reporter_key: 'dh-2' });
    const html = await (await callWorker(new Request(`${BASE}/admin/review?q=deferred`, { headers: { cookie: await adminCookie() } }))).text();
    const card = (sub: string) => html.slice(html.indexOf(sub) - 400, html.indexOf(sub) + 900);
    expect(card(subId)).toContain('From the App Store');
    expect(card(other)).not.toContain('From the App Store');
    expect(card(other)).not.toContain('From Google Play');
  });
});

describe('what the handoff work must not change', () => {
  it('DH15. every queue still renders its rows through the joined query', async () => {
    const ids: Record<string, string> = {};
    for (const [q, state, extra] of [
      ['suspected', 'suspected_spam', { spam_status: 'suspected', spam_reasons: '["flood_repeat"]' }],
      ['spam', 'spam', { spam_status: 'spam', spam_reasons: '["flood_repeat"]' }],
      ['quarantined', 'quarantined', {}],
      ['capped', 'capped', {}],
      ['deferred', 'deferred', {}],
      ['failed', 'failed', {}],
    ] as Array<[string, string, Record<string, unknown>]>) {
      ids[q] = await seedSubmission({ state, body_sanitized: `Row in ${q}.`, reporter_key: `dh-${q}`, ...extra });
    }
    for (const q of Object.keys(ids)) {
      const res = await callWorker(new Request(`${BASE}/admin/review?q=${q}`, { headers: { cookie: await adminCookie() } }));
      expect(res.status, q).toBe(200);
      const html = await res.text();
      expect(html, q).toContain(ids[q]);
      expect(html, q).toContain(`Row in ${q}.`);
      expect(html, q).not.toContain('From Google Play');
    }
  });

  it('DH16. an in-app report is filed with the footer it has today, byte for byte', async () => {
    // The regression guard for the store-review footer question: whatever a
    // store row ends up saying, every other issue keeps this line.
    mockClassifier({ verdict: 'new', title: 'Node unreachable after the update' });
    mockCreateIssue(5002);
    // Oldest, so the drain takes it first whatever earlier tests left behind.
    const id = await seedSubmission({ received_at: 1, body_sanitized: 'The wallet cannot reach the node after an update.' });
    await runDrain();
    expect((await getSubmission(id)).state).toBe('published');
    const created = recordedCalls().find((c) => c.method === 'POST' && c.url.endsWith('/issues') && (c.body ?? '').includes(`mfv2:${id}`));
    expect(JSON.parse(created!.body!).labels).toEqual(['feedback-form']);
    // The whole body, byte for byte.
    expect(JSON.parse(created!.body!).body).toBe(
      'The wallet cannot reach the node after an update.\n\n## Environment\n\n'
      + '- **Platform:** Android\n- **Wallet version:** 1.15.19\n- **Network:** testnet\n- **Route:** /send\n'
      + '- **Error code:** NODE_UNREACHABLE\n\n---\n'
      + `*Filed automatically from the in-app feedback form by an anonymous reporter. Pipeline operated by the Miden support team; replies remain visible to maintainers.*\n\n`
      + `<!-- mfv2:${id} -->\n`);
    expect(JSON.parse(created!.body!).body).not.toContain('## Store review');
    expect(JSON.parse(created!.body!).body).toContain(
      `*Filed automatically from the in-app feedback form by an anonymous reporter. Pipeline operated by the Miden support team; replies remain visible to maintainers.*\n\n<!-- mfv2:${id} -->`);
  });
});

describe('form reports keep their rolling comment', () => {
  it('DH20. a form report added to an issue keeps the form heading and its platform line', async () => {
    await seedMirrorIssue({ number: 602, title: 'Node unreachable on Android', state: 'open' });
    mockClassifier({ verdict: 'duplicate', issue_number: 602, confidence: 0.95 });
    mockCreateComment(602, 778);
    const id = await seedSubmission({ received_at: 2, reporter_key: 'dh-form2' });
    await runDrain();
    expect((await getSubmission(id)).state).toBe('published');
    const call = recordedCalls().find((c) => c.method === 'POST' && c.url.endsWith('/issues/602/comments'));
    const body = JSON.parse(call!.body!).body as string;
    expect(body.startsWith('### Additional reports from the in-app feedback form\n\nOne further report matches this issue:')).toBe(true);
    expect(body).toMatch(/\*\*1\.\*\* Android · \d{4}-\d{2}-\d{2} · matched at 0\.95/);
    expect(body).not.toContain('store review');
    await env.DB.prepare("DELETE FROM dup_links WHERE issue_number = 602").run();
    await env.DB.prepare("DELETE FROM sync_state WHERE key = 'rollup:602'").run();
    await env.DB.prepare("DELETE FROM issue_mirror WHERE number = 602").run();
  });
});

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
