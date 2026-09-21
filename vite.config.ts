import { randomBytes } from 'node:crypto';
import { isSupportPage, supportCsp } from './worker/feedback/src/lib/support-csp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

/*
 * The headers Cloudflare Pages serves, read from public/_headers (the build
 * copies it into dist/). `vite preview` serves the same set, so the e2e suite
 * runs the built page under the real Content-Security-Policy and a change the
 * policy would block fails there rather than after a deploy. The dev server is
 * left without them: its HMR client injects inline script the policy refuses.
 *
 * Only a site-wide `/*` rule is understood. Anything else throws, so the two
 * servers cannot quietly disagree.
 */
function pagesHeaders(): Record<string, string> {
  const file = fileURLToPath(new URL('./public/_headers', import.meta.url));
  const headers: Record<string, string> = {};
  let rule: string | undefined;

  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    if (!/^\s/.test(line)) {
      rule = line.trim();
      if (rule !== '/*')
        throw new Error(`public/_headers: vite preview only mirrors the /* rule, found ${rule}`);
      continue;
    }

    const header = /^\s+([A-Za-z-]+):\s*(\S.*)$/.exec(line);
    if (!header || rule === undefined) throw new Error(`public/_headers: unreadable line: ${line}`);
    headers[header[1] as string] = (header[2] as string).trim();
  }

  return headers;
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_');
    const siteKey = env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey?.trim()) {
      throw new Error(
        'VITE_TURNSTILE_SITE_KEY is required for production builds. Configure the public key for support.miden.xyz.'
      );
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'support-preview-security',
        configurePreviewServer(server) {
          // Exercise the same CSP as the Worker, including fresh style nonces.
          server.middlewares.use((request, response, next) => {
            const path =
              new URL(request.url ?? '/', 'http://localhost').pathname.replace(/\/$/, '') || '/';
            if (!isSupportPage(path) || !['GET', 'HEAD'].includes(request.method ?? 'GET'))
              return next();
            const nonce = randomBytes(24).toString('base64');
            const html = readFileSync(
              fileURLToPath(new URL('./dist/index.html', import.meta.url)),
              'utf8'
            ).replace('<head>', `<head><meta name="style-nonce" content="${nonce}">`);
            for (const [name, value] of Object.entries(pagesHeaders()))
              response.setHeader(name, value);
            response.setHeader('Content-Security-Policy', supportCsp(path, nonce));
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.setHeader('Cache-Control', 'private, no-store');
            response.end(request.method === 'HEAD' ? undefined : html);
          });
        }
      }
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    build: {
      target: 'es2022'
    },
    preview: {
      headers: pagesHeaders()
    },
    test: {
      /*
       * Named explicitly. Vitest's default include also matches *.spec.ts, which
       * would pick up the Playwright specs in e2e/ and run them in the node
       * environment, where `page` does not exist. Relying on a filename to keep
       * the two suites apart would make the next e2e file the one that breaks
       * the unit run.
       */
      include: ['src/**/*.test.ts']
    }
  };
});
