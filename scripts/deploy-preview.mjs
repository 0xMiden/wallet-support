#!/usr/bin/env node
/**
 * Deploy the Help Center to a Cloudflare Pages preview branch and write the
 * deploy record in the same run.
 *
 *   yarn deploy:preview <preview-branch>
 *
 * The record used to be prose, typed into tasks/todo.md after each deploy, and
 * copied again into notes elsewhere. Prose written after the fact drifts: one
 * deploy went unrecorded and the notes kept naming the one before it as live.
 * So nothing here is typed by hand. The command that uploads is the command
 * that records, from what it built and what Cloudflare answered:
 *
 * - dist/deploy-record.json is written into the build before upload, so every
 *   deployment serves its own commit and asset hashes at /deploy-record.json.
 *   What a preview URL is serving can be read from the URL itself.
 * - tasks/deployments.jsonl gains one line per deploy: the served record plus
 *   the deployment id, URL, alias, environment and timestamp Wrangler reports,
 *   and the result of checking the deployed files against the build. Commit it
 *   in the pull request being previewed.
 *
 * Refuses to run on anything a record could not honestly describe: a dirty
 * tree, a commit that is not on GitHub, a failing `yarn verify`, or the
 * production branch.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = 'bread-wallet-help-center-preview';
const WRANGLER = 'wrangler@4.131.1';
// The Pages project's production branch. Production is published separately,
// never through this command.
const PRODUCTION_BRANCH = 'main';
const RECORDS = 'tasks/deployments.jsonl';
const SERVED_RECORD = 'deploy-record.json';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');

function fail(message) {
  console.error(`deploy:preview: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', ...options });
  if (result.error) fail(`${command} did not start: ${result.error.message}`);
  return result;
}

function git(...args) {
  const result = run('git', args);
  if (result.status !== 0) fail(`git ${args.join(' ')} failed:\n${result.stderr}`);
  return result.stdout.trim();
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile())
    .map(entry => relative(directory, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
}

/** The `/*` rule of public/_headers, the same reading vite.config.ts makes. */
function declaredHeaders() {
  const headers = {};
  for (const line of readFileSync(join(root, 'public/_headers'), 'utf8').split('\n')) {
    const header = /^\s+([A-Za-z-]+):\s*(\S.*)$/.exec(line);
    if (header) headers[header[1].toLowerCase()] = header[2].trim();
  }
  return headers;
}

// --- preconditions ---------------------------------------------------------

const branch = process.argv[2];
if (!branch) fail('name the preview branch: yarn deploy:preview <preview-branch>');
// Pages rewrites other characters when it builds the alias hostname; asking
// for the rewritten form keeps the alias URL in the record the real one.
if (!/^[a-z0-9]([a-z0-9-]{0,26}[a-z0-9])?$/.test(branch)) {
  fail(`"${branch}" is not a usable alias: lowercase letters, digits and hyphens, at most 28 characters`);
}
if (branch === PRODUCTION_BRANCH) fail(`"${PRODUCTION_BRANCH}" is the production branch; this command deploys previews only`);

if (git('status', '--porcelain') !== '') fail('the working tree has changes; commit them so the record names what was built');

const commit = git('rev-parse', 'HEAD');
git('fetch', '--quiet', 'origin');
if (git('branch', '--remotes', '--contains', commit) === '') {
  fail(`${commit.slice(0, 7)} is not on GitHub yet; push it so the record names a commit others can read`);
}
const subject = git('log', '-1', '--format=%s', commit);
const gitRef = git('rev-parse', '--abbrev-ref', 'HEAD');

// The record names a commit, so the build has to be one anyone can repeat from
// it. A local install that had drifted from yarn.lock once shipped Vite 8.0.8
// for days after the lockfile moved to 8.0.16: same commit, different JavaScript.
console.log('deploy:preview: yarn install --frozen-lockfile');
if (run('yarn', ['install', '--frozen-lockfile'], { stdio: 'inherit' }).status !== 0) {
  fail('yarn install --frozen-lockfile failed; nothing was deployed');
}

