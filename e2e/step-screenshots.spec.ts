import { expect, test } from '@playwright/test';

/**
 * Step screenshots, the way a reader sees them. A narrow capture (a dialog, a
 * menu) is drawn at life size, which leaves it narrower than the column, and it
 * sits in the middle of the space it is given rather than against the left
 * edge (Ivan, 2026-09-17). Its "Open screenshot full size" label ends at the
 * image's right edge, not the column's. A wide capture fills the space either
 * way, so centring changes nothing for it.
 */

const BODY = '.help-center-article-body';
const INSTALL = '/#setup-and-basic-use/how-to-install-bread-wallet';
const CREATE = '/#setup-and-basic-use/how-do-i-create-a-bread-wallet';
const RESTORE = '/#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase';

for (const { article, route, count } of [
  { article: 'install', route: INSTALL, count: 3 },
  { article: 'create', route: CREATE, count: 5 },
  { article: 'restore', route: RESTORE, count: 7 }
]) for (const { name, width } of [
  { name: 'desktop', width: 1321 },
  { name: 'phone', width: 390 }
]) {
  test(`every ${article} screenshot is centred in its space, with its label at its edge (${name})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);

    const figures = page.locator(`${BODY} figure`);
    await expect(figures).toHaveCount(count);

    for (const figure of await figures.all()) {
      const image = figure.locator('img');
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete)).toBe(true);

      const [space, link, picture, label] = await Promise.all([
        figure.boundingBox(),
        figure.locator('a').boundingBox(),
        image.boundingBox(),
        figure.locator('a > span').boundingBox()
      ]);
      if (!space || !link || !picture || !label) throw new Error('a figure did not lay out');
      const alt = await image.getAttribute('alt');

      const left = picture.x - space.x;
      const right = space.x + space.width - (picture.x + picture.width);
      expect(Math.abs(left - right), `${alt}: ${left}px on the left, ${right}px on the right`).toBeLessThanOrEqual(1);
      expect(Math.abs(link.width - picture.width), `${alt}: the link is as wide as its image`).toBeLessThanOrEqual(1);
      expect(Math.abs(label.x + label.width - (picture.x + picture.width)), `${alt}: label edge`).toBeLessThanOrEqual(1);
    }
  });
}

test('a narrow capture is drawn at life size and leaves room on both sides', async ({ page }) => {
  await page.setViewportSize({ width: 1321, height: 900 });
  await page.goto(INSTALL);

  const dialog = page.locator(`${BODY} figure img[src*="E01a-install-add-extension"]`);
  await dialog.scrollIntoViewIfNeeded();
  const [picture, space] = await Promise.all([
    dialog.boundingBox(),
    dialog.locator('xpath=ancestor::figure[1]').boundingBox()
  ]);
  expect(picture?.width).toBe(435);
  // Room on both sides, so centring is being tested rather than assumed.
  expect((space?.width ?? 0) - (picture?.width ?? 0)).toBeGreaterThan(100);
  expect((picture?.x ?? 0) - (space?.x ?? 0)).toBeGreaterThan(50);
});
