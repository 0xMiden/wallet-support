export type PublicFeedbackStatus = 'received' | 'reviewing' | 'queued' | 'attached' | 'filed';

export interface SubmissionReceipt {
  ok: true;
  submission_id: string;
  status: PublicFeedbackStatus | 'duplicate_submission';
}

export interface StatusResult {
  status: PublicFeedbackStatus;
  issue: number | null;
  duplicate: boolean;
  title: string | null;
}

export async function submitFeedback(form: FormData): Promise<SubmissionReceipt> {
  const response = await fetch('/api/feedback/submit', { method: 'POST', body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? `Feedback could not be sent (${response.status}).`);
  }
  return response.json() as Promise<SubmissionReceipt>;
}

export async function getFeedbackStatus(submissionId: string): Promise<{ repo: string; result?: StatusResult }> {
  const response = await fetch(`/api/feedback/status?ids=${encodeURIComponent(submissionId)}`);
  if (!response.ok) throw new Error(`Status could not be loaded (${response.status}).`);
  const payload = await response.json() as { repo: string; results: Record<string, StatusResult> };
  return { repo: payload.repo, result: payload.results[submissionId] };
}
