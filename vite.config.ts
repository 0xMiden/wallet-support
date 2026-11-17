import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

import { ASK_CORPUS_FILE, buildAskCorpus } from './src/help-center/askCorpus';

/*
 * The articles the Ask assistant answers from, read from the same Markdown files
 * the pages render (src/help-center/askCorpus.ts explains the shape). Written on
 * every build, so a deploy can never pair new pages with an old article set.
 */
function askCorpusSource(): string {
  const directory = fileURLToPath(new URL('./src/help-center/content/', import.meta.url));
  const modules = Object.fromEntries(
    readdirSync(directory)
      .filter(file => file.endsWith('.md'))
      .map(file => [`./content/${file}`, readFileSync(`${directory}${file}`, 'utf8')])
  );
  return JSON.stringify(buildAskCorpus(modules));
}

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
      if (rule !== '/*') throw new Error(`public/_headers: vite preview only mirrors the /* rule, found ${rule}`);
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
      throw new Error('VITE_TURNSTILE_SITE_KEY is required for production builds. Configure the public key for support.miden.xyz.');
    }
  }

  return {
    plugins: [react(), {
      name: 'public-route-documents',
      // Static hosts must be able to serve direct links without an SPA
      // fallback. Copy the final HTML, keeping Vite's absolute asset URLs.
      generateBundle: {
        order: 'post',
        handler(_options, bundle) {
          const document = bundle['index.html'];
          if (!document || document.type !== 'asset') throw new Error('Built index.html is missing');
          for (const path of ['topics', 'feedback']) {
            this.emitFile({ type: 'asset', fileName: `${path}/index.html`, source: document.source });
          }
        }
      }
    }, {
      name: 'ask-corpus',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: ASK_CORPUS_FILE, source: askCorpusSource() });
      }
    }],
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
