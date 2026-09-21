/**
 * Plan §10 tests 26-29, 33 — the atomic publishing guard (Phase 4).
 *
 * Hardening only. Nothing here activates spam filtering: SPAM_GATE_ENABLED
 * stays "false" throughout, and every row that must not publish is put into
 * its state directly, exactly as a reviewer would.
 *
 * The guard's whole reason to exist is the window between the drain claiming a
 * row and the GitHub call landing. Test 27c is the only one that actually
 * opens that window; the rest prove the simpler cases it also covers.
 */
import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  runDrain, installFetchStub, restoreFetch, mockClassifier, mockClassifierDuring,
  mockCreateIssue, mockCreateComment, mockUpdateComment, seedSubmission, seedMirrorIssue,
  getSubmission, getStateLog, getDupLinks, callsTo, callsMentioning, resetGlobalGate,
} from './helpers';
import {
  claimForPublishing, applyReviewDecision, REVIEWABLE_STATES, edgeFor,
} from '../src/lib/publish-guard';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });
beforeEach(async () => { await resetGlobalGate(); });

describe('publish guard — the claim', () => {
  it('26a. refuses a suspected_spam row and makes no GitHub request', async () => {
    mockClassifier();
    mockCreateIssue(4300);
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('suspected_spam');
    expect(row.published_issue).toBe(null);
    // Scoped to THIS row: a drain tick also processes whatever else is
    // eligible, so a global count would fail for unrelated reasons.
    expect(callsMentioning('api.github.com', id)).toHaveLength(0);
  });

  it('26b. refuses a spam row and makes no GitHub request', async () => {
    mockClassifier();
    mockCreateIssue(4301);
    const id = await seedSubmission({ state: 'spam', spam_status: 'spam' });

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('spam');
    expect(row.published_issue).toBe(null);
    expect(callsMentioning('api.github.com', id)).toHaveLength(0);
  });

  it('26c. the drain never even selects a spam row', async () => {
    // Exclusion by ABSENCE from the claim filter, not by a check that could be
    // forgotten. If this ever regresses, 26a and 26b become the only thing
    // standing between a spam row and GitHub.
    mockClassifier();
    const marker = `sentinel-${crypto.randomUUID()}`;
    const id = await seedSubmission({
      state: 'spam', spam_status: 'spam',
      body_sanitized: `${marker} the wallet cannot reach the node`,
    });

    await runDrain();

    // No classifier call carrying this body means the row was never claimed.
    expect(callsMentioning('api.anthropic.com', marker)).toHaveLength(0);
    expect(await getStateLog(id)).toHaveLength(0);
  });

  it('27a. a refused claim is a hard stop: zero GitHub fetches, no state change', async () => {
    const id = await seedSubmission({ state: 'claimed', spam_status: 'spam' });

    const took = await claimForPublishing(env.DB, id, 'claimed');

    expect(took).toBe(false);
    expect((await getSubmission(id)).state).toBe('claimed');
    expect(callsMentioning('api.github.com', id)).toHaveLength(0);
    // A refused claim writes no audit row — nothing happened.
    expect(await getStateLog(id)).toHaveLength(0);
  });

  it('27b. accepts NULL and clean, refuses suspected and spam', async () => {
    const cases: Array<[string | null, boolean]> = [
      [null, true],          // legacy rows and everything pre-migration-0005
      ['clean', true],
      ['suspected', false],
      ['spam', false],
    ];
    for (const [status, expected] of cases) {
      const id = await seedSubmission({ state: 'claimed', spam_status: status });
      expect(await claimForPublishing(env.DB, id, 'claimed'), `spam_status=${status}`).toBe(expected);
    }
  });

  it('27c. TOCTOU: a reviewer marking the row spam mid-publish stops the write', async () => {
    // The window the guard exists for. The row is clean when the drain claims
    // it, so the front gate and the spam gate both pass on the in-memory copy;
    // only a conditional UPDATE against the database can catch this.
    mockCreateIssue(4302);
    const id = await seedSubmission();
    mockClassifierDuring(async () => {
      await env.DB.prepare(
        "UPDATE submissions SET spam_status='spam' WHERE submission_id=?"
      ).bind(id).run();
    });

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).not.toBe('published');
    expect(row.published_issue).toBe(null);
    // The decisive assertion: no GitHub request ever carried this row.
    expect(callsMentioning('api.github.com', id)).toHaveLength(0);
  });

  it('27d. the fold path is guarded too, and no comment is posted', async () => {
    // A fold writes onto a thread this service does not own, so it is if
    // anything the more expensive path to get wrong. It used to bypass both
    // the cap and the `publishing` state entirely.
    // The mirror title must share keywords with the body or retrieval never
    // offers it as a candidate, validateVerdict rejects the issue number, and
    // this test passes without ever reaching the fold path.
    await seedMirrorIssue({ number: 4303, title: 'Node unreachable on Android', state: 'open' });
    mockCreateComment(4303, 991);
    // A sentinel in the body, because the classifier mock answers EVERY call
    // in the tick — so another test's leftover row can legitimately fold onto
    // the same issue and a bare endpoint assertion fails for the wrong reason.
    const sentinel = `sentinel-${crypto.randomUUID()}`;
    const id = await seedSubmission({
      body_sanitized: `${sentinel} the wallet cannot reach the node after an update`,
    });
    mockClassifierDuring(async () => {
      await env.DB.prepare(
        "UPDATE submissions SET spam_status='spam' WHERE submission_id=?"
      ).bind(id).run();
    }, { verdict: 'duplicate', issue_number: 4303, confidence: 0.97 });

    await runDrain();

    const row = await getSubmission(id);
    // Proof the fold path really was taken: the match was accepted and stored.
    expect(row.matched_issue).toBe(4303);
    // No comment anywhere carried THIS report's text.
    expect(callsMentioning('api.github.com', sentinel)).toHaveLength(0);
    expect(await getDupLinks(id)).toHaveLength(0);
    expect(row.state).not.toBe('published');
  });

  it('28. a fold that IS allowed still works, and now has an in-flight state', async () => {
    // The behaviour change the guard introduces on the happy path: the fold
    // passes through `publishing`, so recoverStuckPublishing can clean it up
    // if the Worker dies mid-comment. It could not before.
    // Routed through the FINGERPRINT stage, which is deterministic.
    //
    // Retrieval merges fingerprint -> semantic -> keyword and truncates at
    // MAX_CANDIDATES. Embeddings are stubbed off, and the keyword pass keys on
    // error_code with `ORDER BY updated_at DESC LIMIT 5` -- so as other tests
    // accumulate similarly-titled mirror issues, this one drops out of the top
    // five under some shuffle orders, validateVerdict rejects the number as
    // out-of-candidates, and the report takes the new-issue path instead.
    // A unique fingerprint with one dup_link resolves to exactly one issue.
    const fp = `FP-${crypto.randomUUID()}`;
    await seedMirrorIssue({ number: 4304, title: 'Node unreachable on Android', state: 'open' });
    const prior = await seedSubmission({ fingerprint: fp, state: 'published' });
    await env.DB.prepare(
      'INSERT INTO dup_links (submission_id, issue_number, confidence, linked_at) VALUES (?,?,?,?)'
    ).bind(prior, 4304, 0.95, Date.now()).run();

    mockClassifier({ verdict: 'duplicate', issue_number: 4304, confidence: 0.97 });
    mockCreateComment(4304, 992);
    // BOTH fold paths mocked. The classifier mock answers every call in the
    // tick, so a row another test left behind can fold onto this same issue
    // first and create the rollup comment -- after which THIS row takes the
    // edit path instead. With only createComment mocked, that becomes an
    // unmocked fetch, a failure, a backoff, and a test that fails for a reason
    // unrelated to the guard, but only in the orders where it happens.
    mockUpdateComment(992);
    const id = await seedSubmission({ fingerprint: fp });

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    expect(await getDupLinks(id)).toHaveLength(1);
    expect(await getStateLog(id).then((l: any) => l.map((x: any) => x.to_state)))
      .toEqual(['claimed', 'publishing', 'published']);
  });

  it('29. a legacy row with spam_status NULL publishes normally', async () => {
    // Fail-open, and the reason it matters: there are real rows in production
    // that predate the spam layer. Failing tight would strand every one.
    mockClassifier();
    mockCreateIssue(4305);
    const id = await seedSubmission({ spam_status: null });

    await runDrain();

    const row = await getSubmission(id);
    expect(row.state).toBe('published');
    expect(row.published_issue).toBe(4305);
    expect(row.spam_status).toBe(null);
  });
});

