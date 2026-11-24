/**
 * Help Center contact Worker, served at contact.miden.xyz.
 *
 * Receives one report from the form on support.miden.xyz, checks it, and
 * emails it to the support inbox through Cloudflare's built-in email binding.
 * It stores nothing and calls no outside service; the only outbound request is
 * the Turnstile check, which is Cloudflare's own.
 */

import { parseReport, supportEmail } from './report';

/** The fields of Cloudflare's `send_email` binding this Worker uses. */
export interface EmailBinding {
  send(message: {
    to?: string;
    from: { email: string; name: string };
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    attachments?: Array<{ content: ArrayBuffer; filename: string; type: string; disposition: 'attachment' }>;
  }): Promise<unknown>;
}

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  EMAIL: EmailBinding;
  LIMITER?: RateLimiter;
  ALLOWED_ORIGIN: string;
  FROM_ADDRESS: string;
  TO_ADDRESS: string;
  /** Secret for the form's Turnstile site key. Without it, no report is sent. */
  TURNSTILE_SECRET?: string;
}

/** Room for a 15 MB attachment plus the text fields and multipart framing. */
const MAX_REQUEST_BYTES = 16 * 1024 * 1024;

function reply(env: Env, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': env.ALLOWED_ORIGIN,
      vary: 'Origin',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function turnstilePasses(token: string, secret: string, ip: string | null): Promise<boolean> {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
  return result?.success === true;
}

export async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname !== '/') return reply(env, 404, { ok: false, error: 'not_found' });

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': env.ALLOWED_ORIGIN,
        'access-control-allow-methods': 'POST',
        'access-control-max-age': '86400',
        vary: 'Origin',
      },
    });
  }
  if (request.method !== 'POST') return reply(env, 405, { ok: false, error: 'method' });

  // A form POST is a "simple" request: the browser sends it even when CORS
  // would hide the answer. So the origin is checked here, before anything is
  // sent, not left to the browser.
  if (request.headers.get('origin') !== env.ALLOWED_ORIGIN) return reply(env, 403, { ok: false, error: 'forbidden' });

  // Browsers always send the length of a form. A missing or unreadable one
  // would let the body be read with no cap, so it is refused.
  const length = Number(request.headers.get('content-length'));
  if (!Number.isFinite(length) || length <= 0) return reply(env, 411, { ok: false, error: 'invalid', field: 'form' });
  if (length > MAX_REQUEST_BYTES) return reply(env, 413, { ok: false, error: 'too_large' });

  const ip = request.headers.get('cf-connecting-ip');
  if (env.LIMITER) {
    const { success } = await env.LIMITER.limit({ key: ip ?? 'unknown' });
    if (!success) return reply(env, 429, { ok: false, error: 'rate_limited' });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(env, 400, { ok: false, error: 'invalid', field: 'form' });
  }

  // Hidden from people, filled in by bots. Answered as a success so the bot
  // learns nothing, and never emailed.
  const trap = form.get('website');
  if (typeof trap === 'string' && trap.trim() !== '') return reply(env, 200, { ok: true });

  // Mail goes out only after Turnstile passes. A Worker deployed without its
  // secret refuses every report rather than skip the check.
  if (!env.TURNSTILE_SECRET) {
    console.error('contact: TURNSTILE_SECRET is not set');
    return reply(env, 503, { ok: false, error: 'send_failed' });
  }
  const token = form.get('cf-turnstile-response');
  if (typeof token !== 'string' || !token || !(await turnstilePasses(token, env.TURNSTILE_SECRET, ip))) {
    return reply(env, 403, { ok: false, error: 'bot_check' });
  }

  const report = await parseReport(form);
  if ('error' in report) {
    const status = report.error === 'too_large' ? 413 : report.error === 'secret' ? 422 : 400;
    return reply(env, status, { ok: false, ...report });
  }

  const email = supportEmail(report);
  try {
    await env.EMAIL.send({
      to: env.TO_ADDRESS,
      from: { email: env.FROM_ADDRESS, name: 'Bread Help Center' },
      ...email,
    });
  } catch (error) {
    // The code tells the team which setup step is missing; for example
    // E_SENDER_NOT_VERIFIED means Email Sending has to be turned on.
    const code = (error as { code?: unknown }).code;
    const known = typeof code === 'string' && /^E_[A-Z_]+$/.test(code) ? code : undefined;
    console.error('contact: email not sent', known ?? '', (error as Error).message ?? '');
    // Cloudflare's code describes a setup state, not a secret, so it is also
    // returned: the first test report shows it in the browser's Network tab
    // without anyone opening the Worker's logs.
    return reply(env, 502, { ok: false, error: 'send_failed', ...(known ? { code: known } : {}) });
  }

  return reply(env, 200, { ok: true });
}

export default { fetch: handle };
