/**
 * Admin sign-in: Google, against an allowlist of email addresses.
 *
 * This file is mostly about what the gate REFUSES. A door is not described by
 * the people it lets through.
 *
 * The reversal it encodes: `/admin/review` took no credential at all between
 * 2026-08-25 and 2026-09-02 — a deliberate decision, correct while the
 * repository was private and one person used it. The repository is public and
 * the team is bigger, so the route is discoverable from source and its buttons
 * publish things nobody can take back.
 */
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import {
  callWorker, installFetchStub, restoreFetch, route,
  seedAdmin, adminCookie, adminCsrf, adminHeaders, ADMIN_EMAIL,
} from './helpers';

const BASE = 'https://mfv2.test';
const CLIENT_ID = 'test-google-client';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });
beforeEach(async () => {
  await env.DB.prepare('DELETE FROM admin_allowed').run();
});

const get = (path: string, headers: Record<string, string> = {}) =>
  callWorker(new Request(`${BASE}${path}`, { method: 'GET', headers }));

/** base64url, no padding — what a JWT payload actually is. */
const b64url = (o: unknown) => btoa(JSON.stringify(o))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** A Google ID token with whatever claims the test wants to try. */
function idToken(over: Record<string, unknown> = {}): string {
  const claims = {
    aud: CLIENT_ID,
    iss: 'https://accounts.google.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: ADMIN_EMAIL,
    email_verified: true,
    name: 'Ivan Lomoljo',
    ...over,
  };
  return `${b64url({ alg: 'RS256' })}.${b64url(claims)}.signature-not-checked`;
}

let googleCalls = 0;
function mockGoogleToken(token: string | null, ok = true) {
  googleCalls = 0;
  route({
    match: (u: URL, m: string) => u.host === 'oauth2.googleapis.com' && m === 'POST',
    respond: () => {
      googleCalls += 1;
      return ok
        ? Response.json(token ? { id_token: token } : {})
        : new Response('nope', { status: 400 });
    },
  });
}

/** Drives the full redirect round trip and returns the callback's response. */
async function signInWith(token: string | null, ok = true) {
  mockGoogleToken(token, ok);
  const start = await get('/admin/auth/start');
  const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
  const cookie = start.headers.get('set-cookie')!.split(';')[0];
  return callWorker(new Request(
    `${BASE}/admin/auth/callback?code=abc&state=${encodeURIComponent(state)}`,
    { headers: { cookie } }
  ));
}

