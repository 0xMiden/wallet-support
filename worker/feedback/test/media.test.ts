import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  callWorker, installFetchStub, restoreFetch, mockTurnstile, route, submitRequest,
  getSubmission, callsTo, pngFile, mp4File, fileOf, PNG_BYTES, MP4_BYTES, JUNK_BYTES,
  seedSubmission, seedMirrorIssue, mockClassifier, mockCreateComment,
  mockUpdateComment, runDrain, resetGlobalGate, commentBody, withEnv,
} from './helpers';
import { attachmentUrl, MAX_BYTES, storedAttachments, storeAttachment } from '../src/lib/attachments';

beforeAll(() => installFetchStub());
beforeEach(() => resetGlobalGate());
afterEach(() => { restoreFetch(); installFetchStub(); });

async function seedMedia(video = false) {
  const id = crypto.randomUUID();
  const attachment = await storeAttachment(video ? mp4File() : pngFile(), video ? MP4_BYTES : PNG_BYTES,
    { mime: video ? 'video/mp4' : 'image/png', name: video ? 'clip.mp4' : 'shot.png', video }, id, env);
  await seedSubmission({ submission_id: id, attachment_keys: JSON.stringify([JSON.stringify(attachment)]) });
  return { id, attachment, url: attachmentUrl(attachment, 'https://support.miden.xyz') };
}
async function publishRecord(id: string) {
  await env.DB.prepare("UPDATE submissions SET published_issue = 123, state = 'published' WHERE submission_id = ?").bind(id).run();
}

describe('multiple attachment ingress', () => {
  it('stores all three media with unique names and keys even when the names repeat', async () => {
    mockTurnstile();
    const id = crypto.randomUUID();
    const response = await callWorker(submitRequest({ submission_id: id, attachments: [pngFile('same.png'), pngFile('same.png'), mp4File()] }));
    expect(response.status).toBe(202);
    const stored = storedAttachments((await getSubmission(id)).attachment_keys);
    expect(stored).toHaveLength(3);
    expect(new Set(stored.map((a) => a.key)).size).toBe(3);
    expect(new Set(stored.map((a) => a.name)).size).toBe(3);
    expect(stored.map((a) => a.type)).toEqual(['image/png', 'image/png', 'video/mp4']);
    expect(callsTo('uploads.github.com')).toHaveLength(0);
  });

  it('rejects the whole batch before any storage when its final file is invalid', async () => {
    mockTurnstile();
    const id = crypto.randomUUID();
    const response = await callWorker(submitRequest({ submission_id: id, attachments: [pngFile(), fileOf(JUNK_BYTES, 'lie.png', 'image/png')] }));
    expect(response.status).toBe(415);
    expect(await getSubmission(id)).toBeNull();
    expect((await env.ATTACHMENTS.list({ prefix: `attachments/${id}/` })).objects).toHaveLength(0);
  });

  it('a repeated submission preserves its recorded evidence and removes only the retry objects', async () => {
    mockTurnstile();
    const id = crypto.randomUUID();
    expect((await callWorker(submitRequest({ submission_id: id, attachment: pngFile() }))).status).toBe(202);
    const original = storedAttachments((await getSubmission(id)).attachment_keys);
    expect((await callWorker(submitRequest({ submission_id: id, attachments: [pngFile(), mp4File()] }))).status).toBe(200);
    expect(storedAttachments((await getSubmission(id)).attachment_keys)).toEqual(original);
    const keys = (await env.ATTACHMENTS.list({ prefix: `attachments/${id}/` })).objects.map((o) => o.key);
    expect(keys).toEqual(original.map((a) => a.key));
  });

  it('enforces count and combined size before challenge verification', async () => {
    expect((await callWorker(submitRequest({ attachments: Array.from({ length: 4 }, () => pngFile()) }))).status).toBe(413);
    const large = new Uint8Array(MAX_BYTES / 2 + 1);
    large.set(PNG_BYTES);
    const tooLarge = await callWorker(submitRequest({ attachments: [fileOf(large, 'a.png', 'image/png'), fileOf(large, 'b.png', 'image/png')] }));
    expect(tooLarge.status).toBe(413);
    expect(callsTo('challenges.cloudflare.com')).toHaveLength(0);
  });
});

