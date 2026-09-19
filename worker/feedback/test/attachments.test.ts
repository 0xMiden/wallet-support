/**
 * Plan §10 tests 46-47 — attachment admission by magic bytes (Phase 5).
 *
 * This is the first phase with a reporter-visible change: a file whose bytes
 * are not a PNG, JPEG or MP4 is now refused with 415 instead of stored. So
 * half of these tests are about what must STILL be accepted. Rejecting a real
 * user's screenshot is the expensive failure here, not storing a stray file.
 */
import { env } from 'cloudflare:test';
import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import {
  callWorker, installFetchStub, restoreFetch, mockTurnstile, submitRequest,
  getSubmission, countSubmissions, pngFile, jpegFile, mp4File, fileOf,
  PNG_BYTES, JPEG_BYTES, MP4_BYTES, JUNK_BYTES,
} from './helpers';
import { sniffType } from '../src/lib/sniff';
import { admitBytes, validateFile, storeAttachment, MAX_BYTES } from '../src/lib/attachments';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });

async function submitWith(attachment: File) {
  mockTurnstile();
  const id = crypto.randomUUID();
  const res = await callWorker(submitRequest({ submission_id: id, attachment }));
  return { id, res };
}

async function r2Keys(prefix: string) {
  const listed = await env.ATTACHMENTS.list({ prefix });
  return listed.objects.map((o) => o.key);
}

describe('attachment admission', () => {
  it('46. refuses MP4 bytes wearing a .png name and content type, writing nothing', async () => {
    const before = await countSubmissions();
    const { id, res } = await submitWith(fileOf(MP4_BYTES, 'shot.png', 'image/png'));

    expect(res.status).toBe(415);
    // No row, no R2 object. The report is refused whole rather than filed
    // without the evidence its text refers to.
    expect(await getSubmission(id)).toBeNull();
    expect(await countSubmissions()).toBe(before);
    expect(await r2Keys(`attachments/${id}/`)).toEqual([]);
  });

  it('46b. refuses bytes that are not any supported format', async () => {
    const { id, res } = await submitWith(fileOf(JUNK_BYTES, 'shot.png', 'image/png'));

    expect(res.status).toBe(415);
    // The message never names what WAS detected — a precise answer is a free
    // oracle for anyone probing which formats slip through.
    // Must not name what was DETECTED — that would be a free oracle for
    // anyone probing which formats slip through.
    const body = await res.json<any>();
    expect(body.error).not.toMatch(/png|jpeg|mp4|gif|webp|html/i);
    expect(await getSubmission(id)).toBeNull();
  });

  it('46c. refuses a truncated PNG signature', async () => {
    // "\x89PNG" alone is not enough: the trailing CRLF/EOF bytes are what make
    // the signature hard to hit by accident.
    const { res } = await submitWith(fileOf(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]), 'a.png', 'image/png'));
    expect(res.status).toBe(415);
  });

  it('47. accepts genuine PNG, JPEG and MP4, and stores the sniffed type', async () => {
    for (const [file, expected] of [
      [pngFile(), 'image/png'],
      [jpegFile(), 'image/jpeg'],
      [mp4File(), 'video/mp4'],
    ] as Array<[File, string]>) {
      const { id, res } = await submitWith(file);
      expect(res.status, expected).toBe(202);

      const row = await getSubmission(id);
      const stored = JSON.parse(JSON.parse(row.attachment_keys)[0]);
      expect(stored.type).toBe(expected);
      expect(await r2Keys(`attachments/${id}/`)).toHaveLength(1);

      // R2 serves the object with the type the BYTES say, never the client's.
      const obj = await env.ATTACHMENTS.get(stored.key);
      expect(obj!.httpMetadata!.contentType).toBe(expected);
    }
  });

  it('47b. refuses a genuine PNG the browser labelled JPEG — the accepted cost', async () => {
    // Documents a REAL false rejection, deliberately. Browsers derive
    // File.type from the filename, so a genuine screenshot someone renamed to
    // .jpg is refused here. The strict rule was chosen knowing this; relaxing
    // to "sniffed is in the allowlist" would accept it with the same security
    // guarantee. If this ever shows up in production logs as a recurring
    // rejection, that is the signal to make the call.
    const { id, res } = await submitWith(fileOf(PNG_BYTES, 'screenshot.jpg', 'image/jpeg'));

    expect(res.status).toBe(415);
    expect(await getSubmission(id)).toBeNull();
  });

  it('47c. a submission with no attachment is untouched', async () => {
    const { id, res } = await submitWith(undefined as any);
    expect(res.status).toBe(202);
    expect((await getSubmission(id)).state).toBe('received');
  });

  it('47d. video markup is decided by the bytes, even when GitHub upload fails', async () => {
    // The upload endpoint is undocumented and unmocked here, so it fails --
    // which is the point. `video` used to fall back to the DECLARED type, so a
    // mislabelled recording rendered as a broken image whenever GitHub was
    // down. It now comes from the sniff and is always right.
    const { id } = await submitWith(fileOf(MP4_BYTES, 'clip.mp4', 'video/mp4'));

    const row = await getSubmission(id);
    const stored = JSON.parse(JSON.parse(row.attachment_keys)[0]);
    expect(stored.githubUrl).toBe(null);
    expect(stored.video).toBe(true);
  });

  it('47e. the size check still runs first, and still answers 413', async () => {
    // Unchanged behaviour, and it must stay ahead of the byte read: a 10 MB
    // body should be refused on size without ever being buffered.
    const big = new File([new Uint8Array(MAX_BYTES + 1)], 'big.png', { type: 'image/png' });
    const { res } = await submitWith(big);
    expect(res.status).toBe(413);
  });

  it('47f. an unsupported declared type is still refused before any read', async () => {
    const { res } = await submitWith(fileOf(PNG_BYTES, 'notes.txt', 'text/plain'));
    expect(res.status).toBe(413);
    expect(validateFile(fileOf(PNG_BYTES, 'a.txt', 'text/plain'))).toMatch(/unsupported type/);
  });
});

