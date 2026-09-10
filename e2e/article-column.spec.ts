import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

/**
 * The article column may keep its width or grow as the window widens, never
 * shrink. It did shrink: from 1180px the side rail took its 15rem and gap
 * beside a column that had not yet grown to pay for them, so the reading
 * column fell from 680px to 476px and only recovered around 1384px.
 *
 * Checked on both sides of every breakpoint the stylesheets declare, read from
 * the stylesheets so a new one is covered without an edit here, and on a sweep
 * between them, because the fault was a range of widths rather than a point.
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const breakpoints = [
  ...new Set(
    ['src/help-center/help-center.css', 'src/help-center/tokens.css', 'src/styles.css'].flatMap(file =>
      [...readFileSync(join(root, file), 'utf8').matchAll(/@media[^{]*?\((?:min|max)-width:\s*(\d+)px\)/g)].map(
        match => Number(match[1])
      )
    )
  )
].sort((a, b) => a - b);

const sweep = Array.from({ length: (2560 - 320) / 16 + 1 }, (_, index) => 320 + index * 16);
const widths = [...new Set([...sweep, ...breakpoints.flatMap(width => [width - 1, width, width + 1])])].sort(
  (a, b) => a - b
);

/*
 * The two places the column may narrow, because the page around the article
 * changes rather than the article layout: at 621px the gutter doubles, from
 * 1.25rem to 2.5rem a side, and at 901px the navigation stops being a drawer
 * and takes a column of its own, 21rem at most. Each is allowed only the width
 * its own change takes, and only at that step. Anywhere else, or by more, a
 * narrower column is a fault.
 */
const CHROME_STEPS: ReadonlyMap<number, { readonly maxDrop: number; readonly reason: string }> = new Map([
  [621, { maxDrop: 40, reason: 'the gutter doubles from 1.25rem to 2.5rem a side' }],
  [901, { maxDrop: 336, reason: 'the navigation sidebar takes its own column' }]
]);

for (const { label, route } of [
  { label: 'an article with a side rail', route: '/#guardian-protection/what-is-guardian' },
  { label: 'an article without one', route: '/#activity-and-transaction-status/what-is-delegate-proof-generation' }
]) {
  test(`${label}: the column never narrows as the window widens`, async ({ page }) => {
    expect(breakpoints).toEqual(expect.arrayContaining([620, 740, 900]));

    await page.goto(route);
    const body = page.locator('.help-center-article-body');
    await expect(body).toBeVisible();

    const measured: { width: number; column: number }[] = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const column = await body.evaluate(
        element =>
          new Promise<number>(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve(element.getBoundingClientRect().width)))
          )
      );
      measured.push({ width, column });
    }

    const narrowings = measured.flatMap((row, index) => {
      const previous = measured[index - 1];
      if (!previous || row.column >= previous.column - 0.5) return [];

      const step = CHROME_STEPS.get(row.width);
      const drop = previous.column - row.column;
      if (step && previous.width === row.width - 1 && drop <= step.maxDrop + 0.5) return [];

      return [`${previous.width}px -> ${row.width}px: ${Math.round(previous.column)}px -> ${Math.round(row.column)}px`];
    });
    expect(narrowings, 'the article column got narrower as the window got wider').toEqual([]);
  });
}

test('on a wide window the rail still sits beside the column, not below it', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#guardian-protection/what-is-guardian');

  const body = await page.locator('.help-center-article-body').boundingBox();
  const rail = await page.locator('.help-center-rail').boundingBox();
  expect(body && rail && rail.x >= body.x + body.width).toBe(true);
});
