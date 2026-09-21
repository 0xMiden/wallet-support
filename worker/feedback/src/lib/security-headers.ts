import { BASE_CSP, FEEDBACK_CSP, isSupportPage, supportCsp } from './support-csp';

export function withRouteSecurityHeaders(request: Request, response: Response): Response {
  const pathname = new URL(request.url).pathname;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const headers = new Headers(response.headers);
  if (path === '/feedback') headers.set('content-security-policy', FEEDBACK_CSP);
  else if (!headers.has('content-security-policy'))
    headers.set('content-security-policy', BASE_CSP);
  if (!headers.has('x-frame-options')) headers.set('x-frame-options', 'DENY');
  if (!headers.has('x-content-type-options')) headers.set('x-content-type-options', 'nosniff');
  if (!headers.has('referrer-policy'))
    headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  // Radix injects scroll-lock and select viewport styles. Authorize those with
  // a fresh nonce, without weakening script-src or permitting arbitrary CSS.
  if (
    isSupportPage(path) &&
    response.status === 200 &&
    (headers.get('content-type') ?? '').startsWith('text/html')
  ) {
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
    headers.set('content-security-policy', supportCsp(path, nonce));
    headers.set('cache-control', 'private, no-store');
    headers.delete('etag');
    headers.delete('content-length');
    const secured = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
    return new HTMLRewriter()
      .on('head', {
        element(element) {
          element.prepend(`<meta name="style-nonce" content="${nonce}">`, { html: true });
        }
      })
      .transform(secured);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
