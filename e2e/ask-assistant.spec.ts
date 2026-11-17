import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

/**
 * Bread Assistant in a real browser, built with it switched on
 * (playwright.ask.config.ts). The Worker is not running, so every test answers
 * /api/ask itself and can read what the page sent.
 */

interface Reply {
  readonly status: 'answer' | 'blocked';
  readonly answered?: boolean;
  readonly answer?: string;
  readonly sources?: readonly { id: string; title: string; href: string }[];
  readonly offerSupport?: boolean;
  readonly signature?: string;
}

const RESTORE: Reply = {
  status: 'answer',
  answered: true,
  answer: 'Have your recovery phrase ready. 1. Open Bread. 2. Select Recover your account. 3. Enter the words in order.',
  sources: [{
    id: 'how-do-i-restore-my-wallet-with-a-recovery-phrase',
    title: 'How do I restore my wallet with a recovery phrase?',
    href: '#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase'
  }],
  offerSupport: false,
  signature: 'signed-restore'
};

const UNCOVERED: Reply = {
  status: 'answer',
  answered: false,
  answer: "The Help Center doesn't cover staking on Solana.",
  sources: [],
  offerSupport: true,
  signature: 'signed-uncovered'
};

const GREETING: Reply = {
  status: 'answer',
  answered: false,
  answer: 'Hello! What would you like to know about Bread Wallet?',
  sources: [],
  offerSupport: false,
  signature: 'signed-greeting'
};

/** Answers /api/ask with the replies in turn, and keeps what the page sent. */
async function answer(page: Page, ...replies: Reply[]) {
  const sent: unknown[] = [];
  let next = 0;
  await page.route('**/api/ask', async (route: Route) => {
    sent.push(route.request().postDataJSON());
    const reply = replies[Math.min(next++, replies.length - 1)];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...reply, followUpsLeft: 30 }) });
  });
  return sent;
}

const launcher = (page: Page) => page.getByRole('button', { name: 'Ask a Question' });
const panel = (page: Page) => page.getByRole('dialog', { name: 'Ask a Question' });
const field = (page: Page) => panel(page).getByRole('textbox', { name: 'Your question' });

async function ask(page: Page, question: string) {
  await field(page).fill(question);
  await field(page).press('Enter');
  await expect(panel(page).locator('.help-ask-pending')).toHaveCount(0);
}

