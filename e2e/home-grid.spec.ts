import { expect, test } from '@playwright/test';

test('topic cards and the support card form a consistent responsive grid', async ({ page }) => {
  for (const [width, columns] of [[1440, 4], [800, 2], [390, 1]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const boxes = await page.locator('.help-home-card-grid > li').evaluateAll(items => items.map(item => { const rect = item.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; }));
    expect(boxes).toHaveLength(8);
    expect(boxes.filter(box => Math.abs(box.y - boxes[0]!.y) < 1)).toHaveLength(columns);
    for (let i = columns; i < boxes.length; i++) expect(Math.abs(boxes[i]!.x - boxes[i - columns]!.x)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
