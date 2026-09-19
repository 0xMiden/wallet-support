/**
 * The navigation rail, and the queues it points at.
 *
 * ONE definition, shared by every admin page. The rail must show the same
 * three groups with the same counts whichever page you are standing on, and
 * the way to guarantee that is for there to be nothing to keep in sync.
 *
 * The order is the one in the brief, and it is not alphabetical or historical:
 *
 *   Store Reviews  — what came in from Google Play and the App Store
 *   Delivery       — what the pipeline is doing about it
 *   Spam Review    — what was held back
 *
 * Store Reviews leads because it is the only group that is a source. The other
 * two are the pipeline reporting on itself.
 */
import type { NavGroup } from './admin-chrome';
import { ICONS } from './admin-chrome';

/**
 * Queues a reviewer can page through, and the `submissions.state` each maps to.
 *
 * `empty` is per queue on purpose. "Nothing here" is the same four words
 * whether the filter caught nothing all week or every report has been dealt
 * with, and those are opposite situations to be looking at.
 */
export const QUEUES: Record<string, {
  group: string; state: string; label: string; badge: string; desc: string;
  empty: { icon: string; head: string; note: string };
}> = {
  suspected: {
    group: 'spam', desc: 'Held by the filter. Each one needs a decision before it can go anywhere.', state: 'suspected_spam', label: 'Suspected', badge: 'b-suspected',
    empty: { icon: '✓', head: 'Nothing waiting on you',
             note: 'No report has been flagged. Anything the filter holds back shows up here for a decision.' },
  },
  spam: {
    group: 'spam', desc: 'Confirmed spam. Kept rather than deleted, and restorable if a call was wrong.', state: 'spam', label: 'Confirmed spam', badge: 'b-spam',
    empty: { icon: '∅', head: 'No confirmed spam',
             note: 'Reports you mark as spam are kept here, and can still be restored for another look.' },
  },
  quarantined: {
    group: 'spam', desc: 'Appeared to contain a key or seed phrase, so the body was redacted. These can never be published.', state: 'quarantined', label: 'Quarantined', badge: 'b-quarantined',
    empty: { icon: '⚿', head: 'No quarantined reports',
             note: 'A report that appeared to contain a key or seed phrase is redacted and held here. It can never be published.' },
  },
  capped: {
    group: 'delivery', desc: 'Accepted and waiting on a publish cap. These file themselves as slots free — nothing here needs you.', state: 'capped', label: 'Queued', badge: 'b-queued',
    empty: { icon: '✓', head: 'Nothing queued',
             note: 'Reports wait here when a publish cap is full. They file themselves as slots free — nothing is lost and no retry budget is spent.' },
  },
  deferred: {
    group: 'delivery', desc: 'Waiting on GitHub or the classifier. A count that stays above zero means something upstream is broken.', state: 'deferred', label: 'Deferred', badge: 'b-deferred',
    empty: { icon: '✓', head: 'Nothing deferred',
             note: 'Reports wait here when GitHub or the classifier is unavailable. A count that stays above zero means something upstream needs looking at.' },
  },
  failed: {
    group: 'delivery', desc: 'Every retry to file these on GitHub was spent. They are parked, not deleted.', state: 'failed', label: 'Failed', badge: 'b-failed',
    empty: { icon: '✓', head: 'Nothing failed',
             note: 'Reports land here only after every retry to file them on GitHub was exhausted.' },
  },
};

/**
 * The two stores, in the order the brief lists them.
 *
 * `source` is the value stored in `store_reviews.source`; `platform` is the key
 * and the URL parameter. They differ because one store could plausibly serve a
 * second platform later, and a column that means two things is a column that
 * cannot be queried.
 */
export const PLATFORMS: Record<string, { label: string; source: string; store: string }> = {
  android: { label: 'Android — Google Play', source: 'google_play', store: 'Google Play' },
  ios:     { label: 'iOS — Apple App Store', source: 'app_store',  store: 'the App Store' },
};

/**
 * Review states that mean "a human has not finished with this yet".
 *
 * This is what the rail counts, so the number beside a platform answers the
 * only question worth asking from the rail: how much is waiting on me. A count
 * of every review ever collected would climb forever and stop meaning anything
 * by the second week.
 */
export const AWAITING_HUMAN = ['new', 'classifying', 'awaiting_review'] as const;

export interface Nav {
  groups: NavGroup[];
  /** submissions grouped by state — the queue pages need the raw numbers too. */
  counts: Record<string, number>;
}

/**
 * Builds the rail. `active` is a queue key (`suspected`, `failed`, …) or a
 * platform key prefixed `store:` (`store:android`).
 */
export async function buildNav(db: D1Database, active: string): Promise<Nav> {
  // One grouped read for every queue's count, not one query per queue. It is
  // the same index the queue list uses.
  const tally = await db.prepare(
    'SELECT state, COUNT(*) AS n FROM submissions GROUP BY state'
  ).all<{ state: string; n: number }>();
  const counts: Record<string, number> = {};
  for (const r of tally.results ?? []) counts[r.state] = r.n;

  // Store counts are read defensively.
  //
  // The recorded rule is that migration 0007 is applied before the Worker that
  // depends on it is deployed. If that order is ever broken — a rollback, a
  // redeploy from an older tag, a hand-run that half finished — this query
  // throws `no such table`, and without the catch it would take the EXISTING
  // spam and delivery queues down with it. A console that loses the store
  // counts is an inconvenience; one that stops rendering held reports is an
  // outage of the thing this service exists to do.
  const storeCounts: Record<string, number> = {};
  try {
    const placeholders = AWAITING_HUMAN.map(() => '?').join(',');
    const store = await db.prepare(
      `SELECT platform, COUNT(*) AS n FROM store_reviews
        WHERE review_state IN (${placeholders}) GROUP BY platform`
    ).bind(...AWAITING_HUMAN).all<{ platform: string; n: number }>();
    for (const r of store.results ?? []) storeCounts[r.platform] = r.n;
  } catch (err) {
    console.warn('store review counts unavailable', (err as Error)?.message);
  }

  const queueItems = (group: string) =>
    Object.entries(QUEUES)
      .filter(([, q]) => q.group === group)
      .map(([key, q]) => ({
        href: `/admin/review?q=${key}`,
        label: q.label,
        count: counts[q.state] ?? 0,
        active: key === active,
      }));

  const groups: NavGroup[] = [
    {
      id: 'store', label: 'Store Reviews', cls: 'g-store', icon: ICONS.store,
      items: Object.entries(PLATFORMS).map(([key, p]) => ({
        href: `/admin/store?platform=${key}`,
        label: p.label,
        count: storeCounts[key] ?? 0,
        active: active === `store:${key}`,
      })),
    },
    { id: 'delivery', label: 'Delivery', cls: 'g-delivery', icon: ICONS.delivery, items: queueItems('delivery') },
    { id: 'spam', label: 'Spam Review', cls: 'g-spam', icon: ICONS.spam, items: queueItems('spam') },
  ];

  return { groups, counts };
}
