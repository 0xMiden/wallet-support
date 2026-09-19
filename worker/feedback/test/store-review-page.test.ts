/**
 * The Store Reviews pages after the review-page rework: filters and their
 * explanations, the identifier, the reply's two buttons, the editable summary and
 * the suggested reply.
 *
 * The properties that matter most:
 *   PF1-PF3  every filter narrows the list, alone and combined, through the same
 *            URL the form submits, so a filter cannot silently stop applying
 *   PF4      a redacted review's hidden text cannot be probed through search
 *   PS1/PS2  Approve reply (Send, while sending is on) saves and approves in one
 *            step and contacts no store; a saved draft is what the page opens with
 *   PA1/PA2  no AI output renders anywhere on the store pages; the stored data stays
 *   PT1-PT4  reply templates are the maintainer's wording, verbatim, each within
 *            the reply limit, picked by the documented rules, apart from the AI
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import {
  callWorker, seedAdmin, seedStoreReview, adminCookie, adminCsrf, adminHeaders, ADMIN_EMAIL, recordedCalls,
  installFetchStub,
} from './helpers';
import { FILTER_TIPS } from '../src/store/admin';
import { pickTemplate, templateText, TEMPLATE_KEYS } from '../src/store/reply-templates';
import { REPLY_MAX_CHARS, replyLength } from '../src/store/reply-panel';

const BASE = 'https://mfv2.test';
const get = async (path: string, headers: Record<string, string> | null = null) =>
  callWorker(new Request(`${BASE}${path}`, { headers: headers ?? await adminHeaders() }));
const html = async (path: string) => (await get(path)).text();

async function post(path: string, fields: Record<string, string>, csrf = true) {
  const form = new FormData();
  if (csrf) form.set('csrf', await adminCsrf());
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return callWorker(new Request(`${BASE}${path}`, { method: 'POST', body: form, headers: { cookie: await adminCookie() } }));
}

/** The platform_review_ids a list page shows, in order. */
const listed = (page: string) => [...page.matchAll(/<div class="card-head">\s*<span class="rv-key">([^<]+)<\/span>/g)].map((m) => m[1]);

beforeEach(async () => {
  await seedAdmin();
  for (const t of ['store_review_events', 'store_review_versions', 'store_review_replies', 'store_reviews']) {
    await env.DB.prepare(`DELETE FROM ${t}`).run();
  }
});

// ---- filters ---------------------------------------------------------------------------

