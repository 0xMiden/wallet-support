import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The header's search: a round icon after Send feedback that opens a search
 * window over the page. Driven by keyboard where a reader would use one.
 */

const RESULTS = 'section[aria-label="Search results"] h1';
const icon = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Search the Help Center' });

test('opens with the field focused, finds articles as you type, and opens one by keyboard', async ({ page }) => {
  await page.goto('/#security-and-recovery');
  await icon(page).click();

  const dialog = page.getByRole('dialog', { name: 'Search the Help Center' });
  const field = dialog.getByRole('combobox');
  await expect(dialog).toBeVisible();
  await expect(field).toBeFocused();
  await expect(dialog).toContainText('Start typing to search');

  await field.fill('restore');
  const options = dialog.getByRole('option');
  await expect(options.first()).toBeVisible();
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');

  await field.press('ArrowDown');
  const chosen = dialog.getByRole('option', { selected: true });
  await expect(chosen).toHaveAttribute('id', (await options.nth(1).getAttribute('id'))!);
  await expect(field).toHaveAttribute('aria-activedescendant', (await chosen.getAttribute('id'))!);
  const title = await chosen.locator('.public-search-result-title').textContent();

  await field.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText(title!);
});

test('Esc closes it and returns focus to the icon', async ({ page }) => {
  await page.goto('/');
  await icon(page).click();
  await expect(page.getByRole('dialog', { name: 'Search the Help Center' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Search the Help Center' })).toHaveCount(0);
  await expect(icon(page)).toBeFocused();
});

test('says so when nothing matches', async ({ page }) => {
  await page.goto('/');
  await icon(page).click();
  await page.getByRole('combobox').fill('zzqx');
  await expect(page.getByRole('dialog')).toContainText('No articles match “zzqx”');
  await expect(page.getByRole('option')).toHaveCount(0);
});

test('an article opened from it leaves an earlier search behind', async ({ page }) => {
  await page.goto('/?q=guardian');
  await expect(page.locator(RESULTS)).toContainText('for “guardian”');

  await icon(page).click();
  await page.getByRole('combobox').fill('keep my wallet secure');
  await page.locator('.public-search-result-title', { hasText: /^How do I keep my wallet secure\?$/ }).click();

  await expect(page.locator(RESULTS)).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText('How do I keep my wallet secure?');
  await expect(page).not.toHaveURL(/q=/);
});

test('works from All topics, which is a separate page', async ({ page }) => {
  await page.goto('/topics');
  await icon(page).click();
  await page.getByRole('combobox').fill('restore my wallet with a recovery phrase');
  await page.getByRole('combobox').press('Enter');

  await expect(page).toHaveURL(/\/#security-and-recovery\/how-do-i-restore-my-wallet-with-a-recovery-phrase$/);
  await expect(page.locator('h1')).toHaveText('How do I restore my wallet with a recovery phrase?');
});

test('sits beside the menu button on a phone, and its window passes axe', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#security-and-recovery');
  await expect(icon(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open site navigation' })).toBeVisible();

  await icon(page).click();
  await page.getByRole('combobox').fill('guardian');
  await expect(page.getByRole('option').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const axe = await new AxeBuilder({ page }).include('.public-search-dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations.map(v => v.id)).toEqual([]);
});

test('picking the article already open still ends an earlier search', async ({ page }) => {
  // No hashchange fires for the same address, so the dialog announces the move itself.
  await page.goto('/?q=restore#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase');
  await expect(page.locator(RESULTS)).toContainText('for “restore”');

  await icon(page).click();
  await page.getByRole('combobox').fill('restore my wallet with a recovery phrase');
  await page.getByRole('combobox').press('Enter');

  await expect(page.locator(RESULTS)).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText('How do I restore my wallet with a recovery phrase?');
});

test('the field shows its focus, and a screen reader hears the count', async ({ page }) => {
  await page.goto('/');
  await icon(page).click();
  const pill = page.locator('.public-search-field');
  expect(await pill.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none');

  const status = page.getByRole('dialog').getByRole('status');
  await page.getByRole('combobox').fill('guardian');
  await expect(status).toHaveText(/^\d+ results?$/);
  await page.getByRole('combobox').fill('zzqx');
  await expect(status).toHaveText('No results');
  await expect(page.getByRole('region', { name: 'Search results' })).toBeVisible();
});

test('emptying the results-page field moves focus to the page, not to nowhere', async ({ page }) => {
  await page.goto('/?q=guardian#setup-and-basic-use');
  await page.locator('.help-center-search input').fill('');
  await expect(page.locator(RESULTS)).toHaveCount(0);
  await expect(page.locator('#help-center-content')).toBeFocused();
});
