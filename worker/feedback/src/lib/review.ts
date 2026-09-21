/**
 * The review queue — where a flagged report is read by a human.
 *
 * This page exists so the spam layer is not a black hole. Nothing is ever
 * auto-released; a suspected report waits here until someone decides.
 *
 * ACCESS: AUTHENTICATED. Every `/admin/review` route passes through the shared
 * Google OAuth allowlist in index.ts before it reaches this module. Mutating
 * forms bind a CSRF token to that signed-in session. Attachments are served by
 * the same protected route family and never exposed through a public R2 URL
 * while the report is awaiting review.
 *
 * It still renders attacker-controlled text, so two rules hold throughout:
 *
 *   1. ZERO JAVASCRIPT. Plain server-rendered HTML with <form method=POST>.
 *      A page with no script cannot be driven by injected content even if the
 *      escaping had a bug. It is also why the CSP can be `default-src 'none'`.
 *   2. Every submitter-controlled value is escaped, and the report body renders
 *      inside <pre> — never as markup, never as a URL the page will fetch.
 *
 * Served by the WORKER, not from ./public: static assets are matched before
 * the Worker runs, so a file there would be world-readable with no auth at all.
 *
 * THE SHELL IS NOT HERE ANY MORE. The stylesheet, security headers, escaping,
 * page frame and navigation rail moved to admin-chrome.ts when Store Reviews
 * arrived and the console stopped being one page; the queue definitions and
 * the rail's contents moved to admin-nav.ts. Both rules above are properties
 * of those files now, and this page inherits them rather than restating them.
 */

import { applyReviewDecision, type ReviewAction } from './publish-guard';
import { isUuidV4 } from './validate';
import { esc, page, secureHeaders, sidebar } from './admin-chrome';
import { QUEUES, buildNav } from './admin-nav';
import { csrfToken, csrfOk, type AdminUser, type AuthEnv } from './admin-auth';

const ACTIONS: ReadonlyArray<ReviewAction> = ['release', 'confirm', 'restore'];

function renderReasons(raw: string | null): string {
  let codes: unknown = [];
  try { codes = JSON.parse(raw ?? '[]'); } catch { codes = []; }
  if (!Array.isArray(codes) || codes.length === 0) return '<span class="tag">no reason codes</span>';
  // Reason CODES only ever reach here — the model's are filtered against an
  // allowlist and the rest are code-assigned. Escaped anyway: this page must
  // not depend on a guarantee made in another module.
  return codes.map((c) => `<span class="tag">${esc(c)}</span>`).join('');
}

function renderAttachments(row: any): string {
  let keys: string[] = [];
  try { keys = JSON.parse(row.attachment_keys ?? '[]'); } catch { keys = []; }
  const items = keys.map((j) => { try { return JSON.parse(j); } catch { return null; } }).filter(Boolean);
  if (items.length === 0) return '';
  return items.map((a: any) => {
    const href = `/admin/review/attachment/${encodeURIComponent(row.submission_id)}/${encodeURIComponent(a.name)}`;
    // Proxied, never a public R2 or GitHub URL: an unreviewed report's
    // screenshot must not be reachable by anyone holding a guessable link.
    return a.type?.startsWith('image/')
      ? `<div class="shot"><img src="${esc(href)}" alt="attachment"></div>`
      : `<p class="shot"><a href="${esc(href)}">${esc(a.name)}</a> <span class="tag">${esc(a.type)}</span></p>`;
  }).join('');
}

function actionsFor(state: string, id: string, csrf: string): string {
  // `spam` offers Restore and NOTHING else. There is no one-step path back to
  // a publishable state, by construction as well as by omission here.
  const buttons: Array<[ReviewAction, string, string]> =
    state === 'suspected_spam'
      ? [['release', 'Release', 'btn-ok'], ['confirm', 'Confirm spam', 'btn-danger']]
      : state === 'spam' ? [['restore', 'Restore for review', '']]
      : [];
  if (buttons.length === 0) {
    return '<p class="none">No actions available for this state.</p>';
  }
  return `<div class="actions">${buttons.map(([action, label, cls]) =>
    `<form class="inline" method="POST" action="/admin/review/${esc(id)}/${action}">
       <input type="hidden" name="csrf" value="${esc(csrf)}">
       <button type="submit" class="${cls}">${esc(label)}</button>
     </form>`).join('')}</div>`;
}

/** How long a row has been sitting, for the queues where that is the story. */
function waited(receivedAt: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - receivedAt) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ${mins % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}

