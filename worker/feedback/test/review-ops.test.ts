/**
 * Plan §10 tests 43-45 and 48 — overdue signals and attachment retention
 * (Phase 7).
 *
 * Decision #4 forbids auto-release, so a queue nobody looks at holds real
 * reports forever. Nothing here releases anything; it only makes the silence
 * audible. The two properties that matter are that an alert fires ONCE per
 * tier — 672 messages a week is the same as none — and that it carries no
 * report body.
 */
import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  runMirrorCron, installFetchStub, restoreFetch, mockIssueList, mockOpsWebhook, opsAlerts,
  seedSubmission, getSubmission, getStateLog, callWorker, withEnv,
} from './helpers';
import {
  opsConfig, overdueCounts, alertOverdue, purgeSpamAttachments,
} from '../src/lib/review-ops';
import { applyReviewDecision } from '../src/lib/publish-guard';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });

const H = 3_600_000;
const D = 86_400_000;

/** Messages mentioning ONE submission. alertOverdue is global over the whole
 *  table, so a bare count also sees rows other tests left behind. */
function alertsFor(id: string): any[] {
  return opsAlerts().filter((a) => String(a.text ?? '').includes(id));
}

/** A suspected row that has been waiting `hours` for a human. */
function waiting(hours: number, over: Record<string, unknown> = {}) {
  return seedSubmission({
    state: 'suspected_spam', spam_status: 'suspected',
    spam_reasons: JSON.stringify(['flood_repeat']),
    reporter_kind: 'install',
    received_at: Date.now() - hours * H,
    ...over,
  });
}

