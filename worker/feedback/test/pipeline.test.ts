/**
 * Phase 0 regression — drain + publish path, CURRENT behaviour.
 * Plan §10 tests 7-14.
 */
import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  runDrain, installFetchStub, restoreFetch, mockClassifier, mockClassifierDown,
  mockCreateIssue, mockCreateComment, seedSubmission, seedMirrorIssue,
  getSubmission, getDupLinks, getStateLog, callsTo, issueCreateBody, commentBody,
  exhaustGlobalGate, withEnv, resetGlobalGate,
} from './helpers';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });

// Durable Object storage is NOT rolled back between tests in this pool, so the
// cap test would otherwise leave the gate closed for whatever runs next.
// Without this the suite passes in declaration order and fails when shuffled.
beforeEach(async () => { await resetGlobalGate(); });

describe('drain + publish', () => {
  it('7. classifies a received row and files a new issue', async () => {
    mockClassifier({ verdict: 'new', title: 'Node unreachable after update' });
    mockCreateIssue(4001);
    const id = await seedSubmission();

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    expect(row.published_issue).toBe(4001);
    expect(row.verdict).toBe('new');
    expect(row.prompt_version).toBeTruthy();

    const sent = issueCreateBody();
    // No error-code prefix: the code is in the body's Environment table.
    expect(sent.title).toBe('Node unreachable after update');
    // The marker is idempotency layer 3 — without it a replay files twice.
    expect(sent.body).toContain(`<!-- mfv2:${id} -->`);
    // Exactly one label, by decision 2026-08-13.
    expect(sent.labels).toEqual(['feedback-form']);

    const log = await getStateLog(id);
    expect(log.map((l: any) => l.to_state)).toEqual(['claimed', 'publishing', 'published']);
  });

  it('8. defers without spending an attempt when both classifier keys fail', async () => {
    mockClassifierDown();
    const id = await seedSubmission();

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('deferred');
    // The claim incremented attempts; a deferral is not the submission's fault
    // and must give it back, or an outage burns the retry budget.
    expect(row.attempts).toBe(0);
    expect(row.next_attempt_at).toBeGreaterThan(Date.now());
    // Primary then fallback.
    expect(callsTo('api.anthropic.com')).toHaveLength(2);
    expect(callsTo('api.github.com')).toHaveLength(0);
  });

  it('9. folds a high-confidence match onto an OPEN issue and records it after the write', async () => {
    await seedMirrorIssue({ number: 501, title: 'Node unreachable on Android', state: 'open' });
    mockClassifier({ verdict: 'duplicate', issue_number: 501, confidence: 0.95 });
    mockCreateComment(501, 90210);
    const id = await seedSubmission();

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    // A fold is not an issue of its own.
    expect(row.published_issue).toBeNull();
    expect(row.matched_issue).toBe(501);

    const links = await getDupLinks(id);
    expect(links).toHaveLength(1);
    expect(links[0].issue_number).toBe(501);
    expect(links[0].confidence).toBeCloseTo(0.95);

    // The rolling comment carries the words, not just a count.
    const body = commentBody(501);
    expect(body.body).toContain('cannot reach the node');
    expect(body.body).toContain('<!-- mfv2-rollup -->');

    const rollup = await env.DB.prepare('SELECT value FROM sync_state WHERE key = ?')
      .bind('rollup:501').first<{ value: string }>();
    expect(rollup?.value).toBe('90210');
  });

  it('10. files its own issue with a real cross-reference when the match is CLOSED', async () => {
    await seedMirrorIssue({ number: 502, title: 'Node unreachable on Android', state: 'closed' });
    mockClassifier({ verdict: 'duplicate', issue_number: 502, confidence: 0.95 });
    mockCreateIssue(4002);
    const id = await seedSubmission();

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    expect(row.published_issue).toBe(4002);

    const sent = issueCreateBody();
    expect(sent.body).toContain('**Possibly related to #502, which was previously closed.**');
    // A closed issue is never reopened and never commented on.
    expect(await getDupLinks(id)).toHaveLength(0);
    expect(callsTo('api.github.com').filter((c) => c.url.includes('/comments'))).toHaveLength(0);
  });

  it('11. mentions a below-threshold match in plain text and spends no cross-reference', async () => {
    await seedMirrorIssue({ number: 503, title: 'Node unreachable on Android', state: 'open' });
    mockClassifier({ verdict: 'duplicate', issue_number: 503, confidence: 0.70 });
    mockCreateIssue(4003);
    const id = await seedSubmission();

    await runDrain();

    const sent = issueCreateBody();
    // Plain text, deliberately NOT `#503` — below AUTO_ACTION_THRESHOLD the
    // match has not earned a mark on someone else's issue.
    expect(sent.body).toContain('Possibly the same defect as issue 503');
    expect(sent.body).not.toContain('#503');
    expect(await getDupLinks(id)).toHaveLength(0);
    expect((await getSubmission(id)).state).toBe('published');
  });

  it('12. defers as `capped` when the global publish gate is closed', async () => {
    await exhaustGlobalGate();
    mockClassifier({ verdict: 'new' });
    // No createIssue mock: a call would throw "unmocked outbound fetch".
    const id = await seedSubmission();

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('capped');
    // Backpressure, not data loss — and not an attempt spent.
    expect(row.attempts).toBe(0);
    expect(row.next_attempt_at).toBeGreaterThan(Date.now());
    expect(callsTo('api.github.com')).toHaveLength(0);
  });

  it('13. kill switch stops the FOLD path, which bypasses the cap', async () => {
    await seedMirrorIssue({ number: 504, title: 'Node unreachable on Android', state: 'open' });
    mockClassifier({ verdict: 'duplicate', issue_number: 504, confidence: 0.95 });
    const id = await seedSubmission();

    await withEnv({ PUBLISH_ENABLED: 'false' }, async () => { await runDrain(); });

    const row = await getSubmission(id);
    // Deferred, not silently completed: marking it terminal would mean the
    // comment only ever appeared if some later report attached to the issue.
    expect(row.state).toBe('deferred');
    expect(await getDupLinks(id)).toHaveLength(0);
    expect(callsTo('api.github.com')).toHaveLength(0);
  });

  it('14. recovers a submission already on GitHub without filing it twice', async () => {
    const id = crypto.randomUUID();
    await seedMirrorIssue({ number: 505, title: 'Already filed', state: 'open', marker: id });
    await seedSubmission({ submission_id: id });

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    expect(row.published_issue).toBe(505);
    // Idempotency layer 3 fires before classification — neither upstream is touched.
    expect(callsTo('api.anthropic.com')).toHaveLength(0);
    expect(callsTo('api.github.com')).toHaveLength(0);
  });
});

