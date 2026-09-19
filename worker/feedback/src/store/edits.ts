/**
 * When a review was edited — claimed only when its stored history proves it.
 *
 * A timestamp is not proof. Google gives one `lastModified`, so every Android
 * review arrives with an "updated" time; and a stored payload can change for
 * reasons that are not an edit by the reviewer — Google adds the developer
 * reply to the same object, and the app version or device fields can move.
 * "Edited" is a claim about what the reviewer said, so it is made only when two
 * consecutive stored versions differ in the title, the text, or the rating.
 *
 * The versions are read back through the same normalisers sync uses, so this
 * and the sync can never disagree about what a payload says.
 */
import { fromAppStore, fromGooglePlay } from './normalize';

export interface StoredVersion {
  raw_json: string;
  observed_at: number;
}

/**
 * The time of the most recent proven edit, or null.
 *
 * The time is the store's own edit time when it gives one (Google), otherwise
 * when sync first stored the changed version (Apple has no edit time).
 */
export function editedAt(source: string, appId: string, versions: readonly StoredVersion[]): number | null {
  return latestEdit(source, appId, versions)?.at ?? null;
}

/**
 * When sync first STORED the most recent proven edit, or null.
 *
 * Not the store's edit time: a review edited before a decision but synced after
 * it was still unseen by the person deciding. The handoff compares this with
 * `human_decided_at`, so a public issue never carries text nobody judged.
 */
export function editObservedAt(source: string, appId: string, versions: readonly StoredVersion[]): number | null {
  return latestEdit(source, appId, versions)?.observedAt ?? null;
}

function latestEdit(
  source: string, appId: string, versions: readonly StoredVersion[]
): { at: number; observedAt: number } | null {
  let prev: { title: string | null; body: string | null; rating: number | null } | null = null;
  let latest: { at: number; observedAt: number } | null = null;
  for (const v of versions) {
    let rec;
    try {
      const raw = JSON.parse(v.raw_json);
      rec = source === 'app_store' ? fromAppStore(raw, appId, v.observed_at) : fromGooglePlay(raw, appId, v.observed_at);
    } catch {
      // An unreadable version proves nothing either way; it neither starts nor
      // breaks a comparison.
      continue;
    }
    const cur = { title: rec.reviewTitle, body: rec.reviewBody, rating: rec.rating };
    if (prev && (prev.title !== cur.title || prev.body !== cur.body || prev.rating !== cur.rating)) {
      latest = { at: rec.reviewUpdatedAt ?? v.observed_at, observedAt: v.observed_at };
    }
    prev = cur;
  }
  return latest;
}

/**
 * Proven edit times for one page of reviews: one bounded read, and only for
 * reviews that have more than one stored version at all.
 */
export async function loadEditedAt(
  db: D1Database, rows: ReadonlyArray<{ store_review_id: string; source: string; app_id: string }>
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (rows.length === 0) return out;
  const marks = rows.map(() => '?').join(',');
  const ids = rows.map((r) => r.store_review_id);
  const { results } = await db.prepare(
    `SELECT store_review_id, raw_json, observed_at FROM store_review_versions
      WHERE store_review_id IN (
        SELECT store_review_id FROM store_review_versions
         WHERE store_review_id IN (${marks})
         GROUP BY store_review_id HAVING COUNT(*) > 1)
      ORDER BY store_review_id, id`
  ).bind(...ids).all<{ store_review_id: string } & StoredVersion>();

  const byReview = new Map<string, StoredVersion[]>();
  for (const v of results ?? []) {
    const list = byReview.get(v.store_review_id) ?? [];
    list.push(v);
    byReview.set(v.store_review_id, list);
  }
  for (const r of rows) {
    const versions = byReview.get(r.store_review_id);
    if (!versions) continue;
    const at = editedAt(r.source, r.app_id, versions);
    if (at != null) out.set(r.store_review_id, at);
  }
  return out;
}
