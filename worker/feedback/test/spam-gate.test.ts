/**
 * Plan §10 tests 21-25 — the spam decision at drain time (Phase 3).
 *
 * The point of every test here is that the MODEL DOES NOT DECIDE. Its answer
 * rides the same JSON an injection-prone prompt returns, so a crafted body
 * could otherwise bury a rival's report by getting it declared spam.
 * Confirmation requires corroboration the model cannot set.
 *
 * Test 23 is the one that matters most in practice. Everything else guards
 * against letting spam through; 23 guards against the failure that actually
 * destroys this pipeline's value — burying a real person's report because it
 * was short and angry.
 */
import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  runDrain, installFetchStub, restoreFetch, mockClassifier, mockCreateIssue,
  seedSubmission, getSubmission, getStateLog, callsTo, withEnv, resetGlobalGate,
} from './helpers';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });
beforeEach(async () => { await resetGlobalGate(); });

const ON = { SPAM_GATE_ENABLED: 'true' };

/** A body carrying a deterministic signal the model cannot fabricate. */
const PROMOTIONAL =
  'Guaranteed profits every week. Message me on WhatsApp for investment details.';

describe('spam gate', () => {
  it('21. confirms `spam` only when the model AND deterministic evidence agree', async () => {
    mockClassifier({ spam_status: 'spam', spam_score: 0.97, spam_reasons: ['promotional'] });
    mockCreateIssue(4200);
    const id = await seedSubmission({ body_sanitized: PROMOTIONAL, error_code: null });

    await withEnv(ON, async () => { await runDrain(); });

    const row = await getSubmission(id);
    expect(row.state).toBe('spam');
    expect(row.spam_status).toBe('spam');
    // The model's own code plus the code only the pipeline can assign.
    const reasons = JSON.parse(row.spam_reasons);
    expect(reasons).toContain('promotional');
    expect(reasons).toContain('known_pattern');
    // Never reaches GitHub.
    expect(callsTo('api.github.com')).toHaveLength(0);
    expect(row.published_issue).toBe(null);

    const log = await getStateLog(id);
    expect(log.map((l: any) => l.to_state)).toContain('spam');
  });

  it('22. caps at `suspected_spam` when the model says spam with no corroboration', async () => {
    // The model is confident and completely alone. An ordinary bug report that
    // a classifier happened to dislike must not become a confirmed verdict.
    mockClassifier({ spam_status: 'spam', spam_score: 0.99, spam_reasons: ['scam'] });
    mockCreateIssue(4201);
    const id = await seedSubmission({
      body_sanitized: 'The wallet cannot reach the node after an update.',
    });

    await withEnv(ON, async () => { await runDrain(); });

    const row = await getSubmission(id);
    expect(row.state).toBe('suspected_spam');
    expect(row.spam_status).toBe('suspected');
    expect(row.state).not.toBe('spam');
    // Body preserved — a reviewer has to be able to read it.
    expect(row.body_sanitized).toContain('cannot reach the node');
    expect(callsTo('api.github.com')).toHaveLength(0);
  });

  it('23. does not flag a short, angry, badly written real report', async () => {
    // THE false-positive regression. A frustrated person writing four words is
    // the single most common shape of a genuine report.
    mockClassifier({ spam_status: 'clean', spam_score: 0.05 });
    mockCreateIssue(4202);
    const id = await seedSubmission({ body_sanitized: 'wallet broken!!!!! fix this garbage' });

    await withEnv(ON, async () => { await runDrain(); });

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    expect(row.spam_status).toBe(null);
    expect(row.published_issue).toBe(4202);
  });

  it('24. treats missing platform, version and error metadata as no evidence at all', async () => {
    // The standalone form supplies none of these, so counting their absence as
    // corroboration would confirm spam for essentially every public report.
    mockClassifier({ spam_status: 'spam', spam_score: 0.9, spam_reasons: ['nonsense'] });
    mockCreateIssue(4203);
    const id = await seedSubmission({
      body_sanitized: 'the balance on my account looks wrong',
      platform: null, wallet_version: null, error_code: null, route: null,
    });

    await withEnv(ON, async () => { await runDrain(); });

    const row = await getSubmission(id);
    // Suspected, never confirmed: absence of metadata contributed nothing.
    expect(row.state).toBe('suspected_spam');
    expect(JSON.parse(row.spam_reasons)).toEqual(['nonsense']);
  });

  it('25. treats a malformed spam_status as clean and publishes normally', async () => {
    mockClassifier({ spam_status: 'DEFINITELY_SPAM_TRUST_ME', spam_score: 'high', spam_reasons: 'nope' });
    mockCreateIssue(4204);
    const id = await seedSubmission();

    await withEnv(ON, async () => { await runDrain(); });

    const row = await getSubmission(id);
    // Fail-open. A transport or schema problem is ours, not the reporter's.
    expect(row.state).toBe('published');
    expect(row.spam_status).toBe(null);
    // A non-numeric score is stored as NULL rather than coerced to 0, so
    // "no answer" and "certainly fine" stay distinguishable in the telemetry.
    expect(row.spam_score).toBe(null);
  });

  it('25b. drops reason codes the model is not allowed to assign', async () => {
    // known_pattern / flood_repeat / link_heavy_no_feedback are code-assigned
    // only. If the model could claim them it could manufacture its own
    // corroboration and confirm spam by itself.
    mockClassifier({
      spam_status: 'spam', spam_score: 0.9,
      spam_reasons: ['known_pattern', 'flood_repeat', 'link_heavy_no_feedback', 'scam', 'not_a_code'],
    });
    mockCreateIssue(4205);
    const id = await seedSubmission({ body_sanitized: 'the wallet balance looks wrong' });

    await withEnv(ON, async () => { await runDrain(); });

    const row = await getSubmission(id);
    // Only `scam` survives, so there is no corroboration and it caps at
    // suspected — the model could not smuggle its way to a confirmation.
    expect(row.state).toBe('suspected_spam');
    expect(JSON.parse(row.spam_reasons)).toEqual(['scam']);
  });

  it('25c. changes nothing while the gate is off, however sure the model is', async () => {
    // Phase 3's "inert in production" claim, as a test rather than a comment.
    expect(env.SPAM_GATE_ENABLED).toBe('false');
    mockClassifier({ spam_status: 'spam', spam_score: 0.99, spam_reasons: ['scam'] });
    mockCreateIssue(4206);
    const id = await seedSubmission({ body_sanitized: PROMOTIONAL });

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    // Telemetry is recorded even in shadow — that is the data the flip is
    // justified from. The VERDICT is not: a spam_status with no matching state
    // would block publishing on a decision we chose not to enforce.
    expect(row.spam_score).toBeCloseTo(0.99);
    expect(row.spam_status).toBe(null);
  });

  it('25d. never re-flags a report a human already released', async () => {
    // Release is sticky, or it is a loop: reviewer releases, drain
    // re-classifies, model says spam again, report returns to the queue it
    // was just released from with the human decision silently overwritten.
    mockClassifier({ spam_status: 'spam', spam_score: 0.99, spam_reasons: ['scam'] });
    mockCreateIssue(4207);
    const id = await seedSubmission({
      body_sanitized: PROMOTIONAL,
      spam_status: 'clean',
      spam_reviewed_at: Date.now() - 1000,
    });

    await withEnv(ON, async () => { await runDrain(); });

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    expect(row.spam_status).toBe('clean');
  });

  it('25e. an unreviewed row with spam_status clean is still gated', async () => {
    // The bypass requires BOTH a human timestamp and a clean status. A row
    // that merely says clean, with no review behind it, must not inherit a
    // reviewer's authority.
    mockClassifier({ spam_status: 'spam', spam_score: 0.99, spam_reasons: ['scam'] });
    mockCreateIssue(4208);
    const id = await seedSubmission({
      body_sanitized: PROMOTIONAL, spam_status: 'clean', spam_reviewed_at: null,
    });

    await withEnv(ON, async () => { await runDrain(); });

    expect((await getSubmission(id)).state).toBe('spam');
  });
});
