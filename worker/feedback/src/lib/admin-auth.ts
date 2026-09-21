/**
 * Who is allowed to open the admin console.
 *
 * Sign in with Google, whitelist by email address. You add someone's address,
 * they click one button, they are in; you disable the row, they are out on
 * their next request. There is no password to choose, no invite to expire, and
 * no third-party auth vendor sitting between the team and their own console.
 *
 * WHY GOOGLE AND NOT EMAIL LINKS. Sending mail requires a domain onboarded for
 * sending, with SPF and DKIM. Google already knows who owns `@miden.team`, and
 * asking it costs one redirect and no DNS. (`miden.team` delivers mail through
 * Proton, but its IDENTITIES are Google — mail routing and identity provider
 * are separate things, and the MX record does not tell you about the second.)
 *
 * WHAT THIS REPLACES. Until now `/admin/review` took no credential at all, by a
 * decision made when the repository was private and one person used it. The
 * repository is public and the team is bigger, so the route is discoverable
 * from source and its buttons — Release, Confirm spam, and soon reply approval
 * and the handoff — publish things nobody can take back.
 *
 * THREE PROPERTIES THIS FILE EXISTS TO HOLD.
 *
 *   1. A SESSION CANNOT BE FORGED. The cookie is HMAC-signed with a Worker
 *      secret and carries its own expiry. Nothing in it is trusted before the
 *      signature is checked in constant time.
 *
 *   2. REVOCATION IS IMMEDIATE. The allowlist is consulted on every request,
 *      not just at sign-in. A signed cookie alone would keep working until it
 *      expired, which is the wrong answer to "remove them now".
 *
 *   3. A STATE-CHANGING REQUEST CANNOT BE MADE BY ANOTHER SITE. Every POST
 *      carries a CSRF token bound to the session. There was none before because
 *      there was no session to bind one to.
 */
import { timingSafeEqual, sha256Hex } from './validate';

/** Google's endpoints. Discovery is skipped — these have been stable for years. */
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

const SESSION_COOKIE = '__Host-mfv2_admin';
const STATE_COOKIE = '__Host-mfv2_oauth';
/** Long enough for a working session, short enough that a stolen laptop ages out. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;

export interface AdminUser {
  email: string;
  name: string | null;
}

export interface AuthEnv {
  DB: D1Database;
  ADMIN_SESSION_SECRET?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  /** Optional extra guard: only addresses on these domains may sign in. */
  ADMIN_EMAIL_DOMAINS?: string;
}

/** Addresses are compared lowercased, always. See migration 0008. */
export const normalizeEmail = (raw: unknown): string =>
  String(raw ?? '').trim().toLowerCase();

/**
 * The domain fence, in ONE place.
 *
 * Sign-in enforces it, and the Settings page refuses to grant access outside
 * it. Two copies of this check would drift, and the failure is quiet: an
 * address the page accepts but sign-in rejects shows up in the list as having
 * access while the person is turned away with no way to tell why.
 *
 * An empty or unset ADMIN_EMAIL_DOMAINS means no fence.
 */
export function onAllowedDomain(env: Pick<AuthEnv, 'ADMIN_EMAIL_DOMAINS'>, email: string): boolean {
  const domains = (env.ADMIN_EMAIL_DOMAINS ?? '').split(',')
    .map((d) => d.trim().toLowerCase()).filter(Boolean);
  const addr = normalizeEmail(email);
  return domains.length === 0 || domains.some((d) => addr.endsWith(`@${d}`));
}

