import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PUBLIC_MEDIA_CSP } from '../worker/feedback/src/lib/support-csp';

const screenshot = (name = 'screen.png') => ({
  name, mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aC1sAAAAASUVORK5CYII=', 'base64')
});
const video = { name: 'recording.mp4', mimeType: 'video/mp4', buffer: Buffer.from(readFileSync(fileURLToPath(new URL('./fixtures/feedback-video.mp4', import.meta.url)))) };

test.beforeEach(async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.turnstile={render:(element,options)=>{queueMicrotask(()=>options.callback('test-token'));return 'test'},remove:()=>{}};`
  }));
  await page.route('**/api/feedback/status?*', route => route.fulfill({json:{repo:'0xMiden/wallet',results:{}}}));
  await page.goto('/feedback');
});

test('media can be previewed, removed, retried, and submitted together', async ({ page }) => {
  const files = page.locator('input[type=file]');
  await files.setInputFiles([screenshot(), video]);
  await expect(page.getByRole('img', { name: 'Preview of screen.png' })).toBeVisible();
  await expect(page.locator('video[aria-label="Preview of recording.mp4"]')).toBeVisible();
  await expect.poll(() => page.locator('video').evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
  await page.getByRole('button', { name: 'Remove screen.png' }).click();
  await expect(page.getByRole('img', { name: 'Preview of screen.png' })).toHaveCount(0);
  await files.setInputFiles(screenshot());
  const payloads: string[][] = [];
  await page.route('**/api/feedback/submit', async route => {
    const request = route.request();
    const parsed = await new Request(request.url(), {method:'POST',headers:request.headers(),body:new Uint8Array(request.postDataBuffer()!)}).formData();
    payloads.push(parsed.getAll('attachment').map(file => (file as File).name));
    await route.fulfill(payloads.length === 1
      ? {status:503,json:{error:'Please try again.'}}
      : {status:202,json:{ok:true,submission_id:parsed.get('submission_id'),status:'received'}});
  });
  await page.getByRole('combobox', { name: 'Platform', exact: true }).click();
  await page.getByRole('option', { name: 'Extension', exact: true }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Visual feedback test');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('The wallet screen looks different after clicking receive.');
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Please try again.');
  await expect(page.getByRole('button', { name: 'Remove recording.mp4' })).toBeVisible();
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('We’ve received your feedback');
  await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(0);
  expect(payloads).toEqual([['recording.mp4','screen.png'],['recording.mp4','screen.png']]);
});

test('the uploader rejects unsupported files and count/combined-size overflow', async ({ page }) => {
  const files = page.locator('input[type=file]');
  await files.setInputFiles({name:'script.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
  await expect(page.getByRole('alert')).toContainText('PNG, JPEG, or MP4');
  await files.setInputFiles([screenshot('one.png'),screenshot('two.png'),screenshot('three.png'),screenshot('four.png')]);
  await expect(page.getByRole('alert')).toContainText('3 files');
  await files.setInputFiles([
    {name:'one.png',mimeType:'image/png',buffer:Buffer.alloc(6*1024*1024)},
    {name:'two.png',mimeType:'image/png',buffer:Buffer.alloc(6*1024*1024)}
  ]);
  await expect(page.getByRole('alert')).toContainText('10 MB');
  await expect(page.getByRole('button', { name: /^Remove / })).toHaveCount(0);
});

test('pasted screenshots stay local and previews work under CSP and keyboard navigation', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', message => { if (/Content Security Policy|Content-Security-Policy/i.test(message.text())) violations.push(message.text()); });
  const zone = page.getByRole('textbox', { name: 'Description', exact: true });
  await zone.evaluate((element, bytes) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(bytes)], 'pasted.png', {type:'image/png'}));
    element.dispatchEvent(new ClipboardEvent('paste', {bubbles:true,clipboardData:data}));
  }, [...screenshot().buffer]);
  const image = page.getByRole('img', { name: 'Preview of pasted.png' });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const view = page.getByRole('button', { name: 'View pasted.png', exact: true });
  await view.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(view).toBeFocused();
  await page.getByRole('button', { name: 'Remove pasted.png' }).focus();
  await page.keyboard.press('Enter');
  await expect(image).toHaveCount(0);
  expect(violations).toEqual([]);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
});


test('a published video link plays in the browser under the media policy', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', message => {
    if (/Content Security Policy|Content-Security-Policy/i.test(message.text())) violations.push(message.text());
  });
  await page.route('**/api/feedback/media/test/recording.mp4', route => route.fulfill({
    body: video.buffer,
    headers: {
      'content-type': 'video/mp4',
      'content-security-policy': PUBLIC_MEDIA_CSP,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store'
    }
  }));
  await page.goto('/api/feedback/media/test/recording.mp4');
  const player = page.locator('video');
  await expect(player).toBeVisible();
  await expect.poll(() => player.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
  await expect.poll(() => player.evaluate(element => (element as HTMLVideoElement).duration)).toBe(1);
  expect(violations).toEqual([]);
});