describe('filters', () => {
  /** Six Android reviews that differ in every filtered column, plus one iOS review that must never show. */
  async function seedMatrix() {
    const T = Date.parse('2026-09-10T00:00:00Z');
    const rows: Array<Record<string, unknown>> = [
      { platform_review_id: 'a-new', review_state: 'awaiting_review', eligibility: 'undecided', ai_labels: '["bug","functional_issue"]', rating: 2, review_body: 'Private send spins forever' },
      { platform_review_id: 'a-act', review_state: 'actionable', eligibility: 'eligible', human_labels: '["ui_issue"]', ai_labels: '["praise"]', rating: 3, review_body: 'Buttons overlap the balance', reply_state: 'drafted' },
      { platform_review_id: 'a-not', review_state: 'not_actionable', eligibility: 'not_eligible', human_labels: '["praise"]', rating: 5, review_body: 'Smoothest wallet', reply_state: 'published' },
      { platform_review_id: 'a-info', review_state: 'needs_info', eligibility: 'not_eligible', human_labels: '["insufficient_info"]', rating: 4, review_body: 'Balance looks wrong sometimes' },
      { platform_review_id: 'a-red', review_state: 'awaiting_review', eligibility: 'undecided', rating: 1, review_body: 'abandon ability able about above absent', secret_scan_status: 'flagged' },
      { platform_review_id: 'a-queued', review_state: 'actionable', eligibility: 'eligible', human_labels: '["bug"]', rating: 1, review_body: 'Crash on open', handoff_state: 'accepted' },
      { platform_review_id: 'i-other', platform: 'ios', review_state: 'actionable', eligibility: 'eligible', human_labels: '["bug"]', rating: 1, review_body: 'Crash on open' },
    ];
    for (const [i, r] of rows.entries()) {
      await seedStoreReview({ secret_scan_status: 'clean', review_created_at: T + i * 60_000, ...r });
    }
  }

  const cases: Array<[string, string[]]> = [
    ['', ['a-queued', 'a-red', 'a-info', 'a-not', 'a-act', 'a-new']],
    ['state=awaiting_review', ['a-red', 'a-new']],
    ['state=actionable', ['a-queued', 'a-act']],
    ['state=not_actionable', ['a-not']],
    ['state=needs_info', ['a-info']],
    ['reply=none', ['a-queued', 'a-red', 'a-info', 'a-new']],
    ['reply=drafted', ['a-act']],
    ['reply=published', ['a-not']],
    // The combined GitHub filter: the decision, then whether it was queued.
    ['github=undecided', ['a-red', 'a-new']],
    ['github=not_eligible', ['a-info', 'a-not']],
    ['github=eligible', ['a-act']],
    ['github=queued', ['a-queued']],
    ['github=failed', []],
    // A person's labels only: a-new was suggested bug by the AI and nobody labelled it.
    ['label=bug', ['a-queued']],
    ['label=praise', ['a-not']],
    ['label=ui_issue', ['a-act']],
    ['rating=1', ['a-queued', 'a-red']],
    ['rating=5', ['a-not']],
    ['q=balance', ['a-info', 'a-act']],
    ['sort=oldest', ['a-new', 'a-act', 'a-not', 'a-info', 'a-red', 'a-queued']],
    ['sort=rating_high', ['a-not', 'a-info', 'a-act', 'a-new', 'a-queued', 'a-red']],
    // Combinations.
    ['state=actionable&github=queued&label=bug', ['a-queued']],
    ['state=actionable&github=eligible', ['a-act']],
    ['github=not_eligible&q=wallet', ['a-not']],
    ['state=awaiting_review&github=undecided&rating=2&reply=none&q=send', ['a-new']],
    ['state=actionable&github=not_eligible', []],
    // Links from before the filters were combined still apply.
    ['eligibility=eligible', ['a-queued', 'a-act']],
    ['handoff=accepted', ['a-queued']],
    ['flagged=yes', ['a-red']],
    ['flagged=no', ['a-queued', 'a-info', 'a-not', 'a-act', 'a-new']],
  ];

  it('PF1. every filter and every combination lists exactly the reviews it says, on its own platform', async () => {
    await seedMatrix();
    for (const [query, want] of cases) {
      const page = await html(`/admin/store?platform=android${query ? `&${query}` : ''}`);
      expect(listed(page), query || '(no filter)').toEqual(want);
    }
    // Queuing that failed, or was interrupted, is "Not queued for GitHub".
    await seedStoreReview({ platform_review_id: 'a-failed', review_state: 'actionable', eligibility: 'eligible', handoff_state: 'failed', review_created_at: 1 });
    await seedStoreReview({ platform_review_id: 'a-stuck', review_state: 'actionable', eligibility: 'eligible', handoff_state: 'requested', review_created_at: 2 });
    expect(listed(await html('/admin/store?platform=android&github=failed'))).toEqual(['a-stuck', 'a-failed']);
    expect(listed(await html('/admin/store?platform=android&github=eligible'))).toEqual(['a-act']);
  });

  it('PF2. the form submits every field it shows, so what the Apply button sends is what PF1 tests', async () => {
    await seedMatrix();
    const page = await html('/admin/store?platform=android&state=actionable&github=eligible');
    const form = page.slice(page.indexOf('<form class="filters store-filters"'), page.indexOf('</form>', page.indexOf('<form class="filters store-filters"')));
    expect(form).toContain('method="GET" action="/admin/store"');
    const names = [...form.matchAll(/name="([a-z]+)"/g)].map((m) => m[1]);
    expect(names).toEqual(['platform', 'q', 'state', 'reply', 'github', 'label', 'rating', 'sort']);
    // The chosen values come back selected, and the chips say them in words.
    expect(form).toContain('<option value="actionable" selected>');
    expect(form).toContain('<option value="eligible" selected>Eligible to send to GitHub</option>');
    expect(page).toContain('>Eligible to send to GitHub ×</a>');
    expect(page).toContain('1 review matching');
  });

  it('PF3. seven filters: Eligibility and GitHub are one, Redacted is gone from the bar', async () => {
    const page = await html('/admin/store?platform=android');
    const form = page.slice(page.indexOf('<form class="filters store-filters"'), page.indexOf('</form>', page.indexOf('<form class="filters store-filters"')));
    const labels = [...form.matchAll(/<label for="f-[a-z]+">([^<]+)<\/label>/g)].map((m) => m[1]);
    expect(labels).toEqual(['Search', 'Triage', 'Reply', 'GitHub', 'Label', 'Rating', 'Sort']);
    const github = form.slice(form.indexOf('id="f-github"'), form.indexOf('</select>', form.indexOf('id="f-github"')));
    expect([...github.matchAll(/<option value="([a-z_]*)"[^>]*>([^<]+)</g)].map((m) => `${m[1]}=${m[2]}`)).toEqual([
      '=Any', 'undecided=Not decided yet', 'not_eligible=Not eligible', 'eligible=Eligible to send to GitHub',
      'queued=Queued for GitHub', 'failed=Not queued for GitHub',
    ]);
    expect(page).not.toContain('Pipeline');
    expect(form).not.toMatch(/Redacted|Eligibility/);
    expect(page).toContain('>Apply filters</button>');
  });

  it('PF6. Apply filters is always on a row with fields: a fixed grid, and nothing else in its cell', async () => {
    await seedMatrix();
    const page = await html('/admin/store?platform=android&state=actionable&rating=1');
    const form = page.slice(page.indexOf('<form class="filters store-filters"'), page.indexOf('</form>', page.indexOf('<form class="filters store-filters"')));
    // One cell per field, named for the grid; the Apply cell holds only the button and its status.
    for (const key of ['q', 'state', 'reply', 'github', 'label', 'rating', 'sort']) expect(form).toMatch(new RegExp(`class="fl [^"]*\\bfl-${key}\\b`));
    const actions = form.slice(form.indexOf('<div class="fl-actions">'));
    expect(actions.replace(/\s+/g, ' ')).toBe('<div class="fl-actions"> <span class="fl-pending" id="filters-pending" role="status" aria-live="polite"></span> <button type="submit">Apply filters</button> </div> ');
    // "Clear all" sits with the active chips, outside the bar.
    expect(form).not.toContain('Clear all');
    expect(page).toMatch(/<div class="chips active-filters">[\s\S]*?<a class="clear" href="\/admin\/store\?platform=android">Clear all<\/a><\/div>/);
    const css = page.slice(page.indexOf('<style>'), page.indexOf('</style>'));
    expect(css).toContain('grid-template-areas:"q state reply github label rating sort act"');
    expect(css).toContain('grid-template-areas:"q q q act" "state reply github label" "rating sort . ."');
  });

  it('PF4. search never matches the hidden text of a redacted review', async () => {
    await seedMatrix();
    // The redacted review's text is six words of a seed phrase. Guessing one must not light it up.
    expect(listed(await html('/admin/store?platform=android&q=abandon'))).toEqual([]);
    expect(await html('/admin/store?platform=android&q=abandon')).toContain('No review matches these filters');
    // It is still in the list, with its badge, and still reachable by an old flagged= link.
    expect(await html('/admin/store?platform=android')).toContain('<span class="badge b-quarantined">Redacted</span>');
    expect(listed(await html('/admin/store?platform=android&flagged=yes'))).toEqual(['a-red']);
    // The tooltip does not talk about it.
    expect(FILTER_TIPS.q).toBe('Finds reviews with these words in the title or text; use it to look up a specific review or topic.');
  });

  it('PF5. every filter has an (i) whose one-sentence explanation is its accessible description', async () => {
    const page = await html('/admin/store?platform=android');
    const keys = ['q', 'state', 'reply', 'github', 'label', 'rating', 'sort'];
    expect(Object.keys(FILTER_TIPS).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      const tip = FILTER_TIPS[key];
      expect(tip, key).toMatch(/^[A-Z][^.]*\.$/);
      expect(page).toContain(`<span class="tip" role="tooltip" id="tip-${key}">`);
      // The field itself and its (i) button are both described by the tooltip.
      expect(page).toMatch(new RegExp(`id="f-${key}"[^>]*aria-describedby="tip-${key}"`));
      expect(page).toMatch(new RegExp(`<button type="button" class="info" aria-label="About [^"]+" aria-describedby="tip-${key}">i</button>`));
      expect(page).toContain(`<label for="f-${key}">`);
    }
    // type="button": opening an explanation never submits the form.
    const infos = page.match(/<button[^>]*class="info"[^>]*>/g) ?? [];
    expect(infos).toHaveLength(7);
    for (const b of infos) expect(b).toContain('type="button"');
  });
});

