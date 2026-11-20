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

test('the old /feedback address opens the contact form and sends nothing on its own', async ({ page, context }) => {
  const unexpectedWrites: string[] = [];
  await context.route('**/*', async route => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) { unexpectedWrites.push(request.url()); await route.abort(); }
    else await route.continue();
  });
  await page.goto('/feedback');
  await expect(page.getByRole('heading', { name: 'Send us your concerns or feedback', level: 1 })).toBeVisible();
  await expect(page.getByText('Never include a recovery phrase')).toBeVisible();
  await expect(page.locator('.public-feedback-link')).toHaveCount(0);
  expect(unexpectedWrites).toEqual([]);
  await expect(page.locator('a[href*="zapier.app"], a[href*="miden-feedback-relay.workers.dev"]')).toHaveCount(0);
});