function renderRow(row: any, csrf: string): string {
  const when = new Date(row.received_at).toISOString().replace('T', ' ').slice(0, 16);
  const badge = QUEUES[Object.keys(QUEUES).find((k) => QUEUES[k].state === row.state) ?? '']
    ?? { label: row.state, badge: 'b-failed' };
  const reviewed = row.spam_reviewed_at
    ? `<p class="note">Last decision ${esc(new Date(row.spam_reviewed_at).toISOString().replace('T', ' ').slice(0, 16))} UTC by ${esc(row.spam_reviewed_by ?? 'unknown')}</p>`
    : '';
  // Reason codes are the only thing that earns a chip. Reporter and score
  // used to be chips too, and a row of identical pills made a score read as a
  // verdict — it is telemetry, and it says so, quietly, in the meta line.
  const spammy = row.state === 'suspected_spam' || row.state === 'spam';
  const chips = spammy ? `<div class="chips">${renderReasons(row.spam_reasons)}</div>` : '';
  const from = row.store_source
    ? `<span class="tag">${row.store_source === 'app_store' ? 'From the App Store' : 'From Google Play'}</span> `
    : '';
  const meta = spammy
    ? `<p class="meta">reporter <b>${esc(row.reporter_kind ?? 'unknown')}</b>
       <span class="sep">\u00b7</span> score <b>${row.spam_score == null ? 'n/a' : esc(row.spam_score.toFixed(2))}</b>
       <span class="sep">\u00b7</span> telemetry, not the decision</p>`
    : `<p class="meta">${from}reporter <b>${esc(row.reporter_kind ?? 'unknown')}</b>
       <span class="sep">\u00b7</span> waiting <b>${esc(waited(row.received_at))}</b>${
       row.attempts ? `\n       <span class="sep">\u00b7</span> attempt <b>${esc(String(row.attempts))}</b> of 5` : ''}</p>`;

  // WHY it is stuck, which is the only reason to open the deferred tab. The
  // This is truncated and never rendered as markup — upstream error bodies
  // are attacker-adjacent text like any other.
  const stuck = (row.state === 'deferred' || row.state === 'failed') && row.last_error
    ? `<p class="note">Last error: ${esc(String(row.last_error).slice(0, 160))}</p>`
    : '';

  // A quarantined row's body is already the redacted placeholder in the
  // database. Secret-material handling is untouched by the spam layer.
  return `<article class="card">
    <div class="card-head">
      <span class="badge ${esc(badge.badge)}">${esc(badge.label)}</span>
      <span class="when">${esc(when)} UTC</span>
      <code class="id">${esc(row.submission_id)}</code>
    </div>
    <div class="card-body">
      ${chips}
      ${meta}
      <pre>${esc(row.body_sanitized)}</pre>
      ${renderAttachments(row)}
      ${stuck}
      ${reviewed}
      ${actionsFor(row.state, row.submission_id, csrf)}
    </div>
  </article>`;
}

interface ReviewEnv extends AuthEnv {
  DB: D1Database;
  ATTACHMENTS: R2Bucket;
}

/**
 * Handles every /admin/review* route. Returns null when the path is not ours,
 * so index.ts can fall through to its other routes.
 */