describe('the session cannot be faked', () => {
  it('A20. the page names the account to use, and never says "welcome back"', async () => {
    // Access is invite-only, so the FIRST visit is the common case: everyone
    // who reaches this page reaches it for the first time once, usually just
    // after being added and told to go and sign in. Greeting them as a
    // returning user is wrong exactly when it matters most.
    const html = await (await get('/admin/review?q=suspected')).text();
    expect(html.toLowerCase()).not.toContain('welcome back');
    // And it says WHICH account — people have several Google accounts, and
    // picking the personal one fails with no hint about why.
    expect(html).toContain('@miden.team account');
  });

  it('A1. a cookie with a wrong signature is not a session', async () => {
    await seedAdmin();
    const real = await adminCookie();
    // Flip the last character of the signature. Everything else is valid.
    const forged = real.slice(0, -1) + (real.endsWith('a') ? 'b' : 'a');

    const res = await get('/admin/review?q=suspected', { cookie: forged });
    expect(await res.text()).toContain('Continue with Google');
  });

  it('A2. a well-signed session that has expired is not a session', async () => {
    await seedAdmin();
    // The expiry lives INSIDE the signed payload, not only in the cookie's
    // Max-Age: a Max-Age is a request to the browser, and a replayed cookie
    // never sees one.
    const stale = await adminCookie(ADMIN_EMAIL, -1000);
    const res = await get('/admin/review?q=suspected', { cookie: stale });
    expect(await res.text()).toContain('Continue with Google');
  });

  it('A3. a session for an address nobody added is not a session', async () => {
    // Correctly signed, unexpired, and for an address that is not on the list.
    const res = await get('/admin/review?q=suspected', {
      cookie: await adminCookie('stranger@miden.team'),
    });
    expect(await res.text()).toContain('Continue with Google');
  });

  it('A4. THE SESSION COOKIE IS Lax, OR A SIGN-IN THAT SUCCEEDED LANDS ON THE SIGN-IN PAGE', async () => {
    /**
     * Shipped as Strict and found by the first real sign-in, 2026-09-11. The
     * callback verified the address and set the session, but its 303 into
     * /admin/review is still part of Google's cross-site navigation, so a Strict
     * cookie is withheld on that hop and on a reload of the page it lands on.
     * The person is back on the sign-in page with no error.
     *
     * Same blind spot as A4b: these tests set the Cookie header by hand.
     * test/browser/oauth-samesite.mjs proves a Lax session survives the
     * cross-site return in a real browser.
     */
    await seedAdmin();
    const res = await signInWith(idToken());
    // The callback also clears the state cookie, which is Lax. Isolate the
    // session's own header, or a Strict session would pass on the other one.
    const cookie = (res.headers.getAll
      ? res.headers.getAll('set-cookie')
      : [res.headers.get('set-cookie') ?? '']
    ).find((c) => c.startsWith('__Host-mfv2_admin=')) ?? '';
    expect(cookie).toContain('__Host-');       // no sibling subdomain can set it
    expect(cookie).toContain('HttpOnly');      // script cannot read it
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('SameSite=Strict');
  });

  it('A4b. THE OAUTH STATE COOKIE IS Lax, OR NO REAL SIGN-IN EVER COMPLETES', async () => {
    /**
     * The bug this pins was shipped and would have failed on the first real
     * sign-in. Google returns the browser to /admin/auth/callback by a
     * TOP-LEVEL CROSS-SITE NAVIGATION from accounts.google.com, and a Strict
     * cookie is withheld on exactly that navigation — so the callback found no
     * state and refused everybody with "did not match this browser".
     *
     * It survived the suite because these tests set the Cookie header by hand,
     * which is precisely the browser behaviour under test. A test that
     * fabricates the thing it is testing cannot fail. This assertion is the
     * cheap half of the fix; test/browser/oauth-samesite.spec.mjs is the half
     * that uses a real cookie jar.
     */
    const start = await get('/admin/auth/start');
    const cookie = start.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('__Host-mfv2_oauth=');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('SameSite=Strict');

    // Lax is not a weakening: still Secure, HttpOnly, __Host-, and the value is
    // signed and single-use with a ten-minute life.
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Max-Age=600');
  });

  it('A4c. signing out clears each cookie with the policy it was set with', async () => {
    await seedAdmin();
    const form = new FormData();
    form.set('csrf', await adminCsrf());
    const res = await callWorker(new Request(`${BASE}/admin/logout`, {
      method: 'POST', body: form, headers: { cookie: await adminCookie() },
    }));
    const cookies = res.headers.getAll
      ? res.headers.getAll('set-cookie').join(' | ')
      : (res.headers.get('set-cookie') ?? '');
    // A clear that does not match its set is the kind of asymmetry that later
    // reads as intent.
    expect(cookies).toMatch(/__Host-mfv2_admin=;[^|]*SameSite=Lax/);
    expect(cookies).not.toMatch(/__Host-mfv2_admin=;[^|]*SameSite=Strict/);
    expect(cookies).toMatch(/__Host-mfv2_oauth=;[^|]*SameSite=Lax/);
  });
});

