const BASE_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
const FEEDBACK_CSP = "default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";

// The contact form's policy: the one in public/_headers plus Turnstile's script and frame.
const CONTACT_CSP = "default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://contact.miden.xyz; frame-src https://challenges.cloudflare.com; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";

/** The policy a page gets in place of public/_headers. Only the two pages that draw a Turnstile widget have one. */
export function routeCsp(pathname: string): string | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/feedback') return FEEDBACK_CSP;
  if (path === '/contact') return CONTACT_CSP;
  return undefined;
}

export function withRouteSecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  const csp = routeCsp(new URL(request.url).pathname);
  if (csp) headers.set('content-security-policy', csp);
  else if (!headers.has('content-security-policy')) headers.set('content-security-policy', BASE_CSP);
  if (!headers.has('x-frame-options')) headers.set('x-frame-options', 'DENY');
  if (!headers.has('x-content-type-options')) headers.set('x-content-type-options', 'nosniff');
  if (!headers.has('referrer-policy')) headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
