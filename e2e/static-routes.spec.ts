import { expect, test } from '@playwright/test';

// Vite preview can hide missing entry documents behind its SPA fallback.
const origin = () => String(test.info().config.metadata.staticOrigin);

for (const width of [375, 1280]) {
  test(`public entry documents load and reload on a static host at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [path, title] of [
      ['/topics', 'All topics'], ['/topics/', 'All topics'],
      ['/feedback', 'Help us improve Bread Wallet'], ['/feedback/', 'Help us improve Bread Wallet']
    ]) {
      expect((await page.goto(`${origin()}${path}`))?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.goto(`${origin()}/topics`);
    await page.locator('.all-topics-subcategory a').first().click();
    await expect(page.locator('.help-center-article-body')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'All topics', exact: true })).toBeVisible();
    for (const path of ['/unknown', '/api/unknown', '/admin/unknown']) {
      expect((await request.get(`${origin()}${path}`)).status()).toBe(404);
    }
  });
}

test('link preview uses the official Bread image at an absolute production URL', async ({ request }) => {
  for (const path of ['/', '/topics', '/feedback']) {
    const html = await (await request.get(`${origin()}${path}`)).text();
    expect(html).toContain('property="og:image" content="https://support.miden.xyz/bread-wallet-og.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:image" content="https://support.miden.xyz/bread-wallet-og.png"');
  }
  const image = await request.get(`${origin()}/bread-wallet-og.png`);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');
});
