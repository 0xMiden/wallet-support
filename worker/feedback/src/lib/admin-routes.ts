/**
 * The sign-in routes, and the page where access is granted.
 *
 * Four routes exist outside the gate, because a locked door needs a handle:
 * `/admin/login`, `/admin/auth/start`, `/admin/auth/callback`, `/admin/logout`.
 * Everything else under `/admin/` that a browser opens is behind it.
 *
 * `/admin/settings` is inside the gate and is where the allowlist is edited:
 * type an address, press Grant. That is the whole of the invitation flow —
 * there is nothing to send, nothing to expire, and nothing for the person to
 * set up. They click "Continue with Google" and they are in. It is reached from
 * the gear at the foot of the rail; the forms still post to `/admin/team/*`,
 * and a bookmarked `/admin/team` lands on the page.
 *
 * Same rules as every other page here: zero JavaScript, everything escaped,
 * CSP `default-src 'none'`.
 */
import { esc, page, secureHeaders, authPage, sidebar, PROVIDER_MARKS, SETTINGS_PATH } from './admin-chrome';
import { buildNav } from './admin-nav';
import { themeOf, themeCookie, isTheme, type Theme } from './theme';
import {
  startSignIn, handleCallback, currentUser, isConfigured, normalizeEmail, onAllowedDomain,
  csrfToken, csrfOk, signOutCookies, clearStateCookie, type AuthEnv, type AdminUser,
} from './admin-auth';

interface RoutesEnv extends AuthEnv {
  RATE_LIMITER?: DurableObjectNamespace;
}

/** Paths that must work while signed OUT, or nobody can ever sign in. */
export const PUBLIC_ADMIN_PATHS = new Set([
  '/admin/login', '/admin/auth/start', '/admin/auth/callback', '/admin/logout',
]);

/**
 * The sign-in page.
 *
 * Built to the shape people already know from every hosted auth screen, because
 * a login page nobody recognises reads as untrustworthy whatever it does
 * underneath. Provider buttons carry the real provider mark; adding GitHub
 * later is one more entry in the list below and nothing else on this page
 * changes.
 */
function loginPage(
  env: AuthEnv, message: string | null, status = 200, extra: Record<string, string> = {}
): Response {
  /**
   * NOT "welcome back".
   *
   * Access here is invite-only, so the first visit is the COMMON case: every
   * person who ever reaches this page reaches it for the first time once, and
   * most of them have just been added and told to go and sign in. Greeting
   * them as a returning user is wrong the one time it matters most.
   *
   * The line names the account to use instead, which is worth more than a
   * greeting: people have several Google accounts, and picking the personal one
   * fails with "does not have access yet" and no hint about why.
   */
  const domain = (env.ADMIN_EMAIL_DOMAINS ?? '').split(',')[0].trim();
  const sub = domain
    ? `Use your @${esc(domain)} account to continue.`
    : 'Sign in to continue.';

  return authPage('Sign in', `
    <div class="auth-mark" aria-hidden="true">MF</div>
    <h1 class="auth-title">Sign in to Feedback Command Center</h1>
    <p class="auth-sub">${sub}</p>
    ${message ? `<p class="auth-err">${esc(message)}</p>` : ''}
    <a class="auth-btn" href="/admin/auth/start">${PROVIDER_MARKS.google}Continue with Google</a>
    <p class="auth-note">Not added yet? Ask whoever runs the console &mdash; it takes one click.</p>`,
    'This console holds unpublished user reports.', status, extra);
}

/** Shown when the secrets are missing, so the failure names itself. */
function notConfigured(): Response {
  return authPage('Sign in unavailable', `
    <div class="auth-mark" aria-hidden="true">MF</div>
    <h1 class="auth-title">Sign-in is not configured</h1>
    <p class="auth-sub">This deployment has no Google credentials, so nobody can sign in.</p>
    <p class="auth-note">Set <code>ADMIN_SESSION_SECRET</code>,
       <code>GOOGLE_OAUTH_CLIENT_ID</code> and <code>GOOGLE_OAUTH_CLIENT_SECRET</code>,
       then redeploy.</p>`,
    'The console fails closed: with no credentials it admits nobody, rather than everybody.',
    503);
}

/**
 * A bounded number of sign-in ATTEMPTS per address, per ten minutes.
 *
 * WHAT THIS IS AND IS NOT FOR. There is no password here, so this bounds
 * resource use rather than credential guessing. /admin/auth/callback is
 * already protected without it: the signed state check runs BEFORE the Google
 * token exchange, so a caller with no valid state never causes a subrequest.
 * What is left unbounded is /admin/auth/start, which anybody can hit to mint
 * state cookies, so that is what is limited.
 *
 * SHARED IP IS THE BINDING CONSTRAINT. A whole office behind one NAT egress
 * must not be able to lock itself out by signing in normally. Thirty starts
 * per ten minutes is roughly ten people signing in three times each in the
 * same ten minutes — far above real use, far below anything automated. And
 * exceeding it delays sign-in; it never disables an account or touches the
 * allowlist.
 *
 * Someone who ALREADY has a session never reaches this: the gate returns them
 * before any of it runs.
 */
