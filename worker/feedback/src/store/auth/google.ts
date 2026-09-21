/**
 * Google service-account sign-in, for the Play Developer API.
 *
 * The Worker holds the service-account key file — GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,
 * pasted whole, exactly as Google Cloud downloads it — and trades it for a
 * short-lived access token on every sync run: sign a JWT with the key, POST it
 * to Google's token endpoint, send the token with the page request.
 *
 * ONE SECRET, THE FILE AS-IS. Cutting the PEM body and the address out by hand
 * is where a paste goes wrong, so the file is parsed here instead.
 *
 * THE TOKEN IS NEVER STORED. One mint per run costs one subrequest and nothing
 * against the androidpublisher quota; caching it would put a live bearer token
 * at rest in D1 to save a request there is ample budget for.
 *
 * NOTHING HERE ECHOES THE KEY. Every error is fixed text, an HTTP status, or a
 * short machine code from Google. Sync errors are stored in store_sync_state
 * and logged, and `JSON.parse` quotes a slice of its input in its own error
 * message — for this input, a slice of a private key.
 */

import { classifyGoogle, markFailure } from '../failure';

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Resolves `fetch` at call time, so a test's stub is the one that runs. */
export const defaultFetch: FetchLike = (input, init) => fetch(input, init);

export class GoogleAuthError extends Error {}

export interface ServiceAccount {
  clientEmail: string;
  /** The private key as PKCS#8 DER. */
  pkcs8: Uint8Array;
}

/**
 * A short machine code from an upstream error body, or nothing.
 *
 * Only `invalid_grant`-shaped values survive. Free-text descriptions do not:
 * they are upstream-controlled and have no business in a stored error.
 */
export function upstreamCode(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z_]{1,40}$/.test(value) ? `, ${value}` : '';
}

export function parseServiceAccount(raw: string | undefined): ServiceAccount {
  if (!raw || !raw.trim()) throw new GoogleAuthError('Google Play key is not set');

  let file: any;
  try {
    file = JSON.parse(raw);
  } catch {
    // NOT the parser's own message. It quotes the input, and the input is a key.
    throw new GoogleAuthError('Google Play key is not valid JSON; paste the key file exactly as downloaded');
  }

  if (typeof file?.client_email !== 'string' || !file.client_email.includes('@')) {
    throw new GoogleAuthError('Google Play key has no client_email');
  }
  if (typeof file?.private_key !== 'string') {
    throw new GoogleAuthError('Google Play key has no private_key');
  }
  return { clientEmail: file.client_email, pkcs8: pemToPkcs8(file.private_key) };
}

function pemToPkcs8(pem: string): Uint8Array {
  if (pem.includes('BEGIN RSA PRIVATE KEY')) {
    throw new GoogleAuthError('private_key is PKCS#1; a Google service-account key file carries PKCS#8');
  }
  if (!pem.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new GoogleAuthError('private_key is not a PEM private key');
  }
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    // A key that went through a form can keep its line breaks as the two
    // characters "\n" rather than as newlines. Neither is base64.
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new GoogleAuthError('private_key is not valid base64');
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

const utf8 = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** An RS256 JWT asserting the service account, for Google's token endpoint. */
export async function signServiceAccountJwt(sa: ServiceAccount, nowMs: number): Promise<string> {
  const iat = Math.floor(nowMs / 1000);
  const header = base64url(utf8.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = base64url(utf8.encode(JSON.stringify({
    iss: sa.clientEmail,
    scope: ANDROID_PUBLISHER_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat,
    exp: iat + 3600,
  })));

  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      'pkcs8', sa.pkcs8, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
    );
  } catch {
    throw new GoogleAuthError('private_key could not be imported as an RSA signing key');
  }

  const signingInput = `${header}.${claims}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8.encode(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

/**
 * Trades the key for an access token.
 *
 * THE ENDPOINT IS PINNED. The key file carries its own `token_uri`, and
 * honouring it would let an edited secret send a signed assertion anywhere.
 */
export async function mintAccessToken(
  sa: ServiceAccount, nowMs: number, fetchImpl: FetchLike = defaultFetch
): Promise<string> {
  const assertion = await signServiceAccountJwt(sa, nowMs);
  const res = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });

  let body: any = null;
  try { body = await res.json(); } catch { /* the status is reported either way */ }

  if (!res.ok) {
    /**
     * A REFUSED KEY IS THE ONE FAILURE RETRYING CANNOT FIX, and this is where
     * a deleted service account or a revoked key actually surfaces: `401`, or
     * the 400 + `invalid_grant` that Google answers to a signed assertion from
     * a key it no longer knows. Left as an ordinary failure it costs a request
     * every five minutes, for ever, for an answer that will not change.
     *
     * A parse failure above is deliberately NOT marked: a pasted secret that
     * is wrong gets corrected within the hour, and the ordinary backoff picks
     * the correction up on its own.
     */
    throw markFailure(
      new GoogleAuthError(`Google refused the Play key (HTTP ${res.status}${upstreamCode(body?.error)})`),
      classifyGoogle(res.status, res.headers, body, nowMs)
    );
  }
  if (typeof body?.access_token !== 'string' || !body.access_token) {
    throw new GoogleAuthError('Google returned no access token');
  }
  return body.access_token;
}
