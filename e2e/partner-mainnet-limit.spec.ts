import { expect, test } from '@playwright/test';

const ARTICLE = '#moving-across-chains/what-is-the-partner-mainnet-deposit-limit';

test('the Partner Mainnet limit is prominent and reaches its FAQ on either platform', async ({ page }) => {
  for (const [width, platform] of [[390, 'mobile'], [1440, 'extension-desktop']] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/?platform=${platform}`);
    const notice = page.getByRole('region', { name: 'Partner Mainnet deposit limit' });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('$1,232.462');
    await expect(notice).toContainText('overall deposited balance');
    await expect(notice).toContainText('existing balance');
    const noticeBox = await notice.boundingBox();
    const categoriesBox = await page.locator('.help-home-categories').boundingBox();
    expect(noticeBox).not.toBeNull();
    expect(categoriesBox).not.toBeNull();
    expect(noticeBox!.y + noticeBox!.height).toBeLessThanOrEqual(categoriesBox!.y);

    const link = notice.getByRole('link', { name: 'Read the deposit limit' });
    await expect(link).toHaveAttribute('href', ARTICLE);
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${ARTICLE}$`));
    expect(new URL(page.url()).searchParams.get('platform')).toBe(platform);
    await expect(page.getByRole('heading', { name: 'What is the Partner Mainnet deposit limit?', exact: true })).toBeVisible();
    const body = page.locator('.help-center-article-body');
    await expect(body).toContainText('$1,232.462');
    await expect(body).toContainText('not a per-deposit limit');
    await expect(body).toContainText('existing deposited balance');
    await page.reload();
    await expect(body).toBeVisible();
    await expect(body).toContainText('Splitting funds into smaller deposits does not change the limit');

    await page.goto(`/?platform=${platform}&q=deposit%20limit`);
    const result = page.getByRole('region', { name: 'Search results' }).getByRole('link', { name: 'What is the Partner Mainnet deposit limit?', exact: true });
    await expect(result).toBeVisible();
    await result.click();
    await expect(body).toBeVisible();
  }
});

test('the limit notice fits on both sides of every responsive breakpoint', async ({ page }) => {
  await page.goto('/');
  const notice = page.getByRole('region', { name: 'Partner Mainnet deposit limit' });
  for (const width of [320, 619, 620, 621, 739, 740, 741, 899, 900, 901, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(notice).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}px`).toBeLessThanOrEqual(0);
    const box = await notice.getByRole('link', { name: 'Read the deposit limit' }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x, `${width}px`).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, `${width}px`).toBeLessThanOrEqual(width);
    const arrow = await notice.locator('.help-home-arrow').boundingBox();
    expect(arrow).not.toBeNull();
    expect(arrow!.width, `${width}px: link arrow remains visible`).toBeGreaterThan(0);
  }
});
