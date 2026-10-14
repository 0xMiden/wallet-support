import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/topics', '/feedback', '/#setup-and-basic-use', '/#security-and-recovery/how-do-i-keep-my-wallet-secure', '/#glossary'];

for (const width of [1440, 390]) {
  test(`${width}px: public help pages meet WCAG AA and load without errors`, async ({ page }) => {
    const errors: string[]=[];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({width,height:900});
    for (const path of pages) {
      await page.goto(path);
      await page.locator('h1').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      expect(result.violations.map(v => ({id:v.id, nodes:v.nodes.map(n=>n.target)})),path).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),path).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test('uses the current wallet palette and correctly loaded font roles', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('h1')).toHaveCSS('font-family', /Nunito/);
  await expect(page.locator('h1')).toHaveCSS('font-weight', '800');
  await expect(page.locator('.help-home-lede')).toHaveCSS('font-family', /Inter/);
  await expect(page.locator('.help-home-lede')).toHaveCSS('font-weight', '400');
  await expect(page.locator('.help-home-search-form')).toHaveCSS('background-color','rgb(243, 240, 236)');
  await expect(page.locator('.help-home-search-submit')).toHaveCSS('background-color','rgb(231, 117, 55)');
  await expect(page.locator('h1')).toHaveCSS('color','rgb(63, 63, 63)');
  expect(await page.evaluate(() => document.fonts.check('800 24px Nunito') && document.fonts.check('400 16px Inter'))).toBe(true);
  await page.goto('/#security-and-recovery/how-do-i-keep-my-wallet-secure');
  await expect(page.locator('.help-center-article-body')).toHaveCSS('font-family', /Inter/);
  await expect(page.locator('.help-center-article-body')).toHaveCSS('font-weight','400');
  await expect(page.locator('.help-center-desktop-brand')).toBeHidden();
  await expect(page.getByRole('searchbox')).toHaveCount(1);
});

test('Radix site menu traps focus, closes with Escape, and returns focus to its trigger', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const trigger = page.getByRole('button',{name:'Open site navigation'});
  await trigger.click();
  const dialog = page.getByRole('dialog',{name:'Help Center'});
  await expect(dialog).toBeVisible();
  const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(axe.violations.map(v => v.id)).toEqual([]);
  for (let i=0;i<8;i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('link',{name:'All topics',exact:true}).click();
  await expect(page).toHaveURL(/\/topics$/);
  await expect(page.getByRole('heading',{name:'All topics',exact:true})).toBeVisible();
});

test('Radix help drawer traps focus and is dismissed by a selected help page', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#setup-and-basic-use');
  const trigger=page.getByRole('button',{name:'Open navigation',exact:true});
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'Browse help',exact:true});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Getting started',exact:true})).toHaveCSS('border-top-width','0px');
  await expect(dialog.getByRole('link',{name:'Setup and basic use',exact:true})).toHaveCSS('text-decoration-line','none');
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(axe.violations.map(v => v.id)).toEqual([]);
  for (let i=0;i<15;i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button',{name:'Guardian',exact:true}).click();
  await dialog.getByRole('link',{name:'Guardian protection',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('h1')).toHaveText('Guardian protection');
});

test('Radix platform tabs operate with arrow keys and only the selected guide is shown', async ({ page }) => {
  await page.goto('/#setup-and-basic-use/how-to-install-bread-wallet');
  const extension=page.getByRole('tab',{name:'Extension',exact:true});
  await extension.focus();
  await page.keyboard.press('ArrowRight');
  const mobile=page.getByRole('tab',{name:'Mobile',exact:true});
  await expect(mobile).toBeFocused();
  await expect(mobile).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.help-center-article-body')).toContainText('App Store');
  await page.keyboard.press('ArrowLeft');
  await expect(extension).toBeFocused();
  await expect(extension).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.help-center-article-body')).toContainText('Chrome');
});

test('breakpoint and text zoom sweeps retain usable chrome, search, and article controls', async ({ page }) => {
  for (const width of [320,375,390,619,620,621,739,740,741,899,900,901,999,1000,1001,1440,1920]) {
    await page.setViewportSize({width,height:900});
    for (const path of ['/', '/#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase']) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`${width} ${path}`).toBe(true);
      await expect(page.locator('.public-brand')).toBeVisible();
      await expect(page.getByRole('searchbox')).toBeVisible();
    }
  }
  await page.setViewportSize({width:1440,height:900});
  for (const path of pages) {
    await page.goto(path);
    await page.evaluate(() => { document.documentElement.style.fontSize='200%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`200% ${path}`).toBe(true);
    await expect(page.locator('h1').first()).toBeVisible();
  }
});


test('mobile articles reach the answer without a blank band after search', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/#security-and-recovery/how-do-i-keep-my-wallet-secure');
  const search=await page.locator('.help-center-search').boundingBox();
  const back=await page.locator('.help-center-back').boundingBox();
  expect(search).not.toBeNull();
  expect(back).not.toBeNull();
  expect(back!.y - search!.y - search!.height).toBeLessThanOrEqual(36);
  const title=await page.locator('h1').boundingBox();
  expect(title!.y+title!.height).toBeLessThan(500);
});
