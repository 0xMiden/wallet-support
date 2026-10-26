// Test-only static file server: deliberately no SPA fallback or API proxy.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const dist = resolve('dist');
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', woff2: 'font/woff2' };
createServer(async (request, response) => {
  let path = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (!path.split('/').at(-1)?.includes('.')) path = `${path.replace(/\/$/, '')}/index.html`;
  const file = resolve(dist, `.${path}`);
  if (!file.startsWith(`${dist}${sep}`)) { response.writeHead(404).end(); return; }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[file.split('.').at(-1)] ?? 'application/octet-stream' }).end(body);
  } catch { response.writeHead(404).end(); }
}).listen(4319, '127.0.0.1');
