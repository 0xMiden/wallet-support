import { CONTACT_FORM_ENDPOINT } from '../help-center/links';

/** What the contact Worker answers when it refuses a report. */
export type ContactErrorCode =
  | 'invalid'
  | 'secret'
  | 'too_large'
  | 'rate_limited'
  | 'bot_check'
  | 'send_failed'
  | 'forbidden'
  | 'network';

export type ContactResult = { ok: true } | { ok: false; error: ContactErrorCode; field?: string };

export const FIELD_LABELS: Readonly<Record<string, string>> = {
  type: 'Feedback type',
  title: 'Short title',
  description: 'Description',
  steps: 'Steps to reproduce',
  expected: 'Expected result',
  actual: 'Actual result',
  platform: 'Platform',
  version: 'App version',
  network: 'Network',
  screenshot: 'Screenshot',
  email: 'Contact email'
};

/** Sentences shown above the form when a report is not sent. */
export function errorMessage(result: Extract<ContactResult, { ok: false }>): string {
  switch (result.error) {
    case 'secret':
      return 'Your report looks like it contains a recovery phrase or key. Remove it and send again. Never share your recovery phrase with anyone, including support.';
    case 'too_large':
      return 'The screenshot is too large. Choose an image up to 10 MB.';
    case 'invalid':
      return result.field && FIELD_LABELS[result.field]
        ? `Check ${FIELD_LABELS[result.field]} and send again.`
        : 'Check the form and send again.';
    case 'rate_limited':
      return 'Too many reports in a short time. Wait a minute and send again.';
    default:
      return "Your report wasn't sent. Try again in a few minutes. What you entered is still here.";
  }
}

/** Sends the form to the contact Worker. Never throws: a failure comes back as a result. */
export async function sendContactReport(form: FormData, endpoint: string = CONTACT_FORM_ENDPOINT): Promise<ContactResult> {
  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', body: form });
  } catch {
    return { ok: false, error: 'network' };
  }
  const payload = (await response.json().catch(() => null)) as Partial<ContactResult> & { error?: string; field?: string } | null;
  if (response.ok && payload?.ok === true) return { ok: true };
  const error = (payload?.error ?? 'send_failed') as ContactErrorCode;
  return payload?.field ? { ok: false, error, field: payload.field } : { ok: false, error };
}
