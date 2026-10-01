import { expect, test } from '@playwright/test';

test('home, topics, and articles retain one stable public header', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('.public-header');
  const initial = await header.boundingBox();
  expect(initial).not.toBeNull();
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveText('Help Center');

  await page.locator('.public-nav a', { hasText: 'All topics' }).click();
  await expect(page).toHaveURL(/\/topics$/);
  await expect(page.getByRole('heading', { name: 'All topics', exact: true })).toBeVisible();
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveText('All topics');
  expect(await header.boundingBox()).toEqual(initial);

  await page.locator('.all-topics-subcategory a').first().click();
  await expect(page).toHaveURL(/\/#.+\/.+/);
  await expect(page.locator('.help-center-article-body')).toBeVisible();
  expect(await header.boundingBox()).toEqual(initial);
});

test('feedback is a Bread support view and uses the integrated route', async ({ page }) => {
  await page.goto('/feedback');
  await expect(page.locator('.public-nav a[aria-current="page"]')).toHaveText('Send feedback');
  await expect(page.getByRole('heading', { name: 'Help us improve Bread Wallet' })).toBeVisible();
  await expect(page.getByText('Never include a recovery phrase')).toBeVisible();
  await expect(page.locator('.cf-turnstile')).toHaveAttribute('data-sitekey', '1x00000000000000000000AA');
  await expect(page.locator('a[href*="miden-feedback-relay.workers.dev"]')).toHaveCount(0);
});