describe('sniffType', () => {
  it('47g. recognises exactly the three allowed formats and nothing else', () => {
    expect(sniffType(PNG_BYTES)).toMatchObject({ mime: 'image/png', video: false });
    expect(sniffType(JPEG_BYTES)).toMatchObject({ mime: 'image/jpeg', video: false });
    expect(sniffType(MP4_BYTES)).toMatchObject({ mime: 'video/mp4', video: true });
    expect(sniffType(JUNK_BYTES)).toBe(null);
    expect(sniffType(new Uint8Array([]))).toBe(null);
    // Short buffers must not read past the end and match by accident.
    expect(sniffType(new Uint8Array([0x89, 0x50]))).toBe(null);
    expect(sniffType(new Uint8Array([0xff, 0xd8]))).toBe(null);
    // GIF and WebP are real formats, deliberately NOT accepted: the sniffer
    // recognising more than the allowlist is how a service starts accepting
    // types nobody decided to accept.
    expect(sniffType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0]))).toBe(null);
    expect(sniffType(new TextEncoder().encode('RIFF....WEBP'))).toBe(null);
  });

  it('47i. storeAttachment serves the SNIFFED type even if handed a mismatch', async () => {
    // Defence in depth, tested on its own. Admission currently guarantees
    // declared === sniffed, so the end-to-end tests cannot tell the two apart
    // and would pass even if storage trusted the client. This calls the
    // storage layer directly with a deliberate mismatch, so the contract holds
    // independently of whatever admission decides to allow later.
    const id = crypto.randomUUID();
    const lying = new File([PNG_BYTES], 'x.png', { type: 'text/html' });

    const stored = await storeAttachment(
      lying, PNG_BYTES, { mime: 'image/png', name: 'screenshot.png', video: false },
      id, env as any
    );

    expect(stored.type).toBe('image/png');
    const obj = await env.ATTACHMENTS.get(stored.key);
    expect(obj!.httpMetadata!.contentType).toBe('image/png');
  });

  it('47j. rejects an HTML polyglot wearing an ftyp marker', async () => {
    // `<htm` is four bytes, so `ftyp` lands at offset 4 and a marker-only check
    // calls this an MP4 -- while it is a perfectly good HTML document. Every
    // consumer today renders it harmlessly, but a signature that depends on its
    // consumers staying careful is not a signature.
    const polyglot = new TextEncoder().encode('<htmftyp<html><script>alert(1)</script></html>');
    expect(sniffType(polyglot)).toBe(null);

    const { id, res } = await submitWith(fileOf(polyglot, 'clip.mp4', 'video/mp4'));
    expect(res.status).toBe(415);
    expect(await getSubmission(id)).toBeNull();
  });

  it('47k. accepts a real ftyp box and rejects an impossible declared length', () => {
    // Size 1 is the ISO escape for "64-bit length follows"; a size larger than
    // the file itself cannot be a box.
    expect(sniffType(MP4_BYTES)).toMatchObject({ mime: 'video/mp4' });

    const oversized = new Uint8Array(MP4_BYTES);
    oversized.set([0x7f, 0xff, 0xff, 0xff], 0);
    expect(sniffType(oversized)).toBe(null);

    const escape64 = new Uint8Array(MP4_BYTES);
    escape64.set([0x00, 0x00, 0x00, 0x01], 0);
    expect(sniffType(escape64)).toMatchObject({ mime: 'video/mp4' });

    const tooSmall = new Uint8Array(MP4_BYTES);
    tooSmall.set([0x00, 0x00, 0x00, 0x04], 0);
    expect(sniffType(tooSmall)).toBe(null);
  });

  it('47h. admitBytes returns an error object rather than throwing', () => {
    expect(admitBytes(JUNK_BYTES, 'image/png')).toHaveProperty('error');
    expect(admitBytes(PNG_BYTES, 'image/png')).toMatchObject({ mime: 'image/png' });
  });
});
