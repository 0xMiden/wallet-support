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

test('feedback compatibility page opens the approved hosted form without submitting', async ({ page, context }) => {
  const unexpectedWrites: string[] = [];
  await context.route('**/*', async route => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) unexpectedWrites.push(request.url());
    if (request.url().startsWith('https://cmuv78o9w003x5ebpyha3cf6p.zapier.app/')) {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Mock hosted feedback form</h1>' });
    } else if (!['GET', 'HEAD'].includes(request.method())) await route.abort();
    else await route.continue();
  });
  await page.goto('/feedback');
  await expect(page.getByRole('heading', { name: 'Help us improve Bread Wallet' })).toBeVisible();
  await expect(page.getByText('Never include a recovery phrase')).toBeVisible();
  await expect(page.locator('form.feedback-form')).toHaveCount(0);
  const button = page.getByRole('link', { name: 'Submit feedback', exact: true });
  await expect(button).toHaveAttribute('href', 'https://cmuv78o9w003x5ebpyha3cf6p.zapier.app/page');
  const popupPromise = page.waitForEvent('popup');
  await button.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL('https://cmuv78o9w003x5ebpyha3cf6p.zapier.app/page');
  await expect(popup.getByRole('heading')).toHaveText('Mock hosted feedback form');
  expect(unexpectedWrites).toEqual([]);
  await expect(page.locator('a[href*="miden-feedback-relay.workers.dev"]')).toHaveCount(0);
});
