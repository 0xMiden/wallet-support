import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { deployedFilePath, publicAssetPaths, validatePublicAsset } from './asset-validation.mjs';

test('only owned static assets use local build validation', () => {
  assert.deepEqual(publicAssetPaths('https://support.miden.xyz/bread.png?v=1', '/repo'), { source: '/repo/public/bread.png', built: '/repo/dist/bread.png' });
  for (const url of ['https://example.com/bread.png', 'https://support.miden.xyz/topics', 'https://support.miden.xyz/feedback', 'http://support.miden.xyz/bread.png']) assert.equal(publicAssetPaths(url, '/repo'), null);
  assert.throws(() => publicAssetPaths('https://support.miden.xyz/%2f..%2foutside.png', '/repo'), /leaves/);
});

test('public assets must exist, be nonempty, and match the built output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'support-asset-check-'));
  try {
    await Promise.all(['public', 'dist'].map(dir => mkdir(join(root, dir))));
    const paths = publicAssetPaths('https://support.miden.xyz/bread.png', root);
    await assert.rejects(validatePublicAsset(paths), /ENOENT/);
    await writeFile(paths.source, 'image');
    await assert.rejects(validatePublicAsset(paths), /ENOENT/);
    await writeFile(paths.built, 'wrong');
    await assert.rejects(validatePublicAsset(paths), /differs/);
    await writeFile(paths.built, 'image');
    await validatePublicAsset(paths);
    await Promise.all([paths.source, paths.built].map(path => writeFile(path, '')));
    await assert.rejects(validatePublicAsset(paths), /empty/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('deployed directory documents use canonical URLs without following arbitrary redirects', () => {
  assert.equal(deployedFilePath('index.html'), '');
  assert.equal(deployedFilePath('topics/index.html'), 'topics/');
  assert.equal(deployedFilePath('feedback/index.html'), 'feedback/');
  assert.equal(deployedFilePath('assets/index.html.png'), 'assets/index.html.png');
  assert.equal(deployedFilePath('deploy-record.json'), 'deploy-record.json');
});
