/**
 * The reply, as the console shows it: the panel on one review, and the preview
 * under a review in the list.
 *
 * RENDERING ONLY. Nothing here writes, and the forms it draws post to routes
 * that do not exist until the reply actions land behind their own checks. The
 * shape is fixed by the schema rather than invented here:
 *
 *   - `store_reviews.current_reply_id` is the reply being worked on or shown;
 *     every other row for the review is history.
 *   - An approved reply is never edited in place. Changing it starts a new
 *     draft and the approved row is superseded, so what was approved and what
 *     was published are always the same text. The panel therefore offers
 *     "change", never an editable field, once a reply is approved.
 *   - A flagged review stays replyable (SAFETY-CONTROLS §10). Its text is
 *     redacted; its reply panel is not.
 *
 * A reply that is already on the store but was not written here — Google
 * returns it on the review as `developerComment` — is shown as published, so
 * nobody writes a second answer under the first.
 */
import { esc } from '../lib/admin-chrome';
import { REPLY_STATE_LABEL } from './states';
import { fromGooglePlay } from './normalize';

/** Google Play's limit, applied to both stores at save. */
export const REPLY_MAX_CHARS = 350;

export interface ReplyRow {
  reply_id: string;
  store_review_id: string;
  body: string;
  source: string;
  state: string;
  created_at: number;
  created_by: string | null;
  approved_at: number | null;
  approved_by: string | null;
  published_at: number | null;
  external_state: string | null;
  attempts: number;
  next_attempt_at: number | null;
  last_error: string | null;
}

/**
 * Who said what went wrong, stored in `last_error`: the store's own answer
 * ("Google Play said: ..."), or the console's account of what happened with the
 * store, which is not a quote and is shown without one.
 */
export interface ReplyError { by: 'store' | 'console'; text: string }
export const errorJson = (by: ReplyError['by'], text: string) => JSON.stringify({ by, text: text.slice(0, 300) });
export function parseReplyError(raw: string | null): ReplyError | null {
  if (!raw) return null;
  try {
    const e = JSON.parse(raw);
    if ((e?.by === 'store' || e?.by === 'console') && typeof e.text === 'string') return e;
  } catch { /* a plain string */ }
  return { by: 'store', text: raw };
}

/**
 * `external_state` when a send may have reached the store and the store never
 * confirmed it. Kept until the store confirms the reply, so that no later
 * message says "Nothing was sent" or "Not sent" about a reply that might have
 * arrived.
 */
export const EXTERNAL_UNCONFIRMED = 'UNCONFIRMED';

/** A reply already on the store that did not come from the console. */
export interface StoreReply { text: string; at: number | null }

const when = (ms: number | null) =>
  ms ? `${new Date(ms).toISOString().replace('T', ' ').slice(0, 16)} UTC` : 'unknown date';

/** Characters as a person counts them, not UTF-16 units. */
export const replyLength = (text: string) => Array.from(text).length;

const storeName = (source: string) => (source === 'app_store' ? 'the App Store' : 'Google Play');

/**
 * The reply Google already holds for a review, read from the stored original.
 *
 * Parsed by the same function sync uses, so the console and the sync can never
 * disagree about whether a review has been answered. The App Store returns its
 * response as a separate resource, so iOS has none here.
 */
export function storeReplyOf(review: { source: string; app_id: string; raw_json?: string | null }): StoreReply | null {
  if (review.source !== 'google_play' || !review.raw_json) return null;
  try {
    const rec = fromGooglePlay(JSON.parse(review.raw_json), review.app_id, 0);
    return rec.existingReplyText ? { text: rec.existingReplyText, at: rec.existingReplyAt } : null;
  } catch {
    return null;
  }
}

