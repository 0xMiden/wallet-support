/** Private R2 media. Public URLs are gated by confirmed GitHub publication. */

import { sniffType, type SniffedType } from './sniff';

export const MAX_ATTACHMENTS = 3;
export const MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'video/mp4'] as const;

export interface StoredAttachment {
  key: string;            // R2 object key — always present
  name: string;
  /** The SNIFFED type. Admission guarantees it equals what was declared. */
  type: string;
  size: number;
  githubUrl: string | null;  // legacy GitHub-hosted URL; new uploads stay in R2
  r2Url: string | null;      // legacy URL or publication-gated Worker URL
  video: boolean;            // from magic bytes; decides video-link vs image markup
}

/**
 * Cheap checks, before anything is read into memory.
 *
 * Runs after multipart parsing and before any additional byte reads or writes. The declared type is checked here too — it is free, and it
 * catches an honest client sending the wrong thing without paying for a read.
 * It is NOT a security control: see admitBytes.
 */
export function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) return `file exceeds ${MAX_BYTES / 1048576} MB`;
  if (!ALLOWED_TYPES.includes(file.type as any)) return `unsupported type ${file.type}`;
  return null;
}

/**
 * THE security control: what the bytes actually are.
 *
 * Admission requires BOTH that the bytes are a supported format AND that they
 * match what the client declared. The first half is the security property —
 * the stored object has a PNG, JPEG or MP4 signature. This is format admission,
 * not malware scanning; nosniff and sandbox headers prevent document execution. The second half is a deliberate
 * strictness: a client whose declaration disagrees with its own payload is
 * either broken or lying, and neither is worth storing.
 *
 * KNOWN COST, accepted on purpose. Browsers derive File.type from the
 * filename, so a genuine PNG that someone renamed to .jpg is declared
 * image/jpeg and is refused here even though it is a perfectly good
 * screenshot. Relaxing to "sniffed is in the allowlist" would accept it with
 * the identical security guarantee — everything is still stored and served
 * under the type the BYTES say — at the cost of no longer noticing a client
 * that contradicts itself. That is a product call, and it is one line:
 * delete the mismatch branch below.
 *
 * Returns the real type, or an error message for a 415.
 */
export function admitBytes(bytes: Uint8Array, declared: string): SniffedType | { error: string } {
  const sniffed = sniffType(bytes);
  // Neither message names what WAS detected. A precise answer is a free oracle
  // for anyone probing which formats slip through.
  if (!sniffed) return { error: 'file content is not a supported format' };
  if (sniffed.mime !== declared) {
    console.warn(JSON.stringify({ job: 'attachment', rejected: 'type mismatch', declared }));
    return { error: 'file content does not match its declared type' };
  }
  return sniffed;
}

/** Strip path traversal and anything that would break a markdown link. */
export function safeName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').replace(/\.{2,}/g, '.').slice(0, 120) || 'attachment';
}

/**
 * `bytes` is passed in rather than read here because the caller already
 * buffered and admitted the file. R2 receives exactly the bytes that passed
 * the magic-byte check, without trusting or re-reading the client stream.
 */
export async function storeAttachment(
  file: File,
  bytes: Uint8Array,
  sniffed: SniffedType,
  submissionId: string,
  env: {
    ATTACHMENTS: R2Bucket;
  }
): Promise<StoredAttachment> {
  // Unique names also keep the admin's name-based attachment links unambiguous.
  const sourceName = safeName(file.name);
  const suffix = crypto.randomUUID();
  const dot = sourceName.lastIndexOf('.');
  const name = dot > 0
    ? `${sourceName.slice(0, dot)}-${suffix}${sourceName.slice(dot)}`
    : `${sourceName}-${suffix}`;
  const key = `attachments/${submissionId}/${name}`;

  // The private durable copy is the source for both review and published media.
  await env.ATTACHMENTS.put(key, bytes, {
    // The SNIFFED type, never the declared one. This is the header R2 serves
    // the object with, so trusting the client here would be handing an
    // attacker the Content-Type of a file on our own origin.
    httpMetadata: { contentType: sniffed.mime },
    customMetadata: { submissionId, originalName: file.name },
  });

  return {
    key,
    name,
    type: sniffed.mime,
    size: file.size,
    githubUrl: null,
    // Sniffed rather than declared: pictures and video get different markup.
    video: sniffed.video,
    r2Url: null,
  };
}

/** Parse the existing JSON-of-JSON representation without trusting malformed rows. */
export function storedAttachments(raw: string | null): StoredAttachment[] {
  try {
    const values: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(values)) return [];
    return values.flatMap((value) => {
      try {
        const a = typeof value === 'string' ? JSON.parse(value) : null;
        return a && typeof a.key === 'string' && typeof a.name === 'string'
          && ALLOWED_TYPES.includes(a.type) && Number.isSafeInteger(a.size) && a.size > 0
          ? [a as StoredAttachment] : [];
      } catch { return []; }
    });
  } catch { return []; }
}

/** URL construction never changes visibility; the media route checks D1 on every request. */
export function attachmentUrl(attachment: StoredAttachment, origin: string | undefined): string {
  if (!origin) throw new Error('FEEDBACK_PUBLIC_ORIGIN is required to publish attachments');
  const base = new URL(origin);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new Error('FEEDBACK_PUBLIC_ORIGIN must be an HTTPS origin');
  }
  return `${base.origin}/api/feedback/media/${attachment.key.split('/').slice(1).map(encodeURIComponent).join('/')}`;
}

/** Prepare a link after the write guard, without making private media public. */
export async function publishAttachment(
  attachment: StoredAttachment,
  env: { FEEDBACK_PUBLIC_ORIGIN?: string }
): Promise<StoredAttachment> {
  if (attachment.githubUrl) return attachment; // Preserve existing GitHub-hosted evidence.
  return { ...attachment, r2Url: attachmentUrl(attachment, env.FEEDBACK_PUBLIC_ORIGIN) };
}

/** Images embed inline. Externally hosted videos are explicit playable/downloadable links. */
export function renderAttachment(a: StoredAttachment): string {
  const url = a.githubUrl ?? a.r2Url;
  const name = safeName(a.name);
  if (!url) return `- \`${name}\` — attachment unavailable`;
  if (a.video && a.githubUrl) return url; // Legacy GitHub uploads retain their native rendering.
  if (a.video) return `[Watch or download ${name}](${url})`;
  return `![${name}](${url})`;
}
