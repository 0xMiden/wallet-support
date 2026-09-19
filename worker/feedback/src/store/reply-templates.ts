/**
 * Reply templates: the ready-to-paste defaults a maintainer starts from.
 *
 * Wording is the maintainer's, verbatim (Bread-feedback, 2026-09-15). The bug
 * template points reviewers to the public feedback form rather than an email
 * address. Every template fits the reply limit as written (test PT1), because the
 * text is meant to be pasted into a public reply unchanged.
 *
 * NOTHING HERE SENDS. The suggestion is shown next to the review for copying;
 * a reply reaches a store only through the reply panel's own actions.
 */
import { PIPELINE_LABELS } from './states';

export const TEMPLATE_KEYS = ['positive', 'constructive', 'bug', 'general'] as const;
export type TemplateKey = typeof TEMPLATE_KEYS[number];

/** The public feedback form, where a reviewer with a problem can send details. */
export const FEEDBACK_FORM_URL = 'https://support.miden.xyz/feedback';

export const TEMPLATE_NAME: Record<TemplateKey, string> = {
  positive: 'Positive',
  constructive: 'Constructive / feature request',
  bug: 'Bug or performance issue',
  general: 'General dissatisfaction',
};

const TEXT: Record<TemplateKey, string> = {
  positive: "Thank you for the awesome feedback! We're super happy the app is helpful for you. If you ever have ideas on how we can make it even better, feel free to let us know!",
  constructive: "Thanks for taking the time to share your thoughts! We love hearing ideas from our community. We've noted your feature request down for our team to consider in upcoming updates.",
  bug: `We're really sorry to hear you're having trouble! We want to make this right for you. Please share more details through our feedback form: ${FEEDBACK_FORM_URL} We'd love to help troubleshoot.`,
  general: "Thank you for your candid feedback. We're sorry the app didn't meet your expectations. We're constantly working to make improvements, and your input helps us do just that.",
};

/** The template's text, complete and ready to paste. */
export function templateText(key: TemplateKey): string {
  return TEXT[key];
}

/**
 * Which template a review starts with.
 *
 *   5 stars       Positive
 *   4 stars       Positive, or Constructive when it is labelled a feature request
 *   3 stars       Constructive
 *   1-2 stars     Bug when the classification names a defect, otherwise General
 *
 * "The classification" is the labels the console already treats as authoritative:
 * a person's labels when they have set them, the AI's suggestion otherwise. The
 * defect labels are the same five that make a review eligible for GitHub. With no
 * rating at all, Constructive: it thanks without assuming the reviewer was happy.
 */
export function pickTemplate(rating: number | null, labels: readonly string[]): TemplateKey {
  const has = (l: string) => labels.includes(l);
  if (rating == null || rating < 1 || rating > 5) return 'constructive';
  if (rating >= 5) return 'positive';
  if (rating === 4) return has('feature_request') ? 'constructive' : 'positive';
  if (rating === 3) return 'constructive';
  return PIPELINE_LABELS.some((l) => has(l)) ? 'bug' : 'general';
}

export const isTemplateKey = (v: unknown): v is TemplateKey =>
  typeof v === 'string' && (TEMPLATE_KEYS as readonly string[]).includes(v);