// ---- identifier, home and the way into a review --------------------------------------------

describe('the review identifier, home and Open reply page', () => {
  it('PI1. a list card shows the id as plain text and opens the review with a labelled button', async () => {
    const id = await seedStoreReview({ platform: 'ios', platform_review_id: 'sample-as-01', review_title: 'Stuck after update', review_state: 'awaiting_review' });
    const list = await html('/admin/store?platform=ios');
    const head = list.slice(list.indexOf('<div class="card-head">'), list.indexOf('</div>', list.indexOf('<div class="card-head">')));
    expect(head).toMatch(/^<div class="card-head">\s*<span class="rv-key">sample-as-01<\/span>/);
    expect(head).toContain(`<a class="btn-link" href="/admin/store/${id}"><svg class="icon"`);
    expect(head).toContain('<span>Open reply page</span><span class="vh"> for sample-as-01</span></a>');
    // The id itself is no longer a link: one obvious way in.
    expect((head.match(/<a /g) ?? []).length).toBe(1);
  });

  it('PI2. the review page has a home icon back to its list, and keeps platform and id as plain text', async () => {
    const id = await seedStoreReview({ platform: 'ios', platform_review_id: 'sample-as-01', review_title: 'Stuck after update', review_state: 'awaiting_review' });
    const page = await html(`/admin/store/${id}`);
    expect(page).toMatch(/<a class="home-link" href="\/admin\/store\?platform=ios" aria-label="Back to the review list" title="Back to the review list"><svg class="icon"/);
    expect(page).toContain('<p class="rv-platform">iOS — Apple App Store</p>');
    expect(page).toContain('<h2 class="rv-title-key"><span class="rv-key">sample-as-01</span></h2>');
    // No text breadcrumb any more.
    expect(page).not.toContain('aria-current="page">sample-as-01');
    expect(page).toContain('<p class="rv-title">Stuck after update</p>');
  });

  it('PI3. the review page calls the handoff GitHub everywhere, history included', async () => {
    const id = await seedStoreReview({ review_state: 'actionable' });
    await env.DB.prepare(`INSERT INTO store_review_events (store_review_id, at, kind, detail, actor) VALUES (?,?,?,?,?)`)
      .bind(id, Date.now(), 'handoff', 'Queued for GitHub', ADMIN_EMAIL).run();
    const page = await html(`/admin/store/${id}`);
    expect(page).toContain('<span class="tag">GitHub</span>');
    expect(page).not.toContain('Pipeline');
  });

  it('PI4. a redacted review still shows no title anywhere', async () => {
    const id = await seedStoreReview({ platform: 'ios', review_title: 'SECRET-TITLE-MARKER', secret_scan_status: 'flagged' });
    expect(await html(`/admin/store/${id}`)).not.toContain('SECRET-TITLE-MARKER');
  });
});

