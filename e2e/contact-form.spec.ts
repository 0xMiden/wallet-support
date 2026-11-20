import { expect, test } from '@playwright/test';
import type { Page, Request, Route } from '@playwright/test';
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

/** The token Cloudflare's always-pass test site key issues (playwright.config.ts). */
const TEST_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
const token = (page: Page) => page.locator('.contact-turnstile input[name="cf-turnstile-response"]');

async function fillRequired(page: Page, verified = true) {
  await page.getByLabel('Feedback type').selectOption('bug');
  await page.locator('#contact-title').fill('Send button stays grey');
  await page.getByLabel('Description', { exact: false }).first().fill('After entering an amount the Send button never turns orange.');
  await page.getByLabel('Platform').selectOption('ios');
  await page.getByLabel('Network').selectOption('mainnet');
  await page.locator('#contact-email').fill('user@example.com');
  if (verified) await expect(token(page)).toHaveValue(TEST_TOKEN);
}

for (const width of [1440, 390]) {
  test(`${width}px: the contact form meets WCAG AA and fits the screen`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Send us your concerns or feedback', level: 1 })).toBeVisible();
    // The widget loaded under the site's CSP: a blocked script or frame would log an error.
    await expect(token(page)).toHaveValue(TEST_TOKEN);
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('the form asks the approved questions, in the approved order', async ({ page }) => {
  await page.goto('/contact');
  const labels = await page.locator('.contact-form .contact-field > label').allTextContents();
  expect(labels).toEqual([
    'Title *', 'Feedback type *', 'Platform *', 'Network *', 'Description *',
    'Email *', 'App version', 'Screenshot or video (optional)',
    'Steps to reproduce', 'Expected result', 'Actual result'
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
  await page.locator('#contact-email').fill('user@example.com');
  await page.getByLabel('Screenshot or video (optional)').setInputFiles('public/bread-wallet-og.png');
  await page.getByRole('button', { name: 'Submit feedback' }).click();

  const sent = page.getByRole('heading', { name: 'Sent. Thanks for your feedback.' });
  await expect(sent).toBeVisible();
  await expect(sent).toBeFocused();
  await expect(page.getByText("We'll reply to user@example.com.")).toBeVisible();

  expect(requests).toHaveLength(1);
  const body = requests[0]!.postData() ?? '';
  for (const field of ['name="type"\r\n\r\nbug', 'name="platform"\r\n\r\nios', 'name="email"\r\n\r\nuser@example.com', 'filename="bread-wallet-og.png"', `name="cf-turnstile-response"\r\n\r\n${TEST_TOKEN}`]) {
    expect(body).toContain(field);
  }
  expect(body).toContain('name="website"\r\n\r\n\r\n');

  await page.getByRole('button', { name: 'Send another report' }).click();
  await expect(page.locator('#contact-title')).toHaveValue('');
});

test('a refused report keeps what was typed and says what to fix', async ({ page }) => {
  await worker(page, 422, { ok: false, error: 'secret' });
  await page.goto('/contact');
  await fillRequired(page);
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('recovery phrase or key');
  await expect(alert).toBeFocused();
  await expect(page.locator('#contact-title')).toHaveValue('Send button stays grey');
});

test('a failed send says so and nothing is lost', async ({ page }) => {
  await page.route(ENDPOINT, route => route.abort());
  await page.goto('/contact');
  await fillRequired(page);
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  await expect(page.getByRole('alert')).toContainText("Your report wasn't sent.");
  await expect(page.locator('#contact-title')).toHaveValue('Send button stays grey');
});

test('a failed or expired verification keeps the draft, and a retry sends with a fresh token', async ({ page }) => {
  const answers = [{ status: 403, body: { ok: false, error: 'bot_check' } }, { status: 200, body: { ok: true } }];
  const requests: Request[] = [];
  await page.route(ENDPOINT, async route => {
    requests.push(route.request());
    const { status, body } = answers[requests.length - 1]!;
    await route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  await page.goto('/contact');
  await fillRequired(page);
  const firstWidget = await token(page).getAttribute('id');
  await page.getByRole('button', { name: 'Submit feedback' }).click();

  const alert = page.getByRole('alert');
  await expect(alert).toHaveText("Verification didn't finish. Send again in a moment. What you entered is still here.");
  await expect(alert).toBeFocused();
  await expect(page.locator('#contact-title')).toHaveValue('Send button stays grey');
  // A token works once: the widget was rendered again and issued a new one.
  await expect(token(page)).toHaveValue(TEST_TOKEN);
  expect(await token(page).getAttribute('id')).not.toBe(firstWidget);
  await expect(token(page)).toHaveCount(1);

  await page.getByRole('button', { name: 'Submit feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Sent. Thanks for your feedback.' })).toBeVisible();
  expect(requests).toHaveLength(2);
  for (const request of requests) expect(request.postData()).toContain(`name="cf-turnstile-response"\r\n\r\n${TEST_TOKEN}`);
});

test('without a token nothing is sent, and the widget loads again for a retry', async ({ page }) => {
  const requests = await worker(page, 200, { ok: true });
  const blocked = (route: Route) => route.abort();
  await page.route('https://challenges.cloudflare.com/**', blocked);
  await page.goto('/contact');
  await fillRequired(page, false);
  await page.getByRole('button', { name: 'Submit feedback' }).click();

  await expect(page.getByRole('alert')).toContainText("Verification didn't finish.");
  await expect(page.locator('#contact-title')).toHaveValue('Send button stays grey');
  expect(requests).toHaveLength(0);

  await page.unroute('https://challenges.cloudflare.com/**', blocked);
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  await expect(token(page)).toHaveValue(TEST_TOKEN);
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Sent. Thanks for your feedback.' })).toBeVisible();
  expect(requests).toHaveLength(1);
});

test('the hidden widget leaves the approved spacing above the button', async ({ page }) => {
  await page.goto('/contact');
  await expect(token(page)).toHaveValue(TEST_TOKEN);
  const gaps = await page.evaluate(() => {
    const bug = document.querySelector('.contact-bug')!.getBoundingClientRect();
    const button = document.querySelector('.contact-submit')!.getBoundingClientRect();
    const card = getComputedStyle(document.querySelector('.contact-card')!).rowGap;
    return { between: button.top - bug.bottom, gap: parseFloat(card) };
  });
  expect(gaps.between).toBe(gaps.gap);
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
  await page.locator('#contact-email').fill('user@example.com');
  await page.getByRole('button', { name: 'Submit feedback' }).click();
  const email = page.locator('#contact-email');
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAttribute('aria-describedby', 'contact-error');
  await expect(page.getByRole('alert')).toHaveText('Check Email and send again.');
});

test('the header leaves out Send feedback on the contact form itself', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('.public-feedback-link')).toHaveCount(0);
  await page.goto('/topics');
  await expect(page.locator('.public-nav .public-feedback-link')).toBeVisible();
});
