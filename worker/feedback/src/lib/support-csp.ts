// Native browser MP4 documents load their media from their own URL.
export const PUBLIC_MEDIA_CSP = "default-src 'none'; media-src 'self'; sandbox";

export const BASE_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
export const FEEDBACK_CSP =
  "default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
export const isSupportPage = (path: string) => ['/', '/topics', '/feedback'].includes(path);
export function supportCsp(path: string, nonce: string) {
  return (isSupportPage(path) ? FEEDBACK_CSP : BASE_CSP).replace(
    "style-src 'self'",
    `style-src 'self' 'nonce-${nonce}'`
  );
}
