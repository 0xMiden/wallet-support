import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * The FAQ articles, the way a reader meets them: main categories reached from
 * the home page, diagrams inside the reading column, and references that are
 * links to the articles they name.
 */

const TITLE = '#help-center-category-title';
const BODY = '.help-center-article-body';

// By its title: "Earn" alone would also match the Guardian card's "Learn".
const homeCard = (page: Page, title: string) =>
  page.locator('.help-home-card').filter({
    has: page.locator('h3', { hasText: new RegExp(`^${title}$`) })
  });

test('the Cross-chain and Earn cards each open their own subcategory, and the sidebar reaches Earn', async ({
  page
}) => {
  await page.goto('/');
  await homeCard(page, 'Cross-chain').click();

  await expect(page).toHaveURL(/#moving-across-chains$/);
  await expect(page.locator(TITLE)).toHaveText('Moving across chains');
  await expect(page.locator('.help-center-card-link')).toHaveText([
    'Can I send funds to another blockchain?',
    'What is the difference between a solver route and a canonical bridge?',
    'Can I swap tokens across chains?'
  ]);

  // Earn is a group of its own, so its row is reached through its heading. A
  // heading is a toggle: if the group was already open, the click closed it.
  const tree = page.getByRole('navigation', { name: 'Help Center categories' });
  const earnHeading = tree.getByRole('button', { name: 'Earn', exact: true });
  const earningYield = tree.locator('a[href="#earn"]');
  await earnHeading.click();
  if (!(await earningYield.isVisible())) await earnHeading.click();
  await earningYield.click();

  await expect(page).toHaveURL(/#earn$/);
  await expect(page.locator(TITLE)).toHaveText('Earning yield');
  await expect(page.locator('.help-center-card-link')).toHaveText([
    'Can I earn yield in Bread?',
    'Are my funds private while they earn?'
  ]);

  await page.goto('/');
  await homeCard(page, 'Earn').click();
  await expect(page).toHaveURL(/#earn$/);
  await expect(page.locator(TITLE)).toHaveText('Earning yield');
});

test('Activity and transaction status still routes, and gains no FAQ article', async ({ page }) => {
  await page.goto('/#activity-and-transaction-status');

  await expect(page.locator(TITLE)).toHaveText('Activity and transaction status');
  await expect(page.locator('.help-center-card-link')).toHaveText(['What is delegate proof generation?']);
});

for (const { route, alt } of [
  {
    route: '/#moving-across-chains/what-is-the-difference-between-a-solver-route-and-a-canonical-bridge',
    alt: 'Across chains, two routes'
  },
  { route: '/#earn/are-my-funds-private-while-they-earn', alt: 'Earn across the privacy line' }
]) {
  test(`the "${alt}" diagram renders inside its article`, async ({ page }) => {
    await page.goto(route);

    const image = page.locator(`${BODY} figure img`);
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute('alt', alt);

    // Lazy, so it loads once it is near the viewport.
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => (element.complete ? element.naturalWidth : 0)))
      .toBe(1024);

    // Inside the reading column, never wider than it.
    const [imageBox, bodyBox] = await Promise.all([image.boundingBox(), page.locator(BODY).boundingBox()]);
    expect(imageBox?.width).toBeGreaterThan(0);
    expect(imageBox?.width ?? Infinity).toBeLessThanOrEqual((bodyBox?.width ?? 0) + 0.5);
  });
}

test('at phone width a diagram opens full size in a new tab', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#moving-across-chains/what-is-the-difference-between-a-solver-route-and-a-canonical-bridge');

  const link = page.getByRole('link', { name: 'Open diagram full size: Across chains, two routes' });
  await link.scrollIntoViewIfNeeded();
  await expect(link).toBeVisible();
  await expect(link.getByText('Open diagram full size')).toBeVisible();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');

  // It points at the image the article shows, and that address serves it.
  const href = (await link.getAttribute('href')) ?? '';
  await expect(link.locator('img')).toHaveAttribute('src', href);
  const response = await page.request.get(href);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');

  const [popup] = await Promise.all([page.waitForEvent('popup'), link.click()]);
  await expect(popup).toHaveURL(new URL(href, page.url()).href);
});

test('a See reference is a link to the article it names, in the same tab', async ({ page }) => {
  await page.goto('/#moving-across-chains/can-i-send-funds-to-another-blockchain');

  const reference = page.locator(`${BODY} a`, {
    hasText: 'What is the difference between a solver route and a canonical bridge?'
  });
  await expect(reference).not.toHaveAttribute('target');
  await reference.click();

  await expect(page).toHaveURL(
    /#moving-across-chains\/what-is-the-difference-between-a-solver-route-and-a-canonical-bridge$/
  );
  await expect(page.locator(TITLE)).toHaveText(
    'What is the difference between a solver route and a canonical bridge?'
  );
});

test('a reference to an article with platform variants keeps the platform being read', async ({ page }) => {
  await page.goto('/?platform=mobile#setup-and-basic-use/what-is-bread-wallet');

  await page.locator(`${BODY} a`, { hasText: 'How to install Bread Wallet' }).click();

  await expect(page).toHaveURL(/\?platform=mobile#setup-and-basic-use\/how-to-install-bread-wallet$/);
  await expect(page.locator(TITLE)).toHaveText('How to install Bread Wallet');
  await expect(page.locator(BODY)).toContainText('Tap Get or Install');
});
