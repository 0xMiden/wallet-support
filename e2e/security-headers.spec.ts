import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

/**
 * The security headers in public/_headers, which Cloudflare Pages serves and
 * `vite preview` mirrors, and the page still working under them.
 *
 * A Content-Security-Policy fails silently: a font, an image or a stylesheet
 * simply does not load, and the page still renders something. So the walk
 * below collects every violation the browser reports and fails on any of
 * them, rather than on whether a page happens to look broken.
 */

const root = fileURLToPath(new URL('..', import.meta.url));

const declared = Object.fromEntries(
  readFileSync(join(root, 'public/_headers'), 'utf8')
    .split('\n')
    .map(line => /^\s+([A-Za-z-]+):\s*(\S.*)$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map(match => [(match[1] as string).toLowerCase(), (match[2] as string).trim()])
);

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy
      .split(';')
      .map(part => part.trim().split(/\s+/))
      .filter(tokens => (tokens[0] ?? '') !== '')
      .map(tokens => [tokens[0] as string, tokens.slice(1)])
  );
}

test('the document carries the declared security headers', async ({ page }) => {
  const response = await page.goto('/');
  expect(response).not.toBeNull();
  const served = response!.headers();

  expect(Object.keys(declared).sort()).toEqual([
    'content-security-policy',
    'referrer-policy',
    'x-content-type-options',
    'x-frame-options'
  ]);
  for (const [name, value] of Object.entries(declared)) {
    expect(name === 'content-security-policy' ? served[name]?.replace(/ 'nonce-[^']+'/g, '') : served[name], name).toBe(value);
  }

  const policy = directives(declared['content-security-policy'] as string);
  expect(policy.get('default-src')).toEqual(["'none'"]);
  expect(policy.get('script-src')).toEqual(["'self'"]);
  expect(policy.get('style-src')).toEqual(["'self'"]);
  expect(policy.get('frame-ancestors')).toEqual(["'none'"]);
  expect(policy.get('object-src')).toEqual(["'none'"]);
  expect(policy.get('base-uri')).toEqual(["'none'"]);
  expect(declared['x-frame-options']).toBe('DENY');
  expect(declared['x-content-type-options']).toBe('nosniff');
  expect(declared['referrer-policy']).toBe('strict-origin-when-cross-origin');
});

/*
 * Every page shape the site has, and the one form: home, the home search
 * submitted by typing, a shared search link, a subcategory, an article with
 * images, the other platform, and the glossary.
 */
const ROUTES = [
  '/?q=guardian',
  '/#setup-and-basic-use',
  '/#guardian-protection/what-are-the-three-keys-in-a-guardian-backed-account',
  '/?platform=mobile#setup-and-basic-use/how-to-install-bread-wallet',
  '/#glossary'
];

async function collectViolations(page: Page): Promise<string[]> {
  const violations: string[] = [];
  page.on('console', message => {
    if (/Content Security Policy|Content-Security-Policy/i.test(message.text())) violations.push(message.text());
  });
  await page.exposeFunction('reportCspViolation', (entry: string) => violations.push(entry));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      const report = (window as unknown as { reportCspViolation: (entry: string) => void }).reportCspViolation;
      report(`${event.effectiveDirective} blocked ${event.blockedURI || 'inline'}`);
    });
  });
  return violations;
}

async function expectAssetsLoaded(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const state = await page.evaluate(async () => {
    const images = [...document.images];
    for (const image of images) {
      image.loading = 'eager';
      image.scrollIntoView();
    }
    await Promise.all(images.map(image => image.decode().catch(() => undefined)));
    return {
      families: [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family.replace(/"/g, '')),
      brokenImages: images.filter(image => !image.complete || image.naturalWidth === 0).map(image => image.src),
      stylesheetRules: [...document.styleSheets].reduce((count, sheet) => count + sheet.cssRules.length, 0)
    };
  });

  expect(state.brokenImages).toEqual([]);
  expect(state.stylesheetRules).toBeGreaterThan(0);
  expect(new Set(state.families)).toEqual(new Set(['Nunito', 'Inter']));
}

test('every page shape loads its fonts, images and styles without a CSP violation', async ({ page }) => {
  const violations = await collectViolations(page);

  await page.goto('/');
  await expect(page.locator('.help-center-home')).toBeVisible();
  await expectAssetsLoaded(page);

  await page.locator('.help-home-search-form input[type="search"]').fill('recovery');
  await page.locator('.help-home-search-form input[type="search"]').press('Enter');
  await expect(page).toHaveURL(/\?q=recovery/);

  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator('#root > *')).not.toHaveCount(0);
    await expectAssetsLoaded(page);
  }

  expect(violations).toEqual([]);
});

test('the page refuses to be framed', async ({ page, baseURL }) => {
  // setContent resolves on the host page's load event, which waits for the
  // frame's own load, blocked or not, so the count below reads a settled frame.
  await page.setContent(`<iframe src="${baseURL}/" title="framed"></iframe>`, { waitUntil: 'load' });

  await expect(page.frameLocator('iframe[title="framed"]').locator('#root')).toHaveCount(0);
});

test('Radix dialogs, drawers, and selects work under nonce CSP without style violations', async ({ page }) => {
  const violations = await collectViolations(page);
  await page.goto('/');
  const firstNonce = await page.locator('meta[name="style-nonce"]').getAttribute('content');
  await page.getByRole('button', { name: 'Search help articles' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open site navigation' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.route('https://challenges.cloudflare.com/**', route => route.abort());
  await page.goto('/feedback');
  expect(await page.locator('meta[name="style-nonce"]').getAttribute('content')).not.toBe(firstNonce);
  await page.getByRole('combobox', { name: 'Platform', exact: true }).click();
  await expect(page.getByRole('option', { name: 'Extension', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(violations).toEqual([]);
});