/**
 * #779 filed as "[NODE_UNREACHABLE] Guardian operator unreachable shows raw
 * TypeError and creates failed row per ret" — exactly 80 characters after the
 * prefix, cut mid-word, no ellipsis. Two causes, one test block: the hard
 * slice in validateVerdict, and the prefix that both spent the budget and read
 * as machine-filed.
 */
describe('issue titles', () => {
  it('15. keeps a title the model wrote past the old 80-character cut', async () => {
    const long =
      'Guardian operator unreachable shows a raw TypeError and files a new failed row per retry';
    expect(long.length).toBeGreaterThan(80);
    mockClassifier({ verdict: 'new', title: long });
    mockCreateIssue(4201);
    await seedSubmission();

    await runDrain();

    const sent = issueCreateBody();
    // Whole. Not cut, not elided, not prefixed.
    expect(sent.title).toBe(long);
    expect(sent.title).not.toContain('…');
    expect(sent.title).not.toMatch(/^\[/);
  });

  it('16. strips a bracketed tag the model copied from an existing issue', async () => {
    // Every issue filed before this change opens with one, and candidates are
    // quoted into the prompt with their real titles — so the model is shown
    // the convention it is told not to use.
    mockClassifier({
      verdict: 'new',
      title: '[NODE_UNREACHABLE] Guardian operator unreachable during claim',
    });
    mockCreateIssue(4202);
    await seedSubmission();

    await runDrain();

    expect(issueCreateBody().title).toBe('Guardian operator unreachable during claim');
  });

  it('17. breaks a pathological title on a word boundary, never mid-word', async () => {
    const long =
      'Sending a private note fails silently whenever the guardian operator cannot be reached at all, ' +
      'and the wallet keeps retrying quietly in the background without ever telling the person what broke';
    expect(long.length).toBeGreaterThan(150);
    mockClassifier({ verdict: 'new', title: long });
    mockCreateIssue(4203);
    await seedSubmission();

    await runDrain();

    const title = issueCreateBody().title;
    expect(title.length).toBeLessThanOrEqual(121);
    expect(title.endsWith('…')).toBe(true);
    const kept = title.slice(0, -1);
    expect(long.startsWith(kept)).toBe(true);
    // The cut landed between words: what follows in the original is not a letter.
    expect(long.charAt(kept.length)).not.toMatch(/[A-Za-z]/);
  });

  it('18. falls back to the report\'s own first line when the model gives no title', async () => {
    mockClassifier({ verdict: 'new', title: '' });
    mockCreateIssue(4204);
    await seedSubmission({ body_sanitized: 'Balances vanish after I close the app\nmore detail here' });

    await runDrain();

    expect(issueCreateBody().title).toBe('Balances vanish after I close the app');
  });
});
