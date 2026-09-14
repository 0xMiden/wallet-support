import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/**
 * Where an anchor target comes to rest relative to the sticky header, once the
 * page has stopped scrolling: pixels between the header's bottom edge and the
 * target's top. Negative means the header covers it.
 *
 * Below 900px the header sticks to the top of the viewport, so a jump that
 * scrolls its target to the very top hides the thing it pointed at.
 *
 * Measured at rest on purpose. Section links scroll smoothly, and mid-scroll
 * the target is still below the header, so polling the gap on its own would
 * pass before the scroll had arrived anywhere.
 */
export async function restingGapBelowStickyHeader(page: Page, target: Locator): Promise<number> {
  let previous = Number.NaN;
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => window.scrollY);
        const settled = y > 0 && y === previous;
        previous = y;
        return settled;
      },
      { message: 'the page never came to rest below its top', intervals: [150] }
    )
    .toBe(true);

  const [bar, box] = await Promise.all([
    page.locator('.help-center-mobile-header').boundingBox(),
    target.boundingBox()
  ]);
  if (bar === null || box === null) throw new Error('the sticky header or the target did not render');
  return box.y - (bar.y + bar.height);
}
