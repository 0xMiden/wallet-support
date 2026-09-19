/**
 * Phase 0 regression — ingest path, CURRENT behaviour.
 * Plan §10 tests 1-6. Nothing here asserts spam behaviour; it exists so the
 * spam layer cannot change any of this without a test going red.
 */
import { env } from 'cloudflare:test';
import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import {
  callWorker, installFetchStub, restoreFetch, mockTurnstile, submitRequest,
  getSubmission, countSubmissions, getStateLog, callsTo,
} from './helpers';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });

describe('ingest', () => {
  it('1. accepts a valid submission and parks it in `received`', async () => {
    mockTurnstile();
    const id = crypto.randomUUID();
    const res = await callWorker(submitRequest({ submission_id: id }));

    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ ok: true, submission_id: id, status: 'received' });

    const row = await getSubmission(id);
    expect(row.state).toBe('received');
    expect(row.body_sanitized).toContain('balance is wrong');
    expect(row.body_hash).toHaveLength(64);
    // reporter_key must be written at ingest or the per-reporter publish cap
    // has nothing to key on an hour later (migration 0004).
    expect(row.reporter_key).toHaveLength(64);
    expect(row.attempts).toBe(0);

    const log = await getStateLog(id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ from_state: null, to_state: 'received' });
  });

  it('2. rejects a submission whose Turnstile token fails verification', async () => {
    mockTurnstile({ ok: false, codes: ['invalid-input-response'] });
    const before = await countSubmissions();
    const id = crypto.randomUUID();

    const res = await callWorker(submitRequest({ submission_id: id }));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({
      error: 'challenge failed', codes: ['invalid-input-response'],
    });
    expect(await getSubmission(id)).toBeNull();
    expect(await countSubmissions()).toBe(before);
  });

  it('3. rejects a direct API submission carrying no token, without calling siteverify', async () => {
    mockTurnstile();
    const before = await countSubmissions();
    const id = crypto.randomUUID();

    const res = await callWorker(submitRequest({ submission_id: id, turnstile_token: null }));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ codes: ['missing-input-response'] });
    expect(await getSubmission(id)).toBeNull();
    expect(await countSubmissions()).toBe(before);
    // Short-circuited before the round trip — a missing token is not worth one.
    expect(callsTo('challenges.cloudflare.com')).toHaveLength(0);
  });

  it('4. rate limits repeated submissions from one install id', async () => {
    mockTurnstile();
    const install = crypto.randomUUID();
    const limit = Number(env.RATE_LIMIT_PER_HOUR);

    for (let i = 0; i < limit; i++) {
      const res = await callWorker(submitRequest({ install_id: install }));
      expect(res.status).toBe(202);
    }

    const blocked = crypto.randomUUID();
    const res = await callWorker(submitRequest({ submission_id: blocked, install_id: install }));

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'rate limited' });
    // The limiter fires BEFORE persistence — nothing is recorded.
    expect(await getSubmission(blocked)).toBeNull();
  });

  it('5. quarantines secret material, redacts the body, and still answers 202', async () => {
    mockTurnstile();
    const id = crypto.randomUUID();

    const res = await callWorker(submitRequest({
      submission_id: id,
      body: 'my seed phrase: abandon abandon abandon ability able about above absent',
    }));

    // 202 on purpose: a false positive must not tell an attacker it tripped.
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ status: 'received' });

    const row = await getSubmission(id);
    expect(row.state).toBe('quarantined');
    expect(row.body_sanitized).toBe('[redacted — secret material detected]');
    expect(row.quarantine_reason).toContain('labelled_seed');
    // The words never reach storage.
    expect(row.body_sanitized).not.toContain('abandon');
  });

  it('6. treats a repeated submission_id as a retry, not a second report', async () => {
    mockTurnstile();
    const id = crypto.randomUUID();

    const first = await callWorker(submitRequest({ submission_id: id }));
    expect(first.status).toBe(202);

    const second = await callWorker(submitRequest({ submission_id: id, body: 'a completely different report body here' }));

    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ status: 'duplicate_submission' });

    // Idempotency layer 1: the original row is untouched.
    const row = await getSubmission(id);
    expect(row.body_sanitized).toContain('balance is wrong');
    const dupes = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM submissions WHERE submission_id = ?'
    ).bind(id).first<{ n: number }>();
    expect(dupes?.n).toBe(1);
  });
});