describe('what Google says is checked, not assumed', () => {
  it('A5. an unverified address is refused', async () => {
    await seedAdmin();
    // Anyone can put any address on an account until Google confirms it.
    const res = await signInWith(idToken({ email_verified: false }));
    expect(res.status).toBe(403);
    expect(await res.text()).toContain('has not verified');
  });

  it('A6. a token minted for another application is refused', async () => {
    await seedAdmin();
    // A perfectly valid Google token for somebody else's app.
    const res = await signInWith(idToken({ aud: 'some-other-app.apps.googleusercontent.com' }));
    expect(res.status).toBe(403);
    expect(await res.text()).toContain('audience');
  });

  it('A7. an expired token is refused', async () => {
    await seedAdmin();
    const res = await signInWith(idToken({ exp: Math.floor(Date.now() / 1000) - 60 }));
    expect(res.status).toBe(403);
  });

  it('A8. a mismatched state is refused', async () => {
    await seedAdmin();
    mockGoogleToken(idToken());
    // No state cookie: the shape of somebody completing a sign-in flow in
    // another person's browser.
    const res = await callWorker(new Request(
      `${BASE}/admin/auth/callback?code=abc&state=made-up`));
    expect(res.status).toBe(403);
    expect(await res.text()).toContain('did not match this browser');
  });

  it('A9. an address off the allowlist is refused, and told exactly why', async () => {
    const res = await signInWith(idToken({ email: 'outsider@miden.team' }));
    expect(res.status).toBe(403);
    const html = await res.text();
    // This is an internal console, not a public sign-up. Hiding whether an
    // address is listed protects nobody and leaves the person guessing at
    // something an admin fixes in one click.
    expect(html).toContain('does not have access yet');
    expect(html).toContain('outsider@miden.team');
  });

  it('A10. the domain fence holds even if the allowlist is wrong', async () => {
    // Belt and braces: the allowlist grants access, and this stops a typo in it
    // from ever admitting an outside address.
    await seedAdmin('someone@gmail.com');
    const res = await signInWith(idToken({ email: 'someone@gmail.com' }));
    expect(res.status).toBe(403);
    expect(await res.text()).toContain('allowed domain');
  });

  it('A11. addresses are matched case-insensitively', async () => {
    await seedAdmin(ADMIN_EMAIL);
    const res = await signInWith(idToken({ email: 'Ivan.L@Miden.Team' }));
    // One human, not two rows, and removing one must not leave the other working.
    expect(res.status).toBe(303);
  });

  it('A12. a signed-in reviewer lands in the queue', async () => {
    await seedAdmin();
    const res = await signInWith(idToken());
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/review?q=suspected');
  });
});