// The NUMBERS live in wrangler.jsonc (ADMIN_AUTH_PER_WINDOW) and are read by
// the Durable Object from its own env. This module names the POLICY by path
// and cannot influence the limit — see the note on RateLimiter in index.ts for
// why the caller deliberately has no say.

async function tooManyAttempts(req: Request, env: RoutesEnv): Promise<boolean> {
  // Fails OPEN if the binding is missing. This is a courtesy bound on an
  // endpoint that grants nothing; refusing every sign-in because a limiter is
  // unavailable would be a worse outcome than not counting.
  if (!env.RATE_LIMITER) return false;
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
  const id = env.RATE_LIMITER.idFromName(`authstart:${ip}`);
  // A literal, with no interpolation of anything. `/auth` selects the policy.
  const res = await env.RATE_LIMITER.get(id).fetch('https://rl/auth');
  return res.status === 429;
}

function slowDown(): Response {
  return authPage('Too many attempts', `
    <div class="auth-mark" aria-hidden="true">MF</div>
    <h1 class="auth-title">Too many sign-in attempts</h1>
    <p class="auth-sub">Wait a few minutes and try again.</p>
    <p class="auth-note">Nothing has been locked or changed &mdash; this only
       slows down repeated attempts from one network.</p>`, '', 429);
}

/**
 * The gate.
 *
 * Returns the signed-in user, or a Response to send instead. Called by index.ts
 * before any browser-facing admin route runs, so a new page is protected by
 * being under `/admin/` rather than by its author remembering to check.
 */
export async function requireAdmin(
  req: Request, env: AuthEnv, url: URL, nowMs: number
): Promise<{ user: AdminUser } | { response: Response }> {
  if (!isConfigured(env)) return { response: notConfigured() };

  const user = await currentUser(req, env, nowMs);
  if (user) return { user };

  // A signed-out GET goes to the sign-in page; anything else gets a plain 403.
  // Bouncing a POST to a login page would lose whatever it was submitting and
  // look, to the person, like the button silently did nothing.
  if (req.method !== 'GET') {
    return { response: authPage('Signed out', `
      <div class="auth-mark" aria-hidden="true">MF</div>
      <h1 class="auth-title">Your session ended</h1>
      <p class="auth-sub">That action was not submitted. Sign in again and retry it.</p>
      <a class="auth-btn" href="/admin/auth/start">${PROVIDER_MARKS.google}Continue with Google</a>`,
      '', 403) };
  }
  return { response: loginPage(env, null) };
}

/**
 * Handles the four unauthenticated routes. Returns null when the path is not
 * one of them.
 */
export async function handleAuthRoutes(
  req: Request, env: RoutesEnv, url: URL, nowMs: number
): Promise<Response | null> {
  if (!PUBLIC_ADMIN_PATHS.has(url.pathname)) return null;

  if (url.pathname === '/admin/logout') {
    // POST only. A GET logout can be triggered by any image tag on any page,
    // which is not a security hole so much as a way to be signed out at random.
    if (req.method !== 'POST') return new Response(null, { status: 303, headers: { location: '/admin/login' } });

    /**
     * CSRF-PROTECTED, like every other state-changing POST — with one
     * deliberate carve-out, stated rather than left to be discovered.
     *
     * A signed-IN person must present the token. Forced logout is a nuisance
     * rather than a compromise, but "every state-changing POST carries a token"
     * is a claim the documentation makes, and a single quiet exception is how
     * that claim stops being checkable.
     *
     * A signed-OUT request is allowed through and simply clears the cookies.
     * There is no session to protect, and refusing would strand somebody whose
     * session expired while the page was open: their token no longer verifies,
     * so a strict check would leave them unable to clear a cookie that is
     * already useless.
     */
    const who = await currentUser(req, env, nowMs);
    if (who) {
      const form = await req.formData().catch(() => null);
      if (!(await csrfOk(env, who.email, form?.get('csrf')))) {
        return authPage('Sign out', `
          <div class="auth-mark" aria-hidden="true">MF</div>
          <h1 class="auth-title">Could not verify that request</h1>
          <p class="auth-sub">You are still signed in. Reload the page and try again.</p>`,
          '', 403);
      }
    }

    const headers = new Headers(secureHeaders({ location: '/admin/login' }));
    for (const c of signOutCookies()) headers.append('set-cookie', c);
    return new Response(null, { status: 303, headers });
  }

  if (!isConfigured(env)) return notConfigured();

  if (url.pathname === '/admin/login') {
    // Already signed in? Do not show a sign-in page to somebody who is signed
    // in; send them where they were going.
    if (await currentUser(req, env, nowMs)) {
      return new Response(null, { status: 303, headers: { location: '/admin/review?q=suspected' } });
    }
    return loginPage(env, null);
  }

  if (url.pathname === '/admin/auth/start') {
    if (await tooManyAttempts(req, env)) return slowDown();
    return startSignIn(env, url, nowMs);
  }

  // --- callback ------------------------------------------------------------
  const result = await handleCallback(req, env, url, nowMs);
  if (!result.ok) {
    // The one-time state cookie is cleared either way: it has been used, and a
    // failed attempt must not leave a reusable one behind.
    return loginPage(
      env,
      result.email ? `${result.reason} (${result.email})` : result.reason,
      403, { 'set-cookie': clearStateCookie() }
    );
  }

  const headers = new Headers(secureHeaders({ location: '/admin/review?q=suspected' }));
  headers.append('set-cookie', result.setCookie);
  headers.append('set-cookie', clearStateCookie());
  return new Response(null, { status: 303, headers });
}

