/**
 * Phase 6, first half — how a reply is SHOWN. Nothing here sends or saves.
 *
 * Three properties matter more than the rest, because each is a way for the
 * console to say something untrue about a public reply:
 *   RV3/RV4  a reply that nobody can read on the store is never labelled as
 *            published — not a draft, not an approval, not Apple's pending one
 *   RV8      text from a store payload renders inert, like every review body
 *   RV11-13  "edited" is claimed only when the stored history proves the
 *            reviewer's text or rating changed, never from a timestamp
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import wranglerConfig from '../wrangler.jsonc?raw';
import { callWorker, seedStoreReview, seedAdmin, adminHeaders } from './helpers';
import { replyPanel, replyPreview, storeReplyOf, REPLY_MAX_CHARS, type ReplyRow } from '../src/store/reply-panel';
import { editedAt } from '../src/store/edits';

const BASE = 'https://mfv2.test';
const html = async (path: string) => (await callWorker(new Request(`${BASE}${path}`, {
  method: 'GET', headers: await adminHeaders(),
}))).text();

const T = Date.parse('2026-09-13T10:00:00Z');

beforeEach(async () => {
  await seedAdmin();
  for (const t of ['store_review_events', 'store_review_versions', 'store_review_replies', 'store_reviews']) {
    await env.DB.prepare(`DELETE FROM ${t}`).run();
  }
});

function reply(over: Partial<ReplyRow> = {}): ReplyRow {
  return {
    reply_id: crypto.randomUUID(), store_review_id: 'r', body: 'Thanks for the report.', source: 'human',
    state: 'draft', created_at: T, created_by: 'ivan.l@miden.team', approved_at: null, approved_by: null,
    published_at: null, external_state: null, attempts: 0, next_attempt_at: null, last_error: null, ...over,
  };
}

const panel = (over: Partial<Parameters<typeof replyPanel>[0]> = {}) => replyPanel({
  review: { store_review_id: crypto.randomUUID(), source: 'google_play' },
  current: null, history: [], storeReply: null, csrf: 'tok', sendingEnabled: false, ...over,
});

async function seedReply(reviewId: string, over: Partial<ReplyRow> = {}): Promise<string> {
  const r = reply({ store_review_id: reviewId, ...over });
  await env.DB.prepare(
    `INSERT INTO store_review_replies (reply_id, store_review_id, body, source, state, created_at, created_by,
       approved_at, approved_by, published_at, external_state, attempts, next_attempt_at, last_error)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(r.reply_id, r.store_review_id, r.body, r.source, r.state, r.created_at, r.created_by, r.approved_at,
    r.approved_by, r.published_at, r.external_state, r.attempts, r.next_attempt_at, r.last_error).run();
  return r.reply_id;
}

const gpRaw = (text: string, stars: number, seconds: number, extra: Record<string, unknown> = {}, dev?: string) =>
  JSON.stringify({
    reviewId: 'gp-1', authorName: 'A',
    comments: [
      { userComment: { text, starRating: stars, lastModified: { seconds: String(seconds), nanos: 0 }, ...extra } },
      ...(dev ? [{ developerComment: { text: dev, lastModified: { seconds: String(seconds + 60), nanos: 0 } } }] : []),
    ],
  });

describe('each reply state has its own card', () => {
  it('RV1. no reply yet: a composer with the 350-character limit, and nothing else', () => {
    const out = panel();
    expect(out).toContain('<textarea name="body"');
    expect(out).toContain(`maxlength="${REPLY_MAX_CHARS}"`);
    // Save as draft, then the primary action, side by side at the end. While sending
    // is off the primary action is "Approve reply", and says the reply will wait.
    const bar = out.slice(out.indexOf('reply-bar'));
    expect(bar.indexOf('>Save as draft</button>')).toBeGreaterThan(0);
    expect(bar.indexOf('class="btn-primary" formaction="/admin/store/')).toBeGreaterThan(bar.indexOf('>Save as draft</button>'));
    expect(bar).toContain('/reply/send">Approve reply</button>');
    expect(out).toContain("Approving locks this version's text. It will wait here until sending is switched on.");
    expect(out).not.toContain('>Send</button>');
    // While sending is on, the same button is "Send", and says it queues for public posting.
    const on = panel({ sendingEnabled: true });
    expect(on).toContain('/reply/send">Send</button>');
    expect(on).toContain('This approves and queues your reply for public posting on Google Play. It will be sent exactly as written.');
    expect(on).not.toContain('Approve reply');
  });

  it('RV2. a draft is editable, counts its characters, and can be approved or discarded', () => {
    const out = panel({ current: reply({ body: 'héllo 👋' }) });
    expect(out).toContain('>héllo 👋</textarea>');
    // Characters as a person counts them: the emoji is one, not two UTF-16 units.
    expect(out).toContain(`7 / ${REPLY_MAX_CHARS} characters`);
    expect(out).toContain('>Save as draft</button>');
    expect(out).toContain('/reply/send">Approve reply</button>');
    expect(out).toContain('Discard draft');
    // Discard is apart from the two buttons, in the card's header.
    expect(out.indexOf('Discard draft')).toBeLessThan(out.indexOf('reply-bar'));
    expect(out).toContain("Approving locks this version's text. It will wait here until sending is switched on.");
  });

  it('RV3. an approved reply is shown, not editable, and is never labelled published', () => {
    const out = panel({ current: reply({ state: 'approved', approved_at: T, approved_by: 'ivan.l@miden.team' }) });
    expect(out).not.toContain('<textarea');
    expect(out).toContain('Change reply');
    expect(out).toContain('Waiting to send. Sending is switched off.');
    expect(out).not.toContain('Developer reply');
    expect(out).not.toContain('Reply published');
  });

  it('RV4. Apple\'s pending reply says so in the panel AND in the badge, never "published"', async () => {
    expect(panel({ review: { store_review_id: 'x', source: 'app_store' },
      current: reply({ state: 'pending_publish', published_at: T }) }))
      .toContain('Sent, waiting for Apple');

    const id = await seedStoreReview({ platform: 'ios', reply_state: 'pending_publish' });
    const rid = await seedReply(id, { state: 'pending_publish', published_at: T });
    await env.DB.prepare('UPDATE store_reviews SET current_reply_id = ? WHERE store_review_id = ?').bind(rid, id).run();
    const page = await html(`/admin/store/${id}`);
    expect(page.match(/Sent, waiting for Apple/g)?.length).toBeGreaterThanOrEqual(2);
    expect(page).not.toContain('Reply published');
  });

  it('RV5. published: shown as a developer reply, and editing keeps it up until the replacement is published', () => {
    const out = panel({ current: reply({ state: 'published', published_at: T }) });
    expect(out).toContain('Developer reply');
    expect(out).toContain('Published on Google Play');
    expect(out).toContain('The published reply stays up until the replacement is published.');
  });

  it('RV6. a confirmed failure says "Not sent", shows the store\'s answer, and offers a retry', () => {
    const out = panel({ current: reply({ state: 'failed', attempts: 2, last_error: 'HTTP 403 PERMISSION_DENIED' }) });
    expect(out).toContain('Not sent · 2 attempts');
    expect(out).toContain('Google Play said: HTTP 403 PERMISSION_DENIED');
    expect(out).toContain('Try again');
  });

  it('RV7. earlier versions are listed as history, not as the current reply', () => {
    const cur = reply({ state: 'draft', body: 'new text' });
    const old = reply({ state: 'superseded', body: 'old text' });
    const out = panel({ current: cur, history: [cur, old] });
    expect(out).toContain('Earlier versions (1)');
    expect(out).toContain('Replaced');
    expect(out.indexOf('old text')).toBeGreaterThan(out.indexOf('Earlier versions'));
  });
});

describe('what the store already holds', () => {
  it('RV8. a reply written outside the console is shown as published, and its text renders inert', () => {
    const raw = gpRaw('Great', 5, 1_788_000_000, {}, '<img src=x onerror=alert(1)>');
    const stored = storeReplyOf({ source: 'google_play', app_id: 'com.miden.wallet', raw_json: raw });
    expect(stored?.text).toBe('<img src=x onerror=alert(1)>');
    const out = panel({ storeReply: stored });
    expect(out).toContain('written outside the console');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(out).not.toContain('<img src=x');
    // The same escaping holds for a reply body in the list preview.
    expect(replyPreview({ body: '<script>x</script>', state: 'draft', published_at: null, external_state: null }, null)).toContain('&lt;script&gt;');
  });

  it('RV9. a flagged review keeps its reply panel: redacted text, still replyable', async () => {
    const id = await seedStoreReview({ secret_scan_status: 'flagged', review_state: 'awaiting_review' });
    const page = await html(`/admin/store/${id}`);
    expect(page).toContain('[redacted');
    expect(page).toContain('<textarea name="body"');
  });

  it('RV10. the list labels a reply by what it is: only a published one is a "developer reply"', () => {
    expect(replyPreview({ body: 'a', state: 'draft', published_at: null, external_state: null }, null)).toContain('Draft reply');
    expect(replyPreview({ body: 'a', state: 'approved', published_at: null, external_state: null }, null)).toContain('Approved reply, not sent');
    expect(replyPreview({ body: 'a', state: 'pending_publish', published_at: null, external_state: null }, null)).toContain('Sent, waiting for Apple');
    expect(replyPreview({ body: 'a', state: 'failed', published_at: null, external_state: null }, null)).toContain('Reply not sent');
    // Apple accepted it and did not publish it: sent, so never "not sent".
    const dropped = replyPreview({ body: 'a', state: 'failed', published_at: 1, external_state: 'PENDING_PUBLISH' }, null);
    expect(dropped).toContain('Reply not published');
    expect(dropped).not.toContain('not sent');
    // A send the store never confirmed: not known to be unsent either.
    const unsure = replyPreview({ body: 'a', state: 'failed', published_at: null, external_state: 'UNCONFIRMED' }, null);
    expect(unsure).toContain('Delivery unconfirmed');
    expect(unsure).not.toContain('not sent');
    expect(replyPreview({ body: 'a', state: 'published', published_at: null, external_state: null }, null)).toContain('Developer reply');
    for (const s of ['draft', 'approved', 'pending_publish', 'failed']) {
      expect(replyPreview({ body: 'a', state: s, published_at: null, external_state: null }, null)).not.toContain('Developer reply');
    }
    expect(replyPreview(null, null)).toBe('');
  });
});

describe('"edited" is proven from history, never from a timestamp', () => {
  const v = (raw: string, at: number) => ({ raw_json: raw, observed_at: at });

  it('RV11. one stored version is never an edit, whatever its timestamps say', () => {
    expect(editedAt('google_play', 'com.miden.wallet', [v(gpRaw('Fails', 2, 1_788_000_000), T)])).toBeNull();
  });

  it('RV12. a payload change that leaves the text and rating alone is not an edit', () => {
    const versions = [
      v(gpRaw('Fails', 2, 1_788_000_000, { appVersionName: '1.15.18' }), T),
      v(gpRaw('Fails', 2, 1_788_000_000, { appVersionName: '1.15.19' }, 'Thanks!'), T + 1000),
    ];
    expect(editedAt('google_play', 'com.miden.wallet', versions)).toBeNull();
  });

  it('RV13. a changed text or rating is an edit, dated by the store when it gives a date', () => {
    const text = [v(gpRaw('Fails', 2, 1_788_000_000), T), v(gpRaw('Fails every time', 2, 1_788_090_000), T + 5000)];
    expect(editedAt('google_play', 'com.miden.wallet', text)).toBe(1_788_090_000_000);
    const rating = [v(gpRaw('Fails', 2, 1_788_000_000), T), v(gpRaw('Fails', 4, 1_788_090_000), T + 5000)];
    expect(editedAt('google_play', 'com.miden.wallet', rating)).toBe(1_788_090_000_000);
    // Apple gives no edit time: the edit is dated when the changed version was stored.
    const as = (title: string, at: number) => v(JSON.stringify({ type: 'customerReviews', id: 'a1',
      attributes: { rating: 3, title, body: 'b', createdDate: '2026-09-01T00:00:00Z' } }), at);
    expect(editedAt('app_store', 'com.miden.bread', [as('One', T), as('Two', T + 7000)])).toBe(T + 7000);
  });

  it('RV14. the list and the detail page claim "edited" only for the proven review', async () => {
    const plain = await seedStoreReview({ review_body: 'plain', review_created_at: T, review_updated_at: T + 999_999 });
    const edited = await seedStoreReview({ review_body: 'edited', review_created_at: T, review_updated_at: T });
    const ins = env.DB.prepare('INSERT INTO store_review_versions (store_review_id, raw_hash, raw_json, rating, observed_at) VALUES (?,?,?,?,?)');
    await ins.bind(edited, 'h1', gpRaw('before', 2, 1_788_000_000), 2, T).run();
    await ins.bind(edited, 'h2', gpRaw('after', 2, 1_788_090_000), 2, T + 1).run();

    const list = await html('/admin/store?platform=android');
    expect(list.match(/edited <b>/g)?.length).toBe(1);
    expect(await html(`/admin/store/${plain}`)).not.toContain('edited <b>');
    expect(await html(`/admin/store/${edited}`)).toContain('edited <b>2026-08-30 11:40</b>');
  });
});

describe('outcomes the store did not confirm', () => {
  it('RV16. "Delivery unconfirmed" says it is not known, offers a check, and never says "Not sent"', () => {
    const current = reply({ state: 'unconfirmed', attempts: 1,
      last_error: JSON.stringify({ by: 'console', text: 'No answer from Google Play: the request timed out.' }) });
    const out = panel({ current, sendingEnabled: true });
    expect(out).toContain('Delivery unconfirmed');
    expect(out).toContain("We couldn't confirm whether Google Play received this reply. We'll check before trying to send it again.</p>");
    expect(out).toContain('Check Google Play');
    expect(out).toContain('No answer from Google Play: the request timed out.');
    expect(out).not.toContain('Not sent');
    expect(out).not.toContain('said: No answer');
    expect(out).not.toContain('Try again');

    // Sending off: nothing would check, so there is no button that does nothing.
    const off = panel({ current, sendingEnabled: false });
    expect(off).toContain("We'll check before trying to send it again. Checking starts when sending is switched on.");
    expect(off).not.toContain('/reply/check');
  });
});

describe('the reply filter', () => {
  it('RV17. the new reply states are offered in the filter, and filtering by them returns their reviews', async () => {
    const pending = await seedStoreReview({ platform: 'ios', reply_state: 'pending_publish', review_body: 'pending one' });
    const unconfirmed = await seedStoreReview({ platform: 'ios', reply_state: 'unconfirmed', review_body: 'unconfirmed one' });
    await seedStoreReview({ platform: 'ios', reply_state: 'none', review_body: 'plain one' });
    const page = await html('/admin/store?platform=ios');
    expect(page).toContain('<option value="pending_publish">Sent, waiting for Apple</option>');
    expect(page).toContain('<option value="unconfirmed">Delivery unconfirmed</option>');
    const onlyPending = await html('/admin/store?platform=ios&reply=pending_publish');
    expect(onlyPending).toContain(pending);
    expect(onlyPending).not.toContain(unconfirmed);
    expect(onlyPending).not.toContain('plain one');
  });
});

describe('the switch', () => {
  it('RV15. sending ships OFF, and the console says so on every reply panel', async () => {
    const config = JSON.parse(wranglerConfig.replace(/^\s*\/\/.*$/gm, ''));
    expect(config.vars.STORE_REPLY_ENABLED).toBe('false');
    const id = await seedStoreReview();
    expect(await html(`/admin/store/${id}`)).toContain('Sending is switched off.');
    expect(panel({ sendingEnabled: true })).not.toContain('Sending is switched off.');
  });
});