const enc = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** base64url without padding — what JWTs use, and safe in a cookie. */
function b64urlDecode(part: string): string {
  const pad = part.replace(/-/g, '+').replace(/_/g, '/');
  return atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/**
 * `value.expiry.signature`.
 *
 * The expiry is INSIDE the signed payload, not merely a cookie attribute. A
 * cookie's own Max-Age is a request to the browser; a browser that ignores it,
 * or a cookie replayed by something that is not a browser, would otherwise be
 * valid forever.
 */
async function sign(secret: string, value: string, expiresAt: number): Promise<string> {
  const payload = `${value}.${expiresAt}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

async function unsign(secret: string, token: string, nowMs: number): Promise<string | null> {
  const cut = token.lastIndexOf('.');
  if (cut < 0) return null;
  const payload = token.slice(0, cut);
  const given = token.slice(cut + 1);
  // Constant time: a comparison that returns early leaks how much of a forged
  // signature was right, one byte at a time.
  if (!timingSafeEqual(given, await hmac(secret, payload))) return null;

  const split = payload.lastIndexOf('.');
  if (split < 0) return null;
  const expiresAt = Number(payload.slice(split + 1));
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return null;
  return payload.slice(0, split);
}

export function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/**
 * `__Host-` prefix: the browser refuses the cookie unless it is Secure, has
 * Path=/ and NO Domain attribute. That makes it impossible for a sibling
 * subdomain to set or overwrite it, which is the one cookie attack a signature
 * does not address.
 *
 * BOTH COOKIES ARE Lax. Strict on either one breaks sign-in, in two different
 * ways, and both have happened.
 *
 * Google returns the browser to /admin/auth/callback by a TOP-LEVEL CROSS-SITE
 * NAVIGATION from accounts.google.com, and that navigation stays cross-site
 * through the callback's own redirect. A Strict cookie is withheld on all of it.
 *
 *   OAuth state -> Lax. Strict is withheld on the return to the callback, which
 *               then finds no state cookie and refuses every real sign-in with
 *               "the sign-in link did not match this browser".
 *
 *   Session  -> Lax. Strict is STORED by the callback and then withheld on its
 *               303 into /admin/review, and on a reload of that page, so a
 *               sign-in that succeeded lands on the sign-in page with no error.
 *               Only a fresh navigation would carry it. That shipped, and the
 *               first real sign-in found it on 2026-09-11.
 *
 * Lax is not a weakening for either. It is still withheld on a cross-site POST,
 * every state-changing POST also needs the CSRF token below, and every console
 * page a session opens by GET only reads. The state cookie is also single-use,
 * expires in ten minutes, is signed, and is compared against the `state` Google
 * echoes back. Both are `Secure`, `HttpOnly` and `__Host-`.
 *
 * Both survived the unit tests because they set the `Cookie` header by hand,
 * which is exactly the browser behaviour under test — see the browser-level
 * smoke test, which checks both.
 */
export type SameSite = 'Strict' | 'Lax';

function setCookie(name: string, value: string, maxAgeSec: number, sameSite: SameSite): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAgeSec}`;
}

// Cleared with the SAME SameSite it was set with. A mismatch is not fatal for a
// deletion, but a clear that does not match its set is the kind of asymmetry
// that later reads as intent.
const clearCookie = (name: string, sameSite: SameSite) =>
  `${name}=; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=0`;

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

/**
 * Bound to the signed-in address, so a token minted for one person is not valid
 * for another. `SameSite=Lax` already blocks the cross-site POST; this is the
 * second lock, because SameSite is a browser behaviour and this is a decision
 * about publishing to a third-party repository.
 */
export async function csrfToken(env: AuthEnv, email: string): Promise<string> {
  return hmac(env.ADMIN_SESSION_SECRET ?? '', `csrf:${email}`);
}

export async function csrfOk(env: AuthEnv, email: string, given: unknown): Promise<boolean> {
  if (typeof given !== 'string' || given === '') return false;
  return timingSafeEqual(given, await csrfToken(env, email));
}

// ---------------------------------------------------------------------------
// The allowlist
// ---------------------------------------------------------------------------

/**
 * Consulted on EVERY request, not just at sign-in.
 *
 * That is what makes "remove them" mean now rather than whenever their cookie
 * happens to expire. It costs one indexed primary-key lookup on a page nobody
 * loads in a loop.
 */
export async function lookupAllowed(db: D1Database, email: string): Promise<AdminUser | null> {
  const row = await db.prepare(
    'SELECT email, name, disabled_at FROM admin_allowed WHERE email = ?'
  ).bind(normalizeEmail(email)).first<{ email: string; name: string | null; disabled_at: number | null }>();
  if (!row || row.disabled_at != null) return null;
  return { email: row.email, name: row.name };
}

/**
 * The signed-in user, or null.
 *
 * FAILS CLOSED. With no session secret configured this returns null for
 * everyone rather than letting everyone through — a missing secret must lock
 * the door, not remove it.
 */
export async function currentUser(req: Request, env: AuthEnv, nowMs: number): Promise<AdminUser | null> {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return null;

  const cookie = readCookie(req, SESSION_COOKIE);
  if (!cookie) return null;

  const email = await unsign(secret, cookie, nowMs);
  if (!email) return null;

  return lookupAllowed(env.DB, email);
}

// ---------------------------------------------------------------------------
// The Google round trip
// ---------------------------------------------------------------------------

export function isConfigured(env: AuthEnv): boolean {
  return Boolean(env.ADMIN_SESSION_SECRET && env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);
}

const redirectUri = (url: URL) => `${url.origin}/admin/auth/callback`;

/**
 * Sends the browser to Google.
 *
 * `state` is signed and mirrored into a cookie: Google hands it back, and the
 * two must match. Without it, an attacker can complete a sign-in flow in a
 * victim's browser and land them in a session that is not theirs.
 *
 * `prompt=select_account` because people have more than one Google account —
 * silently reusing whichever they last used is how somebody signs in as the
 * wrong identity and does not notice.
 */
export async function startSignIn(env: AuthEnv, url: URL, nowMs: number): Promise<Response> {
  const nonce = crypto.randomUUID();
  const state = await sign(env.ADMIN_SESSION_SECRET!, nonce, nowMs + STATE_TTL_MS);

  const authorize = new URL(GOOGLE_AUTH);
  authorize.searchParams.set('client_id', env.GOOGLE_OAUTH_CLIENT_ID!);
  authorize.searchParams.set('redirect_uri', redirectUri(url));
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', 'openid email profile');
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('prompt', 'select_account');

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      // Lax: this is the cookie Google's cross-site redirect must return with.
      'set-cookie': setCookie(STATE_COOKIE, state, STATE_TTL_MS / 1000, 'Lax'),
      'cache-control': 'no-store',
    },
  });
}

