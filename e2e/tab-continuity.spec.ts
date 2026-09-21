import { expect, test } from '@playwright/test';

test('primary tabs preserve the shell, animate one grey pill, and support history', async ({ page }) => {
  const documents: string[] = [];
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.push(request.url()); });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const header = await page.locator('.public-header').elementHandle();
  const nav = page.getByRole('navigation', { name: 'Primary navigation', exact: true });
  const initialWidths = await nav.getByRole('link').evaluateAll(links => links.map(link => link.getBoundingClientRect().width));
  for (const label of ['All topics', 'Send feedback', 'Help Center']) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    expect(await header!.evaluate(element => element.isConnected)).toBe(true);
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await nav.getByRole('link').evaluateAll(links => links.map(link => link.getBoundingClientRect().width))).toEqual(initialWidths);
    expect(await nav.getByRole('link', { name: label, exact: true }).evaluate(element => getComputedStyle(element, '::after').content)).toBe('none');
    await expect(nav.locator('[data-slot="motion-highlight"]')).toHaveCount(1);
    expect(await page.locator('main').evaluate(element => {
      let current: Element | null = element;
      while (current) { if (getComputedStyle(current).opacity !== '1') return false; current = current.parentElement; }
      return true;
    })).toBe(true);
  }
  await page.goBack();
  await expect(nav.getByRole('link', { name: 'Send feedback', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(nav.getByRole('link', { name: 'Help Center', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(documents).toHaveLength(1);
});

for (const reduced of [false, true]) {
  test(`selection moves without hiding content, including after scroll (reduced=${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 700));
    const sample = await page.evaluate(async () => {
      const nav = document.querySelector('.public-nav')!;
      const target = nav.querySelector<HTMLAnchorElement>('a[href="/topics"]')!;
      const start = nav.querySelector('[data-slot="motion-highlight"]')!.getBoundingClientRect().x;
      const end = target.getBoundingClientRect().x;
      target.click();
      const frames: { x: number; y: number; opacity: number }[] = [];
      for (let i = 0; i < 35; i++) {
        await new Promise(requestAnimationFrame);
        const pill = target.querySelector('[data-slot="motion-highlight"]') ?? nav.querySelector('[data-slot="motion-highlight"]')!;
        const title = document.querySelector('main h1')!;
        const box = pill.getBoundingClientRect();
        frames.push({ x: box.x, y: box.y, opacity: Number(getComputedStyle(title).opacity) });
      }
      return { start, end, frames, targetY: target.getBoundingClientRect().y, scrollY: window.scrollY };
    });
    expect(sample.frames.every(frame => frame.opacity === 1)).toBe(true);
    expect(sample.scrollY).toBe(0);
    expect(sample.frames.at(-1)!.x).toBeCloseTo(sample.end, 0);
    expect(sample.frames.every(frame => Math.abs(frame.y - sample.targetY) < 2)).toBe(true);
    if (!reduced) expect(sample.frames.some(frame => frame.x > sample.start + 2 && frame.x < sample.end - 2)).toBe(true);
  });
}

test('client-side article links, same-route search and history preserve article routes', async ({ page }) => {
  await page.goto('/topics');
  const header = await page.locator('.public-header').elementHandle();
  await page.getByRole('link', { name: 'How to install Bread Wallet', exact: true }).first().click();
  await expect(page.locator('.help-center-article-body')).toBeVisible();
  await page.getByRole('button', { name: 'Search help articles' }).click();
  await page.getByRole('dialog').getByRole('combobox').fill('recovery phrase');
  const result = page.getByRole('option').first();
  const articleTitle = await result.innerText();
  await result.click();
  await expect(page.locator('#help-center-category-title')).toHaveText(articleTitle.split('\n')[0]!);
  await page.goBack();
  await expect(page.locator('#help-center-category-title')).toHaveText('How to install Bread Wallet');
  expect(await header!.evaluate(element => element.isConnected)).toBe(true);
});


test('search typing retains spaces and the brand clears the URL and results', async ({ page }) => {
  await page.goto('/#setup-and-basic-use');
  const input = page.locator('.help-center-search input');
  await input.pressSequentially('recovery phrase');
  await expect(input).toHaveValue('recovery phrase');
  await page.locator('.public-brand').click();
  await expect(page.locator('.help-center-home')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});


test('article links preserve the platform and tab navigation stays consistent with the URL', async ({ page }) => {
  await page.goto('/?platform=mobile');
  await page.getByRole('link', { name: 'How to install Bread Wallet', exact: true }).first().click();
  await expect(page).toHaveURL(/\?platform=mobile#setup-and-basic-use\/how-to-install-bread-wallet/);
  await expect(page.getByRole('tab', { name: 'Mobile', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.locator('.public-brand').click();
  await page.getByRole('link', { name: 'How to install Bread Wallet', exact: true }).first().click();
  await expect(page.getByRole('tab', { name: 'Extension', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await page.goBack();
  await expect(page.getByRole('tab', { name: 'Mobile', exact: true })).toHaveAttribute('aria-selected', 'true');
});


test('an explicit platform choice stays shareable across touch and desktop devices', async ({ browser, page, baseURL }) => {
  const touchContext = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    const touchPage = await touchContext.newPage();
    await touchPage.goto('/#setup-and-basic-use/how-to-install-bread-wallet');
    await expect(touchPage.getByRole('tab', { name: 'Mobile', exact: true })).toHaveAttribute('aria-selected', 'true');
    await touchPage.getByRole('tab', { name: 'Extension', exact: true }).click();
    await touchPage.getByRole('tab', { name: 'Mobile', exact: true }).click();
    await expect(touchPage).toHaveURL(/platform=mobile/);
    await page.goto(touchPage.url());
    await expect(page.getByRole('tab', { name: 'Mobile', exact: true })).toHaveAttribute('aria-selected', 'true');
  } finally {
    await touchContext.close();
  }
});