const CHIP: Record<string, string> = {
  draft: 'b-queued', approved: 'b-actionable', publishing: 'b-deferred', pending_publish: 'b-deferred',
  published: 'b-published', failed: 'b-spam', superseded: 'b-queued', unconfirmed: 'b-deferred',
};
/** Reply-row states onto the labels the list's badges already use. */
const LABEL: Record<string, string> = {
  draft: REPLY_STATE_LABEL.drafted, approved: REPLY_STATE_LABEL.approved,
  publishing: REPLY_STATE_LABEL.publishing, pending_publish: REPLY_STATE_LABEL.pending_publish,
  published: REPLY_STATE_LABEL.published, failed: REPLY_STATE_LABEL.failed, superseded: 'Replaced',
  unconfirmed: REPLY_STATE_LABEL.unconfirmed,
};

const chip = (state: string) =>
  `<span class="badge ${CHIP[state] ?? 'b-queued'}">${esc(LABEL[state] ?? state)}</span>`;

/**
 * "Developer reply" is what both stores call a reply people can read. Anything
 * not yet on the store is labelled as what it is instead, so an unsent draft
 * never looks public.
 */
const PREVIEW_LABEL: Record<string, string> = {
  published: 'Developer reply', draft: 'Draft reply', approved: 'Approved reply, not sent',
  publishing: 'Sending reply', pending_publish: REPLY_STATE_LABEL.pending_publish,
  failed: 'Reply not sent', superseded: 'Reply', unconfirmed: REPLY_STATE_LABEL.unconfirmed,
};

const bubble = (text: string, state: string) =>
  `<div class="reply-bubble"><span class="reply-from">${esc(state === 'published' ? 'Developer reply' : 'Reply')}</span><p>${esc(text)}</p></div>`;

/**
 * Every form carries the reply the person was looking at. An action on a reply
 * that has changed since the page loaded is refused, never applied to whatever
 * is there now.
 */
const hidden = (csrf: string, replyId: string) =>
  `<input type="hidden" name="csrf" value="${esc(csrf)}"><input type="hidden" name="reply_id" value="${esc(replyId)}">`;

function action(base: string, path: string, csrf: string, replyId: string, label: string, cls = ''): string {
  return `<form class="inline" method="POST" action="${esc(`${base}/${path}`)}">${hidden(csrf, replyId)}
    <button type="submit"${cls ? ` class="${cls}"` : ''}>${esc(label)}</button></form>`;
}

/**
 * Writing a reply always ends in the same two buttons. "Save as draft" keeps the
 * text for later. The other saves it and approves it in one step (reply-flow.ts),
 * and its label says what that does today: while sending is switched off it is
 * "Approve reply", because nothing will be sent; while it is on it is "Send",
 * because the sender will publish the approved text. What happens after is shown by
 * the reply's own state (waiting, sending, sent, published), never assumed here.
 */
function composer(base: string, csrf: string, replyId: string, text: string, store: string, sendingEnabled: boolean): string {
  return `<form class="reply-form" method="POST" action="${esc(`${base}/draft`)}">${hidden(csrf, replyId)}
    <label class="fl"><span>Your reply</span>
      <textarea name="body" rows="4" maxlength="${REPLY_MAX_CHARS}" required>${esc(text)}</textarea></label>
    <p class="reply-hint">Up to ${REPLY_MAX_CHARS} characters.</p>
    <div class="actions reply-bar">
      <button type="submit">Save as draft</button>
      <button type="submit" class="btn-primary" formaction="${esc(`${base}/send`)}">${sendingEnabled ? 'Send' : 'Approve reply'}</button>
    </div>
    <p class="note">${sendingEnabled
      ? `This approves and queues your reply for public posting on ${esc(store)}. It will be sent exactly as written.`
      : "Approving locks this version's text. It will wait here until sending is switched on."}</p>
  </form>`;
}

export interface PanelInput {
  review: { store_review_id: string; source: string };
  current: ReplyRow | null;
  history: ReplyRow[];
  storeReply: StoreReply | null;
  csrf: string;
  sendingEnabled: boolean;
  /** A refused action's reason, shown above the reply. */
  notice?: string | null;
  /** What the person typed when their save was refused, so it is not lost. */
  unsaved?: string | null;
}