describe('publish guard — reviewer ownership', () => {
  it('33a. a reviewer cannot touch a row the drain owns', async () => {
    for (const state of ['claimed', 'publishing', 'published', 'received']) {
      const id = await seedSubmission({ state });
      const res = await applyReviewDecision(env.DB, id, state, 'release', 'a@b.test');
      expect(res, `state=${state}`).toEqual({ ok: false, reason: 'not_reviewable' });
      expect((await getSubmission(id)).state).toBe(state);
    }
    expect(REVIEWABLE_STATES).toEqual(['suspected_spam', 'spam']);
  });

  it('33b. there is no spam → received edge, in one step, by any action', async () => {
    // The negative test that guards decision #1. Recovery is deliberately two
    // separate actions, so no single click and no single bug can move
    // confirmed spam toward GitHub.
    const id = await seedSubmission({ state: 'spam', spam_status: 'spam' });

    for (const action of ['release', 'confirm', 'restore'] as const) {
      const res = await applyReviewDecision(env.DB, id, 'spam', action, 'a@b.test');
      if (action === 'restore') {
        expect(res.ok).toBe(true);
        expect((await getSubmission(id)).state).toBe('suspected_spam');
      } else {
        expect(res, `spam --${action}-->`).toEqual({ ok: false, reason: 'edge_not_allowed' });
      }
    }
    expect(edgeFor('spam', 'release')).toBe(null);
  });

  it('33c. restore lands on `suspected`, so it does not inherit the sticky bypass', async () => {
    const id = await seedSubmission({ state: 'spam', spam_status: 'spam' });

    await applyReviewDecision(env.DB, id, 'spam', 'restore', 'rev@miden.test');

    const row = await getSubmission(id);
    expect(row.state).toBe('suspected_spam');
    // 'suspected', NOT 'clean' — the sticky bypass requires clean, so a
    // restored report still needs a human release before it can publish.
    expect(row.spam_status).toBe('suspected');
    expect(row.spam_reviewed_by).toBe('rev@miden.test');
    expect(row.spam_reviewed_at).toBeGreaterThan(0);
  });

  it('33d. release moves state and status together and names the reviewer', async () => {
    const id = await seedSubmission({ state: 'suspected_spam', spam_status: 'suspected' });

    const res = await applyReviewDecision(env.DB, id, 'suspected_spam', 'release', 'rev@miden.test');

    expect(res.ok).toBe(true);
    const row = await getSubmission(id);
    expect(row.state).toBe('received');
    expect(row.spam_status).toBe('clean');
    // Not a generic "reviewer" string: every decision names a person.
    expect(row.spam_reviewed_by).toBe('rev@miden.test');
    const log = await getStateLog(id);
    expect(log[log.length - 1].detail).toContain('review:release');
  });

  it('33e. a stale review click refuses rather than overwriting', async () => {
    // The row moved between rendering the queue and the click.
    const id = await seedSubmission({ state: 'spam', spam_status: 'spam' });

    const res = await applyReviewDecision(env.DB, id, 'suspected_spam', 'release', 'a@b.test');

    expect(res).toEqual({ ok: false, reason: 'row_moved' });
    expect((await getSubmission(id)).state).toBe('spam');
  });
});
