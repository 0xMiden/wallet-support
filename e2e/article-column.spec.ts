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
    ['src/help-center/help-center.css', 'src/help-center/tokens.css', 'src/design-system.css'].flatMap(file =>
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
 *
 * Ruled by Ivan on 2026-09-11: both stay. They are the layout working, the
 * margin doubling and then the sidebar arriving, and text narrowing because a
 * sidebar appeared is expected. The 1180px case was a defect precisely because
 * nothing appeared. Do not move either breakpoint to make these go away.
 */
const CHROME_STEPS: ReadonlyMap<number, { readonly maxDrop: number; readonly reason: string }> = new Map([
  [621, { maxDrop: 40, reason: 'the gutter doubles from 1.25rem to 2.5rem a side' }],
  [901, { maxDrop: 336, reason: 'the navigation sidebar takes its own column' }]
]);

/*
 * The third place it may narrow, and the reason it is not in the map above:
 * the rail is placed by a container query, not a media query, so it has no
 * breakpoint in any stylesheet to key on and it lands wherever the sweep's
 * 16px step happens to cross it. It is keyed on the rail itself arriving.
 *
 * Allowed once, and only for what the rail and its gap take: 15rem + 3rem.
 * This is the 901px case again by Ivan's 2026-09-11 reasoning — text narrowing
 * because something appeared is the layout working. Ivan asked for it on
 * 2026-09-16, choosing 52ch as the measure floor below which the rail goes
 * under the article instead. If the rail ever takes more than its own width,
 * or takes it where it did not just arrive, that is still a fault.
 */
const RAIL_STEP = 288;

for (const { label, route } of [
  { label: 'an article with a side rail', route: '/#guardian-protection/what-is-guardian' },
  { label: 'an article without one', route: '/#activity-and-transaction-status/what-is-delegate-proof-generation' }
]) {
  test(`${label}: the column never narrows as the window widens`, async ({ page }) => {
    expect(breakpoints).toEqual(expect.arrayContaining([620, 900]));

    await page.goto(route);
    const body = page.locator('.help-center-article-body');
    await expect(body).toBeVisible();

    const measured: { width: number; column: number; railBeside: boolean }[] = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const frame = await body.evaluate(
        element =>
          new Promise<{ column: number; railBeside: boolean }>(resolve =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const box = element.getBoundingClientRect();
                const rail = document.querySelector('.help-center-rail')?.getBoundingClientRect();
                resolve({ column: box.width, railBeside: rail !== undefined && rail.left >= box.right - 1 });
              })
            )
          )
      );
      measured.push({ width, ...frame });
    }

    const narrowings = measured.flatMap((row, index) => {
      const previous = measured[index - 1];
      if (!previous || row.column >= previous.column - 0.5) return [];

      const step = CHROME_STEPS.get(row.width);
      const drop = previous.column - row.column;
      if (step && previous.width === row.width - 1 && drop <= step.maxDrop + 0.5) return [];
      if (!previous.railBeside && row.railBeside && drop <= RAIL_STEP + 0.5) return [];

      return [`${previous.width}px -> ${row.width}px: ${Math.round(previous.column)}px -> ${Math.round(row.column)}px`];
    });
    expect(narrowings, 'the article column got narrower as the window got wider').toEqual([]);
  });
}

/*
 * The floor itself, which the narrowing guard above cannot express: that one
 * allows the rail its own width wherever it arrives, so it would still pass if
 * the threshold were dropped to 20ch and the article left at 200px. This is
 * the number Ivan chose on 2026-09-16 and the reason the rail goes under the
 * article at all, so it is pinned here rather than only in the stylesheet.
 */
test('the rail never leaves the article below the 52ch floor', async ({ page }) => {
  await page.goto('/#guardian-protection/what-is-guardian');
  await expect(page.locator('.help-center-article-body')).toBeVisible();

  let narrowestBeside = Number.POSITIVE_INFINITY;
  let besideFrom = Number.POSITIVE_INFINITY;
  for (let width = 1000; width <= 1600; width += 8) {
    await page.setViewportSize({ width, height: 900 });
    const frame = await page.locator('.help-center-article-body').evaluate(
      element =>
        new Promise<{ column: number; railBeside: boolean }>(resolve =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const box = element.getBoundingClientRect();
              const rail = document.querySelector('.help-center-rail')?.getBoundingClientRect();
              resolve({ column: box.width, railBeside: rail !== undefined && rail.left >= box.right - 1 });
            })
          )
        )
    );
    if (!frame.railBeside) continue;
    besideFrom = Math.min(besideFrom, width);
    narrowestBeside = Math.min(narrowestBeside, frame.column);
  }

  // 52ch, at the 10px per character this stylesheet's type gives.
  expect(narrowestBeside, 'the rail squeezed the article below 52ch').toBeGreaterThanOrEqual(519.5);
  // What Ivan reported: at his window the strip beside the article sat empty
  // and the rail was below it. It is beside well before the old ~1400px.
  expect(besideFrom, 'the rail arrives later than the 52ch threshold implies').toBeLessThanOrEqual(1240);
});

test('on a wide window the rail still sits beside the column, not below it', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#guardian-protection/what-is-guardian');

  const body = await page.locator('.help-center-article-body').boundingBox();
  const rail = await page.locator('.help-center-rail').boundingBox();
  expect(body && rail && rail.x >= body.x + body.width).toBe(true);
});