describe('sign-in attempts are bounded', () => {
  /**
   * WHAT THIS IS FOR. There is no password here, so this bounds resource use,
   * not credential guessing. /admin/auth/callback needs no separate limit: its
   * signed state check runs BEFORE the Google token exchange, so a caller with
   * no valid state never causes a subrequest. /admin/auth/start is the part
   * anybody can hit, so that is the part that is counted.
   */
  const from = (ip: string) => callWorker(new Request(`${BASE}/admin/auth/start`, {
    headers: { 'cf-connecting-ip': ip },
  }));

  it('A20b. the policy boundaries are exact, and the caller cannot move them', async () => {
    /**
     * An earlier version read `?limit=` and `?windowMs=` from the request URL.
     * Safe only while every caller built that URL itself — and forwarding a
     * Request into a Durable Object is the natural thing to do, so the first
     * `rl.fetch(req)` would have handed an attacker `?limit=1000`.
     *
     * Boundaries are asserted exactly rather than as "fewer than N": a limiter
     * that trips at some point below the ceiling looks fine in a loose test and
     * is wrong.
     */
    const { env: e } = await import('cloudflare:test');
    const AUTH = Number((e as any).ADMIN_AUTH_PER_WINDOW);
    const CHECK = Number((e as any).RATE_LIMIT_PER_HOUR);

    // Read from config rather than hardcoded, so tuning either one makes this
    // test do more work rather than quietly assert the wrong number.
    const run = async (path: string, query = '') => {
      const stub = (e as any).RATE_LIMITER.get(
        (e as any).RATE_LIMITER.idFromName(`b:${path}:${crypto.randomUUID()}`));
      let allowed = 0;
      for (let i = 0; i < 200; i += 1) {
        const res = await stub.fetch(`https://rl${path}${query}`);
        if (res.status !== 200) return { allowed, status: res.status };
        allowed += 1;
      }
      return { allowed, status: 200 };
    };

    // /auth: the first AUTH pass, the next is limited.
    expect(await run('/auth')).toEqual({ allowed: AUTH, status: 429 });
    // /check: the first CHECK pass, the next is limited.
    expect(await run('/check')).toEqual({ allowed: CHECK, status: 429 });

    // The most generous query string an attacker could construct changes
    // neither result.
    expect(await run('/auth', '?limit=1000&windowMs=86400000'))
      .toEqual({ allowed: AUTH, status: 429 });
    expect(await run('/check', '?limit=1000&windowMs=86400000'))
      .toEqual({ allowed: CHECK, status: 429 });

    // An unknown path is DENIED outright. Mapping it to /check would be "the
    // stricter policy" only while /check happens to be stricter — a claim a
    // configuration change can falsify without touching that file.
    expect(await run('/whatever')).toEqual({ allowed: 0, status: 400 });
    expect(await run('/')).toEqual({ allowed: 0, status: 400 });
  });

  it('A20c. the two policies keep separate counters', async () => {
    // A shared counter would let sign-in attempts consume a reporter's submit
    // budget, and vice versa.
    const { env: e } = await import('cloudflare:test');
    const AUTH = Number((e as any).ADMIN_AUTH_PER_WINDOW);
    const stub = (e as any).RATE_LIMITER.get(
      (e as any).RATE_LIMITER.idFromName(`shared:${crypto.randomUUID()}`));

    for (let i = 0; i < AUTH; i += 1) {
      expect((await stub.fetch('https://rl/auth')).status).toBe(200);
    }
    expect((await stub.fetch('https://rl/auth')).status).toBe(429);
    // Same Durable Object instance, other policy, untouched.
    expect((await stub.fetch('https://rl/check')).status).toBe(200);
  });

  it('A20d. malformed configuration falls back conservatively, never to "no limit"', async () => {
    /**
     * `Math.max(1, Number(v))` was the old form and it FAILS OPEN:
     * Number('twenty') is NaN, Math.max(1, NaN) is NaN, and `hits >= NaN` is
     * false for every possible hits — so one typo silently disabled the
     * limiter while the comment beside it claimed it failed tight. That was
     * true of /submit's ingest limiter from the day it was written.
     */
    const { positiveIntOr } = await import('../src/index');
    for (const bad of ['twenty', '20abc', '', 'NaN', '0', '-5', '2.7', '1e999',
                       undefined, null, {}, []]) {
      expect(positiveIntOr(bad as unknown, 5), String(bad)).toBe(5);
    }
    // A good value is still used.
    expect(positiveIntOr('20', 5)).toBe(20);
    expect(positiveIntOr(30, 5)).toBe(30);
  });

  it('A21. a burst from one network is slowed, and says nothing is locked', async () => {
    // A fresh IP per run: Durable Object storage does not roll back between
    // tests in this pool, so a fixed address would carry counts across runs.
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 20}`;

    let limited: Response | null = null;
    for (let i = 0; i < 34; i += 1) {
      const res = await from(ip);
      if (res.status === 429) { limited = res; break; }
    }
    expect(limited, 'expected the burst to be limited').not.toBeNull();

    const html = await limited!.text();
    // A shared office egress must be able to read what happened and wait,
    // rather than conclude their access was revoked.
    expect(html).toContain('Too many sign-in attempts');
    expect(html).toContain('Nothing has been locked');
  });

  it('A22. the limit is generous enough that normal team use never trips it', async () => {
    // Ten people signing in once each, from one NAT egress, inside the window.
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 20}`;
    for (let i = 0; i < 10; i += 1) {
      expect((await from(ip)).status, `attempt ${i + 1}`).toBe(302);
    }
  });

  it('A23. one network being limited does not affect another', async () => {
    const noisy = `203.0.113.${Math.floor(Math.random() * 100) + 220}`;
    for (let i = 0; i < 34; i += 1) if ((await from(noisy)).status === 429) break;

    // Shared-IP lockout is the risk worth guarding: the limiter is keyed per
    // address, so one busy network cannot shut out the rest of the team.
    const quiet = `192.0.2.${Math.floor(Math.random() * 200) + 20}`;
    expect((await from(quiet)).status).toBe(302);
  });
});

