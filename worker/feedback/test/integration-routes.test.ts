import { describe, expect, it } from 'vitest';
import { callWorker } from './helpers';

describe('combined support routes', () => {
  it('serves status from the namespaced API and identifies the wallet repository', async () => {
    const response = await callWorker(new Request('https://support.miden.xyz/api/feedback/status'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: {}, repo: '0xMiden/wallet' });
  });

  it('keeps the old status route as a marked compatibility alias', async () => {
    const response = await callWorker(new Request('https://support.miden.xyz/status'));
    expect(response.status).toBe(200);
    expect(response.headers.get('deprecation')).toBe('true');
    expect(response.headers.get('link')).toContain('/api/feedback/status');
  });

  it('never sends unknown privileged paths to the public application', async () => {
    const api = await callWorker(new Request('https://support.miden.xyz/api/not-real'));
    const admin = await callWorker(new Request('https://support.miden.xyz/admin/not-real'));
    expect(api.status).toBe(404);
    expect(api.headers.get('content-type')).toContain('application/json');
    expect(admin.status).toBe(404);
    expect(admin.headers.get('content-type')).toContain('text/plain');
  });

  it('adds Turnstile allowances to public app entry documents only', async () => {
    const feedback = await callWorker(new Request('https://support.miden.xyz/feedback'));
    const feedbackSlash = await callWorker(new Request('https://support.miden.xyz/feedback/'));
    const ordinary = await callWorker(new Request('https://support.miden.xyz/api/not-real'));
    expect(feedback.headers.get('content-security-policy')).toContain('https://challenges.cloudflare.com');
    expect(feedbackSlash.headers.get('content-security-policy')).toContain('https://challenges.cloudflare.com');
    expect(ordinary.headers.get('content-security-policy')).not.toContain('https://challenges.cloudflare.com');
  });
});