// ---------------------------------------------------------------------------
// /admin/settings — the allowlist
// ---------------------------------------------------------------------------

/** The configured domains, lowercased — for the placeholder and the refusal. */
const domainsOf = (env: AuthEnv): string[] =>
  (env.ADMIN_EMAIL_DOMAINS ?? '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

/**
 * Settings, inside the console shell.
 *
 * It renders WITH the rail, unlike the sign-in and not-found pages: it is a
 * place in the console you navigate to and back from, and a page that drops
 * the rail reads as having left the site.
 */
function settingsPage(
  env: AuthEnv, rows: any[], me: AdminUser, csrf: string, aside: string,
  notice: string | null, status = 200, theme: Theme = 'system'
): Response {
  const when = (ms: number | null) =>
    ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) : '—';
  const domain = domainsOf(env)[0];

  const list = rows.map((r) => {
    const disabled = r.disabled_at != null;
    const isMe = r.email === me.email;
    return `<tr${disabled ? ' class="row-off"' : ''}>
      <th scope="row">${esc(r.email)}${isMe ? ' <span class="tag">you</span>' : ''}</th>
      <td data-label="Name">${esc(r.name ?? '—')}</td>
      <td data-label="Last signed in">${esc(when(r.last_seen_at))}</td>
      <td data-label="Status">${disabled ? `<span class="tag">removed ${esc(when(r.disabled_at))}</span>` : 'Has access'}</td>
      <td class="act">${isMe
        // Removing yourself locks you out of the page that grants access. If
        // you are the only one left, nobody can undo it without a database.
        ? '<span class="note">you cannot remove yourself</span>'
        : `<form class="inline" method="POST" action="/admin/team/${disabled ? 'restore' : 'remove'}">
             <input type="hidden" name="csrf" value="${esc(csrf)}">
             <input type="hidden" name="email" value="${esc(r.email)}">
             <button type="submit" class="${disabled ? '' : 'btn-danger'}">${
               disabled ? 'Restore' : 'Remove'}</button>
           </form>`}</td>
    </tr>`;
  }).join('');

  return page('Settings', `
    <div class="head">
      <h2>Settings</h2>
    </div>
    <section class="panel" aria-labelledby="appearance">
      <div class="panel-head">
        <h3 id="appearance">Appearance</h3>
        <p>Choose how the console looks in this browser.</p>
      </div>
      <form class="theme-form" method="POST" action="${SETTINGS_PATH}/theme">
        <input type="hidden" name="csrf" value="${esc(csrf)}">
        <fieldset><legend class="sr-only">Theme</legend>
          <div class="theme-options">${([['system', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']] as const).map(([value, label]) =>
            `<label class="theme-opt"><input type="radio" name="theme" value="${value}"${
              theme === value ? ' checked' : ''}> <span>${label}</span></label>`).join('')}
          </div>
        </fieldset>
        <div class="actions"><button type="submit">Save</button></div>
      </form>
    </section>
    <section class="panel" aria-labelledby="team-access">
      <div class="panel-head">
        <h3 id="team-access">Team access</h3>
        <p>Anyone listed here can sign in with their Google account. Adding an address
           is the whole of the invitation — there is nothing to send and nothing for
           them to set up.</p>
      </div>
      ${notice ? `<p class="signin-error">${esc(notice)}</p>` : ''}
      <form class="filters" method="POST" action="/admin/team/add">
        <input type="hidden" name="csrf" value="${esc(csrf)}">
        <label class="fl grow"><span>Email address</span>
          <input type="email" name="email" required placeholder="name@${esc(domain ?? 'example.com')}"
                 autocomplete="off" maxlength="200"></label>
        <div class="fl-actions"><button type="submit">Grant access</button></div>
      </form>
      <div class="table-wrap">
        <table class="members">
          <thead><tr>
            <th scope="col">Email</th><th scope="col">Name</th>
            <th scope="col">Last signed in</th><th scope="col">Status</th>
            <th scope="col"><span class="sr-only">Action</span></th>
          </tr></thead>
          <tbody>${
            list || '<tr><td colspan="5">Nobody has been granted access yet.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
    <div class="panel-foot">
      <p class="note">Signed in as ${esc(me.email)}.</p>
      <form class="inline" method="POST" action="/admin/logout">
        <input type="hidden" name="csrf" value="${esc(csrf)}">
        <button type="submit">Sign out</button>
      </form>
    </div>`, status, {}, aside);
}

