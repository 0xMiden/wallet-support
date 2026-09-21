import { ALLOWED_TYPES, storedAttachments } from './attachments';
import { isUuidV4 } from './validate';

import { PUBLIC_MEDIA_CSP } from './support-csp';

const safeHeaders = {
  'cache-control': 'private, no-store',
  'x-content-type-options': 'nosniff',
  'content-security-policy': PUBLIC_MEDIA_CSP,
  'referrer-policy': 'no-referrer',
};

/** A single byte range, including open-ended and suffix ranges. */
function byteRange(value: string, size: number): { offset: number; length: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  const from = match[1] ? Number(match[1]) : null;
  const to = match[2] ? Number(match[2]) : null;
  if ([from, to].some((n) => n !== null && !Number.isSafeInteger(n))) return null;
  if (from === null) {
    if (!to || to < 1) return null;
    const length = Math.min(to, size);
    return { offset: size - length, length };
  }
  if (from >= size || (to !== null && to < from)) return null;
  return { offset: from, length: Math.min(to ?? size - 1, size - 1) - from + 1 };
}

/**
 * Public access is earned by a confirmed GitHub write, never by upload or by
 * classification. Check membership and publication on EVERY read (no CDN
 * caching), so removing a record/object or marking it spam revokes this URL.
 */
export async function serveAttachment(
  request: Request,
  env: { DB: D1Database; ATTACHMENTS: R2Bucket }
): Promise<Response> {
  const missing = () => new Response(request.method === 'HEAD' ? null : 'Not found', { status: 404, headers: safeHeaders });
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { ...safeHeaders, allow: 'GET, HEAD' } });
  }
  const match = /^\/api\/feedback\/media\/([^/]+)\/([^/]+)$/.exec(new URL(request.url).pathname);
  if (!match) return missing();
  let id: string, name: string;
  try { id = decodeURIComponent(match[1]); name = decodeURIComponent(match[2]); }
  catch { return missing(); }
  if (!isUuidV4(id) || !name || /[/\\\x00-\x1f]/.test(name) || name === '.' || name === '..') return missing();

  const row = await env.DB.prepare(
    `SELECT s.attachment_keys FROM submissions s
      WHERE s.submission_id = ? AND s.state NOT IN ('spam', 'suspected_spam', 'quarantined')
        AND COALESCE(s.spam_status, 'clean') = 'clean'
        AND (s.published_issue IS NOT NULL OR EXISTS (
          SELECT 1 FROM dup_links d WHERE d.submission_id = s.submission_id
        ))`
  ).bind(id).first<{ attachment_keys: string | null }>();
  if (!row) return missing();
  const attachment = storedAttachments(row.attachment_keys).find((a) => a.key === `attachments/${id}/${name}`);
  if (!attachment || !ALLOWED_TYPES.includes(attachment.type as typeof ALLOWED_TYPES[number])) return missing();
  // The lookup key comes from a recorded member, not an arbitrary URL path.
  const metadata = await env.ATTACHMENTS.head(attachment.key);
  if (!metadata || metadata.size < 1) return missing();
  const headers = new Headers({
    ...safeHeaders,
    'content-type': attachment.type,
    'content-disposition': `inline; filename="${encodeURIComponent(attachment.name)}"`,
    'accept-ranges': 'bytes',
    'content-length': String(metadata.size),
  });
  // RFC 9110: Range modifies GET only; HEAD describes the complete object.
  const requestedRange = request.method === 'GET' ? request.headers.get('range') : null;
  const range = requestedRange ? byteRange(requestedRange, metadata.size) : undefined;
  if (range === null) {
    headers.set('content-range', `bytes */${metadata.size}`);
    headers.set('content-length', '0');
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    headers.set('content-range', `bytes ${range.offset}-${range.offset + range.length - 1}/${metadata.size}`);
    headers.set('content-length', String(range.length));
  }
  if (request.method === 'HEAD') return new Response(null, { headers });
  const object = await env.ATTACHMENTS.get(attachment.key, range ? { range } : undefined);
  if (!object) return missing();
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
