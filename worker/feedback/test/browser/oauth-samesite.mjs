/**
 * The half of the SameSite fix that a unit test cannot prove.
 *
 * WHY THIS EXISTS. `SameSite=Strict` on the OAuth state cookie shipped, passed
 * every unit test, and would have failed on the first real sign-in: Google
 * returns the browser by a TOP-LEVEL CROSS-SITE NAVIGATION, and a Strict cookie
 * is withheld on exactly that. The suite missed it because it sets the `Cookie`
 * header by hand — fabricating the thing under test. Only a real browser with a
 * real cookie jar, crossing a real site boundary, can tell the two apart.
 *
 * IT HAPPENED AGAIN ON THE SESSION COOKIE, and that one reached production.
 * Shipped as Strict, it bounced the first real sign-in on 2026-09-11: the
 * callback verified the address and set the session, but its 303 into the
 * console is still part of Google's cross-site navigation, so the session was
 * withheld and the person landed back on the sign-in page with no error.
 *
 * SELF-CONTAINED, so a clean clone and a CI runner behave like a laptop: it
 * starts and stops its own `wrangler dev`, WAITS for readiness rather than
 * sleeping, uses a THROWAWAY database directory, applies every migration into
 * it, and seeds its own administrator. It never touches .wrangler/state or any
 * database a person is using, and it reads no .dev.vars.
 *
 * FOUR CHECKS, IN THIS ORDER, AND THE ORDER IS THE POINT.
 *
 *   1. POSITIVE CONTROL — same-site, Strict session, the console opens.
 *      Without it, step 2 is ambiguous: a sign-in page after the cross-site hop
 *      could equally mean "the cookie was withheld" (what we want to prove) or
 *      "the cookie arrived and the user is not on the allowlist" (a broken
 *      fixture). Proving the session WORKS first removes the second reading.
 *
 *   2. NEGATIVE CONTROL — cross-site, that same Strict session is withheld.
 *      If it survives, these two origins are not cross-site to this browser and
 *      steps 3 and 4 would pass with the bug still present. That is INCONCLUSIVE, and
 *      the script says so and exits non-zero rather than claiming a pass it did
 *      not earn.
 *
 *   3. THE ACTUAL TEST — cross-site, the Lax state cookie survives.
 *
 *   4. THE SESSION — cross-site, a Lax session survives and opens the console.
 *      The same hop as step 2 with only SameSite changed, so the pair shows
 *      the policy is what decides it. Unit test A4 pins that the Worker
 *      issues Lax; this proves Lax is enough.
 *
 *   Worker      http://localhost:<port>    (site A)
 *   Bounce page http://127.0.0.1:<port>    (site B — different host, so a
 *                                           different site for cookies)
 *
 * Usage:  npm run test:oauth
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = Number(process.env.PORT ?? 8791);
const BOUNCE_PORT = Number(process.env.BOUNCE_PORT ?? 8899);
const WORKER = `http://localhost:${PORT}`;
const BOUNCE = `http://127.0.0.1:${BOUNCE_PORT}`;
const EMAIL = 'ivan.l@miden.team';
const DB = 'miden-feedback-v2-db';

// A secret this script owns, so it neither reads nor depends on .dev.vars.
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

const fail = (m) => { console.error(`\n  FAIL  ${m}\n`); process.exitCode = 1; };
const pass = (m) => console.log(`  ok    ${m}`);

// Throwaway state directory. Never .wrangler/state: a test must not be able to
// disturb a database somebody is working in, and must not depend on one either.
const statePath = fs.mkdtempSync(path.join(os.tmpdir(), 'mfv2-oauth-'));
const wrangler = (args) =>
  execFileSync('npx', ['wrangler', ...args], { cwd: ROOT, stdio: 'pipe' });

let dev = null;
let cleanedUp = false;

/**
 * Runs on the normal path AND on a signal.
 *
 * Without the signal handlers, a CI timeout or a Ctrl-C leaves `wrangler dev`
 * and its `workerd` child holding the port and a temp directory behind. The
 * next run then refuses to start, and the reason looks nothing like the cause.
 */
async function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  try { bounce.close(); } catch { /* not listening */ }
  if (dev?.pid) {
    // Negative pid = the whole process group, which is why it was detached.
    try { process.kill(-dev.pid, 'SIGTERM'); } catch { /* already gone */ }
    await new Promise((r) => setTimeout(r, 800));
    try { process.kill(-dev.pid, 'SIGKILL'); } catch { /* already gone */ }
  }
  fs.rmSync(statePath, { recursive: true, force: true });
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => { await cleanup(); process.exit(130); });
}

