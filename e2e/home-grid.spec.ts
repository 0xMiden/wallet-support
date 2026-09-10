import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * The home grid centres a card left alone on its last row, and nothing else.
 *
 * The rule keys on the number of cards, so these tests set the number rather
 * than wait for the category data to reach it: cards are removed from, or
 * copied into, the page before it is measured. Cards are measured against each
 * other, never against pixel values, so a change of gutter or font leaves the
 * tests standing.
 *
 * 1440px is three columns, 800px two, and 390px one.
 */

const GRID = '.help-home-card-grid';

interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

async function homeWithCards(page: Page, width: number, count: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await page.locator(GRID).evaluate((list, wanted) => {
    while (list.children.length > wanted) list.lastElementChild?.remove();
    while (list.children.length < wanted) list.append((list.lastElementChild as Element).cloneNode(true));
  }, count);

  return page.locator(GRID).evaluate(list => {
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width };
    };
    return { grid: box(list), cards: [...list.children].map(box) };
  });
}

const apart = (a: number, b: number) => Math.abs(a - b);

function columnsOf(cards: readonly Box[]) {
  const first = cards[0] as Box;
  return cards.filter(card => apart(card.top, first.top) <= 1).length;
}

test('a card left alone on the last row is centred, at three columns and at two', async ({ page }) => {
  // Seven cards leave one alone at either column count.
  for (const [width, columns] of [
    [1440, 3],
    [800, 2]
  ] as const) {
    const { grid, cards } = await homeWithCards(page, width, 7);
    const last = cards[6] as Box;
    const label = `${width}px`;

    expect(columnsOf(cards), `${label}: ${columns} columns`).toBe(columns);
    expect(last.top, `${label}: the seventh card is alone on its row`).toBeGreaterThan((cards[5] as Box).top);
    expect(apart(last.left + last.width / 2, grid.left + grid.width / 2), `${label}: centred on the grid`).toBeLessThanOrEqual(1);
    expect(apart(last.width, (cards[0] as Box).width), `${label}: one column wide`).toBeLessThanOrEqual(1);
  }
});

test('a full last row, or two under three, is not centred', async ({ page }) => {
  // What stops the rule from quietly centring everything: whatever the count,
  // every card sits directly under the card one row up, and is as wide.
  const cases = [
    [1440, 3, 6], // 3 + 3
    [1440, 3, 8], // 3 + 3 + 2
    [800, 2, 6], // 2 + 2 + 2
    [800, 2, 8], // 2 + 2 + 2 + 2
    [390, 1, 7], // one column: every row is full
    [390, 1, 4] // an even count the three-column rule would catch, were it to leak
  ] as const;

  for (const [width, columns, count] of cases) {
    const { cards } = await homeWithCards(page, width, count);
    const label = `${width}px, ${count} cards`;

    expect(cards, label).toHaveLength(count);
    expect(columnsOf(cards), `${label}: ${columns} columns`).toBe(columns);
    for (let index = columns; index < count; index += 1) {
      const card = cards[index] as Box;
      const above = cards[index - columns] as Box;
      expect(apart(card.left, above.left), `${label}: card ${index + 1} is under card ${index + 1 - columns}`).toBeLessThanOrEqual(1);
      expect(apart(card.width, above.width), `${label}: card ${index + 1} is as wide as the card above`).toBeLessThanOrEqual(1);
    }
  }
});