describe('a sign-in link is single-use', () => {
  /**
   * Signed and unexpired is not the same as UNUSED. The callback used to verify
   * the signature and the clock and then throw the state away by clearing a
   * cookie — which is a request to a browser, and a scripted client is not a
   * browser. Holding the cookie value and the state string it could replay the
   * callback for ten minutes, and every replay reached Google's token endpoint.
   */
  async function armedFlow() {
    mockGoogleToken(idToken());
    const start = await get('/admin/auth/start');
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
    const cookie = start.headers.get('set-cookie')!.split(';')[0];
    const call = () => callWorker(new Request(
      `${BASE}/admin/auth/callback?code=abc&state=${encodeURIComponent(state)}`,
      { headers: { cookie } }));
    return { call };
  }

  it('A24. a replayed sign-in link is refused, and never reaches Google twice', async () => {
    await seedAdmin();
    const { call } = await armedFlow();

    const first = await call();
    expect(first.status).toBe(303);          // signed in

    const second = await call();
    expect(second.status).toBe(403);
    expect(await second.text()).toContain('already been used');

    // The replay is refused BEFORE the token exchange, which is both the
    // security property and why it costs nothing.
    expect(googleCalls).toBe(1);
  });

  it('A25. two callbacks racing on one state produce exactly ONE Google request', async () => {
    await seedAdmin();
    const { call } = await armedFlow();

    // Fired together. A SELECT-then-INSERT would let both through in the gap
    // between them; `INSERT ... ON CONFLICT DO NOTHING` plus `changes` cannot.
    const [a, b] = await Promise.all([call(), call()]);
    const codes = [a.status, b.status].sort();

    expect(codes).toEqual([303, 403]);   // exactly one winner
    expect(googleCalls).toBe(1);
  });

  it('A26. after consumption, a retry needs a fresh sign-in', async () => {
    await seedAdmin();
    const { call } = await armedFlow();
    await call();

    // Starting again mints a new state, and that one works.
    const second = await signInWith(idToken());
    expect(second.status).toBe(303);
  });
});

