import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorMessage, sendContactReport } from './api';

afterEach(() => vi.restoreAllMocks());

const respond = (status: number, body: unknown) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('sendContactReport', () => {
  it('posts the form to the contact Worker', async () => {
    const fetchMock = respond(200, { ok: true });
    const form = new FormData();
    form.append('title', 'Hello');
    expect(await sendContactReport(form)).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('https://contact.miden.xyz/', { method: 'POST', body: form });
  });

  it('passes on the error and the field', async () => {
    respond(400, { ok: false, error: 'invalid', field: 'email' });
    expect(await sendContactReport(new FormData())).toEqual({ ok: false, error: 'invalid', field: 'email' });
  });

  it('turns a network failure or an unreadable answer into a result', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await sendContactReport(new FormData())).toEqual({ ok: false, error: 'network' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>', { status: 502 }));
    expect(await sendContactReport(new FormData())).toEqual({ ok: false, error: 'send_failed' });
  });
});

describe('errorMessage', () => {
  it('names the field to fix and warns about recovery phrases', () => {
    expect(errorMessage({ ok: false, error: 'invalid', field: 'email' })).toBe('Check Email and send again.');
    expect(errorMessage({ ok: false, error: 'secret' })).toContain('recovery phrase');
    expect(errorMessage({ ok: false, error: 'send_failed' })).toContain("wasn't sent");
  });
});
