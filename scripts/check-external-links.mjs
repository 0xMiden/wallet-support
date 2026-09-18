import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SCANNED_EXTENSIONS = new Set(['.html', '.json', '.md', '.ts', '.tsx']);
const IGNORED_DIRECTORIES = new Set(['.git', 'dist', 'node_modules', 'playwright-report', 'test-results']);
const URL_PATTERN = /https?:\/\/[^\s<>'")\]]+/g;
const MAX_ATTEMPTS = 3;
const CONCURRENCY = 8;

function isPrivateHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) files.push(...(await sourceFiles(join(directory, entry.name))));
    } else if (
      SCANNED_EXTENSIONS.has(extname(entry.name)) &&
      entry.name !== 'yarn.lock' &&
      !entry.name.includes('.test.')
    ) {
      files.push(join(directory, entry.name));
    }
  }

  return files;
}

function cleanUrl(candidate) {
  return candidate.replace(/[`.,;:!?]+$/, '');
}

async function collectLinks() {
  const links = new Map();

  const files = [
    join(ROOT, 'README.md'),
    join(ROOT, 'index.html'),
    ...(await sourceFiles(join(ROOT, 'content-source'))),
    ...(await sourceFiles(join(ROOT, 'src')))
  ];

  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const match of content.matchAll(URL_PATTERN)) {
      const value = cleanUrl(match[0]);
      let url;
      try {
        url = new URL(value);
      } catch {
        continue;
      }
      if (isPrivateHost(url.hostname)) continue;
      const locations = links.get(value) ?? [];
      locations.push(relative(ROOT, file));
      links.set(value, locations);
    }
  }

  return links;
}

async function request(url, method) {
  const response = await fetch(url, {
    method,
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
    headers: { 'user-agent': '0xMiden-wallet-support-link-check/1.0' }
  });
  await response.body?.cancel();
  return response.status;
}

async function checkLink(url) {
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      let status = await request(url, 'HEAD');
      if (status === 405 || status === 501) status = await request(url, 'GET');

      if ((status >= 200 && status < 400) || status === 403 || status === 429) {
        return { ok: true, status };
      }
      if (status < 500) return { ok: false, status };
      lastError = `HTTP ${status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    if (attempt < MAX_ATTEMPTS) await new Promise(resolve => setTimeout(resolve, attempt * 1_000));
  }

  return { ok: false, error: lastError };
}

async function main() {
  const links = [...(await collectLinks()).entries()];
  const failures = [];
  let next = 0;

  async function worker() {
    while (next < links.length) {
      const [url, locations] = links[next++];
      const result = await checkLink(url);
      if (!result.ok) failures.push({ url, locations, ...result });
      else console.log(`✓ ${result.status} ${url}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, links.length) }, () => worker()));

  if (failures.length > 0) {
    console.error(`\n${failures.length} dead external link(s):`);
    for (const failure of failures) {
      const reason = failure.status ? `HTTP ${failure.status}` : failure.error;
      console.error(`- ${failure.url} (${reason})\n  ${[...new Set(failure.locations)].join(', ')}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`\nChecked ${links.length} external links.`);
}

await main();
