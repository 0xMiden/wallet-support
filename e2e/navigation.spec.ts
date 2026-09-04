import { expect, test } from '@playwright/test';

/**
 * The routing rules, exercised the way a reader meets them.
 *
 * Every case here is a link a person can actually follow. Where a control is
 * present in the DOM but hidden — the platform tabs sit inside the category
 * section, which is `hidden` while search results are showing — the test
 * drives the reachable order instead of forcing a click nobody can perform.
 */

const HOME = '.help-center-home';

/*
 * Two headings can be present at once: the results section, and the category
 * section behind it that is `hidden` while results show. So each is addressed
 * by what makes it itself, not by a class both of them carry.
 */
const RESULTS = 'section[aria-label="Search results"] h1';
const TITLE = '#help-center-category-title';

test('the bare URL opens the home page', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator(HOME)).toBeVisible();
  await expect(page.locator('h1')).toHaveText('How can we help?');
  // Not the category view: the sidebar does not exist on this page.
  await expect(page.locator('.help-center-sidebar')).toHaveCount(0);
});

test('a home card opens its first subcategory', async ({ page }) => {
  await page.goto('/');

  await page.locator('.help-home-card', { hasText: 'Getting started' }).click();

  await expect(page).toHaveURL(/#setup-and-basic-use$/);
  await expect(page.locator(TITLE)).toHaveText('Setup and basic use');
  await expect(page.locator('.help-center-sidebar')).toBeVisible();
});

test('subcategory to article to home, by the brand mark', async ({ page }) => {
  await page.goto('/#setup-and-basic-use');

  await page.locator('.help-center-card-link').first().click();
  await expect(page.locator(TITLE)).toHaveText('How to install Bread Wallet');

  await page.locator('.help-center-desktop-brand').click();

  await expect(page.locator(HOME)).toBeVisible();
});

test('the brand mark is a way out of search results', async ({ page }) => {
  await page.goto('/');

  await page.locator('.help-home-popular button', { hasText: 'Guardian' }).click();
  await expect(page.locator(RESULTS)).toContainText('results for');

  await page.locator('.help-center-desktop-brand').click();

  // The regression this guards: the hash changed and nothing else, so the one
  // control promising a way out of the results kept rendering them.
  await expect(page.locator(HOME)).toBeVisible();
  await expect(page).toHaveURL(/\/(#)?$/);
});

test('a shared ?q= link opens the results it names', async ({ page }) => {
  await page.goto('/?q=guardian');

  await expect(page.locator(RESULTS)).toContainText('for “guardian”');
  await expect(page.locator('.help-center-card-link').first()).toBeVisible();
});

test('searching keeps the platform, and the platform keeps the search', async ({ page }) => {
  // The stated case — choosing Mobile with a search active — is not reachable:
  // the tabs live inside the section that is hidden while results show. This
  // is the same invariant in the order a reader can perform, plus the reverse.
  await page.goto('/#setup-and-basic-use');
  await page.locator('.help-center-platform-tabs button', { hasText: 'Mobile' }).click();
  await expect(page).toHaveURL(/platform=mobile/);

  await page.locator('.help-center-search input').fill('guardian');
  await expect(page.locator(RESULTS)).toContainText('for “guardian”');
  await expect(page).toHaveURL(/platform=mobile/);
  await expect(page).toHaveURL(/q=guardian/);

  // And clearing the search must not cost the platform.
  await page.locator('.help-center-search input').fill('');
  await expect(page).toHaveURL(/platform=mobile/);
  await expect(page).not.toHaveURL(/q=/);
});

test('the footer is on every page, not only the home page', async ({ page }) => {
  // It began inside the home page, which left the article pages — where a
  // reader is most likely to want the support form or the legal documents —
  // as the only ones without it.
  const footer = page.locator('.help-center-footer');
  const legal = footer.getByRole('link', { name: 'Privacy Policy' });

  for (const route of [
    '/',
    '/#setup-and-basic-use',
    '/#setup-and-basic-use/how-to-install-bread-wallet',
    '/?q=guardian'
  ]) {
    await page.goto(route);
    await expect(footer, route).toBeVisible();
    await expect(legal, route).toHaveAttribute('href', 'https://0xmiden.github.io/wallet/privacy/');
    // One contentinfo landmark per page: the security reminder inside <main>
    // is not one, and must not become one.
    await expect(page.getByRole('contentinfo'), route).toHaveCount(1);
  }
});

test('the header links sit on the centre line of the page', async ({ page }) => {
  // Centred by a three-track grid with equal outer columns, not by pushing
  // them out of the way of the button: with `space-between` the links landed
  // wherever the brand and the button happened to leave room.
  await page.goto('/');

  const nav = await page.locator('.help-home-nav').boundingBox();
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  if (nav === null) throw new Error('the header nav was not rendered');

  const navCentre = nav.x + nav.width / 2;
  expect(Math.abs(navCentre - width / 2)).toBeLessThan(2);
});

test('the logo carries no Help Center label', async ({ page }) => {
  for (const route of ['/', '/#setup-and-basic-use']) {
    await page.goto(route);
    const brands = page.locator('.help-center-brand');
    for (let i = 0; i < (await brands.count()); i++) {
      await expect(brands.nth(i), route).toHaveText('Bread Wallet');
    }
  }
});

test('the footer brand sits at the left edge of the page, not in from it', async ({ page }) => {
  // Capped and centred, the frame left a wide gap before the logo — 183px
  // inside the content column at 1950, and 351px on the home page.
  await page.setViewportSize({ width: 1600, height: 900 });

  for (const [route, container] of [
    ['/', '.help-center-footer'],
    ['/#setup-and-basic-use', '.help-center-footer']
  ] as const) {
    await page.goto(route);
    const footer = await page.locator(container).boundingBox();
    const logo = await page.locator('.help-center-footer .help-center-brand').boundingBox();
    if (footer === null || logo === null) throw new Error(`no footer on ${route}`);

    // Within the footer's own padding, and nowhere near its middle.
    expect(logo.x - footer.x, route).toBeLessThan(40);
  }
});
