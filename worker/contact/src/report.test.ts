import { describe, expect, it } from 'vitest';

import {
  GITHUB_NEW_ISSUE,
  MAX_ISSUE_URL,
  MAX_SCREENSHOT_BYTES,
  SHORTENED_NOTE,
  escapeHtml,
  githubIssueUrl,
  parseReport,
  supportEmail,
  type Report,
} from './report';

function form(fields: Record<string, string | File>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.append(name, value);
  return data;
}

const minimal = { type: 'bug', title: 'Send button stays grey', description: 'After entering an amount the Send button never turns orange.', platform: 'ios', network: 'mainnet', email: 'user@example.com' };

async function report(fields: Record<string, string | File> = {}): Promise<Report> {
  const result = await parseReport(form({ ...minimal, ...fields }));
  if ('error' in result) throw new Error(`unexpected ${JSON.stringify(result)}`);
  return result;
}

describe('parseReport', () => {
  it('accepts the six required fields alone', async () => {
    const result = await report();
    expect(result).toMatchObject({ type: 'bug', title: minimal.title, platform: 'ios', network: 'mainnet', email: 'user@example.com', steps: '', screenshot: null });
  });

  it.each(['type', 'title', 'description', 'platform', 'network', 'email'])('requires %s', async (field) => {
    const result = await parseReport(form({ ...minimal, [field]: '  ' }));
    expect(result).toEqual({ error: 'invalid', field });
  });

  it('accepts every listed option and rejects others', async () => {
    for (const type of ['bug', 'feature', 'suggestion', 'general']) expect(await report({ type })).toMatchObject({ type });
    for (const platform of ['ios', 'android', 'extension']) expect(await report({ platform })).toMatchObject({ platform });
    for (const network of ['mainnet', 'testnet']) expect(await report({ network })).toMatchObject({ network });
    expect(await parseReport(form({ ...minimal, type: 'praise' }))).toEqual({ error: 'invalid', field: 'type' });
    expect(await parseReport(form({ ...minimal, platform: 'windows' }))).toEqual({ error: 'invalid', field: 'platform' });
    expect(await parseReport(form({ ...minimal, network: 'devnet' }))).toEqual({ error: 'invalid', field: 'network' });
  });

  it('rejects a malformed email and an over-long title', async () => {
    expect(await parseReport(form({ ...minimal, email: 'not an email' }))).toEqual({ error: 'invalid', field: 'email' });
    expect(await parseReport(form({ ...minimal, title: 'x'.repeat(121) }))).toEqual({ error: 'invalid', field: 'title' });
  });

  it('refuses a recovery phrase anywhere in the prose', async () => {
    const phrase = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    expect(await parseReport(form({ ...minimal, steps: `My words are ${phrase}` }))).toEqual({ error: 'secret' });
    expect(await parseReport(form({ ...minimal, description: `key 0x${'ab'.repeat(32)}` }))).toEqual({ error: 'secret' });
  });

  it('keeps an ordinary twelve-word sentence', async () => {
    await expect(report({ description: 'when i open the app it shows a blank white screen every single time' })).resolves.toBeTruthy();
  });

  it('accepts a PNG screenshot and renames an unsafe filename', async () => {
    const result = await report({ screenshot: new File([new Uint8Array([1, 2, 3])], '../../etc/<x>', { type: 'image/png' }) });
    expect(result.screenshot).toMatchObject({ type: 'image/png', name: 'screenshot.png' });
    expect(result.screenshot?.content.byteLength).toBe(3);
  });

  it('accepts a screen recording and names the attachment by its kind', async () => {
    for (const [type, name] of [['video/mp4', 'video.mp4'], ['video/quicktime', 'video.mov'], ['video/webm', 'video.webm']]) {
      const result = await report({ screenshot: new File(['x'], '<bad>', { type }) });
      expect(result.screenshot).toMatchObject({ type, name });
      const url = new URL(githubIssueUrl(result));
      expect(url.searchParams.get('body')).toContain('A video is attached to the support email.');
      expect(supportEmail(result).text).toContain('Attachment: video attached.');
    }
  });

  it('rejects other file types and files over the size limit', async () => {
    expect(await parseReport(form({ ...minimal, screenshot: new File(['x'], 'a.gif', { type: 'image/gif' }) }))).toEqual({ error: 'invalid', field: 'screenshot' });
    const big = new File([new Uint8Array(MAX_SCREENSHOT_BYTES + 1)], 'big.png', { type: 'image/png' });
    expect(await parseReport(form({ ...minimal, screenshot: big }))).toEqual({ error: 'too_large' });
  });
});

describe('githubIssueUrl', () => {
  it('fills the title and body and carries no name, email or label', async () => {
    const url = new URL(githubIssueUrl(await report({ email: 'user@example.com', platform: 'ios', version: '1.16.1' })));
    expect(`${url.origin}${url.pathname}`).toBe(GITHUB_NEW_ISSUE);
    expect(url.searchParams.get('title')).toBe(minimal.title);
    expect(url.searchParams.get('body')).toContain('**Platform**\niOS');
    expect(url.searchParams.get('body')).toContain('**App version**\n1.16.1');
    expect(url.toString()).not.toContain('example.com');
    expect(url.searchParams.has('labels')).toBe(false);
  });

  it('shortens a long report to fit, without splitting characters', async () => {
    const long = await report({ description: 'Ünïcødé 🐞 line\n'.repeat(250) });
    const url = githubIssueUrl(long);
    expect(url.length).toBeLessThanOrEqual(MAX_ISSUE_URL);
    const body = new URL(url).searchParams.get('body') ?? '';
    expect(body.endsWith(SHORTENED_NOTE)).toBe(true);
    expect(body).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });
});

describe('supportEmail', () => {
  it('sets Reply-To to the reporter and attaches the screenshot', async () => {
    const email = supportEmail(await report({ email: 'user@example.com', screenshot: new File(['x'], 'shot.jpg', { type: 'image/jpeg' }) }));
    expect(email.replyTo).toBe('user@example.com');
    expect(email.subject).toBe('[Bug] Send button stays grey');
    expect(email.attachments).toEqual([expect.objectContaining({ filename: 'shot.jpg', type: 'image/jpeg', disposition: 'attachment' })]);
    expect(email.html).toContain('Open as GitHub issue');
  });

  it('escapes user text in the HTML and keeps the subject on one line', async () => {
    const email = supportEmail(await report({ title: 'Broken <img src=x onerror=alert(1)>\r\nBcc: x@y.z' }));
    expect(email.html).not.toContain('<img');
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(escapeHtml(`"'&<>`)).toBe('&quot;&#39;&amp;&lt;&gt;');
  });
});
