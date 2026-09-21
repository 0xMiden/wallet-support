import { describe, expect, it } from 'vitest';
import { withRouteSecurityHeaders } from '../src/lib/security-headers';

const html = () =>
  new Response('<!doctype html><html><head><title>Support</title></head><body>Page</body></html>', {
    headers: { 'content-type': 'text/html', etag: 'old', 'cache-control': 'public, max-age=3600' }
  });
describe('public support style nonces', () => {
  it('uses a fresh matching nonce in the document and CSP without allowing inline scripts or styles', async () => {
    const nonces: string[] = [];
    for (let i = 0; i < 2; i++) {
      const result = withRouteSecurityHeaders(
        new Request('https://support.example/topics'),
        html()
      );
      const body = await result.text();
      const nonce = body.match(/name="style-nonce" content="([^"]+)"/)?.[1];
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{32}$/);
      nonces.push(nonce!);
      const policy = result.headers.get('content-security-policy')!;
      expect(policy).toContain(`style-src 'self' 'nonce-${nonce}'`);
      expect(policy).toContain("script-src 'self' https://challenges.cloudflare.com;");
      expect(policy).not.toContain('unsafe-inline');
      expect(result.headers.get('cache-control')).toBe('private, no-store');
      expect(result.headers.has('etag')).toBe(false);
    }
    expect(nonces[0]).not.toBe(nonces[1]);
  });
  it.each(['/', '/topics', '/feedback/'])('retains feedback verification allowances for SPA entry %s', async (path) => {
    const result = withRouteSecurityHeaders(
      new Request(`https://support.example${path}`),
      html()
    );
    expect(result.headers.get('content-security-policy')).toContain(
      'frame-src https://challenges.cloudflare.com'
    );
    expect(await result.text()).toContain('style-nonce');
  });
  it('does not rewrite admin documents or JSON responses', async () => {
    const admin = withRouteSecurityHeaders(new Request('https://support.example/admin'), html());
    expect(await admin.text()).not.toContain('style-nonce');
    const api = withRouteSecurityHeaders(
      new Request('https://support.example/api/status'),
      Response.json({ ok: true })
    );
    expect(await api.json()).toEqual({ ok: true });
    expect(api.headers.get('content-security-policy')).not.toContain('nonce-');
    expect(api.headers.get('content-security-policy')).not.toContain('challenges.cloudflare.com');
    expect(admin.headers.get('content-security-policy')).not.toContain('challenges.cloudflare.com');
  });
});
