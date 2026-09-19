/**
 * Store Reviews in the console — the Android and iOS pages, and one review.
 *
 * PHASE 3: the read surface. List, filters, search, sorting, paging, and a
 * detail page carrying the full edit history and processing timeline.
 *
 * STILL NOTHING HERE WRITES. Not to store_reviews, and — this is the one that
 * matters — not to `submissions`. The existing feedback pipeline cannot be
 * reached from this file at all. Classification is Phase 4; the reply and
 * handoff ACTIONS are Phases 5 and 6, and they arrive with their own guard.
 *
 * ACCESS. These pages inherit /admin/review's open access, which is safe while
 * they are read-only. Admin authentication is a known open item, deferred by
 * the maintainer; the actions in Phases 5 and 6 are what turn it from an
 * improvement into a prerequisite, because approving a reply publishes public
 * text under Bread Wallet's developer account and the handoff opens a public
 * issue on a third-party repository.
 *
 * Every rule review.ts renders under holds here too, and for the same reason:
 * a store review is a stranger's text from a public listing. Zero JavaScript,
 * everything escaped, bodies inside <pre>, and a review flagged by the secret
 * scanner is never rendered at all — not its body and not its title.
 *
 * The filter form is a plain <form method=GET>, and every page here works with
 * no JavaScript. One small script (review-script.ts) adds what cannot be done
 * without it — Copy, switching a reply template without a reload, closing a
 * tooltip — and is allowed by a per-response nonce, so the CSP still permits no
 * inline script, no eval and no network access.
 */
import { esc, page, sidebar } from '../lib/admin-chrome';
import { PLATFORMS, buildNav } from '../lib/admin-nav';
import {
  REVIEW_STATES, REPLY_STATES, LABELS,
  REVIEW_STATE_LABEL, REVIEW_STATE_BADGE, REPLY_STATE_LABEL, HANDOFF_STATE_LABEL, ELIGIBILITY_LABEL,
} from './states';
import {
  parseQuery, buildQuery, withParam, hasFilters, SORTS, PAGE_SIZE, GITHUB_FILTERS, type StoreQuery,
} from './query';
import { isUuidV4 } from '../lib/validate';
import { csrfToken, csrfOk, type AdminUser } from '../lib/admin-auth';
import { runReplyAction, REPLY_ACTIONS, type ReplyAction } from './reply-flow';
import { replyPanel, replyPreview, storeReplyOf, REPLY_MAX_CHARS, type ReplyRow, type StoreReply } from './reply-panel';
import { editedAt, editObservedAt, loadEditedAt } from './edits';
import { runDecision, runHandoff } from './decision';
import { decisionPanel, type DecisionDraft } from './decision-panel';
import {
  TEMPLATE_KEYS, TEMPLATE_NAME, templateText, pickTemplate, isTemplateKey, type TemplateKey,
} from './reply-templates';
import { REVIEW_SCRIPT } from './review-script';

interface StoreEnv {
  DB: D1Database;
  ADMIN_SESSION_SECRET?: string;
  /** Anything but the literal "true" means no reply is ever sent to a store. */
  STORE_REPLY_ENABLED?: string;
  /** Anything but the literal "true" means no review is ever written into the pipeline. */
  STORE_HANDOFF_ENABLED?: string;
  /** Where the pipeline files issues, for links to them. */
  TARGET_REPO?: string;
}

/** What a refused POST puts back on the page, next to the section it came from. */
interface DetailExtras {
  status?: number;
  replyNotice?: string | null;
  unsaved?: string | null;
  decisionNotice?: string | null;
  decisionDraft?: DecisionDraft | null;
  /** The reply template picked by link, when the script is not running. */
  template?: string | null;
}

/**
 * A page that loads the one Store Reviews script.
 *
 * The nonce is new on every response, and it is the only way a script runs here:
 * no 'unsafe-inline', no 'unsafe-eval', and default-src 'none' still covers
 * connect-src, so nothing on the page can make a request. base-uri 'none' keeps an
 * injected <base> from redirecting the script's relative address.
 */
function scriptedPage(title: string, body: string, status: number, aside: string): Response {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  return page(title, `${body}<script nonce="${nonce}" src="/admin/store/review.js" defer></script>`, status, {
    'content-security-policy':
      `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; base-uri 'none'`,
  }, aside);
}

/** The columns the list reads. Named, never `SELECT *`. */
const LIST_COLUMNS = `store_review_id, platform, source, app_id, platform_review_id,
  review_title, review_body, rating, reviewer_name, territory, language,
  review_created_at, review_updated_at, app_version, device, device_product,
  review_state, reply_state, handoff_state, eligibility, current_reply_id,
  human_labels, secret_scan_status, sync_error`;

