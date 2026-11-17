import { expect, test } from '@playwright/test';

/**
 * Bread Assistant ships switched off. This suite runs on the normal build, so
 * if VITE_ASK_ENABLED were ever left on (an env file, a CI variable), these
 * fail before the assistant reaches visitors.
 */

test('the shipped build has no assistant, and nothing points to one', async ({ page }) => {
  for (const path of ['/', '/#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase']) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ask a Question' }), path).toHaveCount(0);
    await expect(page.locator('.help-ask, .help-ask-launcher'), path).toHaveCount(0);
  }

  // The search's no-results message mentions the assistant only when it exists.
  await page.goto('/');
  await page.getByRole('button', { name: 'Search the Help Center' }).click();
  await page.getByRole('combobox').fill('zzqx');
  await expect(page.getByRole('dialog')).toContainText('No articles match “zzqx”. Try another word.');
  await expect(page.getByRole('dialog')).not.toContainText('Bread Assistant');
});