// ---- no AI output -------------------------------------------------------------------------

describe('no AI output on the store pages', () => {
  it('PA1. neither the list nor the review page renders anything the model produced; the data stays stored', async () => {
    const structured = JSON.stringify({ summary: 'AI-SUMMARY-MARKER', affected_area: 'AI-AREA-MARKER', version_mentioned: '9.9.9' });
    const id = await seedStoreReview({ platform: 'android', review_state: 'awaiting_review', ai_labels: '["technical_issue"]',
      ai_structured: structured, ai_confidence: 0.77, ai_model: 'AI-MODEL-MARKER', ai_classified_at: Date.now() });
    await env.DB.prepare(`INSERT INTO store_review_events (store_review_id, at, kind, from_state, to_state, detail, actor) VALUES (?,?,?,?,?,?,?)`)
      .bind(id, Date.now(), 'classify', 'classifying', 'awaiting_review', 'labels suggested: AI-EVENT-MARKER', 'classifier').run();
    for (const page of [await html('/admin/store?platform=android'), await html(`/admin/store/${id}`)]) {
      for (const gone of ['What the AI suggests', 'AI suggests', 'AI-SUMMARY-MARKER', 'AI-AREA-MARKER', 'AI-MODEL-MARKER',
        'AI-EVENT-MARKER', 'technical_issue</span>', 'No AI suggestion', 'Save summary', '/summary"']) {
        expect(page, gone).not.toContain(gone);
      }
    }
    // Nothing was deleted: the classifier's record is intact.
    const row = await env.DB.prepare('SELECT ai_labels, ai_structured, ai_model FROM store_reviews WHERE store_review_id = ?').bind(id).first<any>();
    expect(row).toEqual({ ai_labels: '["technical_issue"]', ai_structured: structured, ai_model: 'AI-MODEL-MARKER' });
    // And the summary save route is gone, not merely hidden.
    expect((await post(`/admin/store/${id}/summary`, { seen: '', summary: 'x' })).status).toBe(404);
  });

  it('PA2. a person\'s labels still show, and still pick the reply template', async () => {
    const id = await seedStoreReview({ platform: 'android', rating: 2, review_state: 'actionable', ai_labels: '["praise"]', human_labels: '["bug"]' });
    const page = await html(`/admin/store/${id}`);
    // Always "Labels", for one label or several.
    expect(page).toContain('<span class="chips-by">Labels</span><span class="tag">bug</span>');
    const two = await seedStoreReview({ platform: 'android', rating: 2, review_state: 'actionable', human_labels: '["bug","ui_issue"]' });
    expect(await html(`/admin/store/${two}`)).toContain('<span class="chips-by">Labels</span><span class="tag">bug</span><span class="tag">ui_issue</span>');
    expect(page).toContain('Please share more details through our feedback form');
  });
});