/**
 * Consumes a state value, atomically, exactly once.
 *
 * Verifying that a state is signed and unexpired says it CAME FROM US and is
 * RECENT. It does not say it has not already been used, and clearing the
 * browser cookie does not either — clearing a cookie is a request to a browser,
 * and a scripted client is not a browser. Holding the cookie value and the
 * state string, it could replay the callback for the full ten minutes, and
 * every replay reached Google's token endpoint.
 *
 * The INSERT is the check. `ON CONFLICT DO NOTHING` plus `changes` is atomic in
 * SQLite, so of two racing callbacks exactly one sees 1 and proceeds; the loser
 * sees 0 and is refused. A SELECT-then-INSERT would let both through in the gap
 * between them, which is the race a replay creates deliberately.
 *
 * Returns true when THIS caller consumed it. Fails CLOSED: a database error is
 * a refusal, never a pass, because the alternative is an unbounded replay.
 */
async function consumeState(
  db: D1Database, state: string, nowMs: number
): Promise<boolean> {
  const hash = await sha256Hex(state);
  try {
    const res = await db.prepare(
      `INSERT INTO admin_oauth_state (state_hash, consumed_at, expires_at)
       VALUES (?,?,?) ON CONFLICT(state_hash) DO NOTHING`
    ).bind(hash, nowMs, nowMs + STATE_TTL_MS).run();
    if ((res.meta?.changes ?? 0) !== 1) return false;
  } catch (err) {
    console.warn('oauth state could not be consumed', (err as Error)?.message);
    return false;
  }

  // Opportunistic purge of everything already dead. Cheap, indexed, and it
  // keeps the table from growing without a cron to look after it. Its failure
  // is not the caller's problem.
  try {
    await db.prepare('DELETE FROM admin_oauth_state WHERE expires_at <= ?').bind(nowMs).run();
  } catch { /* a full table is untidy, not unsafe */ }

  return true;
}

export type CallbackResult =
  | { ok: true; user: AdminUser; setCookie: string }
  | { ok: false; reason: string; email?: string };

/**
 * Google's ID token, checked.
 *
 * THE SIGNATURE IS NOT VERIFIED HERE, AND THAT IS CORRECT — narrowly.
 * This token did not come from the browser. It came from a direct HTTPS POST
 * from this Worker to Google's token endpoint, so TLS already establishes both
 * who sent it and that it was not altered. Google's own OpenID Connect guidance
 * says a token obtained this way needs no signature check.
 *
 * That reasoning collapses the moment an ID token arrives by any other route.
 * If a future change accepts one from a redirect, a form post, or a client, the
 * JWKS verification has to come with it. The claims below are checked either
 * way, because a valid signature over the wrong audience is still the wrong
 * token.
 */
