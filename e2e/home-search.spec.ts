import { expect, test } from '@playwright/test';

/**
 * The home page search suggests articles as the reader types. Nothing is
 * highlighted until they move into the list, so Enter alone still opens the
 * full results, as it always has.
 */

const RESULTS = 'section[aria-label="Search results"] h1';
const field = (page: import('@playwright/test').Page) => page.locator('.help-home-search-form input');
const list = (page: import('@playwright/test').Page) => page.getByRole('listbox', { name: 'Suggested articles' });

test('suggests articles from the second letter, and opens one by keyboard', async ({ page }) => {
  await page.goto('/');
  await field(page).fill('r');
  await expect(list(page)).toBeHidden();

  await field(page).fill('restore');
  await expect(list(page)).toBeVisible();
  await expect(field(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(list(page).getByRole('option', { selected: true })).toHaveCount(0);

  await field(page).press('ArrowDown');
  const chosen = list(page).getByRole('option', { selected: true });
  await expect(field(page)).toHaveAttribute('aria-activedescendant', (await chosen.getAttribute('id'))!);
  const title = await chosen.locator('.help-home-suggestion-title').textContent();

  await field(page).press('Enter');
  await expect(page.locator('h1')).toHaveText(title!);
  await expect(page).not.toHaveURL(/q=/);
});

test('Enter with nothing highlighted, or See all results, opens the full results', async ({ page }) => {
  await page.goto('/');
  await field(page).fill('guardian');
  await field(page).press('Enter');
  await expect(page.locator(RESULTS)).toContainText('for “guardian”');

  await page.goto('/');
  await field(page).fill('guardian');
  await list(page).getByRole('option', { name: 'See all results for “guardian”' }).click();
  await expect(page.locator(RESULTS)).toContainText('for “guardian”');
});

test('a click opens the article, and Esc closes the list but keeps the text', async ({ page }) => {
  await page.goto('/');
  await field(page).fill('keep my wallet secure');
  await list(page).locator('.help-home-suggestion-title', { hasText: /^How do I keep my wallet secure\?$/ }).click();
  await expect(page.locator('h1')).toHaveText('How do I keep my wallet secure?');

  await page.goto('/');
  await field(page).fill('guardian');
  await expect(list(page)).toBeVisible();
  await field(page).press('Escape');
  await expect(list(page)).toBeHidden();
  await expect(field(page)).toHaveValue('guardian');
});

test('the home page has no eyebrow above its heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Bread Wallet support', { exact: true })).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText('How can we help?');
});