describe('granting and removing access', () => {
  const postTeam = async (path: string, fields: Record<string, string>, csrf = true) => {
    const form = new FormData();
    if (csrf) form.set('csrf', await adminCsrf());
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    return callWorker(new Request(`${BASE}${path}`, {
      method: 'POST', body: form, headers: { cookie: (await adminHeaders()).cookie },
    }));
  };

  it('A13. adding an address is the whole of the invitation', async () => {
    await seedAdmin();
    const res = await postTeam('/admin/team/add', { email: 'teammate@miden.team' });
    expect(res.status).toBe(303);

    const row = await env.DB.prepare('SELECT * FROM admin_allowed WHERE email = ?')
      .bind('teammate@miden.team').first<any>();
    expect(row).toBeTruthy();
    expect(row.added_by).toBe(ADMIN_EMAIL);
    // They can sign in immediately. Nothing was sent, nothing to accept.
    expect((await signInWith(idToken({ email: 'teammate@miden.team' }))).status).toBe(303);
  });

  it('A14. removing keeps the row, so who HAD access is still answerable', async () => {
    await seedAdmin();
    await postTeam('/admin/team/add', { email: 'teammate@miden.team' });
    await postTeam('/admin/team/remove', { email: 'teammate@miden.team' });

    const row = await env.DB.prepare('SELECT disabled_at FROM admin_allowed WHERE email = ?')
      .bind('teammate@miden.team').first<any>();
    expect(row.disabled_at).toBeTruthy();   // disabled, not deleted
    expect((await signInWith(idToken({ email: 'teammate@miden.team' }))).status).toBe(403);
  });

  it('A15. re-adding a removed person restores them rather than duplicating them', async () => {
    await seedAdmin();
    await postTeam('/admin/team/add', { email: 'teammate@miden.team' });
    await postTeam('/admin/team/remove', { email: 'teammate@miden.team' });
    await postTeam('/admin/team/add', { email: 'teammate@miden.team' });

    const { results } = await env.DB.prepare(
      'SELECT disabled_at FROM admin_allowed WHERE email = ?').bind('teammate@miden.team').all<any>();
    expect(results).toHaveLength(1);
    expect(results[0].disabled_at).toBeNull();
  });

  it('A16. you cannot remove your own access', async () => {
    await seedAdmin();
    // This is the page that grants access. The last person out would lock the
    // door behind them with the key inside.
    const res = await postTeam('/admin/team/remove', { email: ADMIN_EMAIL });
    expect(res.status).toBe(400);
    const row = await env.DB.prepare('SELECT disabled_at FROM admin_allowed WHERE email = ?')
      .bind(ADMIN_EMAIL).first<any>();
    expect(row.disabled_at).toBeNull();
  });

  it('A17. granting access without the CSRF token is refused', async () => {
    await seedAdmin();
    const res = await postTeam('/admin/team/add', { email: 'attacker@miden.team' }, false);
    expect(res.status).toBe(403);
    expect(await env.DB.prepare('SELECT email FROM admin_allowed WHERE email = ?')
      .bind('attacker@miden.team').first()).toBeNull();
  });
});

describe('Settings — the gear in the rail, and the page it opens', () => {
  const postTeam = async (path: string, fields: Record<string, string>) => {
    const form = new FormData();
    form.set('csrf', await adminCsrf());
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    return callWorker(new Request(`${BASE}${path}`, {
      method: 'POST', body: form, headers: { cookie: (await adminHeaders()).cookie },
    }));
  };

  it('A30. every console page carries the settings gear; the sign-in page does not', async () => {
    await seedAdmin();
    for (const path of ['/admin/review?q=suspected', '/admin/store?platform=android']) {
      const html = await (await get(path, await adminHeaders())).text();
      // Icon only, so the accessible name is the label — without it a screen
      // reader announces an unnamed link.
      expect(html).toContain('<a class="gear" href="/admin/settings" aria-label="Settings" title="Settings">');
      // At the foot of the rail, after the three groups — not a fourth group
      // among them, which would read as another queue.
      const foot = html.indexOf('<div class="side-foot">');
      expect(foot).toBeGreaterThan(html.lastIndexOf('<details class="grp'));
      expect(html.indexOf('class="gear"')).toBeGreaterThan(foot);
      expect(html.indexOf('</aside>')).toBeGreaterThan(html.indexOf('class="gear"'));
    }
    // Signed out: no rail, so no gear. The sign-in card must not advertise
    // the inside of a console the visitor cannot open.
    const signedOut = await (await get('/admin/login')).text();
    expect(signedOut).not.toContain('/admin/settings');
  });

  it('A31. Settings opens inside the console, with the rail, and lists who has access', async () => {
    await seedAdmin();
    const res = await get('/admin/settings', await adminHeaders());
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<aside class="side">');
    expect(html).toContain('<a class="gear" href="/admin/settings" aria-label="Settings" title="Settings" aria-current="page">');
    expect(html).toContain('Team access');
    expect(html).toContain(ADMIN_EMAIL);
    expect(html).toContain('action="/admin/team/add"');
  });

  it('A32. Settings is behind the gate like every other console page', async () => {
    await seedAdmin();
    const html = await (await get('/admin/settings')).text();
    expect(html).toContain('Continue with Google');
    expect(html).not.toContain(ADMIN_EMAIL);
  });

  it('A33. the old /admin/team address lands on Settings', async () => {
    await seedAdmin();
    const res = await get('/admin/team', await adminHeaders());
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/settings');
  });

  it('A34. granting access returns to Settings, with the new person listed', async () => {
    await seedAdmin();
    const res = await postTeam('/admin/team/add', { email: 'Teammate@Miden.Team' });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/admin/settings');
    const html = await (await get('/admin/settings', await adminHeaders())).text();
    expect(html).toContain('teammate@miden.team');
  });

  it('A35. an address sign-in would refuse is not granted, and says why', async () => {
    // Otherwise the list shows them as having access while Google sign-in
    // turns them away with "not on an allowed domain".
    await seedAdmin();
    const res = await postTeam('/admin/team/add', { email: 'friend@gmail.com' });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('Only @miden.team addresses can sign in');
    expect(await env.DB.prepare('SELECT email FROM admin_allowed WHERE email = ?')
      .bind('friend@gmail.com').first()).toBeNull();
  });

  it('A36. restoring a removed address outside the fence is refused too', async () => {
    await seedAdmin();
    await seedAdmin('old@gmail.com', { disabled_at: 1 });
    const res = await postTeam('/admin/team/restore', { email: 'old@gmail.com' });
    expect(res.status).toBe(400);
    const row = await env.DB.prepare('SELECT disabled_at FROM admin_allowed WHERE email = ?')
      .bind('old@gmail.com').first<any>();
    expect(row.disabled_at).toBe(1);
  });
});

