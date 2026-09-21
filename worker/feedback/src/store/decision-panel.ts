/**
 * The Decision section of a store review: the form a person decides with, and
 * what has happened about the pipeline.
 *
 * Zero-JS, like the rest of the console. The rules shown here are the rules the
 * server enforces (decision.ts); the page only explains them and hides what
 * cannot apply, it never is the guard.
 */
import { esc } from '../lib/admin-chrome';
import { LABELS, PIPELINE_LABELS, REVIEW_STATE_LABEL, HANDOFF_STATE_LABEL } from './states';
import { TRIAGE, NOTE_MAX_CHARS, HANDOFF_LEASE_MS } from './decision';

export interface DecisionRow {
  store_review_id: string;
  review_state: string;
  human_labels: string | null;
  human_decision: string | null;
  human_decided_at: number | null;
  human_decided_by: string | null;
  eligibility: string;
  handoff_state: string;
  handoff_submission_id: string | null;
  handoff_requested_at: number | null;
  handoff_accepted_at: number | null;
  handoff_error: string | null;
  secret_scan_status: string | null;
}

/** What the person submitted, shown again when the save was refused. */
export interface DecisionDraft {
  triage: string;
  labels: string[];
  note: string;
  eligibility: string;
}

export interface DecisionPanelInput {
  row: DecisionRow;
  csrf: string;
  handoffEnabled: boolean;
  /** The review changed after the decision; the handoff waits for a new one. */
  editedAfterDecision: boolean;
  notice?: string | null;
  draft?: DecisionDraft | null;
  nowMs: number;
  /** The queued report, read from submissions: whether it has reached GitHub. */
  github?: GithubStatus | null;
}

export interface GithubStatus {
  /** The report's own state: received, claimed, capped, deferred, publishing, published, failed. */
  state: string;
  /** Filed as a new issue. */
  issue: number | null;
  /** Added to an existing issue instead. */
  attachedTo: number | null;
  repo: string | null;
}

const when = (ms: number | null) =>
  ms == null ? '—' : `${new Date(ms).toISOString().replace('T', ' ').slice(0, 16)} UTC`;

