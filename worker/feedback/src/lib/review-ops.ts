/**
 * Operational upkeep for the review queue: overdue signals and attachment
 * retention. Both run from the 15-minute cron.
 *
 * Decision #4 forbids auto-release, so a queue nobody looks at is a queue that
 * silently holds real reports forever. Nothing here releases anything — it
 * only makes the silence audible.
 */

export interface OverdueConfig {
  warnMs: number;
  escalateMs: number;
  retentionMs: number;
}

const H = 3_600_000;
const D = 86_400_000;

function intOr(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function opsConfig(env: {
  SPAM_REVIEW_OVERDUE_H?: string;
  SPAM_REVIEW_OVERDUE_ESCALATE_H?: string;
  SPAM_ATTACHMENT_RETENTION_DAYS?: string;
}): OverdueConfig {
  const warn = intOr(env.SPAM_REVIEW_OVERDUE_H, 24);
  const escalate = intOr(env.SPAM_REVIEW_OVERDUE_ESCALATE_H, 48);
  return {
    warnMs: warn * H,
    // Escalation must be strictly later than the warning, or every row alerts
    // twice at once and the two tiers stop meaning anything.
    escalateMs: Math.max(escalate, warn + 1) * H,
    retentionMs: intOr(env.SPAM_ATTACHMENT_RETENTION_DAYS, 30) * D,
  };
}

/**
 * How long a row has been waiting on a human.
 *
 * COALESCE(spam_reviewed_at, received_at), not received_at alone. A report
 * RESTORED from `spam` back to `suspected_spam` carries a spam_reviewed_at
 * from the restore, and it is genuinely awaiting a second human action — the
 * release. Measuring from received_at would alert about it the instant it was
 * restored; ignoring restored rows entirely (because spam_reviewed_at is not
 * null) would mean a restored report could sit forever and never be surfaced.
 * The clock starts when the last human touched it.
 */
const WAITING_SINCE = 'COALESCE(spam_reviewed_at, received_at)';

export interface OverdueCounts { warn: number; escalate: number }

/** Counts for the token-gated operator endpoint. */
export async function overdueCounts(
  db: D1Database, cfg: OverdueConfig, now = Date.now()
): Promise<OverdueCounts> {
  const one = async (ms: number) => {
    const row = await db.prepare(
      `SELECT COUNT(*) AS n FROM submissions
        WHERE state = 'suspected_spam' AND ${WAITING_SINCE} <= ?`
    ).bind(now - ms).first<{ n: number }>();
    return row?.n ?? 0;
  };
  return { warn: await one(cfg.warnMs), escalate: await one(cfg.escalateMs) };
}

interface OverdueRow {
  submission_id: string;
  spam_reasons: string | null;
  reporter_kind: string | null;
  waiting_since: number;
}

/** Bounded so one very stale queue cannot produce an unbounded message. */
const MAX_PER_ALERT = 20;

async function cursorValue(db: D1Database, key: string): Promise<number> {
  const row = await db.prepare('SELECT value FROM sync_state WHERE key = ?').bind(key)
    .first<{ value: string }>();
  const n = Number(row?.value);
  return Number.isFinite(n) ? n : 0;
}

async function setCursor(db: D1Database, key: string, value: number, now: number): Promise<void> {
  await db.prepare(
    'INSERT INTO sync_state (key, value, at) VALUES (?,?,?) ' +
    'ON CONFLICT(key) DO UPDATE SET value = excluded.value, at = excluded.at'
  ).bind(key, String(value), now).run();
}

/**
 * Rows that have crossed a threshold and have not been announced at that tier.
 *
 * PER-ROW state, not a high-water cursor. Reports do not become suspected in
 * the order they arrived: one can sit in `deferred` for days through a
 * classifier outage or a retry backoff and only then be flagged, with a clock
 * starting at its original receipt. A cursor skips it forever, silently — the
 * exact failure this feature exists to prevent.
 *
 * Rows released or confirmed in the meantime drop out on their own; they are
 * no longer in `suspected_spam`.
 */
async function newlyOverdue(
  db: D1Database, tier: 'warn' | 'escalate', ms: number, now: number
): Promise<OverdueRow[]> {
  // warn fires only on a row nothing has been said about. escalate fires on a
  // row that is either fresh to the system or has only had its warning.
  const alreadyClause = tier === 'warn'
    ? 'overdue_alert_tier IS NULL'
    : "(overdue_alert_tier IS NULL OR overdue_alert_tier = 'warn')";

  const { results } = await db.prepare(
    `SELECT submission_id, spam_reasons, reporter_kind, ${WAITING_SINCE} AS waiting_since
       FROM submissions
      WHERE state = 'suspected_spam'
        AND ${WAITING_SINCE} <= ?
        AND ${alreadyClause}
      ORDER BY waiting_since ASC LIMIT ${MAX_PER_ALERT}`
  ).bind(now - ms).all<OverdueRow>();
  return results ?? [];
}

async function markAlerted(db: D1Database, ids: string[], tier: string): Promise<void> {
  if (ids.length === 0) return;
  await db.batch(ids.map((id) =>
    db.prepare('UPDATE submissions SET overdue_alert_tier = ? WHERE submission_id = ?').bind(tier, id)
  ));
}

function reasonCodes(raw: string | null): string {
  try {
    const codes = JSON.parse(raw ?? '[]');
    return Array.isArray(codes) && codes.length ? codes.map(String).join(', ') : 'none';
  } catch { return 'none'; }
}

/**
 * METADATA ONLY. Submission id, age, reason codes, reporter kind.
 *
 * Never the report body and never quoted spam text — the same rule that keeps
 * spam_reasons to codes. An alert channel is a place where quoted attacker
 * text would be read by a human in a client that renders links, and the whole
 * point of the queue is that the body is read on the review page instead.
 */
function alertText(tier: 'warn' | 'escalate', rows: OverdueRow[], now: number, hours: number): string {
  const head = tier === 'escalate'
    ? `:rotating_light: ${rows.length} feedback report(s) OVERDUE for review (>${hours}h)`
    : `:hourglass: ${rows.length} feedback report(s) awaiting review (>${hours}h)`;
  const lines = rows.map((r) => {
    const ageH = Math.floor((now - r.waiting_since) / H);
    return `• \`${r.submission_id}\` — ${ageH}h — reasons: ${reasonCodes(r.spam_reasons)} — reporter: ${r.reporter_kind ?? 'unknown'}`;
  });
  return [head, ...lines, '', 'Review at /admin/review?q=suspected'].join('\n');
}

export interface AlertEnv {
  DB: D1Database;
  OPS_ALERT_WEBHOOK?: string;
  SPAM_REVIEW_OVERDUE_H?: string;
  SPAM_REVIEW_OVERDUE_ESCALATE_H?: string;
  SPAM_ATTACHMENT_RETENTION_DAYS?: string;
}

export interface AlertResult { warn: number; escalate: number; sent: number }

export async function alertOverdue(env: AlertEnv, now = Date.now()): Promise<AlertResult> {
  const cfg = opsConfig(env);
  const result: AlertResult = { warn: 0, escalate: 0, sent: 0 };

  // No webhook configured means alerting is OFF, and off means the job does
  // nothing at all -- not "runs and discards the message". markAlerted() below
  // stamps overdue_alert_tier BEFORE the send, and newlyOverdue() will never
  // return a stamped row for that tier again. Without this guard a deployment
  // with no webhook silently burns each row's warn and escalate tiers against
  // a destination that does not exist, so if a webhook is ever added later it
  // has nothing left to announce. Ivan turned alerting off on 2026-08-25; the
  // queue counts stay on /admin/quarantined either way.
  if (!env.OPS_ALERT_WEBHOOK) return result;

  for (const [tier, ms, hours] of [
    ['escalate', cfg.escalateMs, Math.round(cfg.escalateMs / H)],
    ['warn', cfg.warnMs, Math.round(cfg.warnMs / H)],
  ] as Array<['warn' | 'escalate', number, number]>) {
    const rows = await newlyOverdue(env.DB, tier, ms, now);
    if (rows.length === 0) continue;
    result[tier] = rows.length;

    // Marked BEFORE the webhook call, and marked whether or not the webhook is
    // configured or reachable. An unreachable Slack must not turn into the same
    // alert every fifteen minutes forever; the counts remain on the operator
    // endpoint regardless, so nothing is lost by not repeating.
    await markAlerted(env.DB, rows.map((r) => r.submission_id), tier);

    console.warn(JSON.stringify({
      job: 'overdue', tier, count: rows.length,
      oldest_hours: Math.floor((now - rows[0].waiting_since) / H),
    }));

    if (!env.OPS_ALERT_WEBHOOK) continue;
    try {
      await fetch(env.OPS_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: alertText(tier, rows, now, hours) }),
      });
      result.sent++;
    } catch (err) {
      // Never throws. An alerting failure must not take down the cron that
      // also syncs the mirror.
      console.warn('overdue alert failed', (err as Error)?.message);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Attachment retention
// ---------------------------------------------------------------------------

const PURGE_CURSOR = 'purge:spam-attachments';
const PURGE_INTERVAL_MS = D;
/** Bounded per pass: the 15-minute cron shares a subrequest budget with the drain. */
const MAX_PURGE = 25;

export interface PurgeEnv extends AlertEnv { ATTACHMENTS: R2Bucket }

export interface PurgeResult { ran: boolean; rows: number; objects: number }

/**
 * Delete R2 objects for CONFIRMED spam past the retention window.
 *
 * `suspected_spam` is never purged — a reviewer has to be able to see what was
 * sent, and decision #4 says those wait indefinitely for a human. Only rows a
 * human already confirmed as spam age out.
 *
 * The row itself is kept. Restore still recovers the report; the file is gone,
 * and a state_log entry says so, which is why a reviewer sees an explanation
 * rather than wondering whether an attachment was ever sent.
 */
export async function purgeSpamAttachments(env: PurgeEnv, now = Date.now()): Promise<PurgeResult> {
  const last = await cursorValue(env.DB, PURGE_CURSOR);
  if (now - last < PURGE_INTERVAL_MS) return { ran: false, rows: 0, objects: 0 };
  await setCursor(env.DB, PURGE_CURSOR, now, now);

  const cfg = opsConfig(env);
  const { results } = await env.DB.prepare(
    `SELECT submission_id, attachment_keys FROM submissions
      WHERE state = 'spam'
        AND attachment_keys IS NOT NULL AND attachment_keys NOT IN ('', '[]')
        AND ${WAITING_SINCE} < ?
      LIMIT ${MAX_PURGE}`
  ).bind(now - cfg.retentionMs).all<{ submission_id: string; attachment_keys: string }>();

  let objects = 0;
  for (const row of results ?? []) {
    let stored: any[] = [];
    try {
      stored = (JSON.parse(row.attachment_keys) as string[])
        .map((j) => { try { return JSON.parse(j); } catch { return null; } })
        .filter(Boolean);
    } catch { stored = []; }

    for (const a of stored) {
      if (!a?.key) continue;
      try { await env.ATTACHMENTS.delete(a.key); objects++; } catch (err) {
        console.warn('attachment purge failed', a.key, (err as Error)?.message);
      }
    }

    await env.DB.batch([
      env.DB.prepare("UPDATE submissions SET attachment_keys = '[]' WHERE submission_id = ?")
        .bind(row.submission_id),
      env.DB.prepare(
        'INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?,?,?,?,?)'
      ).bind(row.submission_id, now, 'spam', 'spam',
             `attachments purged after retention (${stored.length} file(s))`),
    ]);
  }

  return { ran: true, rows: (results ?? []).length, objects };
}