describe('signing out', () => {
  it('A27. a signed-in logout without the CSRF token is refused', async () => {
    // The documentation claims every state-changing POST carries a token. One
    // quiet exception is how that claim stops being checkable.
    await seedAdmin();
    const res = await callWorker(new Request(`${BASE}/admin/logout`, {
      method: 'POST', body: new FormData(), headers: { cookie: await adminCookie() },
    }));
    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();   // still signed in
  });

  it('A28. a signed-OUT logout still clears cookies — the stated exception', async () => {
    /**
     * Deliberate carve-out. There is no session to protect, and refusing would
     * strand somebody whose session expired while the page was open: their
     * token no longer verifies, so a strict check would leave them unable to
     * clear a cookie that is already useless.
     */
    const res = await callWorker(new Request(`${BASE}/admin/logout`, {
      method: 'POST', body: new FormData(),
    }));
    expect(res.status).toBe(303);
    const cookies = res.headers.getAll
      ? res.headers.getAll('set-cookie').join(' | ')
      : (res.headers.get('set-cookie') ?? '');
    expect(cookies).toContain('__Host-mfv2_admin=;');
  });

  it('A29. a GET cannot sign anybody out', async () => {
    // Otherwise any image tag on any page signs a reviewer out at random.
    await seedAdmin();
    const res = await callWorker(new Request(`${BASE}/admin/logout`, {
      headers: { cookie: await adminCookie() },
    }));
    expect(res.status).toBe(303);
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});

describe('the gate does not break what it does not cover', () => {
  it('A18. script endpoints still use their token, not a browser session', async () => {
    // /admin/backfill and friends are called by scripts, which have no browser
    // to sign in with. Putting them behind the session would break them.
    const res = await callWorker(new Request(`${BASE}/admin/quarantined`, {
      headers: { authorization: 'Bearer test-backfill-token' },
    }));
    expect(res.status).toBe(200);
  });

  it('A19. /submit is untouched — reporters never sign in', async () => {
    // The whole point of the boundary: this gate is for the console, and the
    // feedback form must not have acquired a login.
    const res = await callWorker(new Request(`${BASE}/submit`, { method: 'POST', body: new FormData() }));
    expect([400, 403]).toContain(res.status);   // rejected on its own terms
    expect(await res.text()).not.toContain('Continue with Google');
  });
});
