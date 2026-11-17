import { afterEach, describe, expect, it, vi } from 'vitest';

import { handle, type Env } from './index';

const ORIGIN = 'https://support.miden.xyz';

function env(overrides: Partial<Env> = {}): Env & { sent: unknown[] } {
  const sent: unknown[] = [];
  return {
    sent,
    EMAIL: { send: async (message) => { sent.push(message); return {}; } },
    ALLOWED_ORIGIN: ORIGIN,
    FROM_ADDRESS: 'help-center@miden.xyz',
    TO_ADDRESS: 'support@miden.team',
    ...overrides,
  };
}

/** A form POST as a browser sends it, with its Content-Length. */
async function post(fields: Record<string, string>, headers: Record<string, string> = { origin: ORIGIN }): Promise<Request> {
  const form = new FormData();
  for (const [name, value] of Object.entries({ type: 'general', title: 'A question', description: 'How do I add a token?', platform: 'android', network: 'testnet', email: 'user@example.com', ...fields })) form.append(name, value);
  const encoded = new Request('https://x/', { method: 'POST', body: form });
  const body = await encoded.arrayBuffer();
  return new Request('https://contact.miden.xyz/', {
    method: 'POST',
    body,
    headers: { ...headers, 'content-type': encoded.headers.get('content-type') ?? '', 'content-length': String(body.byteLength) },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('contact Worker', () => {
  it('emails a valid report to the support inbox', async () => {
    const e = env();
    const response = await handle(await post({ email: 'user@example.com' }), e);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(e.sent).toEqual([expect.objectContaining({
      to: 'support@miden.team',
      from: { email: 'help-center@miden.xyz', name: 'Bread Help Center' },
      replyTo: 'user@example.com',
      subject: '[General] A question',
    })]);
  });

  it('refuses requests from any other origin, before sending', async () => {
    const e = env();
    expect((await handle(await post({}, { origin: 'https://evil.example' }), e)).status).toBe(403);
    expect((await handle(await post({}, {}), e)).status).toBe(403);
    expect(e.sent).toEqual([]);
  });

  it('answers only POST and OPTIONS on /', async () => {
    const e = env();
    expect((await handle(new Request('https://contact.miden.xyz/'), e)).status).toBe(405);
    expect((await handle(new Request('https://contact.miden.xyz/admin'), e)).status).toBe(404);
    expect((await handle(new Request('https://contact.miden.xyz/', { method: 'OPTIONS' }), e)).status).toBe(204);
  });

  it('refuses a body without a usable length', async () => {
    const e = env();
    const request = await post({});
    const noLength = new Request(request.url, { method: 'POST', body: await request.arrayBuffer(), headers: { origin: ORIGIN, 'content-type': request.headers.get('content-type') ?? '' } });
    noLength.headers.delete('content-length');
    expect((await handle(noLength, e)).status).toBe(411);
    expect(e.sent).toEqual([]);
  });

  it('pretends to accept a bot that fills the hidden field, and sends nothing', async () => {
    const e = env();
    const response = await handle(await post({ website: 'http://spam.example' }), e);
    expect(response.status).toBe(200);
    expect(e.sent).toEqual([]);
  });

  it('stops a connection over the rate limit', async () => {
    const e = env({ LIMITER: { limit: async () => ({ success: false }) } });
    expect((await handle(await post({}), e)).status).toBe(429);
    expect(e.sent).toEqual([]);
  });

  it('returns the field that failed and refuses recovery phrases', async () => {
    const e = env();
    const missing = await handle(await post({ title: '' }), e);
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ ok: false, error: 'invalid', field: 'title' });
    const secret = await handle(await post({ description: 'abandon ability able about above absent absorb abstract absurd abuse access accident' }), e);
    expect(secret.status).toBe(422);
    expect(e.sent).toEqual([]);
  });

  it('reports a failed send and logs the error code', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = Object.assign(new Error('sender not verified'), { code: 'E_SENDER_NOT_VERIFIED' });
    const e = env({ EMAIL: { send: async () => { throw failure; } } });
    const response = await handle(await post({}), e);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: 'send_failed', code: 'E_SENDER_NOT_VERIFIED' });
    expect(log).toHaveBeenCalledWith('contact: email not sent', 'E_SENDER_NOT_VERIFIED', 'sender not verified');
  });

  it('skips the bot check without a secret, and requires a passing token with one', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ success: true })));
    expect((await handle(await post({}), env())).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();

    const e = env({ TURNSTILE_SECRET: 'secret' });
    expect((await handle(await post({}), e)).status).toBe(403);
    expect((await handle(await post({ 'cf-turnstile-response': 'token' }), e)).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false })));
    expect((await handle(await post({ 'cf-turnstile-response': 'bad' }), e)).status).toBe(403);
  });
});