test('opens from the launcher with the field focused, and answers with steps and a source link', async ({ page }) => {
  await answer(page, RESTORE);
  await page.goto('/');
  await launcher(page).click();

  await expect(panel(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  await expect(panel(page)).toContainText('Bread Assistant');
  await expect(panel(page)).toContainText('Never share your recovery phrase.');

  await ask(page, 'How do I restore my wallet?');
  const reply = panel(page).locator('.help-ask-answer').last();
  await expect(reply.locator('ol > li')).toHaveCount(3);
  await expect(reply.getByRole('link', { name: 'How do I restore my wallet with a recovery phrase?' }))
    .toHaveAttribute('href', '/#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase');
  await expect(reply.getByRole('link', { name: /Contact Support/ })).toHaveCount(0);
});

test('offers Contact Support only for a Bread Wallet question it cannot answer', async ({ page }) => {
  await answer(page, GREETING, UNCOVERED);
  await page.goto('/');
  await launcher(page).click();

  await ask(page, 'hi');
  await expect(panel(page).getByRole('link', { name: /Contact Support/ })).toHaveCount(0);

  await ask(page, 'Can I stake on Solana?');
  await expect(panel(page).locator('.help-ask-answer').last().getByRole('link', { name: /Contact Support/ })).toBeVisible();
});

test('sends each earlier answer back with its signature', async ({ page }) => {
  const sent = await answer(page, RESTORE, GREETING);
  await page.goto('/');
  await launcher(page).click();
  await ask(page, 'How do I restore my wallet?');
  await ask(page, 'And then?');

  expect(sent[1]).toMatchObject({
    messages: [
      { role: 'user', content: 'How do I restore my wallet?' },
      { role: 'assistant', content: RESTORE.answer, signature: 'signed-restore' },
      { role: 'user', content: 'And then?' }
    ]
  });
});

test('takes a blocked recovery phrase off the screen and out of the conversation', async ({ page }) => {
  const sent = await answer(page, { status: 'blocked' }, GREETING);
  await page.goto('/');
  await launcher(page).click();

  await ask(page, 'abandon ability able about above absent absorb abstract absurd abuse access accident');
  await expect(panel(page).getByRole('alert')).toContainText("wasn't sent");
  await expect(panel(page).locator('.help-ask-question')).toHaveCount(0);

  await ask(page, 'hi');
  expect((sent[1] as { messages: unknown[] }).messages).toEqual([{ role: 'user', content: 'hi' }]);
});

test('minimise keeps the chat; End chat asks first, and only when there is something to lose', async ({ page }) => {
  await answer(page, RESTORE);
  await page.goto('/');

  // Nothing to lose: the cross closes straight away.
  await launcher(page).click();
  await panel(page).getByRole('button', { name: 'End chat' }).click();
  await expect(panel(page)).toBeHidden();
  await expect(launcher(page)).toBeFocused();

  // Minimise keeps the conversation.
  await launcher(page).click();
  await ask(page, 'How do I restore my wallet?');
  await panel(page).getByRole('button', { name: /Minimise/ }).click();
  await launcher(page).click();
  await expect(panel(page).locator('.help-ask-question')).toHaveCount(1);

  // With a conversation, the cross asks. No (and Esc) keeps it.
  const endChat = panel(page).getByRole('button', { name: 'End chat' });
  await endChat.click();
  const confirm = page.getByRole('alertdialog', { name: 'End chat?' });
  await expect(confirm.getByRole('button', { name: 'No' })).toBeFocused();
  await confirm.getByRole('button', { name: 'No' }).click();
  await expect(panel(page).locator('.help-ask-question')).toHaveCount(1);
  await expect(endChat).toBeFocused();

  await endChat.click();
  await page.keyboard.press('Escape');
  await expect(confirm).toHaveCount(0);
  await expect(panel(page)).toBeVisible();

  // Yes clears it, closes the panel, and a reopened panel starts fresh.
  await endChat.click();
  await confirm.getByRole('button', { name: 'Yes' }).click();
  await expect(panel(page)).toBeHidden();
  await launcher(page).click();
  await expect(panel(page).locator('.help-ask-question')).toHaveCount(0);
});

test('puts the question back in the field when the assistant is unavailable', async ({ page }) => {
  await page.route('**/api/ask', route => route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"unavailable"}' }));
  await page.goto('/');
  await launcher(page).click();

  await field(page).fill('How do I restore my wallet?');
  await field(page).press('Enter');
  await expect(panel(page).getByRole('alert')).toContainText("isn't available right now");
  await expect(field(page)).toHaveValue('How do I restore my wallet?');
  await expect(panel(page).locator('.help-ask-question')).toHaveCount(0);
});

test('Esc minimises, keeps the chat, and returns focus to the launcher', async ({ page }) => {
  await answer(page, RESTORE);
  await page.goto('/');
  await launcher(page).click();
  await ask(page, 'How do I restore my wallet?');

  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect(launcher(page)).toBeFocused();
  await launcher(page).click();
  await expect(panel(page).locator('.help-ask-question')).toHaveCount(1);
});

test('keeps the conversation when a cited article is opened', async ({ page }) => {
  await answer(page, RESTORE);
  await page.goto('/');
  await launcher(page).click();
  await ask(page, 'How do I restore my wallet?');

  await panel(page).getByRole('link', { name: 'How do I restore my wallet with a recovery phrase?' }).click();
  await expect(page.locator('h1')).toHaveText('How do I restore my wallet with a recovery phrase?');
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator('.help-ask-question')).toHaveCount(1);
});

test('on a phone the launcher is an icon with a name, and the panel fills the screen', async ({ page }) => {
  await answer(page, RESTORE);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const box = await launcher(page).boundingBox();
  expect(box!.width).toBeLessThanOrEqual(48);
  expect(Math.abs(box!.width - box!.height)).toBeLessThanOrEqual(1);

  await launcher(page).click();
  const sheet = await panel(page).boundingBox();
  expect(sheet).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });

  // A source link steps aside on a phone, so the article is not hidden under the panel.
  await ask(page, 'How do I restore my wallet?');
  await panel(page).getByRole('link', { name: 'How do I restore my wallet with a recovery phrase?' }).click();
  await expect(panel(page)).toBeHidden();
  await expect(page.locator('h1')).toHaveText('How do I restore my wallet with a recovery phrase?');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the open panel and the End chat card pass axe', async ({ page }) => {
  await answer(page, RESTORE);
  await page.goto('/');
  await launcher(page).click();
  await ask(page, 'How do I restore my wallet?');

  const panelAxe = await new AxeBuilder({ page }).include('.help-ask').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(panelAxe.violations.map(v => v.id)).toEqual([]);

  await panel(page).getByRole('button', { name: 'End chat' }).click();
  const cardAxe = await new AxeBuilder({ page }).include('.help-ask-confirm').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(cardAxe.violations.map(v => v.id)).toEqual([]);
});