describe('publication-gated private R2 media', () => {
  it('never exposes an unpublished object in any prepublication state', async () => {
    const { id, url } = await seedMedia();
    for (const state of ['received', 'claimed', 'publishing', 'deferred', 'failed', 'suspected_spam', 'quarantined', 'spam']) {
      await env.DB.prepare('UPDATE submissions SET state = ? WHERE submission_id = ?').bind(state, id).run();
      const response = await callWorker(new Request(url));
      expect(response.status, state).toBe(404);
      expect(response.headers.get('cache-control')).toContain('no-store');
    }
  });

  it('serves an exact recorded member after success with safe headers, and supports HEAD', async () => {
    const { id, url } = await seedMedia();
    await publishRecord(id);
    const response = await callWorker(new Request(url));
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG_BYTES);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain('sandbox');
    expect(response.headers.get('content-security-policy')).toContain("media-src 'self'");
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const head = await callWorker(new Request(url, { method: 'HEAD' }));
    expect(head.status).toBe(200);
    expect(head.headers.get('content-length')).toBe(String(PNG_BYTES.length));
    expect(await head.text()).toBe('');
    await env.DB.prepare("UPDATE submissions SET spam_status = 'spam' WHERE submission_id = ?").bind(id).run();
    expect((await callWorker(new Request(url))).status).toBe(404);
  });

  it('requires stored membership, denies traversal and does not leak a neighbouring report', async () => {
    const current = await seedMedia();
    const other = await seedMedia();
    await publishRecord(current.id);
    for (const path of [
      `/api/feedback/media/${current.id}/${other.attachment.name}`,
      `/api/feedback/media/${current.id}/%2e%2e%2f${other.id}%2f${other.attachment.name}`,
      `/api/feedback/media/${current.id}/%ZZ`,
      `/api/feedback/media/${current.id}/extra/shot.png`,
      new URL(other.url).pathname,
    ]) expect((await callWorker(new Request(`https://support.miden.xyz${path}`))).status, path).toBe(404);
    await env.ATTACHMENTS.put(`attachments/${current.id}/unrecorded.png`, PNG_BYTES);
    expect((await callWorker(new Request(`https://support.miden.xyz/api/feedback/media/${current.id}/unrecorded.png`))).status).toBe(404);
    expect((await callWorker(new Request(current.url, { method: 'POST' }))).status).toBe(405);
  });

  it('supports single video ranges and rejects invalid or multipart ranges', async () => {
    const { id, url } = await seedMedia(true);
    await publishRecord(id);
    for (const [value, start, end] of [['bytes=0-7', 0, 8], ['bytes=8-', 8, MP4_BYTES.length], ['bytes=-4', MP4_BYTES.length - 4, MP4_BYTES.length]] as const) {
      const response = await callWorker(new Request(url, { headers: { range: value } }));
      expect(response.status).toBe(206);
      expect(response.headers.get('content-range')).toBe(`bytes ${start}-${end - 1}/${MP4_BYTES.length}`);
      expect(response.headers.get('content-type')).toBe('video/mp4');
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(MP4_BYTES.slice(start, end));
    }
    for (const range of ['bytes=100000-', 'bytes=8-2', 'bytes=-0', 'bytes=0-1,4-5', 'invalid']) {
      const response = await callWorker(new Request(url, { headers: { range } }));
      expect(response.status, range).toBe(416);
      expect(response.headers.get('content-range')).toBe(`bytes */${MP4_BYTES.length}`);
    }
  });

  it('rejects missing or unsafe public origins instead of silently losing attachments', () => {
    const attachment = { key: 'attachments/id/shot.png', name: 'shot.png', size: 8, type: 'image/png', video: false, githubUrl: null, r2Url: null };
    for (const origin of [undefined, 'http://support.miden.xyz', 'https://user:pass@support.miden.xyz', 'https://support.miden.xyz/path', 'https://support.miden.xyz?query=yes']) {
      expect(() => attachmentUrl(attachment, origin)).toThrow();
    }
  });
});

