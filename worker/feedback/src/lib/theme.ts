/**
 * Light or dark, chosen in Settings.
 *
 * The console follows the device's setting unless someone picks Light or Dark.
 * The choice is kept in a cookie for this browser, read on the server, and applied
 * as `data-theme` on <html>, so the page arrives already in the right colours:
 * no script, no flash of the wrong theme, and nothing to migrate.
 *
 * The cookie holds one of two allowlisted words and nothing else. It is read back
 * through the same allowlist, so no cookie value can reach the markup.
 */
import { readCookie } from './admin-auth';

export const THEME_COOKIE = '__Host-mfv2_theme';
export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = typeof THEMES[number];

const ONE_YEAR_S = 365 * 24 * 60 * 60;

/** The chosen theme, or 'system' when there is no valid choice. */
export function themeOf(req: Request): Theme {
  const v = readCookie(req, THEME_COOKIE);
  return v === 'light' || v === 'dark' ? v : 'system';
}

export const isTheme = (v: unknown): v is Theme => typeof v === 'string' && (THEMES as readonly string[]).includes(v);

/**
 * The Set-Cookie for a choice. 'system' removes the cookie. `__Host-` forces
 * Secure, Path=/ and no Domain, like the session cookie; HttpOnly because only the
 * server reads it.
 */
export function themeCookie(theme: Theme): string {
  const base = `${THEME_COOKIE}=${theme === 'system' ? '' : theme}; Path=/; Secure; HttpOnly; SameSite=Lax`;
  return theme === 'system' ? `${base}; Max-Age=0` : `${base}; Max-Age=${ONE_YEAR_S}`;
}

/**
 * Applies the chosen theme to a console HTML response. Anything that is not HTML,
 * and every response while the device's setting is followed, passes through as is.
 */
export function withTheme(req: Request, res: Response): Response {
  const theme = themeOf(req);
  if (theme === 'system') return res;
  if (!(res.headers.get('content-type') ?? '').startsWith('text/html')) return res;
  return new HTMLRewriter().on('html', {
    element(el) { el.setAttribute('data-theme', theme); },
  }).transform(res);
}
