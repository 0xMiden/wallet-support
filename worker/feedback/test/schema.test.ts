/**
 * Plan §2 — the spam columns exist, and NULL means clean.
 *
 * Two failure modes this guards, both silent:
 *
 *   1. DRIFT. `migrations/0005_spam.sql` is what production gets; `schema.sql`
 *      is what a fresh `db:init` gets. Nothing forces them to agree, and a
 *      column present in one and missing from the other produces a dev
 *      database that passes every test and a production database that throws
 *      on the first write — or the reverse, which is worse.
 *   2. FAIL-OPEN. Every later phase reads `spam_status IS NULL` as clean. If a
 *      DEFAULT or NOT NULL is ever added to that column, rows stop being
 *      neutral at rest and the guard's meaning changes without the guard
 *      changing. That is a one-word edit to a schema file with a very quiet
 *      blast radius.
 *
 * The suite seeds from `schema.sql`, so what this file inspects IS that file.
 *
 * Numbered S1-S5: these are additions, not plan §10 cases, and 17 belongs to
 * the flood tests.
 */
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { seedSubmission } from './helpers';

const SPAM_COLUMNS = [
  'spam_status', 'spam_score', 'spam_reasons',
  'spam_reviewed_at', 'spam_reviewed_by',
  'normalized_hash', 'reporter_kind',
] as const;

async function columns(): Promise<Map<string, { type: string; notnull: number; dflt: unknown }>> {
  const { results } = await env.DB.prepare('PRAGMA table_info(submissions)').all<any>();
  return new Map(results.map((r) => [r.name, { type: r.type, notnull: r.notnull, dflt: r.dflt_value }]));
}

describe('schema — store reviews', () => {
  /**
   * The drift checker and the test database build their schema by DIFFERENT
   * routes, and only one of them is sqlite's own parser.
   *
   * check-schema-drift.py uses `executescript`. test/setup.ts strips `--`
   * comments line by line, splits on `;`, and runs the pieces — a hand-rolled
   * splitter, over 11KB of new commented DDL. If it ever mangles a statement,
   * the drift checker still passes (it never sees the splitter) and every test
   * still passes (Phase 0 issues no query that needs an index). This asserts
   * the one thing that would otherwise go unnoticed until a query got slow in
   * production.
   */
  it('S6. the test database really has every store index the migration defines', async () => {
    const { results } = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_sr%' ORDER BY name`
    ).all<{ name: string }>();
    expect(results.map((r) => r.name)).toEqual([
      'idx_sr_classify', 'idx_sr_created', 'idx_sr_handoff', 'idx_sr_handoff_sub',
      'idx_sr_platform_id', 'idx_sr_queue', 'idx_sr_rating', 'idx_sr_reply',
      'idx_sr_version', 'idx_sre_review', 'idx_srr_pending', 'idx_srr_review',
      'idx_srv_review', 'idx_srv_unique',
    ]);
  });

  it('S7. the uniqueness that makes re-syncing idempotent is really unique', async () => {
    const { results } = await env.DB.prepare(
      `SELECT name, "unique" AS uniq FROM pragma_index_list('store_reviews')`
    ).all<{ name: string; uniq: number }>();
    const byName = new Map(results.map((r) => [r.name, r.uniq]));
    // Without this, a re-sync of the same window duplicates every review.
    expect(byName.get('idx_sr_platform_id')).toBe(1);
    // Without this, two concurrent handoffs could both claim one submission id.
    expect(byName.get('idx_sr_handoff_sub')).toBe(1);
  });
});

describe('schema — spam layer', () => {
  it('S1. schema.sql carries every column migration 0005 adds', async () => {
    const cols = await columns();
    for (const name of SPAM_COLUMNS) {
      expect(cols.has(name), `schema.sql is missing ${name}`).toBe(true);
    }
  });

  it('S2. declares the types the pipeline expects', async () => {
    const cols = await columns();
    expect(cols.get('spam_status')!.type).toBe('TEXT');
    expect(cols.get('spam_reasons')!.type).toBe('TEXT');   // JSON array of CODES
    expect(cols.get('spam_reviewed_by')!.type).toBe('TEXT');
    expect(cols.get('reporter_kind')!.type).toBe('TEXT');
    expect(cols.get('normalized_hash')!.type).toBe('TEXT');
    expect(cols.get('spam_reviewed_at')!.type).toBe('INTEGER');
    // REAL, and telemetry only — no code path may branch on it.
    expect(cols.get('spam_score')!.type).toBe('REAL');
  });

  it('S3. leaves every spam column nullable with no default — NULL means clean', async () => {
    const cols = await columns();
    for (const name of SPAM_COLUMNS) {
      expect(cols.get(name)!.notnull, `${name} must stay nullable`).toBe(0);
      expect(cols.get(name)!.dflt ?? null, `${name} must have no default`).toBe(null);
    }
  });

  it('S4. an ordinary ingest INSERT leaves spam_status NULL, not a verdict', async () => {
    // The fail-open contract at the row level: nothing written by the current
    // ingest path may imply a spam judgement no classifier made.
    const id = await seedSubmission();
    const row = await env.DB.prepare(
      'SELECT spam_status, spam_score, spam_reasons, spam_reviewed_at, reporter_kind FROM submissions WHERE submission_id=?'
    ).bind(id).first<any>();

    expect(row.spam_status).toBe(null);
    expect(row.spam_score).toBe(null);
    expect(row.spam_reasons).toBe(null);
    expect(row.spam_reviewed_at).toBe(null);
    // Phase 2 starts populating this at ingest. Until then it must stay NULL —
    // a flood COUNT that matches on it would silently match nothing.
    expect(row.reporter_kind).toBe(null);
  });

  it('S5. creates the two indexes the review queue and flood check need', async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='submissions'"
    ).all<any>();
    const names = results.map((r) => r.name);
    expect(names).toContain('idx_sub_spam');
    expect(names).toContain('idx_sub_flood');
  });
});
