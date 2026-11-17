/**
 * A Help Center contact report: parsing, checking, and turning it into the
 * support email. Pure functions only, so every rule here is unit-tested
 * without a Worker runtime.
 *
 * The fields and their labels follow the hosted form this replaces, so the
 * team reads the same report they read today.
 */

import { BIP39 } from '../../feedback/src/lib/bip39';
import { detectHexKey, detectWalletArtifacts } from '../../feedback/src/lib/secret-scan';

/** Shortest recovery phrase the wallet's standard allows. */
const PHRASE_WORDS = 12;

/**
 * True when the text holds a recovery phrase or key. Unlike the feedback
 * service's exact-length check, a phrase is caught inside a sentence too:
 * any run of 12 or more consecutive recovery-phrase words counts. Ordinary
 * prose rarely gets there, because short words such as "a" and "I" are not on
 * the list and break the run.
 */
export function containsSecret(text: string): boolean {
  let run = 0;
  for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    run = BIP39.has(word) ? run + 1 : 0;
    if (run >= PHRASE_WORDS) return true;
  }
  return detectHexKey(text) !== null || detectWalletArtifacts(text) !== null;
}

export const FEEDBACK_TYPES = { bug: 'Bug', feature: 'Feature', suggestion: 'Suggestion', general: 'General' } as const;
export const PLATFORMS = { ios: 'iOS', android: 'Android', extension: 'Chrome extension' } as const;
export const NETWORKS = { mainnet: 'Mainnet', testnet: 'Testnet' } as const;

export type FeedbackType = keyof typeof FEEDBACK_TYPES;

/** Longest accepted value for each text field, in characters. */
export const LIMITS = {
  title: 120,
  description: 5000,
  steps: 2000,
  expected: 2000,
  actual: 2000,
  version: 40,
  email: 254,
} as const;

/**
 * 15 MB for a screenshot or a short screen recording. Base64 adds about a
 * third, which keeps the email inside Cloudflare's 25 MiB message limit.
 */
export const MAX_SCREENSHOT_BYTES = 15 * 1024 * 1024;

/** Accepted attachment types, with the extension used when the filename is unusable. */
const ATTACHMENT_EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
} as const;
export const SCREENSHOT_TYPES = Object.keys(ATTACHMENT_EXTENSIONS) as ReadonlyArray<keyof typeof ATTACHMENT_EXTENSIONS>;

export interface Screenshot {
  name: string;
  type: string;
  content: ArrayBuffer;
}

export interface Report {
  type: FeedbackType;
  title: string;
  description: string;
  steps: string;
  expected: string;
  actual: string;
  platform: keyof typeof PLATFORMS;
  version: string;
  network: keyof typeof NETWORKS;
  email: string;
  screenshot: Screenshot | null;
}

export type ReportError =
  | { error: 'invalid'; field: string }
  | { error: 'secret' }
  | { error: 'too_large' };

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function oneOf<T extends Record<string, string>>(value: string, options: T): value is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(options, value);
}

/** Reads and checks a submitted form. Returns the report or the first problem found. */
export async function parseReport(form: FormData): Promise<Report | ReportError> {
  const type = text(form, 'type');
  const platform = text(form, 'platform');
  const network = text(form, 'network');
  const fields = {
    title: text(form, 'title'),
    description: text(form, 'description'),
    steps: text(form, 'steps'),
    expected: text(form, 'expected'),
    actual: text(form, 'actual'),
    version: text(form, 'version'),
    email: text(form, 'email'),
  };

  if (!oneOf(type, FEEDBACK_TYPES)) return { error: 'invalid', field: 'type' };
  if (!fields.title) return { error: 'invalid', field: 'title' };
  if (!fields.description) return { error: 'invalid', field: 'description' };
  if (!oneOf(platform, PLATFORMS)) return { error: 'invalid', field: 'platform' };
  if (!oneOf(network, NETWORKS)) return { error: 'invalid', field: 'network' };
  if (!fields.email) return { error: 'invalid', field: 'email' };
  for (const [name, limit] of Object.entries(LIMITS)) {
    if (fields[name as keyof typeof fields].length > limit) return { error: 'invalid', field: name };
  }
  if (!EMAIL.test(fields.email)) return { error: 'invalid', field: 'email' };

  // A report is emailed and may be copied to a public GitHub issue, so a
  // recovery phrase or key is refused outright rather than sent on.
  const prose = [fields.title, fields.description, fields.steps, fields.expected, fields.actual];
  if (prose.some(containsSecret)) return { error: 'secret' };

  let screenshot: Screenshot | null = null;
  const file = form.get('screenshot');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_SCREENSHOT_BYTES) return { error: 'too_large' };
    if (!(SCREENSHOT_TYPES as readonly string[]).includes(file.type)) return { error: 'invalid', field: 'screenshot' };
    screenshot = { name: safeFilename(file.name, file.type), type: file.type, content: await file.arrayBuffer() };
  }

  return {
    type,
    ...fields,
    platform: platform as Report['platform'],
    network: network as Report['network'],
    screenshot,
  };
}

