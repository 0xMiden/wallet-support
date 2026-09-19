/**
 * Light or dark, chosen in Settings (lib/theme.ts).
 *
 *   TH1  with no choice, pages follow the device, and both dark routes carry the same colours
 *   TH2  a choice arrives on every console page, signed in or out, already applied
 *   TH3  saving a choice needs the session and the CSRF token, and sets only an allowlisted value
 *   TH4  a cookie that says anything else is ignored and never reaches the markup
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { callWorker, seedAdmin, seedStoreReview, adminCookie, adminCsrf } from './helpers';
import { THEME_COOKIE, themeCookie } from '../src/lib/theme';

const BASE = 'https://mfv2.test';
const get = async (path: string, cookie: string) => callWorker(new Request(`${BASE}${path}`, { headers: { cookie } }));
const withTheme = async (value: string) => `${await adminCookie()}; ${THEME_COOKIE}=${value}`;

beforeEach(async () => {
  await seedAdmin();
});

describe('theme', () => {
  it('TH1. with no choice the page follows the device, and the dark colours are the same either way', async () => {
    const html = await (await get('/admin/settings', await adminCookie())).text();
    expect(html).toMatch(/<html lang="en">/);
    const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
    const media = css.match(/@media\(prefers-color-scheme:dark\)\{\s*:root:not\(\[data-theme="light"\]\)\{([^}]*)\}/)?.[1];
    const forced = css.match(/:root\[data-theme="dark"\]\{([^}]*)\}/)?.[1];
    expect(media).toBeTruthy();
    expect(forced).toBeTruthy();
    const norm = (block: string) => block.replace(/\s+/g, ' ').trim();
    expect(norm(media!)).toBe(norm(forced!));
    expect(css).toContain('color-scheme:light;');
  });

  it('TH2. a chosen theme is applied on every console page, including the sign-in page', async () => {
    const id = await seedStoreReview({ platform: 'android', review_state: 'awaiting_review' });
    for (const theme of ['dark', 'light']) {
      const cookie = await withTheme(theme);
      for (const path of ['/admin/settings', '/admin/store?platform=android', `/admin/store/${id}`, '/admin/review']) {
        const html = await (await get(path, cookie)).text();
        expect(html, `${theme} ${path}`).toContain(`<html lang="en" data-theme="${theme}">`);
      }
      // Signed out: the sign-in page too.
      const signedOut = await (await get('/admin/store?platform=android', `${THEME_COOKIE}=${theme}`)).text();
      expect(signedOut).toContain('Continue with Google');
      expect(signedOut).toContain(`data-theme="${theme}"`);
    }
    // Settings shows the current choice selected.
    const settings = await (await get('/admin/settings', await withTheme('dark'))).text();
    expect(settings).toContain('<input type="radio" name="theme" value="dark" checked>');
    expect(settings).toContain('<input type="radio" name="theme" value="system">');
    const none = await (await get('/admin/settings', await adminCookie())).text();
    expect(none).toContain('<input type="radio" name="theme" value="system" checked>');
  });

  it('TH3. saving a theme sets the cookie; Match my device clears it; the token and a known value are required', async () => {
    const post = async (fields: Record<string, string>, cookie?: string) => {
      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) form.set(k, v);
      return callWorker(new Request(`${BASE}/admin/settings/theme`, { method: 'POST', body: form, headers: { cookie: cookie ?? await adminCookie() } }));
    };
    const csrf = await adminCsrf();

    const dark = await post({ csrf, theme: 'dark' });
    expect(dark.status).toBe(303);
    expect(dark.headers.get('location')).toBe('/admin/settings');
    expect(dark.headers.get('set-cookie')).toBe(`${THEME_COOKIE}=dark; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=31536000`);

    const system = await post({ csrf, theme: 'system' });
    expect(system.headers.get('set-cookie')).toBe(`${THEME_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`);

    for (const bad of [{ csrf: 'nope', theme: 'dark' }, { theme: 'dark' }] as Array<Record<string, string>>) {
      const res = await post(bad);
      expect(res.status).toBe(403);
      expect(res.headers.get('set-cookie')).toBeNull();
    }
    const unknown = await post({ csrf, theme: 'purple' });
    expect(unknown.status).toBe(400);
    expect(unknown.headers.get('set-cookie')).toBeNull();
    expect(await unknown.text()).toContain('Choose Match my device, Light or Dark.');

    // Signed out: refused by the gate, nothing set.
    const signedOut = await post({ csrf, theme: 'dark' }, '');
    expect(signedOut.status).toBe(403);
    expect(signedOut.headers.get('set-cookie')).toBeNull();

    expect(themeCookie('light')).toContain(`${THEME_COOKIE}=light;`);
  });

  it('TH4. a cookie with any other value is ignored and never written into the page', async () => {
    for (const value of ['purple', '"><script>alert(1)</script>', 'DARK', '']) {
      const html = await (await get('/admin/settings', `${await adminCookie()}; ${THEME_COOKIE}=${value}`)).text();
      expect(html, JSON.stringify(value)).toMatch(/<html lang="en">/);
      expect(html).not.toContain('alert(1)');
    }
    // Non-HTML responses pass through untouched.
    const js = await get('/admin/store/review.js', await withTheme('dark'));
    expect(js.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(await js.text()).not.toContain('data-theme');
  });
});
