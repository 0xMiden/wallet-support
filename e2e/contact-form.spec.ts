import { expect, test } from '@playwright/test';
import type { Page, Request } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ENDPOINT = 'https://contact.miden.xyz/';

/** Answers for the contact Worker, which does not exist in the test run. */
async function worker(page: Page, status: number, body: unknown): Promise<Request[]> {
  const requests: Request[] = [];
  await page.route(ENDPOINT, async route => {
    requests.push(route.request());
    await route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  return requests;
}

async function fillRequired(page: Page) {
  await page.getByLabel('Feedback type').selectOption('bug');
  await page.getByLabel('Short title').fill('Send button stays grey');
  await page.getByLabel('Description', { exact: false }).first().fill('After entering an amount the Send button never turns orange.');
  await page.getByLabel('Platform').selectOption('ios');
  await page.getByLabel('Network').selectOption('mainnet');
  await page.getByLabel('Contact email').fill('user@example.com');
}

for (const width of [1440, 390]) {
  test(`${width}px: the contact form meets WCAG AA and fits the screen`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Send us your concerns and feedback', level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('the form asks the same questions as the hosted form, in the same order', async ({ page }) => {
  await page.goto('/contact');
  const labels = await page.locator('.contact-form .contact-field > label').allTextContents();
  expect(labels).toEqual([
    'Feedback type (required)', 'Short title (required)', 'Description (required)',
    'Steps to reproduce', 'Expected result', 'Actual result',
    'Platform (required)', 'App version', 'Network (required)', 'Screenshot (optional)', 'Contact email (required)'
  ]);
  expect(await page.getByLabel('Feedback type').locator('option:not([disabled])').allTextContents()).toEqual(['Bug', 'Feature', 'Suggestion', 'General']);
  expect(await page.getByLabel('Platform').locator('option').allTextContents()).toEqual(['Select platform', 'iOS', 'Android', 'Chrome extension']);
  expect(await page.getByLabel('Network').locator('option').allTextContents()).toEqual(['Select network', 'Mainnet', 'Testnet']);
});

test('a sent report reaches the Worker and the page confirms it', async ({ page }) => {
  const requests = await worker(page, 200, { ok: true });
  await page.goto('/contact');
  await fillRequired(page);
  await page.getByLabel('Platform').selectOption('ios');
  await page.getByLabel('Contact email').fill('user@example.com');
  await page.getByLabel('Screenshot (optional)').setInputFiles('public/bread-wallet-og.png');
  await page.getByRole('button', { name: 'Submit feedback' }).click();

  const sent = page.getByRole('heading', { name: 'Sent. Thanks for your feedback.' });
  await expect(sent).toBeVisible();
  await expect(sent).toBeFocused();
  await expect(page.getByText("We'll reply to user@example.com.")).toBeVisible();

  expect(requests).toHaveLength(1);
  const body = requests[0]!.postData() ?? '';
  for (const field of ['name="type"\r\n\r\nbug', 'name="platform"\r\n\r\nios', 'name="email"\r\n\r\nuser@example.com', 'filename="bread-wallet-og.png"']) {
    expect(body).toContain(field);
  }
  expect(body).toContain('name="website"\r\n\r\n\r\n');

  await page.getByRole('button', { name: 'Send another report' }).click();
  await expect(page.getByLabel('Short title')).toHaveValue('');
});

test('a refused report keeps what was typed and says what to fix', async ({ page }) => {
  await worker(page, 422, { ok: false, error: 'secret' });
  await page.goto('/contact');
  await fillRequired(page);
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('recovery phrase or key');
  await expect(alert).toBeFocused();
  await expect(page.getByLabel('Short title')).toHaveValue('Send button stays grey');
});

test('a failed send says so and nothing is lost', async ({ page }) => {
  await page.route(ENDPOINT, route => route.abort());
  await page.goto('/contact');
  await fillRequired(page);
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  await expect(page.getByRole('alert')).toContainText("Your report wasn't sent.");
  await expect(page.getByLabel('Short title')).toHaveValue('Send button stays grey');
});

test('the browser requires the required fields before sending', async ({ page }) => {
  const requests = await worker(page, 200, { ok: true });
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  expect(requests).toHaveLength(0);
  expect(await page.getByLabel('Feedback type').evaluate(el => (el as HTMLSelectElement).validity.valid)).toBe(false);
});

test('a field the Worker rejects is marked, described and focused', async ({ page }) => {
  await worker(page, 400, { ok: false, error: 'invalid', field: 'email' });
  await page.goto('/contact');
  await fillRequired(page);
  await page.getByLabel('Contact email').fill('user@example.com');
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  const email = page.getByLabel('Contact email');
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAttribute('aria-describedby', 'contact-error');
  await expect(page.getByRole('alert')).toHaveText('Check Contact email and send again.');
});
