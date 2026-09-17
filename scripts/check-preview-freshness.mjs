#!/usr/bin/env node
/**
 * Does the shared preview link serve what main builds?
 *
 *   yarn build && yarn check:preview-freshness [--url <link>] [--report <file>]
 *
 * Deploying the shared preview is a manual step, and nothing said when it was
 * missed: PRs #7 to #9 sat merged for days while help-center-shell still served
 * PR #3. This is what says so. It needs no Cloudflare credentials — the link is
 * public, and every deployment serves its own record at /deploy-record.json.
 *
 * It compares built files, not commits. Each deploy's record reaches main in a
 * pull request of its own, so main moves past the deployed commit without one
 * built file changing. A commit comparison would call that stale, and the
 * redeploy it asked for would write another record and go round again. The
 * record lists the sha256 of every file the deployment serves, so this builds
 * nothing itself: it reads dist/ after `yarn build` and hashes it by the rule
 * deploy-preview.mjs uses to write the record.
 *
 * Exit 0  the link serves exactly what this checkout builds
 * Exit 1  it does not
 * Exit 2  the check could not be made: no build, or no readable record
 *
 * --report writes the outcome as Markdown, for the workflow to put in an issue.
 * In GitHub Actions it also sets the step output `result` to match, behind or
 * unchecked. The workflow reads that, not the exit code: a crash also exits 1,
 * and must not pass for "behind".
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHARED_LINK = 'https://help-center-shell.bread-wallet-help-center-preview.pages.dev';
const SERVED_RECORD = 'deploy-record.json';
const LISTED = 10;

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');

function option(name) {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
}

const link = (option('--url') ?? SHARED_LINK).replace(/\/+$/, '');
const reportFile = option('--report');

const run = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : null;

function finish(code, summary, markdown) {
  const footer = run ? `\n\nChecked by the [Preview freshness run](${run}).\n` : '\n';
  const body = `${markdown.trim()}${footer}`;
  if (reportFile) writeFileSync(reportFile, body);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, body);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `result=${['match', 'behind', 'unchecked'][code]}\n`);
  }
  (code === 0 ? console.log : console.error)(`check:preview-freshness: ${summary}`);
  process.exit(code);
}

function cannotCheck(problem, advice) {
  finish(2, problem, [
    "The shared preview link couldn't be checked against main, so there's no telling what it serves.",
    '',
    `- **Link:** ${link}`,
    `- **Problem:** ${problem}`,
    '',
    advice
  ].join('\n'));
}

function git(...args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

// The same two rules as deploy-preview.mjs: every file under dist/, by its
// path with forward slashes, less the record itself.
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile())
    .map(entry => relative(directory, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
}

// --- what this checkout builds ---------------------------------------------

if (!existsSync(join(dist, 'index.html'))) {
  cannotCheck('there is no build to compare with', 'Run `yarn build` first, then the check.');
}
const built = Object.fromEntries(
  filesUnder(dist)
    .filter(file => file !== SERVED_RECORD)
    .map(file => [file, sha256(readFileSync(join(dist, file)))])
);
const commit = git('rev-parse', 'HEAD');
const here = { commit: commit.slice(0, 7), subject: git('log', '-1', '--format=%s') };

// --- what the link serves --------------------------------------------------

let served;
try {
  // The alias can hand out the previous deployment's files from the edge for a
  // minute or two after a deploy; a fresh query string asks past that.
  const response = await fetch(`${link}/${SERVED_RECORD}?cb=${Date.now()}`, {
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) {
    cannotCheck(
      `${SERVED_RECORD} answered HTTP ${response.status}`,
      'Open the link to see whether the site is up. If it is, its last deploy did not come from `yarn deploy:preview`, the only command that writes the record: redeploy with it.'
    );
  }
  served = JSON.parse(await response.text());
} catch (error) {
  cannotCheck(
    `${SERVED_RECORD} could not be read (${error instanceof Error ? error.message : String(error)})`,
    'If the site is down, that is the problem to fix first. If the record is not JSON, redeploy with `yarn deploy:preview help-center-shell`.'
  );
}

const assets = served?.assets;
if (
  typeof served?.commit !== 'string' ||
  assets === null ||
  typeof assets !== 'object' ||
  Object.values(assets).some(hash => typeof hash !== 'string')
) {
  cannotCheck(
    `${SERVED_RECORD} does not name a commit and the files it serves`,
    'Redeploy with `yarn deploy:preview help-center-shell`, which writes a complete record.'
  );
}

// --- the comparison --------------------------------------------------------

const changed = Object.keys(built).filter(file => file in assets && assets[file] !== built[file]);
const onlyBuilt = Object.keys(built).filter(file => !(file in assets));
const onlyServed = Object.keys(assets).filter(file => !(file in built)).sort();
const differing = changed.length + onlyBuilt.length + onlyServed.length;

// A commit subject is free text; a stray pipe would split its table cell.
// Backslashes first, or a subject ending in one would unescape the pipe after it.
const cell = text => String(text ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
const builtAt = typeof served.builtAt === 'string' ? ` (built ${served.builtAt.slice(0, 16).replace('T', ' ')} UTC)` : '';
const table = [
  '| | Commit | |',
  '|---|---|---|',
  `| **The link serves** | \`${served.commit.slice(0, 7)}\` | ${cell(served.subject)}${builtAt} |`,
  `| **This check built** | \`${here.commit}\` | ${cell(here.subject)} |`
].join('\n');

if (differing === 0) {
  finish(0, `${link} serves what ${here.commit} builds`, [
    'The shared preview link serves exactly the files this commit builds.',
    '',
    table,
    '',
    `Link: ${link}`
  ].join('\n'));
}

function list(title, files) {
  if (files.length === 0) return [];
  const shown = files.slice(0, LISTED).map(file => `- \`${file}\``);
  if (files.length > LISTED) shown.push(`- …and ${files.length - LISTED} more`);
  return [`**${title}:**`, ...shown, ''];
}

finish(1, `${link} does not serve what ${here.commit} builds (${differing} files differ)`, [
  "The shared preview link doesn't serve what main builds, so changes merged since its last deploy aren't visible there yet.",
  '',
  table,
  '',
  `${differing} ${differing === 1 ? 'file differs' : 'files differ'}. Built files are named by their content, so an edit usually shows as one file only in main and one only on the link.`,
  '',
  ...list('Changed', changed),
  ...list('Only in main', onlyBuilt),
  ...list('Only on the link', onlyServed),
  '**To fix it:** from an up-to-date `main`, run `yarn deploy:preview help-center-shell`, then commit the record it writes in a pull request. This issue closes itself at the next check once the link matches.',
  '',
  `Link: ${link}`
].join('\n'));