export async function handleTeam(
  req: Request, env: AuthEnv, url: URL, user: AdminUser, nowMs: number
): Promise<Response | null> {
  const onSettings = url.pathname === SETTINGS_PATH || url.pathname.startsWith(`${SETTINGS_PATH}/`);
  if (!onSettings && !url.pathname.startsWith('/admin/team')) return null;

  const back = () => new Response(null, { status: 303, headers: { location: SETTINGS_PATH } });
  const csrf = await csrfToken(env, user.email);

  const render = async (notice: string | null = null, status = 200) => {
    const { results } = await env.DB.prepare(
      `SELECT email, name, added_at, disabled_at, last_seen_at
         FROM admin_allowed ORDER BY added_at DESC LIMIT 200`
    ).all<any>();
    const { groups } = await buildNav(env.DB, 'settings');
    return settingsPage(env, results ?? [], user, csrf, sidebar(groups, true), notice, status, themeOf(req));
  };

  if (url.pathname === SETTINGS_PATH && req.method === 'GET') return render();

  /**
   * The theme for this browser. A choice about how the page looks, not about
   * access, but still a state-changing POST, so it carries the CSRF token like
   * every other one: a forged request could otherwise flip someone's console dark.
   */
  if (url.pathname === `${SETTINGS_PATH}/theme`) {
    if (req.method !== 'POST') return back();
    const form = await req.formData().catch(() => null);
    if (!form || !(await csrfOk(env, user.email, form.get('csrf')))) {
      return render('That request could not be verified. Reload the page and try again.', 403);
    }
    const choice = form.get('theme');
    if (!isTheme(choice)) return render('Choose Match my device, Light or Dark.', 400);
    return new Response(null, { status: 303, headers: { location: SETTINGS_PATH, 'set-cookie': themeCookie(choice) } });
  }

  // The old address, and anything else under either prefix that is not an
  // action, lands on the page rather than on a 404.
  const action = url.pathname.match(/^\/admin\/team\/(add|remove|restore)$/);
  if (!action || req.method !== 'POST') return back();

  const form = await req.formData();
  if (!(await csrfOk(env, user.email, form.get('csrf')))) {
    return render('That request could not be verified. Reload the page and try again.', 403);
  }

  const email = normalizeEmail(form.get('email'));
  // Deliberately minimal: an address either has an @ with something on both
  // sides or it does not. Google is what actually proves the address exists;
  // a stricter regex here would only reject valid addresses.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return render('That does not look like an email address.', 400);
  }

  // Sign-in refuses an address outside ADMIN_EMAIL_DOMAINS before it ever
  // reads this table. Granting one anyway — or restoring an old row from before
  // the fence — would list the person as having access while they are turned
  // away at the door, so refuse it here, with the same check sign-in uses.
  if (action[1] !== 'remove' && !onAllowedDomain(env, email)) {
    const allowed = domainsOf(env).map((d) => `@${d}`).join(' or ');
    return render(`Only ${allowed} addresses can sign in, so access was not granted to ${email}.`, 400);
  }

  if (action[1] === 'add') {
    // Re-granting a removed address clears disabled_at rather than inserting a
    // second row — the same person coming back, not a new one.
    await env.DB.prepare(
      `INSERT INTO admin_allowed (email, added_at, added_by) VALUES (?,?,?)
       ON CONFLICT(email) DO UPDATE SET disabled_at = NULL, added_by = ?, added_at = ?`
    ).bind(email, nowMs, user.email, user.email, nowMs).run();
    return back();
  }

  // You cannot remove yourself: this is the page that grants access, and the
  // last person out would lock the door behind them with the key inside.
  if (email === user.email) {
    return render('You cannot remove your own access.', 400);
  }

  await env.DB.prepare(
    'UPDATE admin_allowed SET disabled_at = ? WHERE email = ?'
  ).bind(action[1] === 'remove' ? nowMs : null, email).run();

  return back();
}