console.log(`deploy:preview: yarn verify on ${commit.slice(0, 7)} (typecheck, unit, e2e, build)`);
if (run('yarn', ['verify'], { stdio: 'inherit' }).status !== 0) fail('yarn verify failed; nothing was deployed');

// --- the served record -----------------------------------------------------

const assets = Object.fromEntries(
  filesUnder(dist)
    .filter(file => file !== SERVED_RECORD)
    .map(file => [file, sha256(readFileSync(join(dist, file)))])
);
const served = { commit, subject, builtAt: new Date().toISOString(), assets };
writeFileSync(join(dist, SERVED_RECORD), `${JSON.stringify(served, null, 2)}\n`);

// --- deploy ----------------------------------------------------------------

const outputDirectory = mkdtempSync(join(tmpdir(), 'deploy-preview-'));
const outputFile = join(outputDirectory, 'wrangler-output.ndjson');
const deploy = run(
  'npx',
  [
    '--yes', WRANGLER, 'pages', 'deploy', 'dist',
    `--project-name=${PROJECT}`, `--branch=${branch}`,
    `--commit-hash=${commit}`, `--commit-message=${subject}`, '--commit-dirty=false'
  ],
  { stdio: 'inherit', env: { ...process.env, WRANGLER_OUTPUT_FILE_PATH: outputFile } }
);
if (deploy.status !== 0) fail('wrangler pages deploy failed; no record written');

const reported = readFileSync(outputFile, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line))
  .find(entry => entry.type === 'pages-deploy-detailed');
rmSync(outputDirectory, { recursive: true, force: true });
if (!reported) fail('wrangler reported no deployment details; check the dashboard, no record written');

// --- check the deployment against the build --------------------------------

const problems = [];
const checkedFiles = [...Object.keys(assets).filter(file => file !== '_headers'), SERVED_RECORD];

async function fetchOnce(path) {
  const response = await fetch(`${reported.url}/${path}`, { cache: 'no-store', redirect: 'manual' });
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}

for (const file of checkedFiles) {
  const expected = sha256(readFileSync(join(dist, file)));
  let actual = '';
  // A new deployment can answer from the edge a moment before every file is there.
  for (let attempt = 0; attempt < 6 && actual !== expected; attempt += 1) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 5000));
    const { response, bytes } = await fetchOnce(file === 'index.html' ? '' : file);
    actual = response.ok ? sha256(bytes) : `HTTP ${response.status}`;
  }
  if (actual !== expected) problems.push(`${file}: served ${actual.slice(0, 12)}, built ${expected.slice(0, 12)}`);
}

const { response: document } = await fetchOnce('');
const headers = declaredHeaders();
for (const [name, value] of Object.entries(headers)) {
  if (document.headers.get(name) !== value) problems.push(`header ${name}: served ${document.headers.get(name) ?? 'none'}`);
}
if (reported.environment !== 'preview') problems.push(`environment is ${reported.environment}, not preview`);

// --- record ----------------------------------------------------------------

const record = {
  deployedAt: reported.timestamp,
  project: reported.pages_project,
  environment: reported.environment,
  branch,
  deploymentId: reported.deployment_id,
  url: reported.url,
  alias: reported.alias ?? null,
  commit,
  subject,
  gitRef,
  wrangler: WRANGLER,
  assets,
  checked: { files: checkedFiles.length, headers: Object.keys(headers), problems }
};
appendFileSync(join(root, RECORDS), `${JSON.stringify(record)}\n`);

console.log(`\ndeploy:preview: ${record.deploymentId} (${record.environment}) from ${commit.slice(0, 7)}`);
console.log(`  ${record.url}\n  ${record.alias ?? '(no alias reported)'}`);
console.log(`  record appended to ${RECORDS}; commit it in this branch's pull request`);
if (problems.length > 0) fail(`the deployment does not match the build:\n  ${problems.join('\n  ')}`);
console.log(`  ${checkedFiles.length} files and ${Object.keys(headers).length} headers match the build`);
