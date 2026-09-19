/** Request authenticity: Turnstile + HMAC + replay protection. */

export interface TurnstileResult {
  ok: boolean;
  /**
   * Cloudflare's error-codes, passed back to the caller rather than discarded.
   * "challenge failed" on its own is unactionable — these say WHICH failure:
   *   invalid-input-secret     TURNSTILE_SECRET does not match the site key
   *   invalid-input-response   the token is malformed or for another site key
   *   timeout-or-duplicate     the token expired (300s) or was already spent
   *   missing-input-response   no token was sent
   */
  codes: string[];
}

export async function verifyTurnstile(token: string, secret: string, ip?: string): Promise<TurnstileResult> {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  // Parse the body on ANY status. siteverify answers a bad secret with
  // HTTP 400 and the reason in error-codes — returning early on !res.ok
  // discards exactly the diagnosis we need.
  const data = (await res.json().catch(() => null)) as
    { success?: boolean; 'error-codes'?: string[] } | null;
  if (!data) return { ok: false, codes: [`siteverify-http-${res.status}-unparseable`] };
  return { ok: data.success === true, codes: data['error-codes'] ?? [] };
}

/** Constant-time comparison. Never use === on a MAC or a bearer token. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyHmac(body: string, signature: string, key: string): Promise<boolean> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(body));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(hex, signature.replace(/^sha256=/, ''));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuidV4 = (s: unknown): s is string => typeof s === 'string' && UUID_V4.test(s);