/**
 * A rating, as stars. Text, not an image or a webfont — the CSP forbids both,
 * and a star is the one glyph every platform draws the same way. `aria-label`
 * carries the number so a screen reader is told "2 out of 5" rather than five
 * ambiguous symbols.
 */
function stars(rating: number | null): string {
  if (rating == null || rating < 1 || rating > 5) return '<span class="tag">no rating</span>';
  const n = Math.round(rating);
  // Low ratings are the ones worth finding in a list, so they get the colour.
  return `<span class="${n <= 2 ? 'rating r-low' : 'rating'}" aria-label="${n} out of 5">${
    '★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

function when(ms: number | null): string {
  if (!ms) return 'unknown date';
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 16);
}

/**
 * A person's labels. The AI's suggested labels stay in the database but are not
 * shown anywhere in the console (maintainer, 2026-09-15): nothing the model says
 * renders, so the page never shows a suggestion as though it were a label.
 */
function labelChips(row: any): string {
  let parsed: unknown = [];
  try { parsed = JSON.parse(row.human_labels ?? '[]'); } catch { parsed = []; }
  const labels = Array.isArray(parsed) ? parsed.map(String) : [];
  if (labels.length === 0) return '';
  // Named apart from the labels themselves: always "Labels" (maintainer, 2026-09-15).
  const by = 'Labels';
  // Escaped even though these come from an allowlist: this page must not
  // depend on a guarantee made in another module.
  return `<div class="chips"><span class="chips-by">${esc(by)}</span>${
    labels.map((l) => `<span class="tag">${esc(l)}</span>`).join('')}</div>`;
}

/** The review's own words, or the placeholder that stands in for them. */
function bodyOf(row: any, cls = ''): string {
  if (row.secret_scan_status === 'flagged') {
    return '<pre class="redacted">[redacted — this review appeared to contain a key or seed phrase]</pre>';
  }
  return `<pre${cls ? ` class="${cls}"` : ''}>${esc(row.review_body ?? '')}</pre>`;
}

/** `edited` is a PROVEN edit time from the review's history (see edits.ts), never a bare timestamp. */
function metaLine(row: any, edited: number | null = null): string {
  return [
    row.reviewer_name ? `by <b>${esc(row.reviewer_name)}</b>` : null,
    row.app_version ? `version <b>${esc(row.app_version)}</b>` : null,
    // device_product is the name on the box ("Pixel 7"); `device` is the
    // codename ("panther"). The detail table already preferred the former and
    // the meta line did not, so one page disagreed with itself.
    (row.device_product ?? row.device)
      ? `device <b>${esc(row.device_product ?? row.device)}</b>` : null,
    row.territory ? `<b>${esc(row.territory)}</b>` : null,
    edited ? `edited <b>${esc(when(edited))}</b>` : null,
  ].filter(Boolean).join(' <span class="sep">·</span> ');
}

function badges(row: any): string {
  const out = [
    `<span class="badge ${esc(REVIEW_STATE_BADGE[row.review_state] ?? 'b-queued')}">${
      esc(REVIEW_STATE_LABEL[row.review_state] ?? row.review_state)}</span>`,
  ];
  if (row.reply_state && row.reply_state !== 'none') {
    out.push(`<span class="badge b-queued">${
      esc(REPLY_STATE_LABEL[row.reply_state] ?? row.reply_state)}</span>`);
  }
  if (row.handoff_state && row.handoff_state !== 'none') {
    out.push(`<span class="badge b-queued">${
      esc(HANDOFF_STATE_LABEL[row.handoff_state] ?? row.handoff_state)}</span>`);
  }
  if (row.secret_scan_status === 'flagged') {
    out.push('<span class="badge b-quarantined">Redacted</span>');
  }
  return out.join('');
}

function renderRow(row: any, preview = '', edited: number | null = null): string {
  const href = `/admin/store/${encodeURIComponent(row.store_review_id)}`;
  const meta = metaLine(row, edited);
  // The identifier leads the card as plain text; the way into the review is a
  // button that looks like one, with an icon and a label that says where it goes.
  return `<article class="card">
    <div class="card-head">
      <span class="rv-key">${esc(row.platform_review_id)}</span>
      ${badges(row)}
      ${stars(row.rating)}
      <span class="when">${esc(when(row.review_created_at))} UTC</span>
      <a class="btn-link" href="${esc(href)}">${ICON_REPLY}<span>Open reply page</span><span class="vh"> for ${esc(row.platform_review_id)}</span></a>
    </div>
    <div class="card-body">
      ${labelChips(row)}
      ${row.review_title && row.secret_scan_status !== 'flagged'
        ? `<p class="rv-title">${esc(row.review_title)}</p>` : ''}
      ${meta ? `<p class="meta">${meta}</p>` : ''}
      ${bodyOf(row, 'clamp')}
      ${preview}
      ${row.sync_error ? `<p class="note">Last sync error: ${esc(String(row.sync_error).slice(0, 160))}</p>` : ''}
    </div>
  </article>`;
}

/**
 * What each filter does, one sentence, shown by the (i) beside its name.
 *
 * The explanation is the control's accessible description (aria-describedby on
 * both the field and the button), so a screen reader hears it on focus, and it
 * opens on hover, on keyboard focus and on tap without depending on the script.
 */
export const FILTER_TIPS: Record<string, string> = {
  // Search skips redacted reviews (query.ts); the tooltip does not say so, by the maintainer's call.
  q: 'Finds reviews with these words in the title or text; use it to look up a specific review or topic.',
  state: 'Shows reviews at one triage stage, such as Awaiting review for reviews nobody has decided on yet.',
  reply: 'Shows reviews by where their reply stands, such as Awaiting reply for reviews nobody has answered.',
  github: 'Shows reviews by where they stand with GitHub, from the team\u2019s decision to whether they were queued.',
  label: 'Shows reviews with one label set by the team.',
  rating: 'Shows reviews with exactly this many stars.',
  sort: 'Changes the order of the list, such as showing the lowest-rated reviews first.',
};

function fieldHead(key: string, label: string): string {
  return `<span class="fl-head"><label for="f-${esc(key)}">${esc(label)}</label><span class="tipwrap">
    <button type="button" class="info" aria-label="About ${esc(label)}" aria-describedby="tip-${esc(key)}">i</button>
    <span class="tip" role="tooltip" id="tip-${esc(key)}">${esc(FILTER_TIPS[key] ?? '')}</span></span></span>`;
}

/** Inline SVG icons: the CSP allows no image or font from anywhere else. */
const ICON_REPLY = '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">'
  + '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
  + 'd="M9 14 4 9l5-5"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
  + 'stroke-linejoin="round" d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
const ICON_HOME = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">'
  + '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
  + 'd="M3 10.5 12 3l9 7.5"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
  + 'stroke-linejoin="round" d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>';

/** One <select>, built from an allowlist with the current value preselected. */
function select(
  name: string, current: string | null, groupLabel: string,
  options: ReadonlyArray<readonly [string, string]>, any = true, cls = ''
): string {
  return `<div class="fl fl-${esc(name)}${cls ? ` ${cls}` : ''}">${fieldHead(name, groupLabel)}
    <select id="f-${esc(name)}" name="${esc(name)}" aria-describedby="tip-${esc(name)}">
      ${any ? '<option value="">Any</option>' : ''}
      ${options.map(([value, label]) =>
        `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`
      ).join('')}
    </select></div>`;
}

const pairs = (values: readonly string[], labels: Record<string, string> = {}) =>
  values.map((v) => [v, labels[v] ?? v] as const);

/**
 * The filter bar: seven controls, not nine.
 *
 * Eligibility and GitHub were two halves of one question and are one filter now
 * (query.ts, GITHUB_FILTERS). Redacted is gone from the bar: it was rarely used,
 * and a redacted review already carries a Redacted badge in the list. Old links
 * with eligibility=, handoff= or flagged= still apply and show as removable chips.
 *
 * Not split into pipeline stages: a review runs three independent tracks — triage,
 * the reply to the reviewer, and GitHub — and Reply belongs to neither "intake"
 * nor "GitHub", while Search, Label and Rating describe the review itself.
 */
const GITHUB_FILTER_LABEL: Record<string, string> = {
  undecided: ELIGIBILITY_LABEL.undecided,
  not_eligible: ELIGIBILITY_LABEL.not_eligible,
  eligible: ELIGIBILITY_LABEL.eligible,
  queued: HANDOFF_STATE_LABEL.accepted,
  failed: HANDOFF_STATE_LABEL.failed,
};

function filterBar(q: StoreQuery): string {
  return `<form class="filters store-filters" method="GET" action="/admin/store">
    <input type="hidden" name="platform" value="${esc(q.platform)}">
    <div class="fl grow fl-q">${fieldHead('q', 'Search')}
      <input type="search" id="f-q" name="q" value="${esc(q.search ?? '')}" maxlength="120"
             placeholder="words in the title or body" aria-describedby="tip-q"></div>
    ${select('state', q.state, 'Triage', pairs(REVIEW_STATES, REVIEW_STATE_LABEL))}
    ${select('reply', q.reply, 'Reply', pairs(REPLY_STATES, REPLY_STATE_LABEL))}
    ${select('github', q.github, 'GitHub', pairs(GITHUB_FILTERS, GITHUB_FILTER_LABEL))}
    ${select('label', q.label, 'Label', pairs(LABELS))}
    ${select('rating', q.rating == null ? null : String(q.rating), 'Rating',
      [['1', '1 star'], ['2', '2 stars'], ['3', '3 stars'], ['4', '4 stars'], ['5', '5 stars']])}
    ${select('sort', q.sort, 'Sort', Object.entries(SORTS).map(([k, v]) => [k, v.label] as const), false, 'fl-wide')}
    <div class="fl-actions">
      <span class="fl-pending" id="filters-pending" role="status" aria-live="polite"></span>
      <button type="submit">Apply filters</button>
    </div>
  </form>`;
}

/** The filters currently narrowing the list, each removable on its own. */
function activeChips(q: StoreQuery): string {
  const active: Array<[string, string]> = [];
  const add = (key: string, value: string | null, shown: string) => {
    if (value) active.push([key, shown]);
  };
  add('q', q.search, `“${q.search}”`);
  add('state', q.state, REVIEW_STATE_LABEL[q.state ?? ''] ?? q.state ?? '');
  add('reply', q.reply, REPLY_STATE_LABEL[q.reply ?? ''] ?? q.reply ?? '');
  add('handoff', q.handoff, HANDOFF_STATE_LABEL[q.handoff ?? ''] ?? q.handoff ?? '');
  add('eligibility', q.eligibility, ELIGIBILITY_LABEL[q.eligibility ?? ''] ?? q.eligibility ?? '');
  add('github', q.github, GITHUB_FILTER_LABEL[q.github ?? ''] ?? '');
  add('label', q.label, q.label ?? '');
  if (q.rating != null) active.push(['rating', `${q.rating}★`]);
  if (q.flagged !== null) {
    active.push(['flagged', q.flagged ? 'redacted only' : 'no redacted']);
  }
  if (active.length === 0) return '';
  // "Clear all" sits with the filters it clears, so the filter bar keeps one fixed
  // shape whether or not anything is applied.
  return `<div class="chips active-filters">${active.map(([key, shown]) =>
    `<a class="tag removable" href="${esc(withParam(q, key, null))}">${esc(shown)} ×</a>`
  ).join('')}<a class="clear" href="/admin/store?platform=${esc(q.platform)}">Clear all</a></div>`;
}

function pager(q: StoreQuery, total: number): string {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return '';
  const prev = q.page > 1
    ? `<a href="${esc(withParam(q, 'page', String(q.page - 1)))}">&lsaquo; Newer</a>`
    : '<span>&lsaquo; Newer</span>';
  const next = q.page < pages
    ? `<a href="${esc(withParam(q, 'page', String(q.page + 1)))}">Older &rsaquo;</a>`
    : '<span>Older &rsaquo;</span>';
  return `<nav class="pager" aria-label="Pages">${prev}
    <span class="pos">Page ${q.page} of ${pages}</span>${next}</nav>`;
}

/**
 * "No reviews" and "not collecting" are opposite situations and must not share
 * a message: the first is good news, the second is an outage wearing its
 * clothes. A third case — filters matching nothing — is neither, and saying
 * "not collecting yet" to someone who has just typed a search would be a lie.
 */
function emptyState(q: StoreQuery, store: string, syncedAt: number | null): string {
  if (hasFilters(q)) {
    return `<div class="empty">
      <p class="big">&#8981;</p><h3>No review matches these filters</h3>
      <p>Nothing here matched. <a href="/admin/store?platform=${esc(q.platform)}">Clear the filters</a>
         to see everything from ${esc(store)}.</p></div>`;
  }
  if (syncedAt) {
    return `<div class="empty">
      <p class="big">&#10003;</p><h3>No reviews to show</h3>
      <p>Nothing new from ${esc(store)} since the last sync (${esc(when(syncedAt))} UTC).
         New reviews appear here automatically.</p></div>`;
  }
  return `<div class="empty">
    <p class="big">&#9676;</p><h3>Not collecting yet</h3>
    <p>No review has been synced from ${esc(store)}. Collection starts once the store
       credentials are configured; until then this page stays empty and nothing is
       being missed on our side.</p></div>`;
}

/**
 * Reply templates: fixed text to copy into the reply, picked from the rating and
 * labels a person set (reply-templates.ts). None of it is the model's. Nothing here sends anything, and the field is capped at the
 * reply limit so an edited template still fits.
 */
function templatesPanel(row: any, x: DetailExtras): string {
  const base = `/admin/store/${encodeURIComponent(row.store_review_id)}`;
  // A person's labels, the same ones the list shows and filters on. The AI's are
  // not used: nothing the model suggests shapes what the page shows.
  let labels: string[] = [];
  try { const v = JSON.parse(row.human_labels ?? '[]'); labels = Array.isArray(v) ? v.map(String) : []; } catch { labels = []; }
  const suggested = pickTemplate(row.rating, labels);
  const current: TemplateKey = isTemplateKey(x.template) ? x.template : suggested;
  const links = TEMPLATE_KEYS.map((k) => `<a class="tpl" href="${esc(`${base}?template=${k}#templates`)}"
      data-template-text="${esc(templateText(k))}" data-target="template-text"${
      k === current ? ' aria-current="true"' : ''}>${esc(TEMPLATE_NAME[k])}${k === suggested ? ' <span class="tpl-pick">suggested</span>' : ''}</a>`).join('');
  return `<div class="reply-card suggested">
      <div class="sugg-head">
        <nav class="tpls" aria-label="Reply templates">${links}</nav>
        <span class="copy-status" id="copy-status" role="status" aria-live="polite"></span>
        <button type="button" class="btn-primary btn-small" data-copy="template-text" data-status="copy-status" hidden>Copy</button>
      </div>
      <textarea id="template-text" class="sugg-text" rows="4" maxlength="${REPLY_MAX_CHARS}" aria-labelledby="templates"
        aria-describedby="template-hint">${esc(templateText(current))}</textarea>
      <p class="reply-hint" id="template-hint">Chosen from the star rating and labels. Edit it here, then copy it into your reply.</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// One review
// ---------------------------------------------------------------------------

const EVENT_LABEL: Record<string, string> = {
  sync: 'Sync', classify: 'AI', human: 'Decision', reply: 'Reply', handoff: 'GitHub',
};

async function renderDetail(
  env: StoreEnv, id: string, csrf: string, x: DetailExtras = {}
): Promise<Response> {
  const row = await env.DB.prepare(
    'SELECT * FROM store_reviews WHERE store_review_id = ?'
  ).bind(id).first<any>();

  if (!row) {
    return page('Store Reviews',
      `<div class="refused"><h1>Not found</h1>
       <p>That review is not in the console.</p>
       <p><a href="/admin/store?platform=android">Back to Store Reviews</a></p></div>`, 404);
  }

  const { groups } = await buildNav(env.DB, `store:${row.platform}`);
  const flagged = row.secret_scan_status === 'flagged';

  const versions = await env.DB.prepare(
    `SELECT id, raw_hash, raw_json, rating, observed_at FROM store_review_versions
      WHERE store_review_id = ? ORDER BY id`
  ).bind(id).all<any>();

  const events = await env.DB.prepare(
    // The model's entries stay in the audit table and are not rendered: no AI output
    // is shown in the console (maintainer, 2026-09-15).
    `SELECT at, kind, from_state, to_state, detail, actor FROM store_review_events
      WHERE store_review_id = ? AND kind <> 'classify' ORDER BY id DESC LIMIT 100`
  ).bind(id).all<any>();

  const edited = editedAt(row.source, row.app_id, versions.results ?? []);

  const meta: Array<[string, string]> = [
    ['Store', row.source === 'app_store' ? 'Apple App Store' : 'Google Play'],
    ['Store review id', row.platform_review_id],
    ['App', row.app_id],
    ['Posted', `${when(row.review_created_at)} UTC`],
    ['Last edited upstream', edited ? `${when(edited)} UTC` : '—'],
    ['Last synced', `${when(row.last_synced_at)} UTC`],
    ['Reviewer', row.reviewer_name ?? '—'],
    ['App version', row.app_version ?? '—'],
    ['Device', row.device_product ?? row.device ?? '—'],
    // `androidOsVersion` is an API LEVEL, not a version number: "33" on its own
    // reads as a version and is not one. Labelled rather than mapped — an
    // API-level-to-Android-version table needs updating every year and is
    // wrong in between.
    [row.platform === 'android' ? 'Android API level' : 'OS',
      row.os_version ?? '—'],
    ['Territory', row.territory ?? '—'],
    ['Language', row.language ?? '—'],
    ['Eligibility', row.eligibility],
    ['Decided by', row.human_decided_by ?? 'nobody yet'],
  ];

  const versionRows = versions.results ?? [];
  const eventRows = events.results ?? [];

  const replies = (await env.DB.prepare(
    `SELECT reply_id, store_review_id, body, source, state, created_at, created_by,
            approved_at, approved_by, published_at, external_state, attempts,
            next_attempt_at, last_error
       FROM store_review_replies WHERE store_review_id = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(id).all<ReplyRow>()).results ?? [];
  const current = replies.find((r) => r.reply_id === row.current_reply_id) ?? null;

  // Queued is our state; on GitHub is the report's. Read, never inferred.
  const report = row.handoff_submission_id ? await env.DB.prepare(
    `SELECT s.state, s.published_issue,
            (SELECT d.issue_number FROM dup_links d WHERE d.submission_id = s.submission_id LIMIT 1) AS attached
       FROM submissions s WHERE s.submission_id = ?`
  ).bind(row.handoff_submission_id).first<{ state: string; published_issue: number | null; attached: number | null }>() : null;

  // A detail-page header in the usual shape: breadcrumb, the record's identifier as
  // the page title (a permalink, so it can be copied and shared), then its state.
  // The review's own title moves into the card with its text: it is the
  // reviewer's words, not the page's name, and a redacted review has none shown.
  // Home is an icon button back to this platform's list. The platform and the
  // review's identifier stay on the page as plain text, as context.
  const body = `<div class="rv-top">
      <a class="home-link" href="/admin/store?platform=${esc(row.platform)}" aria-label="Back to the review list" title="Back to the review list">${ICON_HOME}</a>
      <p class="rv-platform">${esc(PLATFORMS[row.platform]?.label ?? 'Store Reviews')}</p>
    </div>
    <header class="rv-header">
      <h2 class="rv-title-key"><span class="rv-key">${esc(row.platform_review_id)}</span></h2>
      <p class="rv-sub">${badges(row)} ${stars(row.rating)}</p>
    </header>

    <article class="card"><div class="card-body">
      ${!flagged && row.review_title ? `<p class="rv-title">${esc(row.review_title)}</p>` : ''}
      ${labelChips(row)}
      ${metaLine(row, edited) ? `<p class="meta">${metaLine(row, edited)}</p>` : ''}
      ${bodyOf(row)}
      ${flagged ? `<p class="note">The secret scanner flagged this review, so its text is
        never rendered here. The original is stored and is shown on no page.</p>` : ''}
    </div></article>

    <section class="reply-sect" aria-labelledby="reply">
      <h3 class="sect" id="reply">Reply</h3>
      ${replyPanel({
        review: row, current, history: replies, storeReply: current ? null : storeReplyOf(row),
        csrf, sendingEnabled: env.STORE_REPLY_ENABLED === 'true', notice: x.replyNotice, unsaved: x.unsaved,
      })}
    </section>

    <section class="tpl-sect" aria-labelledby="templates">
      <h3 class="sect" id="templates">Reply templates</h3>
      ${templatesPanel(row, x)}
    </section>


    <section class="decide-sect" aria-labelledby="decision">
      <h3 class="sect" id="decision">Decision</h3>
      ${decisionPanel({
        row, csrf, handoffEnabled: env.STORE_HANDOFF_ENABLED === 'true', nowMs: Date.now(),
        editedAfterDecision: row.human_decided_at != null
          && (editObservedAt(row.source, row.app_id, versions.results ?? []) ?? 0) > row.human_decided_at,
        notice: x.decisionNotice, draft: x.decisionDraft,
        github: report ? { state: report.state, issue: report.published_issue, attachedTo: report.attached,
          repo: env.TARGET_REPO ?? null } : null,
      })}
    </section>

    <h3 class="sect">Details</h3>
    <table class="kv"><tbody>${meta.map(([k, v]) =>
      `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>

    <h3 class="sect">Edit history</h3>
    ${versionRows.length <= 1
      ? '<p class="none">Never edited since we first saw it.</p>'
      : `<table class="kv"><tbody>${versionRows.map((v: any, i: number) =>
           `<tr><th scope="row">${esc(when(v.observed_at))} UTC${
              i === 0 ? ' <span class="tag">original</span>' : ''}</th>
            <td>${v.rating == null ? '—' : esc(String(v.rating))}&#9733;
            <code>${esc(String(v.raw_hash).slice(0, 12))}</code></td></tr>`).join('')}
         </tbody></table>
         <p class="note">The original is kept exactly as first received and is never rewritten.</p>`}

    <h3 class="sect">Processing history</h3>
    ${eventRows.length === 0
      ? '<p class="none">Nothing recorded yet.</p>'
      : `<ol class="timeline">${eventRows.map((e: any) =>
          `<li><span class="t-when">${esc(when(e.at))} UTC</span>
             <span class="tag">${esc(EVENT_LABEL[e.kind] ?? e.kind)}</span>
             <span class="t-detail">${esc(e.detail ?? '')}</span>
             ${e.actor ? `<span class="t-actor">${esc(e.actor)}</span>` : ''}</li>`).join('')}
        </ol>`}`;

  return scriptedPage(`Store review — ${row.platform_review_id}`, body, x.status ?? 200, sidebar(groups));
}

// ---------------------------------------------------------------------------

/**
 * The reply under each review on one page of the list: two bounded reads, not
 * one per row. The console's own reply wins; otherwise Google's copy from the
 * stored original, for a review answered outside the console.
 */
async function listPreviews(db: D1Database, rows: any[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const replyIds = rows.map((r) => r.current_reply_id).filter(Boolean);
  const bodies = new Map<string, { body: string; state: string; published_at: number | null; external_state: string | null }>();
  if (replyIds.length > 0) {
    const got = await db.prepare(
      `SELECT reply_id, body, state, published_at, external_state FROM store_review_replies
        WHERE reply_id IN (${replyIds.map(() => '?').join(',')})`
    ).bind(...replyIds).all<{ reply_id: string; body: string; state: string; published_at: number | null; external_state: string | null }>();
    for (const r of got.results ?? []) bodies.set(r.reply_id, r);
  }
  const answered = rows.filter((r) => !r.current_reply_id && r.reply_state === 'published' && r.source === 'google_play');
  const stored = new Map<string, StoreReply | null>();
  if (answered.length > 0) {
    const got = await db.prepare(
      `SELECT store_review_id, source, app_id, raw_json FROM store_reviews
        WHERE store_review_id IN (${answered.map(() => '?').join(',')})`
    ).bind(...answered.map((r) => r.store_review_id)).all<any>();
    for (const r of got.results ?? []) stored.set(r.store_review_id, storeReplyOf(r));
  }
  for (const r of rows) {
    const reply = r.current_reply_id ? bodies.get(r.current_reply_id) ?? null : null;
    const html = replyPreview(reply, reply ? null : stored.get(r.store_review_id) ?? null);
    if (html) out.set(r.store_review_id, html);
  }
  return out;
}

const notFound = () => page('Store Reviews',
  `<div class="refused"><h1>Not found</h1>
   <p><a href="/admin/store?platform=android">Back to Store Reviews</a></p></div>`, 404);

export async function handleStore(
  req: Request, env: StoreEnv, url: URL, user: AdminUser
): Promise<Response | null> {
  if (url.pathname !== '/admin/store' && !url.pathname.startsWith('/admin/store/')) return null;

  // The pages' one script. Behind the same sign-in as the pages that load it.
  if (url.pathname === '/admin/store/review.js') {
    if (req.method !== 'GET') return notFound();
    return new Response(REVIEW_SCRIPT, {
      headers: {
        'content-type': 'text/javascript; charset=utf-8',
        'cache-control': 'no-store, private',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'",
      },
    });
  }

  /**
   * The reply actions: the only writes on these pages, placed in front of the
   * closed door below rather than by relaxing it.
   *
   * Their credential is the signed-in session (every /admin/store request has
   * already passed requireAdmin in index.ts) plus a CSRF token bound to that
   * person. None of them talks to a store: they change our own rows, and the
   * sender alone sends, and only while STORE_REPLY_ENABLED is "true".
   */
  const replyRoute = url.pathname.match(/^\/admin\/store\/([^/]+)\/reply\/([a-z]+)$/);
  if (replyRoute) {
    const id = decodeURIComponent(replyRoute[1]);
    const act = replyRoute[2] as ReplyAction;
    if (req.method !== 'POST' || !isUuidV4(id) || !REPLY_ACTIONS.includes(act)) return notFound();
    const csrf = await csrfToken(env, user.email);
    const form = await req.formData().catch(() => null);
    if (!form || !(await csrfOk(env, user.email, form.get('csrf')))) {
      return renderDetail(env, id, csrf, { replyNotice: 'That request could not be verified. Reload the page and try again.', status: 403 });
    }
    const result = await runReplyAction(env.DB, act, {
      reviewId: id, user: user.email, replyId: String(form.get('reply_id') ?? ''),
      body: form.get('body'), nowMs: Date.now(),
    });
    if (!result.ok) {
      // Someone else changed the reply: the page reloads with theirs, and what
      // this person typed is shown beside it rather than lost.
      const typed = result.status === 409 && (act === 'draft' || act === 'approve' || act === 'send')
        ? String(form.get('body') ?? '').trim() || null : null;
      return renderDetail(env, id, csrf, { replyNotice: result.message, status: result.status, unsaved: typed });
    }
    return new Response(null, { status: 303, headers: { location: `/admin/store/${encodeURIComponent(id)}#reply` } });
  }

  /**
   * The decision and the handoff: the same credential as the reply actions.
   * The decision writes human columns only. The handoff writes a submissions
   * row, and only while STORE_HANDOFF_ENABLED is "true"; it makes no outbound
   * request itself.
   */
  const decideRoute = url.pathname.match(/^\/admin\/store\/([^/]+)\/(decide|handoff)$/);
  if (decideRoute) {
    const id = decodeURIComponent(decideRoute[1]);
    if (req.method !== 'POST' || !isUuidV4(id)) return notFound();
    const csrf = await csrfToken(env, user.email);
    const form = await req.formData().catch(() => null);
    if (!form || !(await csrfOk(env, user.email, form.get('csrf')))) {
      return renderDetail(env, id, csrf, { decisionNotice: 'That request could not be verified. Reload the page and try again.', status: 403 });
    }
    let result;
    let draft: DecisionDraft | null = null;
    if (decideRoute[2] === 'decide') {
      draft = {
        triage: String(form.get('triage') ?? ''),
        labels: form.getAll('labels').map(String),
        note: String(form.get('note') ?? '').slice(0, 4000),
        eligibility: String(form.get('eligibility') ?? ''),
      };
      result = await runDecision(env.DB, {
        reviewId: id, user: user.email, seenDecidedAt: String(form.get('seen') ?? ''),
        triage: draft.triage, labels: draft.labels, note: draft.note,
        eligibility: form.has('eligibility') ? draft.eligibility : null, nowMs: Date.now(),
      });
    } else {
      result = await runHandoff(env, { reviewId: id, user: user.email, nowMs: Date.now() });
    }
    if (!result.ok) {
      // A conflict reloads the stored decision; any other refusal keeps what was submitted.
      return renderDetail(env, id, csrf, {
        decisionNotice: result.message, status: result.status,
        decisionDraft: result.status === 409 ? null : draft,
      });
    }
    return new Response(null, { status: 303, headers: { location: `/admin/store/${encodeURIComponent(id)}#decision` } });
  }

  // A DELIBERATE CLOSED DOOR, not an unfinished router. Everything else here is
  // read-only, so every other non-GET method is refused. The handoff's POST
  // belongs in front of this check with its own guard, never by relaxing it.
  if (req.method !== 'GET') return notFound();

  const detail = url.pathname.match(/^\/admin\/store\/([^/]+)$/);
  if (detail) {
    const id = decodeURIComponent(detail[1]);
    // Validated before it is bound, so a malformed id is a 404 rather than a
    // query. Same rule the attachment proxy follows.
    if (!isUuidV4(id)) return notFound();
    return renderDetail(env, id, await csrfToken(env, user.email), { template: url.searchParams.get('template') });
  }

  if (url.pathname !== '/admin/store') return notFound();

  /**
   * An unknown PLATFORM redirects; an unknown filter value is simply dropped.
   *
   * The difference is what the URL claims. Platform decides the whole page —
   * its heading, its nav highlight, which store's reviews these are — so
   * rendering Android at a URL that says something else is a page quietly
   * disagreeing with its own address. The other filters announce what actually
   * applied in the chip row above the results, so dropping an unrecognised one
   * is visible rather than silent.
   */
  const rawPlatform = url.searchParams.get('platform');
  if (rawPlatform !== null && !PLATFORMS[rawPlatform]) {
    return new Response(null, {
      status: 303, headers: { location: '/admin/store?platform=android' },
    });
  }

  const q = parseQuery(url.searchParams);
  const meta = PLATFORMS[q.platform];
  const { groups } = await buildNav(env.DB, `store:${q.platform}`);

  // Reads are defensive for the same reason the nav's counts are: if migration
  // 0007 has not been applied to this database these throw `no such table`, and
  // an unhandled throw would take the page down rather than degrade it.
  let rows: any[] = [];
  let previews = new Map<string, string>();
  let edits = new Map<string, number>();
  let total = 0;
  let syncedAt: number | null = null;
  let unavailable = false;
  try {
    const built = buildQuery(q);
    const listed = await env.DB.prepare(
      `SELECT ${LIST_COLUMNS} FROM store_reviews
        WHERE ${built.where} ORDER BY ${built.orderBy} LIMIT ? OFFSET ?`
    ).bind(...built.binds, built.limit, built.offset).all<any>();
    rows = listed.results ?? [];
    previews = await listPreviews(env.DB, rows);
    edits = await loadEditedAt(env.DB, rows);

    const counted = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM store_reviews WHERE ${built.where}`
    ).bind(...built.binds).first<{ n: number }>();
    total = counted?.n ?? 0;

    const sync = await env.DB.prepare(
      'SELECT MAX(last_success_at) AS at FROM store_sync_state WHERE key LIKE ?'
    ).bind(`${meta.source}:%`).first<{ at: number | null }>();
    syncedAt = sync?.at ?? null;
  } catch (err) {
    unavailable = true;
    console.warn('store review tables unavailable', (err as Error)?.message);
  }

  const body = `<div class="head">
      <h2>${esc(meta.label)}</h2>
      <p>Reviews collected from ${esc(meta.store)}. The original is stored exactly as it was
         posted; everything shown here is derived from it.</p>
    </div>
    ${unavailable ? '' : filterBar(q)}
    ${unavailable ? '' : activeChips(q)}
    ${unavailable
      ? `<div class="empty"><p class="big">&#9888;</p><h3>Store reviews are unavailable</h3>
         <p>The store review tables could not be read. This usually means the database
            migration has not been applied to this environment yet. The feedback form
            and its queues are unaffected.</p></div>`
      : rows.length === 0
        ? emptyState(q, meta.store, syncedAt)
        : `<p class="count">${total} review${total === 1 ? '' : 's'}${
             hasFilters(q) ? ' matching' : ''}</p>
           ${rows.map((r) => renderRow(r, previews.get(r.store_review_id), edits.get(r.store_review_id) ?? null)).join('')}
           ${pager(q, total)}`}`;

  return scriptedPage(`Store Reviews — ${meta.label}`, body, 200, sidebar(groups));
}