export async function handleReview(
  req: Request, env: ReviewEnv, url: URL, user: AdminUser
): Promise<Response | null> {
  if (url.pathname !== '/admin/review' && !url.pathname.startsWith('/admin/review/')) return null;

  // --- attachment proxy ---------------------------------------------------
  const att = url.pathname.match(/^\/admin\/review\/attachment\/([^/]+)\/(.+)$/);
  if (att && req.method === 'GET') {
    const [, rawId, rawName] = att;
    const id = decodeURIComponent(rawId);
    if (!isUuidV4(id)) return new Response('not found', { status: 404 });

    const row = await env.DB.prepare('SELECT attachment_keys FROM submissions WHERE submission_id = ?')
      .bind(id).first<{ attachment_keys: string | null }>();
    if (!row) return new Response('not found', { status: 404 });

    let stored: any = null;
    try {
      stored = (JSON.parse(row.attachment_keys ?? '[]') as string[])
        .map((j) => { try { return JSON.parse(j); } catch { return null; } })
        .find((a: any) => a && a.name === decodeURIComponent(rawName)) ?? null;
    } catch { stored = null; }
    // The key comes from the ROW, never from the URL — the name in the path is
    // only ever used to pick between this submission's own attachments, so a
    // traversal attempt selects nothing rather than reaching another object.
    if (!stored) return new Response('not found', { status: 404 });

    const obj = await env.ATTACHMENTS.get(stored.key);
    if (!obj) return new Response('not found', { status: 404 });

    return new Response(obj.body, {
      headers: {
        // The SNIFFED type, verified at admission. nosniff so a browser cannot
        // decide it knows better.
        'content-type': stored.type ?? 'application/octet-stream',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
        'cache-control': 'no-store, private',
        // Video is downloaded, not played inline: a player is a parser, and
        // this is the one page where an unreviewed file is opened.
        ...(stored.type?.startsWith('video/')
          ? { 'content-disposition': `attachment; filename="${encodeURIComponent(stored.name)}"` }
          : {}),
      },
    });
  }

  // --- actions ------------------------------------------------------------
  const act = url.pathname.match(/^\/admin\/review\/([^/]+)\/(release|confirm|restore)$/);
  if (act && req.method === 'POST') {
    const [, rawId, action] = act;
    const id = decodeURIComponent(rawId);
    if (!isUuidV4(id)) {
      return page('Review',
        `<div class="refused"><h1>Not found</h1>
         <p><a href="/admin/review?q=suspected">Back to the queue</a></p></div>`, 404);
    }

    const row = await env.DB.prepare('SELECT state FROM submissions WHERE submission_id = ?')
      .bind(id).first<{ state: string }>();
    const back0 = `/admin/review?q=${row?.state === 'spam' ? 'spam' : 'suspected'}`;
    if (!row) {
      return page('Review',
        `<div class="refused"><h1>Not found</h1>
         <p>That report is no longer in the queue.</p>
         <p><a href="/admin/review?q=suspected">Back to the queue</a></p></div>`, 404);
    }

    // The decision itself lives in publish-guard: allowed edges are data there,
    // `spam -> received` is absent by construction, and it refuses outright on
    // any row the drain currently owns.
    /**
     * CSRF, then the actor.
     *
     * SameSite=Lax already blocks a cross-site POST, but this decision
     * publishes to a third-party repository or buries a real user's report, so
     * it does not rest on a browser behaviour alone.
     */
    if (!(await csrfOk(env, user.email, (await req.formData()).get('csrf')))) {
      return page('Review',
        `<div class="refused">
           <h1>Could not verify that request</h1>
           <p>Reload the queue and try again.</p>
           <p><a href="${esc(back0)}">Back to the queue</a></p>
         </div>`, 403);
    }

    // A real person, not an IP. This is the whole point of the sign-in: an
    // audit row that names who released a report is the difference between a
    // log and a record.
    const actor = `user:${user.email}`;
    const result = await applyReviewDecision(
      env.DB, id, row.state, action as ReviewAction, actor
    );

    const back = `/admin/review?q=${row.state === 'spam' ? 'spam' : 'suspected'}`;
    if (!result.ok) {
      return page('Review',
        `<div class="refused">
           <h1>Action refused</h1>
           <p>The queue would not make that change: <code>${esc(result.reason)}</code></p>
           <p><a href="${esc(back)}">Back to the queue</a></p>
         </div>`, 409);
    }
    // 303 so a refresh cannot repeat the action.
    return new Response(null, { status: 303, headers: { location: back, ...secureHeaders() } });
  }

  // --- the queue ----------------------------------------------------------
  if (url.pathname === '/admin/review' && req.method === 'GET') {
    const q = url.searchParams.get('q') ?? 'suspected';
    const queue = QUEUES[q];
    // Unknown filter falls back rather than erroring, and never interpolates
    // the caller's string into SQL or the page.
    if (!queue) return new Response(null, { status: 303, headers: { location: '/admin/review?q=suspected' } });

    const { results } = await env.DB.prepare(
      // One join, no migration: a report handed off from Store Reviews is the
      // submission a store review points at.
      `SELECT s.submission_id, s.received_at, s.state, s.body_sanitized, s.spam_status, s.spam_score,
              s.spam_reasons, s.reporter_kind, s.spam_reviewed_at, s.spam_reviewed_by, s.attachment_keys,
              s.attempts, s.last_error, sr.source AS store_source
         FROM submissions s LEFT JOIN store_reviews sr ON sr.handoff_submission_id = s.submission_id
        WHERE s.state = ? ORDER BY s.received_at ASC LIMIT 100`
    ).bind(queue.state).all<any>();

    const rows = results ?? [];

    // The rail and its counts are built once, in admin-nav, so every page in
    // the console shows the same three groups with the same numbers.
    const { groups, counts } = await buildNav(env.DB, q);
    const csrf = await csrfToken(env, user.email);

    // Queues are listed SEPARATELY on purpose: a flood of correctly-caught
    // spam must never be able to bury one false positive in a mixed list.
    const shown = counts[queue.state] ?? 0;
    // Queues are listed SEPARATELY on purpose: a flood of correctly-caught
    // spam must never be able to bury one false positive in a mixed list.
    const body = `<div class="head">
        <h2>${esc(queue.label)}</h2>
        <p>${esc(queue.desc)}</p>
      </div>
      ${rows.length === 0
        ? `<div class="empty">
             <p class="big">${esc(queue.empty.icon)}</p>
             <h3>${esc(queue.empty.head)}</h3>
             <p>${esc(queue.empty.note)}</p>
           </div>`
        : rows.map((r) => renderRow(r, csrf)).join('')
          + (shown > rows.length
            ? `<p class="note">Showing the ${rows.length} that have waited longest, of ${shown}.</p>`
            : '')}`;
    return page(`Review \u2014 ${queue.label}`, body, 200, {}, sidebar(groups));
  }

  return page('Review',
    `<div class="refused"><h1>Not found</h1>
     <p><a href="/admin/review?q=suspected">Back to the queue</a></p></div>`, 404);
}