describe('overdue signals', () => {
  it('43. alerts once when a row crosses the warning threshold, and not again', async () => {
    const hook = mockOpsWebhook();
    mockIssueList();
    const id = await waiting(30);

    await withEnv({ OPS_ALERT_WEBHOOK: hook }, async () => {
      await runMirrorCron();
      expect(alertsFor(id)).toHaveLength(1);

      // The next tick, and the one after: silence for the same row. A queue
      // left for a week must produce two messages, not one per 15 minutes.
      await runMirrorCron();
      await runMirrorCron();
      expect(alertsFor(id)).toHaveLength(1);
    });
  });

  it('43b. with no webhook configured, alerting is OFF and burns no tier', async () => {
    // Ivan turned alerting off on 2026-08-25. "Off" has to mean the job leaves
    // no trace, not that it runs and drops the message on the floor: markAlerted
    // stamps overdue_alert_tier BEFORE the send, and a stamped tier never comes
    // back from newlyOverdue. Without the guard, every row silently spends both
    // its tiers against a destination that does not exist, so turning alerting
    // back ON later would announce nothing.
    mockIssueList();
    const id = await waiting(60);   // past BOTH thresholds

    // No OPS_ALERT_WEBHOOK in the env at all.
    await runMirrorCron();
    await runMirrorCron();

    expect(alertsFor(id)).toHaveLength(0);
    expect((await getSubmission(id)).overdue_alert_tier).toBeNull();

    // And the proof it was the guard, not a dead row: give it a webhook and the
    // same row alerts immediately, with both tiers still unspent.
    const hook = mockOpsWebhook();
    await withEnv({ OPS_ALERT_WEBHOOK: hook }, async () => {
      await runMirrorCron();
      expect(alertsFor(id)).toHaveLength(1);
      expect((await getSubmission(id)).overdue_alert_tier).toBe('escalate');
    });
  });

  it('44. escalation is a second, distinct alert once the row crosses again', async () => {
    const hook = mockOpsWebhook();
    const now = Date.now();
    const id = await seedSubmission({
      state: 'suspected_spam', spam_status: 'suspected', received_at: now - 30 * H,
    });

    await withEnv({ OPS_ALERT_WEBHOOK: hook }, async () => {
      // Past 24h: the warning.
      await alertOverdue(env as any, now);
      expect(alertsFor(id)).toHaveLength(1);
      expect(alertsFor(id)[0].text).toContain('awaiting review');

      // Still past 24h, not yet 48h: nothing more.
      await alertOverdue(env as any, now + H);
      expect(alertsFor(id)).toHaveLength(1);

      // Now past 48h: a second, distinct message at the higher tier.
      await alertOverdue(env as any, now + 20 * H);
      expect(alertsFor(id)).toHaveLength(2);
      expect(alertsFor(id)[1].text).toContain('OVERDUE');

      // And then silence, however long it is ignored for.
      await alertOverdue(env as any, now + 200 * H);
      expect(alertsFor(id)).toHaveLength(2);
    });
  });

  it('44b. a row already past BOTH thresholds gets one message, the severe one', async () => {
    // Not two at once. A single row cannot be both "please look" and "this is
    // overdue" in the same breath, and sending both would train a reader to
    // ignore the pair.
    const hook = mockOpsWebhook();
    const now = Date.now();
    const id = await seedSubmission({
      state: 'suspected_spam', spam_status: 'suspected', received_at: now - 90 * H,
    });

    await withEnv({ OPS_ALERT_WEBHOOK: hook }, async () => {
      await alertOverdue(env as any, now);
    });

    expect(alertsFor(id)).toHaveLength(1);
    expect(alertsFor(id)[0].text).toContain('OVERDUE');
  });

  it('45. the payload carries metadata only — never the report body', async () => {
    const hook = mockOpsWebhook();
    const secret = 'CLICK HERE guaranteed profits whatsapp me now';
    const id = await waiting(30, { body_sanitized: secret });

    await withEnv({ OPS_ALERT_WEBHOOK: hook }, async () => {
      await alertOverdue(env as any);
    });

    const text = alertsFor(id).map((a) => a.text).join('\n');
    expect(text).toContain(id);
    expect(text).toContain('flood_repeat');   // reason CODES are fine
    // Quoting attacker text into a channel a human reads in a link-rendering
    // client is exactly what the codes-only rule exists to prevent.
    expect(text).not.toContain(secret);
    expect(text).not.toContain('whatsapp');
  });

  it('45b. a released row stops alerting without any bookkeeping', async () => {
    const hook = mockOpsWebhook();
    const id = await waiting(30);
    await env.DB.prepare("UPDATE submissions SET state='received', spam_status='clean' WHERE submission_id=?")
      .bind(id).run();

    await withEnv({ OPS_ALERT_WEBHOOK: hook }, async () => { await alertOverdue(env as any); });

    expect(opsAlerts().map((a) => a.text).join('')).not.toContain(id);
  });

  it('45c. a RESTORED row is alerted on, with its clock reset to the restore', async () => {
    // The gap this closes: a restored report carries spam_reviewed_at from the
    // restore and genuinely awaits a second human action. Measuring age from
    // received_at would alert the instant it was restored; skipping rows that
    // have any spam_reviewed_at would mean it could sit forever unnoticed.
    const now = Date.now();
    const fresh = await seedSubmission({
      state: 'suspected_spam', spam_status: 'suspected',
      received_at: now - 40 * D, spam_reviewed_at: now - 1 * H,   // just restored
    });
    const stale = await seedSubmission({
      state: 'suspected_spam', spam_status: 'suspected',
      received_at: now - 40 * D, spam_reviewed_at: now - 30 * H,  // restored, then ignored
    });

    const hook = mockOpsWebhook();
    await withEnv({ OPS_ALERT_WEBHOOK: hook }, async () => { await alertOverdue(env as any, now); });

    const text = opsAlerts().map((a) => a.text).join('\n');
    expect(text).not.toContain(fresh);
    expect(text).toContain(stale);
  });

  it('45g. restoring a report clears its alert history and starts a fresh clock', async () => {
    // A row that was announced, then confirmed as spam, then restored, is
    // awaiting a decision again. Keeping the old tier would mean the second
    // review round is never announced -- the report sits in the queue with
    // nothing saying so, which is the failure this feature exists to prevent.
    const now = Date.now();
    const id = await seedSubmission({
      state: 'spam', spam_status: 'spam',
      received_at: now - 90 * H, overdue_alert_tier: 'escalate',
    });

    await applyReviewDecision(env.DB, id, 'spam', 'restore', 'session:test', now - 30 * H);

    expect((await getSubmission(id)).overdue_alert_tier).toBe(null);

    const hook = mockOpsWebhook();
    await withEnv({ OPS_ALERT_WEBHOOK: hook }, async () => { await alertOverdue(env as any, now); });

    // Announced again, and from the RESTORE rather than the original receipt.
    expect(opsAlerts().map((a) => a.text).join('\n')).toContain(id);
  });

  it('45d. an unreachable webhook does not re-alert forever, and never throws', async () => {
    // The cursor advances whether or not the message got out. An outage must
    // not turn into the same alert every fifteen minutes; the counts remain on
    // the operator endpoint either way.
    const id = await waiting(30);
    await withEnv({ OPS_ALERT_WEBHOOK: 'https://hooks.slack.test/dead' }, async () => {
      const first = await alertOverdue(env as any);
      expect(first.warn).toBeGreaterThan(0);
      const second = await alertOverdue(env as any);
      expect(second.warn).toBe(0);
    });
    expect((await getSubmission(id)).state).toBe('suspected_spam');
  });

  it('45e. counts are token-gated and never appear on public /health', async () => {
    await waiting(30);

    // /health is untokened by design. An attacker who could watch a suspected
    // count move after each submission would have a free tuning oracle for the
    // classifier this whole layer depends on -- so neither the derived overdue
    // counts NOR the raw per-state census may appear there.
    const health = await (await callWorker(new Request('https://mfv2.test/health'))).json<any>();
    const asText = JSON.stringify(health);
    expect(asText).not.toContain('overdue');
    expect(asText).not.toContain('suspected_spam');
    expect(asText).not.toContain('spam');
    // The whole census is gone, not just the spam rows: leaving `published`
    // public lets a prober infer a flag from a counter that FAILS to move.
    expect(health.pipeline).toBeUndefined();
    // Still a usable health check.
    expect(health.ok).toBe(true);
    expect(health.publish).toBeDefined();
    expect(health.needsAttention).toBeDefined();

    const unauth = await callWorker(new Request('https://mfv2.test/admin/quarantined'));
    expect(unauth.status).toBe(401);

    const authed = await callWorker(new Request('https://mfv2.test/admin/quarantined', {
      headers: { authorization: `Bearer ${env.BACKFILL_TOKEN}` },
    }));
    const body = await authed.json<any>();
    expect(body.review.overdue_warn).toBeGreaterThan(0);
    // The census moved here, where a credential is required for it.
    expect(body.pipeline.suspected_spam).toBeGreaterThan(0);
  });

  it('45f. escalation is forced strictly later than the warning', async () => {
    // Misconfigured the other way round, both tiers fire on every row at once
    // and the distinction stops meaning anything.
    const cfg = opsConfig({ SPAM_REVIEW_OVERDUE_H: '48', SPAM_REVIEW_OVERDUE_ESCALATE_H: '12' });
    expect(cfg.escalateMs).toBeGreaterThan(cfg.warnMs);
    expect(opsConfig({}).warnMs).toBe(24 * H);
    expect(opsConfig({}).escalateMs).toBe(48 * H);
    expect(opsConfig({}).retentionMs).toBe(30 * D);
    expect(opsConfig({ SPAM_ATTACHMENT_RETENTION_DAYS: 'x' }).retentionMs).toBe(30 * D);
  });
});

