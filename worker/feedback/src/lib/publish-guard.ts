/**
 * Who owns a row, and when.
 *
 * Two writers can want the same submission at the same time: the drain, which
 * is about to publish it to GitHub, and a reviewer, who is about to mark it
 * spam. Reading the state and then acting on it is a TOCTOU — the window
 * between the read and the GitHub call is exactly where a reviewer's decision
 * gets lost, and the thing that gets lost is irreversible: a public issue on
 * someone else's repository.
 *
 * So neither side reads-then-writes. Both take the row with a CONDITIONAL
 * UPDATE and act only if the database says they got it. `changes === 0` is a
 * hard stop, never a warning.
 *
 * The resulting ownership rule, in one line: `claimed` and `publishing` belong
 * to the drain, `suspected_spam` and `spam` belong to a reviewer, and neither
 * can reach into the other's states.
 */

/**
 * States a reviewer may act on. Deliberately does NOT include `claimed` or
 * `publishing`: once the drain has taken a row those states are in-flight and
 * owned, and a reviewer changing one underneath an active publish would either
 * be silently overwritten or corrupt the audit trail.
 */
export const REVIEWABLE_STATES = ['suspected_spam', 'spam'] as const;
export type ReviewableState = (typeof REVIEWABLE_STATES)[number];

/** Owned by the drain. A reviewer must never write to a row in one of these. */
export const IN_FLIGHT_STATES = ['claimed', 'publishing'] as const;

const REVIEWABLE = new Set<string>(REVIEWABLE_STATES);

/**
 * Take a row for publishing, or do not publish it.
 *
 * ```sql
 * UPDATE submissions SET state='publishing'
 *  WHERE submission_id = ? AND state = ?
 *    AND (spam_status IS NULL OR spam_status = 'clean')
 * ```
 *
 * `spam_status IS NULL` is accepted because NULL MEANS CLEAN — the legacy rows
 * and everything written before the spam layer have no verdict and never will.
 * Failing tight here would silently stop publishing every one of them, which
 * is a far larger outage than the one this guard prevents.
 *
 * Returns false when the row was not taken. The caller must then make NO
 * GitHub request. There is no retry: whoever moved the row either owns it now
 * or made a decision we are required to respect.
 */
export async function claimForPublishing(
  db: D1Database, id: string, from: string
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE submissions SET state = 'publishing'
        WHERE submission_id = ? AND state = ?
          AND (spam_status IS NULL OR spam_status = 'clean')`
    )
    .bind(id, from)
    .run();

  if (res.meta.changes === 0) return false;

  await db
    .prepare('INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?,?,?,?,?)')
    .bind(id, Date.now(), from, 'publishing', null)
    .run();
  return true;
}

/**
 * The transitions a reviewer is allowed to make, as data.
 *
 * `spam → received` IS ABSENT, and its absence is the point. Recovering a
 * mis-confirmed report is two steps by two separate actions:
 *
 *     spam --restore--> suspected_spam --release--> received
 *
 * so no single click, and no single bug, can move confirmed spam toward
 * GitHub. Restore sets `suspected`, not `clean`, so a restored report is still
 * gated and still needs a human release — it does not inherit the sticky
 * bypass, which requires `clean`.
 */
const ALLOWED_EDGES: ReadonlyArray<{
  from: ReviewableState; to: string; spamStatus: 'clean' | 'suspected' | 'spam'; action: string;
}> = [
  { from: 'suspected_spam', to: 'received',       spamStatus: 'clean',     action: 'release' },
  { from: 'suspected_spam', to: 'spam',           spamStatus: 'spam',      action: 'confirm' },
  { from: 'spam',           to: 'suspected_spam', spamStatus: 'suspected', action: 'restore' },
];

export type ReviewAction = 'release' | 'confirm' | 'restore';

export function edgeFor(from: string, action: ReviewAction) {
  return ALLOWED_EDGES.find((e) => e.from === from && e.action === action) ?? null;
}

export interface ReviewResult {
  ok: boolean;
  /** Why it was refused. Never surfaced to a reporter, only to a reviewer. */
  reason?: 'not_reviewable' | 'edge_not_allowed' | 'row_moved';
}

/**
 * Apply a reviewer decision, atomically, or refuse.
 *
 * Three independent refusals, and each one closes a different hole:
 *
 *   not_reviewable   — the row is `claimed`, `publishing`, `published` or
 *                      anything else the drain owns. A reviewer has no say
 *                      over a row that is mid-flight.
 *   edge_not_allowed — the requested move is not in the table above. This is
 *                      what makes `spam → received` impossible by construction
 *                      rather than by a UI that happens not to offer it.
 *   row_moved        — the row changed between rendering the page and the
 *                      click. The conditional UPDATE catches it; nothing is
 *                      written.
 *
 * state and spam_status move together in one statement, always. A state
 * without a matching status leaves spam_status NULL, which every guard reads
 * as clean.
 */
export async function applyReviewDecision(
  db: D1Database,
  id: string,
  from: string,
  action: ReviewAction,
  reviewedBy: string,
  at: number = Date.now()
): Promise<ReviewResult> {
  if (!REVIEWABLE.has(from)) return { ok: false, reason: 'not_reviewable' };

  const edge = edgeFor(from, action);
  if (!edge) return { ok: false, reason: 'edge_not_allowed' };

  const res = await db
    .prepare(
      // overdue_alert_tier is cleared in the SAME statement, so a report
      // brought back for a second look starts a fresh review clock instead of
      // inheriting an announcement about a decision that has been reversed.
      // A separate UPDATE would leave a window where the two disagree.
      `UPDATE submissions
          SET state = ?, spam_status = ?, spam_reviewed_at = ?, spam_reviewed_by = ?,
              overdue_alert_tier = NULL
        WHERE submission_id = ? AND state = ?`
    )
    .bind(edge.to, edge.spamStatus, at, reviewedBy.slice(0, 200), id, from)
    .run();

  if (res.meta.changes === 0) return { ok: false, reason: 'row_moved' };

  await db
    .prepare('INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?,?,?,?,?)')
    .bind(id, at, from, edge.to, `review:${action} by ${reviewedBy.slice(0, 100)}`)
    .run();

  return { ok: true };
}
