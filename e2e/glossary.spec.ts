import { expect, test } from '@playwright/test';

import { GLOSSARY_TITLE, helpCenterGlossaryEntries } from '../src/help-center/glossary';
import { restingGapBelowStickyHeader } from './sticky-header';

/**
 * The glossary, the way a reader reaches it.
 *
 * Entries are imported from glossary.ts rather than written out, so these tests
 * follow the list as it grows. The approved wording is held by glossary.test.ts;
 * what is checked here is that the browser shows the data unaltered.
 */

const TITLE = '#help-center-glossary-title';
const ARTICLE = '/#guardian-protection/what-is-guardian';

test('#glossary shows every entry, term then definition, exactly as written', async ({ page }) => {
  await page.goto('/#glossary');

  await expect(page.locator(TITLE)).toHaveText(GLOSSARY_TITLE);
  // allTextContents rather than toHaveText, which normalises whitespace: the
  // point is that nothing between the data and the reader alters the text.
  expect(await page.locator('.help-center-glossary dt').allTextContents()).toEqual(
    helpCenterGlossaryEntries.map(entry => entry.term)
  );
  expect(await page.locator('.help-center-glossary dd').allTextContents()).toEqual(
    helpCenterGlossaryEntries.map(entry => entry.definition)
  );
});

test('#glossary-commitment opens the glossary scrolled to that entry, from a cold load', async ({
  page
}) => {
  await page.goto('/#glossary-commitment');

  const entry = page.locator('#glossary-commitment');
  await expect(page.locator(TITLE)).toHaveText(GLOSSARY_TITLE);
  await expect(entry.locator('dt')).toHaveText('Commitment');

  // At the top of the viewport, not merely somewhere on screen: an early entry
  // is visible without any scrolling at all, which would pass a broken scroll.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect
    .poll(async () => (await entry.boundingBox())?.y ?? Number.POSITIVE_INFINITY)
    .toBeLessThan(80);
});

test('an entry link lands below the sticky header on narrow screens', async ({ page }) => {
  // Below 900px the header sticks to the top of the viewport. With the desktop
  // scroll margin the term came to rest 32px down, under a 77px header: the
  // link worked and the reader could not see what it pointed at. 900 is the
  // widest width the header is sticky at.
  for (const width of [390, 900]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('about:blank');
    await page.goto('/#glossary-commitment');

    const term = page.locator('#glossary-commitment dt');
    await expect(term, `${width}px`).toHaveText('Commitment');
    expect(
      await restingGapBelowStickyHeader(page, term),
      `${width}px: the term is under the header`
    ).toBeGreaterThanOrEqual(0);
  }
});

test('the home card opens the glossary, from below the support panel', async ({ page }) => {
  await page.goto('/');

  // Not among the categories: that section counts articles across topics.
  await expect(
    page.locator('.help-home-categories').getByText(GLOSSARY_TITLE, { exact: true })
  ).toHaveCount(0);

  const card = page.locator('.help-home-glossary .help-home-card');
  await expect(card).toHaveCount(1);
  // It holds no articles, so it states no count.
  await expect(card.locator('.help-home-card-count')).toHaveCount(0);

  // Under a small heading of its own, so a lone card does not read as left behind.
  await expect(page.getByRole('region', { name: 'Reference' }).locator('.help-home-card')).toHaveCount(1);

  // Placed after the support panel, where it cannot read as a sixth topic.
  const [panel, cardBox] = await Promise.all([
    page.locator('.help-home-support').boundingBox(),
    card.boundingBox()
  ]);
  if (panel === null || cardBox === null) throw new Error('the support panel or the card did not render');
  expect(cardBox.y).toBeGreaterThan(panel.y + panel.height);

  await card.click();

  await expect(page).toHaveURL(/#glossary$/);
  await expect(page.locator(TITLE)).toHaveText(GLOSSARY_TITLE);
});

test('an article reaches the glossary from the sidebar and from the footer', async ({ page }) => {
  const sidebarLink = page
    .locator('.help-center-sidebar')
    .getByRole('link', { name: GLOSSARY_TITLE, exact: true });

  await page.goto(ARTICLE);
  await sidebarLink.click();
  await expect(page.locator(TITLE)).toHaveText(GLOSSARY_TITLE);
  await expect(sidebarLink).toHaveAttribute('aria-current', 'page');

  await page.goto(ARTICLE);
  await expect(page.locator(TITLE)).toHaveCount(0);
  await page
    .locator('.help-center-footer')
    .getByRole('link', { name: GLOSSARY_TITLE, exact: true })
    .click();
  await expect(page.locator(TITLE)).toHaveText(GLOSSARY_TITLE);
});

test('the glossary stays out of the category tree and the reading order', async ({ page }) => {
  await page.goto('/#glossary');

  const tree = page.getByRole('navigation', { name: 'Help Center categories' });
  await expect(tree.getByRole('link', { name: GLOSSARY_TITLE, exact: true })).toHaveCount(0);
  // Nothing in the tree claims to be the page the reader is on.
  await expect(tree.locator('[aria-current="page"]')).toHaveCount(0);
  // No previous or next: the glossary is not a step between categories.
  await expect(page.getByRole('navigation', { name: /sequence/i })).toHaveCount(0);
});
