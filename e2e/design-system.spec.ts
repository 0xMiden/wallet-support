import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/topics', '/feedback', '/#setup-and-basic-use/how-to-install-bread-wallet'];

test('command search supports keyboard navigation, empty state, and focus restoration', async ({
  page
}) => {
  await page.goto('/topics');
  const trigger = page.getByRole('button', { name: 'Search help articles' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole('combobox');
  await expect(search).toBeFocused();
  await search.fill('unmatchable-xyz');
  await expect(dialog.getByText('No articles found')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Control+k');
  await search.fill('How to install Bread Wallet');
  await search.press('ArrowDown');
  await search.press('ArrowUp');
  await search.press('Enter');
  await expect(page).toHaveURL(/#setup-and-basic-use\/how-to-install-bread-wallet/);
  await expect(page.locator('.help-center-article-body')).toBeVisible();
});

test('mobile navigation traps focus, closes with Escape, and reaches Topics', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open site navigation' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('link', { name: 'All topics', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'All topics', exact: true })).toBeVisible();
});

test('mobile article drawer preserves the route and returns focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#setup-and-basic-use');
  const trigger = page.getByRole('button', { name: 'Open article navigation' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('dialog').getByRole('link', { name: 'Glossary', exact: true }).click();
  await expect(page).toHaveURL(/#glossary$/);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('platform control follows the Radix arrow-key pattern', async ({ page }) => {
  await page.goto('/#setup-and-basic-use');
  await page.getByRole('tab', { name: 'Extension', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Mobile', exact: true })).toBeFocused();
  await expect(page).toHaveURL(/platform=mobile/);
});

test('topics filter has a recoverable empty state', async ({ page }) => {
  await page.goto('/topics');
  await page.getByRole('searchbox', { name: 'Filter topics' }).fill('zzzzz');
  await expect(page.getByRole('heading', { name: 'No matching topics' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filter' }).click();
  await expect(page.locator('.all-topics-subcategory a').first()).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`all page types remain accessible and fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // External verification is audited independently; avoid a third-party iframe in the page audit.
    await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        route
      ).toBeLessThanOrEqual(width);
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() =>
          page
            .locator('main [style]')
            .evaluateAll((elements) =>
              elements.every((element) => getComputedStyle(element).opacity === '1')
            )
        )
        .toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        result.violations.map((item) => ({
          id: item.id,
          nodes: item.nodes.map((node) => node.target)
        })),
        route
      ).toEqual([]);
    }
  });
}

test('reduced motion disables entrance transforms and dialog animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(
    await page
      .getByRole('heading', { name: 'How can we help?' })
      .evaluate((element) => getComputedStyle(element.closest('[style]') ?? element).transform)
  ).toBe('none');
  await page.getByRole('button', { name: 'Search help articles' }).click();
  const duration = await page
    .getByRole('dialog')
    .evaluate((element) => parseFloat(getComputedStyle(element).animationDuration));
  expect(duration).toBeLessThan(0.01);
});

test('feedback retains failed input, retries with fresh verification, and shows a receipt', async ({
  page
}) => {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `let count=0; window.turnstile={render:(element,options)=>{const id=String(++count);queueMicrotask(()=>options.callback('test-token-'+id));return id},remove:()=>{}};`
    })
  );
  const tokens: string[] = [];
  let submits = 0;
  await page.route('**/api/feedback/submit', async (route) => {
    const body = route.request().postData() ?? '';
    tokens.push(body.match(/test-token-\d+/)?.[0] ?? 'missing');
    submits++;
    await route.fulfill({
      status: submits === 1 ? 503 : 200,
      json:
        submits === 1
          ? { error: 'Please try again.' }
          : { ok: true, submission_id: 'test', status: 'received' }
    });
  });
  await page.route('**/api/feedback/status?*', (route) =>
    route.fulfill({ json: { repo: '0xMiden/wallet', results: {} } })
  );
  await page.goto('/feedback');
  await page.getByRole('combobox', { name: 'Platform', exact: true }).click();
  await page.getByRole('option', { name: 'Extension', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Preview feedback test');
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('A test of the feedback interaction and status display.');
  const submit = page.getByRole('button', { name: 'Send feedback', exact: true });
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText('Please try again.');
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
    'Preview feedback test'
  );
  await submit.click();
  await expect(page.getByRole('status')).toContainText('We’ve received your feedback');
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('');
  await expect(
    page.getByRole('complementary', { name: 'Your reports' }).getByText('Preview feedback test')
  ).toBeVisible();
  expect(tokens).toHaveLength(2);
  expect(tokens[0]).not.toBe('missing');
  expect(tokens[1]).not.toBe(tokens[0]);
});
