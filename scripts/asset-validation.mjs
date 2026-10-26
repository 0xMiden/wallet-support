import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const PUBLIC_ASSET_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2']);

// Owned static assets ship with this commit. Their future production URLs
// must be checked against the build, independently of the currently live site.
export function publicAssetPaths(value, root) {
  const url = new URL(value);
  if (url.origin !== 'https://support.miden.xyz') return null;
  const path = decodeURIComponent(url.pathname);
  if (!PUBLIC_ASSET_EXTENSIONS.has(extname(path).toLowerCase())) return null;
  const paths = {};
  for (const [name, directory] of [['source', 'public'], ['built', 'dist']]) {
    const base = resolve(root, directory);
    const file = resolve(base, `.${path}`);
    if (!file.startsWith(`${base}${sep}`)) throw new Error('Asset path leaves its public directory');
    paths[name] = file;
  }
  return paths;
}

export async function validatePublicAsset({ source, built }) {
  const [original, output] = await Promise.all([readFile(source), readFile(built)]);
  if (!original.length) throw new Error('Public asset is empty');
  if (!original.equals(output)) throw new Error('Built public asset differs from its source');
}

// Pages canonicalizes nested index documents to their directory URL. Request
// that exact URL while retaining manual redirect handling for all other files.
export function deployedFilePath(file) {
  return file === 'index.html' || file.endsWith('/index.html') ? file.slice(0, -'index.html'.length) : file;
}