// ---- reply: Save as draft and Send -------------------------------------------------------

describe('reply: Save as draft and Approve reply / Send', () => {
  const rev = (id: string) => env.DB.prepare('SELECT reply_state, current_reply_id FROM store_reviews WHERE store_review_id = ?').bind(id).first<any>();

  it('PS1. Approve reply with nothing saved yet saves and approves in one step, and contacts no store', async () => {
    installFetchStub();
    const id = await seedStoreReview({ review_state: 'awaiting_review' });
    const before = recordedCalls().length;
    const res = await post(`/admin/store/${id}/reply/send`, { reply_id: '', body: 'Thanks for telling us.' });
    expect(res.status).toBe(303);
    const r = await rev(id);
    expect(r.reply_state).toBe('approved');
    const reply = await env.DB.prepare('SELECT * FROM store_review_replies WHERE reply_id = ?').bind(r.current_reply_id).first<any>();
    expect(reply).toMatchObject({ state: 'approved', body: 'Thanks for telling us.', created_by: ADMIN_EMAIL, approved_by: ADMIN_EMAIL, published_at: null });
    const events = (await env.DB.prepare('SELECT detail FROM store_review_events WHERE store_review_id = ? ORDER BY id').bind(id).all<any>()).results.map((e) => e.detail);
    expect(events).toEqual(['Draft saved', 'Reply approved']);
    expect(recordedCalls().length).toBe(before);
    expect(await html(`/admin/store/${id}`)).toContain('Waiting to send. Sending is switched off.');
  });

  it('PS2. Save as draft keeps the text, and reopening the page restores it; Approve reply then approves that draft with any edits', async () => {
    const id = await seedStoreReview({ review_state: 'awaiting_review' });
    expect((await post(`/admin/store/${id}/reply/draft`, { reply_id: '', body: 'First words' })).status).toBe(303);
    const { current_reply_id: draftId } = await rev(id);
    let page = await html(`/admin/store/${id}`);
    expect(page).toContain('/reply/send">Approve reply</button>');
    expect(page).toContain('>First words</textarea>');
    expect(page).toContain(`name="reply_id" value="${draftId}"`);

    expect((await post(`/admin/store/${id}/reply/draft`, { reply_id: draftId, body: 'Second words' })).status).toBe(303);
    page = await html(`/admin/store/${id}`);
    expect(page).toContain('>Second words</textarea>');

    expect((await post(`/admin/store/${id}/reply/send`, { reply_id: draftId, body: 'Final words' })).status).toBe(303);
    expect(await rev(id)).toEqual({ reply_state: 'approved', current_reply_id: draftId });
    expect((await env.DB.prepare('SELECT body, state FROM store_review_replies WHERE reply_id = ?').bind(draftId).first<any>()))
      .toEqual({ body: 'Final words', state: 'approved' });
  });

  it('PS3. Send on a reply someone else has changed is refused, and what was typed is kept on the page', async () => {
    const id = await seedStoreReview({ review_state: 'awaiting_review' });
    await post(`/admin/store/${id}/reply/draft`, { reply_id: '', body: 'Theirs' });
    const res = await post(`/admin/store/${id}/reply/send`, { reply_id: '', body: 'Mine, typed on a stale page' });
    expect(res.status).toBe(409);
    const page = await res.text();
    expect(page).toContain('What you typed (not saved)');
    expect(page).toContain('Mine, typed on a stale page');
    expect((await rev(id)).reply_state).toBe('drafted');
  });

  it('PS4. Send needs the CSRF token and a reply', async () => {
    const id = await seedStoreReview({ review_state: 'awaiting_review' });
    expect((await post(`/admin/store/${id}/reply/send`, { reply_id: '', body: 'x' }, false)).status).toBe(403);
    expect((await post(`/admin/store/${id}/reply/send`, { reply_id: '', body: '   ' })).status).toBe(400);
    expect((await rev(id)).current_reply_id).toBeNull();
  });
});

