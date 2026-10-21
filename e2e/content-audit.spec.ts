import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FEEDBACK = 'https://cmuv78o9w003x5ebpyha3cf6p.zapier.app/page';
const directory = new URL('../src/help-center/content/', import.meta.url).pathname;
const articles = [...readdirSync(directory)].sort().map(file => {
  const source = readFileSync(join(directory, file), 'utf8');
  const field = (key: string) => source.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1] ?? '';
  return { file, id: field('id'), title: field('title'), sub: field('subcategory'),
    hidden: field('hidden') === 'true', platforms: field('platforms') };
}).filter(article => !article.hidden);

for (const { width, platform } of [
  { width: 1440, platform: 'extension-desktop' },
  { width: 390, platform: 'mobile' }
]) {
  test(`every public ${platform} article renders, fits and resolves feedback links`, async ({ page, context }, testInfo) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const request = route.request();
      if (!['GET', 'HEAD'].includes(request.method())) {
        writes.push(request.url());
        await route.abort();
      } else if (!request.url().startsWith('http://localhost:4318/')) await route.abort();
      else await route.continue();
    });
    await page.setViewportSize({ width, height: 900 });
    const applicable = articles.filter(article => article.platforms.includes(platform));
    expect(articles).toHaveLength(63);
    for (const article of applicable) {
      await page.goto(`/?platform=${platform}#${article.sub}/${article.id}`);
      await expect(page.locator('#help-center-category-title'), article.id).toHaveText(article.title);
      const body = page.locator('.help-center-article-body');
      await expect(body, article.id).toBeVisible();
      expect((await body.innerText()).length, article.id).toBeGreaterThan(30);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), article.id).toBeLessThanOrEqual(0);
      await expect(page.locator('.public-feedback-link')).toHaveAttribute('href', FEEDBACK);
      await expect(body.locator('a[href="/feedback"]')).toHaveCount(0);
      for (const link of await body.locator('a').all()) {
        const href = await link.getAttribute('href') ?? '';
        expect(href, article.id).not.toContain('miden-feedback-relay.workers.dev');
        if (href === FEEDBACK) await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
      if (Number(article.file.slice(0, 2)) >= 59) await page.screenshot({ path: testInfo.outputPath(`${width}-${article.id}.png`), fullPage: true });
    }
    for (const path of ['/', '/topics', '/feedback']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBeLessThanOrEqual(0);
      await page.screenshot({ path: testInfo.outputPath(`${width}-${path === '/' ? 'home' : path.slice(1)}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });

  test(`feedback header and compatibility button navigate safely at ${width}px`, async ({ page, context }) => {
    await context.route(`${FEEDBACK}**`, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Mock feedback destination</h1>' }));
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/topics', '/feedback', '/#common-issues-and-support/how-do-i-send-feedback-or-report-a-problem']) {
      await page.goto(path);
      if (width <= 900) await page.getByRole('button', { name: 'Open site navigation' }).click();
      const header = width <= 900 ? page.getByRole('dialog').locator('.public-feedback-link') : page.locator('.public-feedback-link');
      await header.focus();
      await expect(header).toBeFocused();
      const popupPromise = page.waitForEvent('popup');
      await page.keyboard.press('Enter');
      const popup = await popupPromise;
      await expect(popup).toHaveURL(FEEDBACK);
      await expect(popup.getByRole('heading')).toHaveText('Mock feedback destination');
      await popup.close();
    }
    await page.goto('/feedback');
    const button = page.getByRole('link', { name: 'Submit feedback', exact: true });
    await button.focus();
    await expect(button).toBeFocused();
    const popupPromise = page.waitForEvent('popup');
    await page.keyboard.press('Enter');
    const popup = await popupPromise;
    await expect(popup).toHaveURL(FEEDBACK);
    await expect(page.locator('form.feedback-form')).toHaveCount(0);
  });
}