describe('attachment retention', () => {
  // The purge is guarded to once a day by a sync_state cursor, and D1 does not
  // roll back between tests. Without this reset the tests are order-dependent,
  // and the two that assert nothing was purged would pass VACUOUSLY whenever
  // the guard happened to block the run.
  beforeEach(async () => {
    await env.DB.prepare("DELETE FROM sync_state WHERE key = 'purge:spam-attachments'").run();
  });

  const stored = (key: string) => JSON.stringify([JSON.stringify({
    key, name: 'shot.png', type: 'image/png', size: 4, githubUrl: null, r2Url: null, video: false,
  })]);

  it('48. purges a confirmed-spam attachment past retention and says so in the log', async () => {
    const now = Date.now();
    const key = `attachments/purge-${crypto.randomUUID()}/shot.png`;
    await env.ATTACHMENTS.put(key, new Uint8Array([1, 2, 3, 4]));
    const id = await seedSubmission({
      state: 'spam', spam_status: 'spam',
      spam_reviewed_at: now - 40 * D, attachment_keys: stored(key),
    });

    const res = await purgeSpamAttachments(env as any, now);

    expect(res.ran).toBe(true);
    expect(res.objects).toBeGreaterThan(0);
    expect(await env.ATTACHMENTS.get(key)).toBe(null);

    const row = await getSubmission(id);
    // The ROW survives: restore still recovers the report, just not the file.
    expect(row.state).toBe('spam');
    expect(JSON.parse(row.attachment_keys)).toEqual([]);
    // So a reviewer sees WHY a file is missing rather than wondering whether
    // one was ever sent.
    expect((await getStateLog(id)).pop().detail).toContain('attachments purged');
  });

  it('48b. never purges a suspected report, however old', async () => {
    const now = Date.now();
    const key = `attachments/keep-${crypto.randomUUID()}/shot.png`;
    await env.ATTACHMENTS.put(key, new Uint8Array([1, 2, 3, 4]));
    const id = await seedSubmission({
      state: 'suspected_spam', spam_status: 'suspected',
      received_at: now - 400 * D, attachment_keys: stored(key),
    });

    // `ran` asserted, or a blocked guard would make this pass without ever
    // looking at the row.
    expect((await purgeSpamAttachments(env as any, now)).ran).toBe(true);

    // A reviewer has to be able to see what was sent, and decision #4 says
    // suspected reports wait indefinitely for a human.
    expect(await env.ATTACHMENTS.get(key)).not.toBe(null);
    expect(JSON.parse((await getSubmission(id)).attachment_keys)).toHaveLength(1);
  });

  it('48c. never purges confirmed spam that is still inside the window', async () => {
    const now = Date.now();
    const key = `attachments/recent-${crypto.randomUUID()}/shot.png`;
    await env.ATTACHMENTS.put(key, new Uint8Array([1, 2, 3, 4]));
    await seedSubmission({
      state: 'spam', spam_status: 'spam',
      spam_reviewed_at: now - 5 * D, attachment_keys: stored(key),
    });

    expect((await purgeSpamAttachments(env as any, now)).ran).toBe(true);

    expect(await env.ATTACHMENTS.get(key)).not.toBe(null);
  });

  it('48d. runs at most once a day even though the cron ticks every 15 minutes', async () => {
    const now = Date.now();
    expect((await purgeSpamAttachments(env as any, now)).ran).toBe(true);
    expect((await purgeSpamAttachments(env as any, now + H)).ran).toBe(false);
    expect((await purgeSpamAttachments(env as any, now + D + H)).ran).toBe(true);
  });
});