// ---- reply templates ---------------------------------------------------------------------

describe('reply templates', () => {
  const FORM = 'https://support.miden.xyz/feedback';
  const TEXT = {
    positive: "Thank you for the awesome feedback! We're super happy the app is helpful for you. If you ever have ideas on how we can make it even better, feel free to let us know!",
    constructive: "Thanks for taking the time to share your thoughts! We love hearing ideas from our community. We've noted your feature request down for our team to consider in upcoming updates.",
    bug: `We're really sorry to hear you're having trouble! We want to make this right for you. Please share more details through our feedback form: ${FORM} We'd love to help troubleshoot.`,
    general: "Thank you for your candid feedback. We're sorry the app didn't meet your expectations. We're constantly working to make improvements, and your input helps us do just that.",
  };
  const shown = (t: string) => t.replace(/'/g, '&#39;');

  it('PT1. the templates are the maintainer\'s wording, verbatim, complete, and each fits the reply limit', () => {
    for (const k of TEMPLATE_KEYS) {
      expect(templateText(k)).toBe(TEXT[k]);
      // Complete: no placeholder left to fill, no email instruction.
      expect(templateText(k)).not.toMatch(/\[|\]|email/i);
      expect(replyLength(templateText(k)), k).toBeLessThanOrEqual(REPLY_MAX_CHARS);
    }
  });

  it('PT2. the template follows the rating and labels as specified', () => {
    expect(pickTemplate(5, [])).toBe('positive');
    expect(pickTemplate(5, ['feature_request'])).toBe('positive');
    expect(pickTemplate(4, [])).toBe('positive');
    expect(pickTemplate(4, ['feature_request'])).toBe('constructive');
    expect(pickTemplate(3, [])).toBe('constructive');
    expect(pickTemplate(3, ['bug'])).toBe('constructive');
    for (const l of ['bug', 'functional_issue', 'ui_issue', 'ux_issue', 'technical_issue']) {
      expect(pickTemplate(2, [l]), l).toBe('bug');
      expect(pickTemplate(1, ['praise', l]), l).toBe('bug');
    }
    expect(pickTemplate(1, [])).toBe('general');
    expect(pickTemplate(2, ['complaint_no_issue'])).toBe('general');
    expect(pickTemplate(null, [])).toBe('constructive');
  });

  it('PT3. "Reply templates" is its own section under the reply, picked from a person\'s labels only', async () => {
    const id = await seedStoreReview({ rating: 2, human_labels: '["bug"]', review_state: 'actionable' });
    const page = await html(`/admin/store/${id}`);
    const reply = page.indexOf('id="reply"');
    const templates = page.indexOf('<h3 class="sect" id="templates">Reply templates</h3>');
    const decision = page.indexOf('id="decision"');
    expect(reply).toBeGreaterThan(0);
    expect(templates).toBeGreaterThan(reply);
    expect(decision).toBeGreaterThan(templates);
    const tplSection = page.slice(templates, decision);
    expect(tplSection).toContain(`${shown(TEXT.bug)}</textarea>`);
    expect(tplSection).toContain(`maxlength="${REPLY_MAX_CHARS}"`);
    expect(page).not.toMatch(/support address|Your Support Email/i);
    // The AI's suggestion does not pick the template: a 1-star review the AI called a bug,
    // with no label from a person, gets General.
    const aiOnly = await seedStoreReview({ rating: 1, ai_labels: '["bug"]', review_state: 'awaiting_review' });
    expect(await html(`/admin/store/${aiOnly}`)).toContain(`${shown(TEXT.general)}</textarea>`);
  });

  it('PT4. a template can be switched, without a script by link; Copy targets the field and waits for the script', async () => {
    const id = await seedStoreReview({ rating: 5, review_state: 'awaiting_review' });
    const page = await html(`/admin/store/${id}?template=general`);
    expect(page).toContain(`${shown(TEXT.general)}</textarea>`);
    expect(page).toMatch(/href="\/admin\/store\/[^"]+\?template=general#templates"[\s\S]*?aria-current="true">General dissatisfaction/);
    // The rating's own pick is still marked as the suggestion.
    expect(page).toMatch(/Positive <span class="tpl-pick">suggested<\/span>/);
    expect(page).toContain('<button type="button" class="btn-primary btn-small" data-copy="template-text" data-status="copy-status" hidden>Copy</button>');
    // An unknown template is ignored, not rendered.
    expect(await html(`/admin/store/${id}?template=<script>`)).toContain(`${shown(TEXT.positive)}</textarea>`);
  });

  it('PT5. the script is served behind sign-in, as JavaScript, with nosniff', async () => {
    const res = await get('/admin/store/review.js');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    const js = await res.text();
    expect(js).toContain('navigator.clipboard.writeText');
    // Copies the field's exact value: no trimming, no markup.
    expect(js).toContain('const text = field.value;');
    expect(js).not.toMatch(/fetch\(|XMLHttpRequest|innerHTML|eval\(/);

    const signedOut = await get('/admin/store/review.js', {});
    expect(await signedOut.text()).not.toContain('navigator.clipboard');
  });
});