const bounce = http.createServer((req, res) => {
  const to = new URL(req.url, BOUNCE).searchParams.get('to') ?? WORKER;
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(`<!doctype html><meta charset=utf-8><a id=go href="${to}">go</a>`);
});

/** Polls until the Worker answers, rather than sleeping and hoping. */
async function waitForWorker(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (dev && dev.exitCode !== null) {
      throw new Error(`wrangler dev exited early with code ${dev.exitCode}`);
    }
    try {
      const res = await fetch(`${WORKER}/health`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`the Worker did not become ready on ${WORKER} within ${timeoutMs}ms`);
}

try {
  /**
   * REFUSE TO RUN AGAINST A SERVER THIS SCRIPT DID NOT START.
   *
   * If something is already on the port, `wrangler dev` fails to bind but
   * waitForWorker happily gets a 200 from the stranger — and the whole test
   * then runs against whatever code that process is serving, reporting a pass
   * or a failure about the wrong thing. A misleading failure is worse than a
   * loud one, and a misleading PASS is worse than both.
   */
  try {
    await fetch(`${WORKER}/health`, { signal: AbortSignal.timeout(1500) });
    fail(`something is already serving ${WORKER}. This test starts its own `
       + 'Worker and must not run against one it did not start — stop that '
       + 'process, or set PORT to a free one.');
    throw new Error('port in use');
  } catch (err) {
    if (String(err?.message) === 'port in use') throw err;
    // Anything else means nothing answered, which is what we want.
  }

  console.log('  ..    preparing an isolated database');
  /**
   * schema.sql, NOT a migration replay.
   *
   * Migrations 0001-0006 are ALTER TABLE against a `submissions` table that
   * already exists, so they cannot be applied to an empty database — the first
   * one fails with "no such table". schema.sql IS the fresh-database path, and
   * it is the same thing `npm run db:init` and test/setup.ts use.
   *
   * That the two agree is not assumed here: scripts/validate-migrations.py
   * replays the whole chain from before the first migration and proves it
   * reproduces this file, and it runs in CI ahead of this test.
   */
  wrangler(['d1', 'execute', DB, '--local', `--persist-to=${statePath}`,
            '--file=./schema.sql']);
  wrangler(['d1', 'execute', DB, '--local', `--persist-to=${statePath}`, '--command',
    `INSERT INTO admin_allowed (email, name, added_at, added_by) `
    + `VALUES ('${EMAIL}', 'Test Admin', 0, 'oauth-smoke-test')`]);
  pass('migrations applied and the test administrator seeded');

  /**
   * Secrets go through --env-file, NOT the spawn's environment.
   *
   * `wrangler dev` loads secrets from .dev.vars and env files; it does not pick
   * them up from the parent process. Passing them in `env:` looked right and
   * silently did nothing — the Worker kept using whatever .dev.vars held, so
   * the cookie this script signs verified against a different secret and the
   * console showed a sign-in page. The positive control is what caught it.
   *
   * Written into the throwaway state directory, so it also overrides any
   * .dev.vars a developer happens to have, and leaves with the rest of it.
   */
  const envFile = path.join(statePath, 'test.env');
  fs.writeFileSync(envFile,
    `ADMIN_SESSION_SECRET=${SESSION_SECRET}\n`
    + 'GOOGLE_OAUTH_CLIENT_ID=oauth-smoke-test-client\n'
    + 'GOOGLE_OAUTH_CLIENT_SECRET=oauth-smoke-test-secret\n');

  console.log('  ..    starting wrangler dev');
  dev = spawn('npx', ['wrangler', 'dev', '--local', `--port=${PORT}`,
                      `--persist-to=${statePath}`, `--env-file=${envFile}`], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    /**
     * Its own process GROUP, so cleanup can take the whole tree.
     *
     * `wrangler dev` supervises a `workerd` child and restarts it. Killing only
     * the pid we hold leaves workerd running, still on the port, and the next
     * run refuses to start — which is exactly what happened while writing this.
     * A group kill takes the supervisor and everything it spawned.
     */
    detached: true,
    env: process.env,
  });
  dev.stdout.on('data', () => {});
  dev.stderr.on('data', () => {});

  await waitForWorker();
  pass('worker is ready');

  await new Promise((r) => bounce.listen(BOUNCE_PORT, '127.0.0.1', r));

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  // Google is never contacted: /admin/auth/start only has to SET the cookie.
  await ctx.route('**://accounts.google.com/**', (r) =>
    r.fulfill({ status: 200, body: 'google stub' }));

  try {
    const page = await ctx.newPage();

    const payload = `${EMAIL}.${Date.now() + 3_600_000}`;
    const session = `${payload}.${crypto.createHmac('sha256', SESSION_SECRET)
      .update(payload).digest('hex')}`;
    await ctx.addCookies([{
      name: '__Host-mfv2_admin', value: session,
      // domain+path, NOT url: a `__Host-` cookie carries no Domain attribute
      // and CDP rejects the url form for one. Secure over http is fine because
      // browsers treat localhost as a trustworthy origin.
      domain: 'localhost', path: '/', httpOnly: true, secure: true, sameSite: 'Strict',
    }]);

    // --- 1. POSITIVE CONTROL ---------------------------------------------
    await page.goto(`${WORKER}/admin/review?q=suspected`);
    if ((await page.content()).includes('Continue with Google')) {
      fail('POSITIVE CONTROL: the Strict session did not open the console even '
         + 'SAME-SITE. The fixture is broken — a wrong secret, or the '
         + 'administrator is not on the allowlist. Nothing below would mean '
         + 'anything, because a sign-in page would no longer imply a withheld '
         + 'cookie.');
      throw new Error('positive control failed');
    }
    pass('positive control: the Strict session opens the console same-site');

    await page.goto(`${WORKER}/admin/auth/start`);
    const state = (await ctx.cookies()).find((c) => c.name === '__Host-mfv2_oauth')?.value;
    if (!state) { fail('no __Host-mfv2_oauth cookie was set'); throw new Error('no state'); }
    pass('/admin/auth/start set a state cookie');

    // --- 2. NEGATIVE CONTROL ---------------------------------------------
    await page.goto(`${BOUNCE}/?to=${encodeURIComponent(`${WORKER}/admin/review?q=suspected`)}`);
    await page.click('#go');
    if (!(await page.content()).includes('Continue with Google')) {
      fail('INCONCLUSIVE: the Strict session survived the hop, so '
         + `${BOUNCE} and ${WORKER} are the same site to this browser. `
         + 'This script cannot tell Strict from Lax here — run it against a '
         + 'preview deployment on two real hostnames instead.');
      throw new Error('negative control failed');
    }
    pass('negative control: the Strict session IS withheld cross-site');

    // --- 3. THE ACTUAL TEST ----------------------------------------------
    const cb = `${WORKER}/admin/auth/callback?state=${encodeURIComponent(state)}`;
    await page.goto(`${BOUNCE}/?to=${encodeURIComponent(cb)}`);
    await page.click('#go');
    const body = await page.content();

    if (body.includes('did not match this browser')) {
      fail('the state cookie was WITHHELD on the cross-site return — this is the '
         + 'SameSite=Strict bug, and no real Google sign-in would complete.');
    } else if (body.includes('did not return a sign-in code')) {
      // State matched, so the cookie arrived; the flow then stopped for the
      // only remaining reason, which is that this test supplies no code.
      pass('the Lax state cookie SURVIVED the cross-site return');
    } else {
      fail(`unexpected callback response: ${
        body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180)}`);
    }
    // --- 4. THE SESSION ---------------------------------------------------
    // The same session with the policy the Worker issues (A4 pins it), over
    // the same cross-site hop as step 2. Only Strict against Lax differs.
    await ctx.addCookies([{
      name: '__Host-mfv2_admin', value: session,
      domain: 'localhost', path: '/', httpOnly: true, secure: true, sameSite: 'Lax',
    }]);
    await page.goto(`${BOUNCE}/?to=${encodeURIComponent(`${WORKER}/admin/review?q=suspected`)}`);
    await page.click('#go');
    if ((await page.content()).includes('Continue with Google')) {
      fail('the Lax session was WITHHELD on the cross-site return — a sign-in '
         + 'that succeeded would land on the sign-in page again.');
    } else {
      pass('the Lax session SURVIVED the cross-site return and opened the console');
    }
  } finally {
    await browser.close();
  }
} catch (err) {
  if (process.exitCode !== 1) fail(String(err?.message ?? err));
} finally {
  await cleanup();
}

console.log(process.exitCode === 1 ? '\nSameSite smoke test FAILED' : '\nSameSite smoke test passed');