function readIdToken(idToken: string, clientId: string, nowSec: number):
  { email: string; name: string | null } | { error: string } {
  const parts = idToken.split('.');
  if (parts.length !== 3) return { error: 'id_token malformed' };

  let claims: any;
  try { claims = JSON.parse(b64urlDecode(parts[1])); } catch { return { error: 'id_token unreadable' }; }

  // Audience: a token minted for a DIFFERENT application is a valid Google
  // token and must not sign anybody in here.
  if (claims.aud !== clientId) return { error: 'id_token audience mismatch' };
  if (!GOOGLE_ISSUERS.includes(String(claims.iss))) return { error: 'id_token issuer mismatch' };
  if (!Number.isFinite(Number(claims.exp)) || Number(claims.exp) <= nowSec) {
    return { error: 'id_token expired' };
  }
  // An UNVERIFIED address proves nothing: anyone can put any address on an
  // account until Google has confirmed it.
  if (claims.email_verified !== true && claims.email_verified !== 'true') {
    return { error: 'google has not verified that address' };
  }
  const email = normalizeEmail(claims.email);
  if (!email) return { error: 'id_token carried no address' };

  return { email, name: typeof claims.name === 'string' ? claims.name : null };
}

export async function handleCallback(
  req: Request, env: AuthEnv, url: URL, nowMs: number
): Promise<CallbackResult> {
  const returnedState = url.searchParams.get('state');
  const cookieState = readCookie(req, STATE_COOKIE);
  if (!returnedState || !cookieState || !timingSafeEqual(returnedState, cookieState)) {
    return { ok: false, reason: 'The sign-in link did not match this browser. Please try again.' };
  }
  if (!(await unsign(env.ADMIN_SESSION_SECRET!, returnedState, nowMs))) {
    return { ok: false, reason: 'That sign-in attempt expired. Please try again.' };
  }

  /**
   * CONSUMED HERE, before anything is spent on it. A replay is refused without
   * ever reaching Google's token endpoint, which is both the security property
   * and the reason it costs nothing.
   */
  if (!(await consumeState(env.DB, returnedState, nowMs))) {
    return { ok: false, reason: 'That sign-in link has already been used. Please sign in again.' };
  }

  const code = url.searchParams.get('code');
  if (!code) return { ok: false, reason: 'Google did not return a sign-in code.' };

  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: redirectUri(url),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) return { ok: false, reason: 'Google refused the sign-in.' };

  const body = (await res.json()) as { id_token?: string };
  if (!body.id_token) return { ok: false, reason: 'Google returned no identity token.' };

  const claims = readIdToken(body.id_token, env.GOOGLE_OAUTH_CLIENT_ID!, Math.floor(nowMs / 1000));
  if ('error' in claims) return { ok: false, reason: claims.error };

  // Optional domain fence, checked BEFORE the allowlist. Belt and braces: the
  // allowlist is what grants access, and this stops a typo in it from ever
  // granting access to an outside address.
  if (!onAllowedDomain(env, claims.email)) {
    return { ok: false, reason: 'That address is not on an allowed domain.', email: claims.email };
  }

  const user = await lookupAllowed(env.DB, claims.email);
  if (!user) {
    // Says exactly what is wrong. This is an internal console, not a public
    // sign-up: hiding whether an address is on the list protects nobody and
    // leaves the person guessing at something an admin can fix in one click.
    return { ok: false, reason: 'That address does not have access yet.', email: claims.email };
  }

  await env.DB.prepare(
    'UPDATE admin_allowed SET last_seen_at = ?, name = COALESCE(?, name) WHERE email = ?'
  ).bind(nowMs, claims.name, user.email).run();

  const token = await sign(env.ADMIN_SESSION_SECRET!, user.email, nowMs + SESSION_TTL_MS);
  return {
    ok: true,
    user: { email: user.email, name: claims.name ?? user.name },
    setCookie: setCookie(SESSION_COOKIE, token, SESSION_TTL_MS / 1000, 'Lax'),
  };
}

export const signOutCookies = (): string[] =>
  [clearCookie(SESSION_COOKIE, 'Lax'), clearCookie(STATE_COOKIE, 'Lax')];
export const clearStateCookie = () => clearCookie(STATE_COOKIE, 'Lax');
