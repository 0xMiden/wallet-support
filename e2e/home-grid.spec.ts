import { expect, test } from '@playwright/test';

test('the topic directory stays in reading order and adapts without orphaned narrow rows', async ({ page }) => {
  for (const [width, columns] of [[1440, 2], [901, 2], [800, 2], [741, 2], [740, 1], [739, 1], [390, 1], [320, 1]] as const) {
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    const rows = page.locator('.help-home-card');
    await expect(rows).toHaveCount(7);
    const boxes = await rows.evaluateAll(rows => rows.map(row => { const r=row.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width}; }));
    expect(boxes.filter(box => Math.abs(box.y - boxes[0]!.y) <= 1)).toHaveLength(columns);
    for (let i=columns;i<boxes.length;i++) {
      expect(Math.abs(boxes[i]!.x-boxes[i-columns]!.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes[i]!.width-boxes[i-columns]!.width)).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('common tasks reach their answer directly and retain the selected platform', async ({ page }) => {
  await page.goto('/?platform=mobile');
  await page.getByRole('link', {name:'Restore wallet access Recover safely on a new device'}).click();
  await expect(page.locator('.help-center-article-body')).toBeVisible();
  await expect(page.getByRole('tab',{name:'Mobile',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page).toHaveURL(/platform=mobile#security-and-recovery\/how-do-i-restore-my-wallet-with-a-recovery-phrase/);
});
