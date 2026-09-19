/**
 * Attachment handling: GitHub upload with R2 fallback.
 *
 * Files are uploaded to GitHub so they render inline in the issue, per the
 * product requirement. R2 is the durable copy and the fallback path.
 *
 * IMPORTANT — the GitHub attachment endpoint is UNDOCUMENTED. It is not in
 * GitHub's REST reference, has no SLA, and no deprecation notice. It is known
 * to return 201 for personal access tokens. Because it can break without
 * warning, every upload writes to R2 first and falls back to an R2 link if
 * GitHub rejects the upload. An issue never fails to file because an
 * attachment failed to upload.
 */

import { uploadAttachment } from './publish';
import { sniffType, type SniffedType } from './sniff';

export const MAX_BYTES = 10 * 1024 * 1024;
export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'video/mp4'] as const;

export interface StoredAttachment {
  key: string;            // R2 object key — always present
  name: string;
  /** The SNIFFED type. Admission guarantees it equals what was declared. */
  type: string;
  size: number;
  githubUrl: string | null;  // set when the GitHub upload succeeded
  r2Url: string | null;      // public R2 URL, when R2_PUBLIC_BASE is configured
  video: boolean;            // from magic bytes; decides bare-URL vs image markup
}

/**
 * Cheap checks, before anything is read into memory.
 *
 * Runs at the very top of /submit, so a 10 MB body is rejected on size without
 * being buffered. The declared type is checked here too — it is free, and it
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
 * the stored object is provably a PNG, JPEG or MP4, so it cannot be served as
 * something executable from our own origin. The second half is a deliberate
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
 * Upload to GitHub's user-attachments store.
 *
 * The request itself lives in publish.ts — it is a GitHub write, and every
 * GitHub write lives in that module. This wrapper only turns a File into the
 * bytes that request needs and keeps the null-on-failure contract:
 *
 *   - resolves to a URL string on success
 *   - resolves to null on ANY failure (never throws)
 * The caller falls back to R2. A broken attachment must never block an issue.
 */
async function uploadToGitHub(
  bytes: Uint8Array,
  repo: string,
  token: string
): Promise<{ url: string; video: boolean } | null> {
  try {
    if (bytes.byteLength > MAX_BYTES) return null;
    return await uploadAttachment(bytes, repo, token);
  } catch (err) {
    console.warn('github attachment upload failed, falling back to R2', err);
    return null;
  }
}

/**
 * `bytes` is passed in rather than read here, and that is the point: the
 * caller already buffered the file to sniff it, and the GitHub upload path
 * needed a buffer anyway. Reading it once and feeding R2, the sniff and the
 * upload from the same array REMOVES a double read rather than adding one.
 * The file's stream is also already consumed by then, so re-reading it would
 * not have worked.
 */
export async function storeAttachment(
  file: File,
  bytes: Uint8Array,
  sniffed: SniffedType,
  submissionId: string,
  env: {
    ATTACHMENTS: R2Bucket;
    TARGET_REPO: string;
    GITHUB_WRITE_TOKEN: string;
    R2_PUBLIC_BASE?: string;
  }
): Promise<StoredAttachment> {
  const name = safeName(file.name);
  const key = `attachments/${submissionId}/${name}`;

  // Durable copy first. If GitHub's undocumented endpoint disappears
  // tomorrow, the file still exists and old links can be repointed.
  await env.ATTACHMENTS.put(key, bytes, {
    // The SNIFFED type, never the declared one. This is the header R2 serves
    // the object with, so trusting the client here would be handing an
    // attacker the Content-Type of a file on our own origin.
    httpMetadata: { contentType: sniffed.mime },
    customMetadata: { submissionId, originalName: file.name },
  });

  const uploaded = await uploadToGitHub(bytes, env.TARGET_REPO, env.GITHUB_WRITE_TOKEN);
  const r2Url = env.R2_PUBLIC_BASE ? `${env.R2_PUBLIC_BASE.replace(/\/$/, '')}/${key}` : null;

  return {
    key,
    name,
    type: sniffed.mime,
    size: file.size,
    githubUrl: uploaded?.url ?? null,
    // From the bytes, and now known even when the GitHub upload failed — it
    // used to fall back to the declared type, so a mislabelled video rendered
    // as a broken image whenever that endpoint was down.
    video: sniffed.video,
    r2Url,
  };
}

/** Markdown for the issue body. Images render inline; MP4 renders as a player on GitHub. */
export function renderAttachment(a: StoredAttachment): string {
  const url = a.githubUrl ?? a.r2Url;
  if (!url) {
    return `- \`${a.name}\` (${(a.size / 1048576).toFixed(1)} MB) — upload failed; stored internally as \`${a.key}\``;
  }
  // GitHub renders a video ONLY from a bare URL on its own line. Wrapping one
  // in link or image syntax yields a dead link instead of a player (v1,
  // worker.js:470-473).
  if (a.video) return url;
  return `![${a.name}](${url})`;
}