/** The store's answer quoted; the console's own account shown as it is. */
function errorLine(source: string, raw: string | null): string {
  const e = parseReplyError(raw);
  if (!e) return '';
  const who = source === 'app_store' ? 'The App Store' : 'Google Play';
  return `<p class="reply-error">${e.by === 'store' ? `${esc(who)} said: ` : ''}${esc(e.text)}</p>`;
}

export function replyPanel(p: PanelInput): string {
  const store = storeName(p.review.source);
  const base = `/admin/store/${encodeURIComponent(p.review.store_review_id)}/reply`;
  const c = p.current;

  const intro = `<p class="reply-intro">Replies are public and appear under the review on ${esc(store)}.</p>`;
  const off = p.sendingEnabled ? '' : `<p class="reply-off">Sending is switched off. Replies can be written
    and approved here, but nothing is sent to ${esc(store)} yet.</p>`;
  const notice = p.notice ? `<p class="reply-error reply-notice" role="alert">${esc(p.notice)}</p>` : '';
  const unsaved = p.unsaved ? `<div class="reply-bubble reply-unsaved"><span class="reply-from">What you typed (not saved)</span>
    <p>${esc(p.unsaved.slice(0, 2000))}</p></div>` : '';
  const cid = c?.reply_id ?? '';

  let main: string;
  if (!c && !p.storeReply) {
    main = `<div class="reply-card">${composer(base, p.csrf, cid, '', store, p.sendingEnabled)}</div>`;
  } else if (!c && p.storeReply) {
    main = `<div class="reply-card">
      <div class="reply-head">${chip('published')}
        <span class="reply-meta">On ${esc(store)} · ${esc(when(p.storeReply.at))}</span>
        <span class="tag">written outside the console</span></div>
      ${bubble(p.storeReply.text, 'published')}
      <div class="actions">${action(base, 'edit', p.csrf, cid, 'Edit reply')}</div>
      <p class="note">Editing starts a new draft. The published reply stays up until the replacement is published.</p>
    </div>`;
  } else if (c!.state === 'draft') {
    // The saved draft is what the box opens with, so a draft picked up later reads
    // exactly as it was left. Discard sits in the header, apart from the two buttons.
    main = `<div class="reply-card">
      <div class="reply-head">${chip('draft')}
        <span class="reply-meta">Saved by ${esc(c!.created_by ?? 'unknown')} · ${esc(when(c!.created_at))}</span>
        <span class="reply-count">${replyLength(c!.body)} / ${REPLY_MAX_CHARS} characters</span>
        ${action(base, 'discard', p.csrf, cid, 'Discard draft', 'btn-danger btn-small')}</div>
      ${composer(base, p.csrf, cid, c!.body, store, p.sendingEnabled)}
    </div>`;
  } else if (c!.state === 'approved') {
    main = `<div class="reply-card">
      <div class="reply-head">${chip('approved')}
        <span class="reply-meta">Approved by ${esc(c!.approved_by ?? 'unknown')} · ${esc(when(c!.approved_at))}</span></div>
      ${bubble(c!.body, c!.state)}
      <p class="reply-status">${p.sendingEnabled ? 'Waiting to send.' : 'Waiting to send. Sending is switched off.'}</p>
      <div class="actions">${action(base, 'change', p.csrf, cid, 'Change reply')}</div>
      <p class="note">Changing an approved reply starts a new draft. This version is kept in the history.</p>
    </div>`;
  } else if (c!.state === 'publishing') {
    main = `<div class="reply-card">
      <div class="reply-head">${chip('publishing')}
        <span class="reply-meta">Sending to ${esc(store)} · attempt ${esc(String(Math.max(1, c!.attempts)))}</span></div>
      ${bubble(c!.body, c!.state)}
    </div>`;
  } else if (c!.state === 'pending_publish') {
    main = `<div class="reply-card">
      <div class="reply-head">${chip('pending_publish')}
        <span class="reply-meta">Sent to the App Store · ${esc(when(c!.published_at))}</span></div>
      ${bubble(c!.body, c!.state)}
      <p class="reply-status">It appears on the App Store once Apple publishes it.</p>
    </div>`;
  } else if (c!.state === 'published') {
    main = `<div class="reply-card">
      <div class="reply-head">${chip('published')}
        <span class="reply-meta">Published on ${esc(store)} · ${esc(when(c!.published_at))}</span></div>
      ${bubble(c!.body, c!.state)}
      <div class="actions">${action(base, 'edit', p.csrf, cid, 'Edit reply')}</div>
      <p class="note">Editing starts a new draft. The published reply stays up until the replacement is published.</p>
    </div>`;
  } else if (c!.state === 'unconfirmed') {
    main = `<div class="reply-card">
      <div class="reply-head">${chip('unconfirmed')}
        <span class="reply-meta">Attempt ${esc(String(Math.max(1, c!.attempts)))}</span></div>
      ${bubble(c!.body, c!.state)}
      <p class="reply-status">We couldn't confirm whether ${esc(store)} received this reply. We'll check before trying to send it again.${
        p.sendingEnabled ? '' : ' Checking starts when sending is switched on.'}</p>
      ${errorLine(p.review.source, c!.last_error)}
      ${p.sendingEnabled
        // The sender checks on its own; the button only brings the check forward.
        // While sending is off nothing checks, so a button would do nothing.
        ? `<div class="actions">${action(base, 'check', p.csrf, cid, `Check ${store}`, 'btn-ok')}</div>` : ''}
    </div>`;
  } else {
    // failed. "Not sent" only when no attempt can have reached the store: a
    // reply Apple accepted and then did not publish is "Not published", and
    // one with an attempt the store never confirmed stays "Delivery unconfirmed".
    const outcome = c!.published_at != null ? 'Not published'
      : c!.external_state === EXTERNAL_UNCONFIRMED ? REPLY_STATE_LABEL.unconfirmed : 'Not sent';
    main = `<div class="reply-card">
      <div class="reply-head">${chip('failed')}
        <span class="reply-meta">${esc(outcome)} · ${esc(String(c!.attempts))} attempt${c!.attempts === 1 ? '' : 's'}</span></div>
      ${bubble(c!.body, c!.state)}
      ${errorLine(p.review.source, c!.last_error)}
      <div class="actions">${action(base, 'retry', p.csrf, cid, 'Try again', 'btn-ok')}${action(base, 'change', p.csrf, cid, 'Change reply')}</div>
    </div>`;
  }

  const earlier = p.history.filter((h) => h.reply_id !== c?.reply_id);
  const history = earlier.length === 0 ? '' : `<details class="reply-history">
      <summary>Earlier versions (${earlier.length})</summary>
      ${earlier.map((h) => `<div class="reply-old">
        <div class="reply-head">${chip(h.state)}
          <span class="reply-meta">${esc(h.created_by ?? 'unknown')} · ${esc(when(h.created_at))}</span></div>
        ${bubble(h.body, h.state)}</div>`).join('')}
    </details>`;

  return `${intro}${off}${notice}${unsaved}${main}${history}`;
}

/** Under a review in the list: the reply's text, clamped. State is already a badge. */
export function replyPreview(
  current: Pick<ReplyRow, 'body' | 'state' | 'published_at' | 'external_state'> | null, storeReply: StoreReply | null
): string {
  const text = current?.body ?? storeReply?.text;
  if (!text) return '';
  // "Reply not sent" only when that is known, as on the card.
  const label = !current ? PREVIEW_LABEL.published
    : current.state === 'failed' && current.published_at != null ? 'Reply not published'
    : current.state === 'failed' && current.external_state === EXTERNAL_UNCONFIRMED ? REPLY_STATE_LABEL.unconfirmed
    : PREVIEW_LABEL[current.state] ?? 'Reply';
  return `<div class="reply-mini"><span class="reply-from">${esc(label)}</span><p>${esc(text)}</p></div>`;
}
