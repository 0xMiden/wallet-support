/**
 * The vocabulary of Store Reviews: three state machines, one label set, and
 * the rule that decides what may enter the existing feedback pipeline.
 *
 * DATA, NOT CODE. Every value a store review can hold is listed here as a
 * literal, in one place, so the console, the classifier, the reply publisher
 * and the handoff cannot disagree about what a state means. This follows
 * publish-guard.ts, where the allowed transitions are a table rather than a
 * chain of ifs — a rule you can read in one screen is a rule that can be
 * reviewed.
 *
 * WHY THREE MACHINES AND NOT ONE ENUM.
 * The brief lists 22 statuses, and they mix three unrelated questions: where a
 * review is in triage, what has been done about replying to it, and whether it
 * has entered the pipeline. As one enum they could not express "actionable and
 * reply published", which is an ordinary state for a real review — and the
 * first time that came up someone would add a compound value, and then another.
 */

/** Where a review is in triage. */
export const REVIEW_STATES = [
  'new',              // stored by sync, nothing has looked at it
  'classifying',      // handed to the model, awaiting a suggestion
  'awaiting_review',  // has a suggestion (or none), waiting on a human
  'actionable',       // a human judged it a real issue
  'not_actionable',   // a human judged it not one
  'needs_info',       // a real report, but not enough of one to file
  'sync_failed',      // the row exists but the last sync of it errored
] as const;
export type ReviewState = typeof REVIEW_STATES[number];

/** What has happened to the reply, independently of everything else. */
export const REPLY_STATES = [
  'none', 'drafted', 'approved', 'publishing',
  // Accepted by the App Store, not yet readable there: Apple publishes a
  // response some time after it is sent. Its own state, so nothing calls a
  // reply published while nobody can see it.
  'pending_publish',
  'published', 'failed',
  // The request may have reached the store and no answer came back. Never
  // resent blindly: the store is checked first.
  'unconfirmed',
] as const;
export type ReplyState = typeof REPLY_STATES[number];

/** Whether the review has entered the existing pipeline. */
export const HANDOFF_STATES = ['none', 'requested', 'accepted', 'failed'] as const;
export type HandoffState = typeof HANDOFF_STATES[number];

/**
 * The human's verdict on whether this may enter the pipeline.
 *
 * `undecided` is the only default that can be correct. A review nobody has
 * read must never be eligible for a public GitHub issue, so the absence of a
 * decision has to read as "no", not as "not yet no".
 */
export const ELIGIBILITY = ['undecided', 'eligible', 'not_eligible'] as const;
export type Eligibility = typeof ELIGIBILITY[number];

/** Said the way the decision form says it, so the filter and the form agree. */
export const ELIGIBILITY_LABEL: Record<string, string> = {
  undecided: 'Not decided yet',
  eligible: 'Eligible to send to GitHub',
  not_eligible: 'Not eligible',
};

/**
 * What a review IS. Multi-valued: a review can be a bug report and a support
 * question in the same breath, and forcing a single value would lose one.
 *
 * ALLOWLIST. The classifier's output is filtered against this array before it
 * is stored — the same discipline spam_reasons follows. A model that invents a
 * label produces no label, never a new one.
 */
export const LABELS = [
  // Wallet-related technical content.
  'bug',
  'functional_issue',
  'ui_issue',
  'ux_issue',
  'technical_issue',
  // Everything else. Real, worth reading, worth replying to — and not a
  // defect report.
  'feature_request',
  'support_question',
  'account_request',
  'praise',
  'complaint_no_issue',
  'general_feedback',
  'insufficient_info',
  'irrelevant',
  'spam',
] as const;
export type Label = typeof LABELS[number];

/**
 * The labels that make a review a candidate for the pipeline.
 *
 * This is the brief's rule in machine-readable form: bugs, functional issues,
 * UI problems, UX problems, and other clear wallet-related technical issues may
 * enter; praise, complaints with no identifiable issue, support questions,
 * account-specific requests, feature requests, spam, irrelevant content and
 * reviews without enough information stay visible and do not.
 *
 * IT IS A FILTER ON WHAT MAY BE OFFERED, NEVER A DECISION.
 * A review carrying one of these labels becomes eligible to be OFFERED to a
 * human for the handoff. Nothing here sends anything anywhere. The human's
 * `eligibility` verdict is the gate, and only a human writes it.
 */
export const PIPELINE_LABELS: ReadonlyArray<Label> = [
  'bug', 'functional_issue', 'ui_issue', 'ux_issue', 'technical_issue',
];

/** Does this label set contain anything the pipeline accepts? */
export function isPipelineCandidate(labels: readonly string[]): boolean {
  return labels.some((l) => (PIPELINE_LABELS as readonly string[]).includes(l));
}

/** Keeps only labels on the allowlist, de-duplicated, in allowlist order. */
export function filterLabels(raw: unknown): Label[] {
  const given = Array.isArray(raw) ? raw.map(String) : [];
  return LABELS.filter((l) => given.includes(l));
}

/**
 * How each state is shown. Kept beside the state list so a new state cannot be
 * added without someone deciding what it looks like — an unlabelled state
 * renders as its own raw identifier, which is how internals leak into a page.
 */
export const REVIEW_STATE_LABEL: Record<string, string> = {
  new: 'New',
  classifying: 'Classifying',
  awaiting_review: 'Awaiting review',
  actionable: 'Actionable',
  not_actionable: 'Not actionable',
  needs_info: 'Needs more information',
  sync_failed: 'Sync failed',
};

/**
 * How each review state is COLOURED.
 *
 * Not cosmetic. The badge is the fastest thing on a card, and it earns that
 * only if it distinguishes. `actionable` and `not_actionable` are opposite
 * verdicts about the same review; rendering both amber made the badge say
 * nothing except "this has a state", which someone then has to read.
 *
 *   amber  — waiting on a human
 *   accent — a human confirmed a real issue: this one goes somewhere
 *   grey   — decided, nothing further to do
 *   red    — broken, not a verdict
 */
export const REVIEW_STATE_BADGE: Record<string, string> = {
  new: 'b-suspected',
  classifying: 'b-suspected',
  awaiting_review: 'b-suspected',
  actionable: 'b-actionable',
  not_actionable: 'b-queued',
  needs_info: 'b-queued',
  sync_failed: 'b-spam',
};

export const REPLY_STATE_LABEL: Record<string, string> = {
  none: 'Awaiting reply',
  drafted: 'Reply drafted',
  approved: 'Reply approved',
  publishing: 'Reply publishing',
  pending_publish: 'Sent, waiting for Apple',
  published: 'Reply published',
  failed: 'Reply failed',
  unconfirmed: 'Delivery unconfirmed',
};

/**
 * Said in terms of GitHub, where the review is going. `accepted` means queued:
 * the review is a report waiting for the drain, not yet an issue. Whether it has
 * reached GitHub is read from the report itself, on the review's page.
 */
export const HANDOFF_STATE_LABEL: Record<string, string> = {
  none: 'Not sent to GitHub',
  requested: 'Queuing for GitHub',
  accepted: 'Queued for GitHub',
  failed: 'Not queued for GitHub',
};