function safeFilename(name: string, type: string): string {
  const base = name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 80);
  const extension = ATTACHMENT_EXTENSIONS[type as keyof typeof ATTACHMENT_EXTENSIONS] ?? '';
  const kind = type.startsWith('video/') ? 'video' : 'screenshot';
  return base && /\.[A-Za-z0-9]+$/.test(base) ? base : `${kind}${extension}`;
}

/** "screenshot" or "video", for the sentences that mention the attachment. */
function attachmentKind(report: Report): string {
  return report.screenshot?.type.startsWith('video/') ? 'video' : 'screenshot';
}

/** Header values must stay on one line. */
function oneLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface Section {
  label: string;
  value: string;
}

/** The report's details, in the order the form asks for them. Empty answers are left out. */
function sections(report: Report): Section[] {
  return [
    { label: 'Feedback type', value: FEEDBACK_TYPES[report.type] },
    { label: 'Platform', value: PLATFORMS[report.platform] },
    { label: 'App version', value: report.version },
    { label: 'Network', value: NETWORKS[report.network] },
    { label: 'Description', value: report.description },
    { label: 'Steps to reproduce', value: report.steps },
    { label: 'Expected result', value: report.expected },
    { label: 'Actual result', value: report.actual },
  ].filter((section) => section.value !== '');
}

export const GITHUB_NEW_ISSUE = 'https://github.com/0xMiden/wallet/issues/new';

/**
 * GitHub refuses long query strings: measured on 2026-11-16, a 6,000-character
 * URL opened, 7,000 failed with a server error and 9,000 with "URI Too Long".
 * This caps the ENCODED URL, which is what GitHub measures; spaces, line
 * breaks and non-ASCII text can grow several times when encoded.
 */
export const MAX_ISSUE_URL = 5000;
export const SHORTENED_NOTE = '\n\n_Shortened to fit the link. The full report is in the support email._';

/**
 * Opens GitHub's new-issue page with the title and body filled in. It carries
 * no name, email or label, so anyone with a GitHub account can submit it.
 */
export function githubIssueUrl(report: Report): string {
  const title = oneLine(report.title);
  const body = [
    ...sections(report).map(({ label, value }) => `**${label}**\n${value}`),
    report.screenshot ? `_A ${attachmentKind(report)} is attached to the support email._` : '',
    '_Sent from the Help Center contact form._',
  ].filter(Boolean).join('\n\n');

  const url = (text: string) =>
    `${GITHUB_NEW_ISSUE}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
  if (url(body).length <= MAX_ISSUE_URL) return url(body);

  // Longest prefix that fits, counted in code points so an emoji or accented
  // letter is never cut in half.
  const characters = Array.from(body);
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (url(characters.slice(0, middle).join('') + SHORTENED_NOTE).length <= MAX_ISSUE_URL) low = middle;
    else high = middle - 1;
  }
  return url(characters.slice(0, low).join('').trimEnd() + SHORTENED_NOTE);
}

export interface SupportEmail {
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{ content: ArrayBuffer; filename: string; type: string; disposition: 'attachment' }>;
}

export function supportEmail(report: Report): SupportEmail {
  const subject = oneLine(`[${FEEDBACK_TYPES[report.type]}] ${report.title}`).slice(0, 200);
  const issueUrl = githubIssueUrl(report);
  const from = report.email;
  const details = sections(report);

  const text = [
    report.title,
    '',
    `From: ${from}`,
    '',
    ...details.flatMap(({ label, value }) => [`${label}:`, value, '']),
    report.screenshot ? `Attachment: ${attachmentKind(report)} attached.` : 'Attachment: none.',
    '',
    `Open as GitHub issue: ${issueUrl}`,
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:sans-serif;line-height:1.5">
<h2 style="margin:0 0 12px">${escapeHtml(report.title)}</h2>
<p style="margin:0 0 16px"><strong>From:</strong> ${escapeHtml(from)}</p>
${details.map(({ label, value }) => `<p style="margin:0 0 12px"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`).join('\n')}
<p style="margin:0 0 20px">Attachment: ${report.screenshot ? `${attachmentKind(report)} attached.` : 'none.'}</p>
<p><a href="${escapeHtml(issueUrl)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#e77537;color:#ffffff;text-decoration:none;font-weight:bold">Open as GitHub issue</a></p>
<p style="color:#6b6b6b;font-size:13px">The issue page opens without the reporter's name or email. Drag the attachment in before you submit.</p>
</body></html>`;

  return {
    subject,
    text,
    html,
    replyTo: report.email,
    ...(report.screenshot
      ? { attachments: [{ content: report.screenshot.content, filename: report.screenshot.name, type: report.screenshot.type, disposition: 'attachment' as const }] }
      : {}),
  };
}
