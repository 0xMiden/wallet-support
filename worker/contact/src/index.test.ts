import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { handle, type Env } from './index';

const ORIGIN = 'https://support.miden.xyz';
/** Cloudflare's always-pass test secret and the dummy token its test site keys issue. */
const TEST_SECRET = '1x0000000000000000000000000000000AA';
const TEST_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';

function env(overrides: Partial<Env> = {}): Env & { sent: unknown[] } {
  const sent: unknown[] = [];
  return {
    sent,
    EMAIL: { send: async (message) => { sent.push(message); return {}; } },
    ALLOWED_ORIGIN: ORIGIN,
    FROM_ADDRESS: 'help-center@miden.xyz',
    TO_ADDRESS: 'support@miden.team',
    TURNSTILE_SECRET: TEST_SECRET,
    ...overrides,
  };
}

/** A form POST as a browser sends it, with its Content-Length. */
async function post(fields: Record<string, string>, headers: Record<string, string> = { origin: ORIGIN }): Promise<Request> {
  const form = new FormData();
  for (const [name, value] of Object.entries({ type: 'general', title: 'A question', description: 'How do I add a token?', platform: 'android', network: 'testnet', email: 'user@example.com', 'cf-turnstile-response': TEST_TOKEN, ...fields })) form.append(name, value);
  const encoded = new Request('https://x/', { method: 'POST', body: form });
  const body = await encoded.arrayBuffer();
  return new Request('https://contact.miden.xyz/', {
    method: 'POST',
    body,
    headers: { ...headers, 'content-type': encoded.headers.get('content-type') ?? '', 'content-length': String(body.byteLength) },
  });
}

/** Cloudflare's siteverify, answering with the given result. */
function siteverify(result: Record<string, unknown>): MockInstance<typeof fetch> {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(result)));
}

let verify: MockInstance<typeof fetch>;
beforeEach(() => { verify = siteverify({ success: true }); });
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

    expect(verify).toHaveBeenCalledOnce();
    const [url, init] = verify.mock.calls[0]!;
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const sent = init?.body as FormData;
    expect(sent.get('secret')).toBe(TEST_SECRET);
    expect(sent.get('response')).toBe(TEST_TOKEN);
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

  it('sends nothing without a token, and checks no token with Cloudflare', async () => {
    const e = env();
    const response = await handle(await post({ 'cf-turnstile-response': '' }), e);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: 'bot_check' });
    expect(verify).not.toHaveBeenCalled();
    expect(e.sent).toEqual([]);
  });

  it.each(['invalid-input-response', 'timeout-or-duplicate'])('sends nothing when Cloudflare answers %s', async (code) => {
    siteverify({ success: false, 'error-codes': [code] });
    const e = env();
    const response = await handle(await post({}), e);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: 'bot_check' });
    expect(e.sent).toEqual([]);
  });

  it('refuses every report when the Turnstile secret is missing', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const e = env({ TURNSTILE_SECRET: undefined });
    const response = await handle(await post({}), e);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: 'send_failed' });
    expect(log).toHaveBeenCalledWith('contact: TURNSTILE_SECRET is not set');
    expect(verify).not.toHaveBeenCalled();
    expect(e.sent).toEqual([]);
  });
});
