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
