import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { helpCenterMainCategories } from '../src/help-center/categories';

/**
 * The sidebar carries one highlight, on the last thing the reader chose in it:
 * a clicked group heading holds it, and following a link hands it to the page
 * the link leads to.
 *
 * Reported 2026-09-10 and reproduced for every category. Clicking the page
 * already open fires no hashchange and changes no state, so a heading clicked
 * just before kept the highlight, on all 28 pairings of a page with another
 * group's heading. Coming back to the same category from the glossary or the
 * home page did the same. And on the glossary page a clicked heading lit up
 * beside the Glossary link, which the stand-down rule for the current page
 * did not reach.
 *
 * Driven from the category data, so a new category is covered without an
 * edit here.
 */

/** What the reader sees as highlighted: sidebar items with a painted background. */
async function lit(page: Page) {
  // Off the sidebar, so a hover tint does not count as a highlight.
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.mouse.move(size.width - 5, size.height - 5);
  return page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '.help-center-navigation-heading, .help-center-category-list a, .help-center-sidebar-utility'
      )
    ]
      .filter(element => (element as HTMLElement).offsetParent !== null)
      .filter(element => {
        const channels = getComputedStyle(element).backgroundColor.match(/[\d.]+/g) ?? [];
        return (channels.length > 3 ? Number(channels[3]) : 1) > 0;
      })
      .map(element => (element.textContent ?? '').trim())
  );
}

const expectLit = (page: Page, expected: readonly string[], message: string) =>
  expect.poll(() => lit(page), { message }).toEqual(expected);

const tree = (page: Page) => page.getByRole('navigation', { name: 'Help Center categories' });
const heading = (page: Page, title: string) => tree(page).getByRole('button', { name: title, exact: true });
const row = (page: Page, id: string) => tree(page).locator(`a[href="#${id}"]`);

test('clicking the page already open takes the highlight back from a heading, in every category', async ({
  page
}) => {
  for (const group of helpCenterMainCategories) {
    for (const subcategory of group.subcategories) {
      await page.goto(`/#${subcategory.id}`);

      for (const other of helpCenterMainCategories) {
        if (other.id === group.id) continue;

        await heading(page, other.title).click();
        await expectLit(page, [other.title], `#${subcategory.id}: "${other.title}" takes the highlight`);

        await row(page, subcategory.id).click();
        await expectLit(
          page,
          [subcategory.title],
          `#${subcategory.id}: clicking the open page after "${other.title}" takes it back`
        );
      }
    }
  }
});

test('on the glossary a clicked heading holds the highlight alone, and a link hands it on', async ({ page }) => {
  for (const group of helpCenterMainCategories) {
    const [first] = group.subcategories;
    if (!first) continue;

    await page.goto('about:blank');
    await page.goto('/#glossary');
    await expectLit(page, ['Glossary'], 'the glossary holds the highlight on arrival');

    await heading(page, group.title).click();
    await expectLit(page, [group.title], `"${group.title}" does not share the highlight with the Glossary link`);

    // A heading is a toggle: the group may have been open already and just closed.
    if (!(await row(page, first.id).isVisible())) await heading(page, group.title).click();
    await row(page, first.id).click();
    await expectLit(page, [first.title], `following ${first.title} from the glossary after "${group.title}"`);
  }
});

test('following the Glossary link after a heading leaves only the Glossary lit', async ({ page }) => {
  await page.goto('/#guardian-protection');
  await heading(page, 'Privacy').click();
  await page.locator('.help-center-sidebar-utility').click();
  await expectLit(page, ['Glossary'], 'the heading lets go when the glossary opens');
});

test('a heading lets go however the route moves: home and back again, or the back button', async ({ page }) => {
  await page.goto('/#guardian-protection');
  await heading(page, 'Privacy').click();
  await page.locator('.help-center-desktop-brand').click();
  await page.locator('.help-home-card', { hasText: 'Guardian' }).first().click();
  await expectLit(page, ['Guardian protection'], 'back on the same page by way of the home page');

  await page.goto('/#common-issues-and-support');
  await page.goto('/#guardian-protection');
  await heading(page, 'Privacy').click();
  await page.goBack();
  await expectLit(page, ['Common issues and support'], 'after the back button');
});

test('in the phone drawer, clicking the page already open takes the highlight back too', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#guardian-protection');

  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.click();
  await heading(page, 'Privacy').click();
  await row(page, 'guardian-protection').click();

  await menu.click();
  await expectLit(page, ['Guardian protection'], 'the drawer reopens with the page highlighted');
});
