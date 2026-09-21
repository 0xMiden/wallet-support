/**
 * App Store Connect sign-in, for the customer-reviews API.
 *
 * There is no token endpoint to trade a key at. Every request carries a JWT
 * the Worker signs itself: ES256, the key's ID in the header, the team's issuer
 * ID as `iss`, audience `appstoreconnect-v1`, and at most 20 minutes of life.
 * So nothing here can tell whether the credentials are good. The first API
 * response does: a 401 there is this sign-in failing.
 *
 * THREE SECRETS, AND THE .p8 IS THE ONE THAT SIGNS.
 *   APPLE_ASC_KEY_ID       which key signed, so Apple can find its public half
 *   APPLE_ASC_ISSUER_ID    the team the key belongs to (team keys only)
 *   APPLE_ASC_PRIVATE_KEY  the key's .p8 file, pasted whole
 * The two IDs only name the key; without the .p8 there is no signature. Apple
 * lets a .p8 be downloaded once and keeps no copy, so a lost one means revoking
 * the key and issuing another, with a new Key ID.
 *
 * THE TOKEN IS NEVER STORED. It is minted per run and costs no request; keeping
 * it would put a live credential at rest in D1 for no saving at all.
 *
 * NOTHING HERE ECHOES A SECRET. Every error is fixed text naming the variable
 * at fault, never its value. Sync errors are stored in store_sync_state and
 * logged.
 */

export const APP_STORE_CONNECT_AUDIENCE = 'appstoreconnect-v1';

/**
 * Seconds a token is valid. Apple rejects more than 20 minutes for these
 * requests, and a run needs seconds: ten minutes leaves room for clock skew
 * without handing out anything long-lived.
 */
export const APPLE_TOKEN_LIFETIME_S = 10 * 60;

export class AppleAuthError extends Error {}

export interface AppStoreKey {
  keyId: string;
  issuerId: string;
  /** The private key as PKCS#8 DER. */
  pkcs8: Uint8Array;
}

const PEM_BEGIN = '-----BEGIN PRIVATE KEY-----';
const PEM_END = '-----END PRIVATE KEY-----';

/**
 * Reads the three secrets. Shape checks only: whether Apple accepts them is
 * learned from Apple.
 *
 * The ID checks exist because the likeliest mistake is a paste into the wrong
 * field, and "the key ID is not a key ID" is a better first report than
 * Apple's 401, which cannot say which of three values is wrong.
 */
export function parseAppStoreKey(
  keyId: string | undefined, issuerId: string | undefined, privateKey: string | undefined
): AppStoreKey {
  const kid = keyId?.trim() ?? '';
  const iss = issuerId?.trim() ?? '';
  if (!kid) throw new AppleAuthError('APPLE_ASC_KEY_ID is not set');
  if (!iss) throw new AppleAuthError('APPLE_ASC_ISSUER_ID is not set');
  if (!privateKey?.trim()) throw new AppleAuthError('APPLE_ASC_PRIVATE_KEY is not set');

  // The shapes Apple documents: a key ID like 2X9R4HXF34, an issuer ID like
  // 57246542-96fe-1a63-e053-0824d011072a.
  if (!/^[A-Z0-9]{10}$/.test(kid)) {
    throw new AppleAuthError('APPLE_ASC_KEY_ID is not a 10-character App Store Connect key ID');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(iss)) {
    throw new AppleAuthError('APPLE_ASC_ISSUER_ID is not an App Store Connect issuer ID');
  }
  return { keyId: kid, issuerId: iss, pkcs8: p8ToPkcs8(privateKey) };
}

function p8ToPkcs8(p8: string): Uint8Array {
  if (p8.includes('BEGIN EC PRIVATE KEY')) {
    throw new AppleAuthError('APPLE_ASC_PRIVATE_KEY is a SEC1 key; paste the .p8 file exactly as Apple issued it');
  }
  const start = p8.indexOf(PEM_BEGIN);
  const end = p8.indexOf(PEM_END);
  if (start === -1 || end < start) {
    throw new AppleAuthError(
      'APPLE_ASC_PRIVATE_KEY is not a .p8 private key; paste the whole file, BEGIN and END lines included'
    );
  }
  const base64 = p8
    .slice(start + PEM_BEGIN.length, end)
    // A dashboard field or a form may keep the line breaks as newlines, as
    // CRLF, as the characters "\n", or drop them. None of those is base64.
    .replace(/\\[rn]/g, '')
    .replace(/\s+/g, '');

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new AppleAuthError('APPLE_ASC_PRIVATE_KEY is not valid base64');
  }
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new AppleAuthError('APPLE_ASC_PRIVATE_KEY is not valid base64');
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

/** A team-key JWT for App Store Connect. It is the bearer token itself. */
export async function signAppStoreJwt(key: AppStoreKey, nowMs: number): Promise<string> {
  const iat = Math.floor(nowMs / 1000);
  const header = base64url(utf8.encode(JSON.stringify({ alg: 'ES256', kid: key.keyId, typ: 'JWT' })));
  const claims = base64url(utf8.encode(JSON.stringify({
    iss: key.issuerId,
    iat,
    exp: iat + APPLE_TOKEN_LIFETIME_S,
    aud: APP_STORE_CONNECT_AUDIENCE,
  })));

  let signingKey: CryptoKey;
  try {
    signingKey = await crypto.subtle.importKey(
      'pkcs8', key.pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
  } catch {
    throw new AppleAuthError('APPLE_ASC_PRIVATE_KEY could not be imported as a P-256 signing key');
  }

  const signingInput = `${header}.${claims}`;
  // WebCrypto returns an ECDSA signature as r||s, 64 bytes for P-256: exactly
  // the form JWS requires for ES256 (RFC 7518 section 3.4). Not DER, so no
  // conversion.
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, signingKey, utf8.encode(signingInput)
  );
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}