describe('issue and duplicate publication with media', () => {
  it('includes inline images and linked videos and exposes them only after GitHub confirms success', async () => {
    const image = await seedMedia();
    const video = await storeAttachment(mp4File(), MP4_BYTES, { mime: 'video/mp4', name: 'clip.mp4', video: true }, image.id, env);
    await env.DB.prepare('UPDATE submissions SET attachment_keys = ? WHERE submission_id = ?')
      .bind(JSON.stringify([JSON.stringify(image.attachment), JSON.stringify(video)]), image.id).run();
    mockClassifier({ verdict: 'new' });
    route({
      match: (u, method) => u.host === 'api.github.com' && method === 'POST' && u.pathname === '/repos/0xMiden/wallet/issues',
      respond: async (body) => {
        const sent = JSON.parse(body!).body;
        expect(sent).toContain(`![${image.attachment.name}](${image.url})`);
        expect(sent).toContain(`[Watch or download ${video.name}](${attachmentUrl(video, 'https://support.miden.xyz')})`);
        expect((await callWorker(new Request(image.url))).status).toBe(404);
        return Response.json({ number: 7991 }, { status: 201 });
      },
    });
    await runDrain();
    expect((await getSubmission(image.id)).published_issue).toBe(7991);
    expect((await callWorker(new Request(image.url))).status).toBe(200);
    expect(callsTo('uploads.github.com')).toHaveLength(0);
  });

  it('keeps media private when GitHub refuses the issue', async () => {
    const { id, url } = await seedMedia();
    mockClassifier({ verdict: 'new' });
    route({ match: (u, method) => u.host === 'api.github.com' && method === 'POST', respond: () => new Response('forbidden', { status: 403 }) });
    await runDrain();
    expect((await getSubmission(id)).published_issue).toBeNull();
    expect((await callWorker(new Request(url))).status).toBe(404);
  });

  it('publishes duplicate media in the rolling comment and keeps earlier evidence on subsequent edits', async () => {
    await seedMirrorIssue({ number: 771, title: 'Node unreachable after an update', state: 'open' });
    mockClassifier({ verdict: 'duplicate', issue_number: 771, confidence: 0.95 });
    mockCreateComment(771, 871);
    const first = await seedMedia();
    await runDrain();
    expect(commentBody(771).body).toContain(first.url);
    expect((await callWorker(new Request(first.url))).status).toBe(200);
    mockUpdateComment(871);
    const second = await seedMedia(true);
    await runDrain();
    const edit = callsTo('api.github.com').find((c) => c.method === 'PATCH');
    expect(JSON.parse(edit!.body!).body).toContain(first.url);
    expect(JSON.parse(edit!.body!).body).toContain(second.url);
    expect((await callWorker(new Request(second.url))).status).toBe(200);
  });

  it('keeps the rolling comment within its existing budget with media included', async () => {
    await seedMirrorIssue({ number: 773, title: 'Node unreachable after an update', state: 'open' });
    for (let i = 0; i < 9; i++) {
      const prior = await seedMedia();
      await env.DB.prepare("UPDATE submissions SET state = 'published', body_sanitized = ? WHERE submission_id = ?")
        .bind('Long report. '.repeat(660), prior.id).run();
      await env.DB.prepare('INSERT INTO dup_links (submission_id, issue_number, confidence, linked_at) VALUES (?,773,0.95,?)')
        .bind(prior.id, Date.now() - i - 1).run();
    }
    const current = await seedMedia();
    mockClassifier({ verdict: 'duplicate', issue_number: 773, confidence: 0.95 });
    mockCreateComment(773, 873);
    await runDrain();
    const body = commentBody(773).body;
    expect(body.length).toBeLessThan(55_500);
    expect(body).toContain(current.url);
    expect(body).toContain('omitted to keep this comment');
  });

  it('fails closed when media origin is missing rather than filing an issue without evidence', async () => {
    const { id, url } = await seedMedia();
    mockClassifier({ verdict: 'new' });
    await withEnv({ FEEDBACK_PUBLIC_ORIGIN: '' }, () => runDrain());
    expect((await getSubmission(id)).published_issue).toBeNull();
    expect(callsTo('api.github.com').filter((c) => c.method === 'POST')).toHaveLength(0);
    expect((await callWorker(new Request(url))).status).toBe(404);
  });

  it('keeps duplicate media private when the rolling comment fails', async () => {
    await seedMirrorIssue({ number: 772, title: 'Node unreachable after an update', state: 'open' });
    mockClassifier({ verdict: 'duplicate', issue_number: 772, confidence: 0.95 });
    route({ match: (u, method) => u.host === 'api.github.com' && method === 'POST', respond: () => new Response('forbidden', { status: 403 }) });
    const { id, url } = await seedMedia();
    await runDrain();
    expect((await getSubmission(id)).published_issue).toBeNull();
    expect((await callWorker(new Request(url))).status).toBe(404);
  });
});
