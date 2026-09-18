import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

/**
 * Every image in the Help Center sits on one centre line: the article
 * column's. A screenshot inside a step is centred on the column, not on the
 * step's indented text, so it lines up with the screenshots and diagrams
 * around it (Ivan, 2026-09-18: misaligned images look messy, and the rule
 * holds on every page). Centred on the text, a step screenshot sat 11px right
 * of a top-level one of the same width and their edges missed.
 *
 * The articles are read from disk, so an image added to any article, on
 * either platform, is checked the day it lands.
 */

const root = fileURLToPath(new URL('..', import.meta.url));
const contentDir = join(root, 'src/help-center/content');
const BODY = '.help-center-article-body';

function field(source: string, name: string): string {
  const match = new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(source);
  if (!match) throw new Error(`no ${name} in an article's frontmatter`);
  return match[1].trim();
}

const articles = readdirSync(contentDir)
  .filter(file => file.endsWith('.md'))
  .map(file => readFileSync(join(contentDir, file), 'utf8'))
  .filter(source => source.includes('![') && !/^hidden:\s*true$/m.test(source))
  .map(source => ({
    id: field(source, 'id'),
    subcategory: field(source, 'subcategory'),
    queries: [
      ...(source.includes('extension-desktop') ? [''] : []),
      ...(/^platforms:.*\bmobile\b/m.test(source) ? ['?platform=mobile'] : [])
    ]
  }));

for (const { id, subcategory, queries } of articles) {
  for (const { name, width } of [
    { name: 'desktop', width: 1321 },
    { name: 'phone', width: 390 }
  ]) {
    test(`${id}: every image is centred on the article column (${name})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      let checked = 0;

      for (const query of queries) {
        await page.goto(`/${query}#${subcategory}/${id}`);
        await expect(page.locator(BODY)).toBeVisible();

        for (const image of await page.locator(`${BODY} img`).all()) {
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete)).toBe(true);

          const [column, picture] = await Promise.all([page.locator(BODY).boundingBox(), image.boundingBox()]);
          if (!column || !picture) throw new Error('an image did not lay out');
          const offCentre = picture.x + picture.width / 2 - (column.x + column.width / 2);
          const alt = await image.getAttribute('alt');
          expect(Math.abs(offCentre), `${alt}${query}: ${offCentre}px off the column's centre`).toBeLessThanOrEqual(1);
          checked += 1;
        }
      }

      // The source has an image, so a page that renders none is a fault, not a pass.
      expect(checked, `${id} has an image in its source but none was shown`).toBeGreaterThan(0);
    });
  }
}
