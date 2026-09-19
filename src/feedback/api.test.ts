import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFeedbackStatus, submitFeedback } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('feedback API', () => {
  it('submits to the namespaced same-origin endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true, submission_id: 'id', status: 'received' }, { status: 202 }));
    vi.stubGlobal('fetch', fetch);
    const form = new FormData();
    await submitFeedback(form);
    expect(fetch).toHaveBeenCalledWith('/api/feedback/submit', { method: 'POST', body: form });
  });

  it('polls the namespaced status endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ repo: '0xMiden/wallet', results: {} }));
    vi.stubGlobal('fetch', fetch);
    await getFeedbackStatus('abc');
    expect(fetch).toHaveBeenCalledWith('/api/feedback/status?ids=abc');
  });
});