function parseLabels(raw: string | null): string[] {
  try { const v = JSON.parse(raw ?? '[]'); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

const HANDOFF_CHIP: Record<string, string> = {
  requested: 'b-deferred', accepted: 'b-published', failed: 'b-spam',
};

export function decisionPanel(p: DecisionPanelInput): string {
  const r = p.row;
  const base = `/admin/store/${encodeURIComponent(r.store_review_id)}`;
  const flagged = r.secret_scan_status === 'flagged';
  const inPipeline = r.handoff_state === 'accepted'
    || (r.handoff_state === 'requested' && (r.handoff_requested_at ?? 0) > p.nowMs - HANDOFF_LEASE_MS);

  // A refused save shows what was submitted, not what is stored.
  const d: DecisionDraft = p.draft ?? {
    triage: (TRIAGE as readonly string[]).includes(r.review_state) ? r.review_state : '',
    labels: parseLabels(r.human_labels),
    note: r.human_decision ?? '',
    eligibility: r.eligibility === 'undecided' ? '' : r.eligibility,
  };

  const radio = (name: string, value: string, label: string, checked: boolean, disabled = false) =>
    `<label class="choice"><input type="radio" name="${name}" value="${esc(value)}"${checked ? ' checked' : ''}${
      disabled ? ' disabled' : ''}> <span>${esc(label)}</span></label>`;

  const status = r.human_decided_at == null
    ? '<span class="reply-meta">Not decided yet.</span>'
    : `<span class="reply-meta">Decided by ${esc(r.human_decided_by ?? 'unknown')} · ${esc(when(r.human_decided_at))}</span>`;

  const notice = p.notice ? `<p class="reply-error reply-notice" role="alert">${esc(p.notice)}</p>` : '';

  const form = `<form class="decide-form" method="POST" action="${esc(`${base}/decide`)}">
    <input type="hidden" name="csrf" value="${esc(p.csrf)}">
    <input type="hidden" name="seen" value="${esc(r.human_decided_at == null ? '' : String(r.human_decided_at))}">
    <fieldset${inPipeline ? ' disabled' : ''}><legend>Triage</legend>
      <div class="choices">${TRIAGE.map((t) => radio('triage', t, REVIEW_STATE_LABEL[t], d.triage === t)).join('')}</div>
    </fieldset>
    ${inPipeline ? `<input type="hidden" name="triage" value="${esc(r.review_state)}">` : ''}
    <fieldset><legend>Labels</legend>
      <div class="choices">${LABELS.map((l) =>
        `<label class="choice"><input type="checkbox" name="labels" value="${esc(l)}"${d.labels.includes(l) ? ' checked' : ''}> <code>${esc(l)}</code></label>`).join('')}</div>
    </fieldset>
    <fieldset${inPipeline ? ' disabled' : ''}><legend>GitHub</legend>
      <div class="choices">
        ${radio('eligibility', 'eligible', 'Eligible to send to GitHub', d.eligibility === 'eligible', flagged)}
        ${radio('eligibility', 'not_eligible', 'Not eligible', d.eligibility === 'not_eligible')}
      </div>
      <p class="reply-hint">${inPipeline
        ? "Already queued for GitHub, so triage and eligibility can't change."
        : flagged
          ? "Flagged by the secret scanner, so it can't be eligible."
          : `Eligible needs Actionable and at least one of ${esc(PIPELINE_LABELS.join(', '))}.`}</p>
    </fieldset>
    <label class="fl"><span>Note</span>
      <textarea name="note" rows="3" maxlength="${NOTE_MAX_CHARS}">${esc(d.note)}</textarea></label>
    <p class="reply-hint">Seen only in this console. Never sent to GitHub.</p>
    <div class="actions"><button type="submit" class="btn-ok">Save decision</button></div>
  </form>`;

  return `${notice}<div class="reply-card">
    <div class="reply-head">${status}</div>
    ${form}
  </div>
  ${handoffBlock(p, base, inPipeline)}`;
}

function handoffBlock(p: DecisionPanelInput, base: string, inPipeline: boolean): string {
  const r = p.row;
  // Not shown on a review already queued: the switch no longer applies to it.
  const off = p.handoffEnabled || r.handoff_state === 'accepted' ? '' : `<p class="reply-off">Sending to GitHub is switched off.
    Decisions are saved, but no review is queued for GitHub while it is off.</p>`;
  const chip = (cls: string, label: string) => `<span class="badge ${cls}">${esc(label)}</span>`;
  const button = (label: string) => `<div class="actions"><form class="inline" method="POST" action="${esc(`${base}/handoff`)}">
      <input type="hidden" name="csrf" value="${esc(p.csrf)}">
      <button type="submit" class="btn-ok">${esc(label)}</button></form></div>
    <p class="note">This queues the review to become a public GitHub issue, or to be added to a matching issue.
      Queued is not yet on GitHub: it appears there once the pipeline files it, and this section shows when it has.
      A queued review can't be taken back.</p>`;
  const ready = p.handoffEnabled && r.eligibility === 'eligible' && r.review_state === 'actionable'
    && r.human_decided_at != null && r.secret_scan_status !== 'flagged' && !p.editedAfterDecision;
  const issueLink = (n: number) => p.github?.repo
    ? `<a href="${esc(`https://github.com/${p.github.repo}/issues/${n}`)}">issue #${n}</a>` : `issue #${n}`;

  let body: string;
  if (r.handoff_state === 'accepted') {
    // Queued is our own state. Whether it is on GitHub is the report's.
    const g = p.github;
    const target = g?.issue ?? g?.attachedTo ?? null;
    if (g?.state === 'published') {
      body = `<div class="reply-head">${chip('b-published', 'On GitHub')}
        <span class="reply-meta">${target == null ? 'Filed'
          : `${g.attachedTo != null && g.issue == null ? 'Added to' : 'Filed as'} ${issueLink(target)}`}</span></div>`;
    } else if (g?.state === 'failed') {
      body = `<div class="reply-head">${chip('b-spam', 'Not filed')}</div>
        <p class="reply-error">The pipeline stopped trying to file this review. It is listed under Delivery, Failed.</p>`;
    } else {
      body = `<div class="reply-head">${chip('b-deferred', HANDOFF_STATE_LABEL.accepted)}
          <span class="reply-meta">${esc(when(r.handoff_accepted_at))} · submission <code>${esc(r.handoff_submission_id ?? '')}</code></span></div>
        <p class="reply-status">Not on GitHub yet. It appears there once the pipeline files it.</p>`;
    }
  } else if (inPipeline) {
    body = `<div class="reply-head">${chip('b-deferred', HANDOFF_STATE_LABEL.requested)}<span class="reply-meta">${esc(when(r.handoff_requested_at))}</span></div>`;
  } else if (r.handoff_state === 'failed' || r.handoff_state === 'requested') {
    const secret = (r.handoff_error ?? '').startsWith('secret_material');
    const why = secret
      ? 'The secret scanner found key or seed phrase material in this review, so it was not queued for GitHub.'
      : r.handoff_state === 'requested'
        ? 'Queuing was interrupted, so nothing was sent to GitHub.'
        : `Could not queue this review for GitHub, so nothing was sent.${r.handoff_error ? ` ${r.handoff_error}` : ''}`;
    body = `<div class="reply-head">${chip('b-spam', HANDOFF_STATE_LABEL.failed)}</div>
      <p class="reply-error">${esc(why)}</p>
      ${ready && !secret ? button('Try again') : ''}`;
  } else if (r.secret_scan_status === 'flagged') {
    body = `<p class="reply-status">A review flagged by the secret scanner can't be sent to GitHub.</p>`;
  } else if (r.eligibility !== 'eligible') {
    body = `<p class="reply-status">Only a review marked eligible can be sent to GitHub.</p>`;
  } else if (p.editedAfterDecision) {
    body = `<p class="reply-status">This review was edited after the decision. Save the decision again before sending it.</p>`;
  } else {
    body = p.handoffEnabled ? button('Send to GitHub') : '<p class="reply-status">Ready to send once sending to GitHub is switched on.</p>';
  }

  return `<h4 class="subsect">GitHub</h4>${off}<div class="reply-card handoff-card">${body}</div>`;
}
