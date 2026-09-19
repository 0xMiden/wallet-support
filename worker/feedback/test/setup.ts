/**
 * Seeds each test file's D1 with the SAME schema.sql that `npm run db:init`
 * deploys, so the suite can never pass against a shape production does not
 * have. Migrations are not replayed on top: schema.sql already carries every
 * column 0001-0004 added, and re-running them would fail on duplicates.
 */
import { env } from 'cloudflare:test';
import { beforeAll } from 'vitest';
import schemaSql from '../schema.sql?raw';

/** D1's exec() needs single-line statements; split and strip comments instead. */
function statements(sql: string): string[] {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

beforeAll(async () => {
  for (const stmt of statements(schemaSql)) {
    await env.DB.prepare(stmt).run();
  }

  /**
   * Workers AI is a REMOTE binding even in local dev — the pool warns that it
   * "may incur usage charges". A regression suite must not spend money or
   * depend on a live model, so it is replaced with a thrower.
   *
   * This is not a lost assertion: retrieveCandidates() already wraps
   * similarIssues() in try/catch and degrades to lexical retrieval by design
   * (pipeline.ts). These tests therefore exercise the DEGRADED retrieval path,
   * which is the one that must keep working when embeddings are unavailable.
   */
  (env as any).AI = {
    run: async () => { throw new Error('Workers AI disabled in tests'); },
  };
});
