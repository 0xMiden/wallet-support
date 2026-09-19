/**
 * Raw store payload -> NormalizedReview. The contract every source produces.
 *
 * PURE. No database, no network, no clock beyond what is passed in. Everything
 * here is a function of its input, which is what makes the whole ingestion path
 * testable before a single credential exists.
 *
 * WHY THIS FILE IS THE POINT OF THE WHOLE DESIGN.
 * There will be at least three producers of store reviews:
 *
 *   1. the Google Play API          (last 7 days only)
 *   2. the Play Console CSV export  (everything older — the only way back)
 *   3. the App Store Connect API
 *
 * Each speaks a different shape. If each also carried its own idea of what a
 * duplicate is, they would disagree, and the disagreement would show up as the
 * same review stored twice. So they converge HERE, on one record, and exactly
 * one place downstream decides identity: `upsertReview` in upsert.ts.
 *
 * Two producers, one dedup path. That is the rule.
 *
 * THE ORIGINAL IS AUTHORITATIVE, THIS IS NOT.
 * Every field below is derived for querying and rendering. `raw` is stored
 * verbatim beside them, and the derived columns are recomputed from it. That
 * is deliberate and load-bearing: it is what makes it safe to write this
 * normalisation against Google's DOCUMENTED schema before anyone has seen a
 * real payload. If a field turns out to sit somewhere else, it is a re-parse
 * of stored data, not a re-fetch of data we no longer have access to.
 *
 * Fields marked ASSUMPTION below are the ones to check against the first real
 * response. None of them can lose data if wrong.
 */
import { sha256Hex } from '../lib/validate';

/** The canonical record. Every source produces exactly this. */
export interface NormalizedReview {
  /**
   * REQUIRED, and there is no fallback on purpose.
   *
   * All deduplication rests on UNIQUE(source, app_id, platform_review_id). A
   * producer that cannot supply the store's own id must FAIL rather than
   * invent one: a synthesised id would be unique every run, so re-importing
   * would silently create a second row for every review — the exact failure
   * the constraint exists to prevent, arriving through the back door.
   */
  platformReviewId: string;
  platform: 'android' | 'ios';
  source: 'google_play' | 'app_store';
  appId: string;

  /** The payload exactly as received, and its hash. See hashRaw(). */
  raw: unknown;
  rawHash: string;

  reviewTitle: string | null;
  reviewBody: string | null;
  rating: number | null;
  reviewerName: string | null;
  territory: string | null;
  language: string | null;
  /** Epoch ms. Never null — see the fallback note in fromGooglePlay(). */
  reviewCreatedAt: number;
  reviewUpdatedAt: number | null;

  appVersion: string | null;
  appVersionCode: number | null;
  device: string | null;
  deviceProduct: string | null;
  osVersion: string | null;

  /**
   * The developer reply ALREADY on the store, if the payload carries one.
   *
   * Not our reply, and not something we published. It matters because without
   * it the console would happily offer to draft a reply to a review that has
   * already been answered — from the reviewer's side, a second reply appearing
   * under the first. Recorded so that cannot happen.
   */
  existingReplyText: string | null;
  existingReplyAt: number | null;
}

export class NormalizeError extends Error {}

/**
 * sha256 of a CANONICAL serialisation, not of JSON.stringify's output.
 *
 * Key order in a JSON response is not guaranteed to be stable, and neither is
 * the order a JSON parser hands back. Hashing the raw text would therefore
 * make an unchanged review look edited whenever a key moved — every sync would
 * write a version row, `store_review_versions` would fill with noise, and the
 * one signal it exists to carry (this review actually changed) would be buried
 * under identical copies of itself.
 *
 * Sorting keys recursively costs a few microseconds and removes the whole
 * class of problem.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.keys(value as Record<string, unknown>).sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`);
  return `{${entries.join(',')}}`;
}

export function hashRaw(raw: unknown): Promise<string> {
  return sha256Hex(canonicalize(raw));
}

/** Google returns timestamps as { seconds, nanos }, with seconds as a string. */
function timestampMs(t: unknown): number | null {
  if (!t || typeof t !== 'object') return null;
  const seconds = Number((t as any).seconds);
  if (!Number.isFinite(seconds)) return null;
  const nanos = Number((t as any).nanos ?? 0);
  return Math.round(seconds * 1000 + (Number.isFinite(nanos) ? nanos / 1e6 : 0));
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Google Play `reviews.list` -> NormalizedReview.
 *
 * A review is `{ reviewId, authorName, comments: [...] }`, where `comments`
 * holds at most one `userComment` and at most one `developerComment`. The
 * user's is the review; the developer's is a reply already published.
 *
 * `nowMs` is passed rather than read so the function stays pure and the
 * fallback below is testable.
 */
export function fromGooglePlay(raw: unknown, appId: string, nowMs: number): NormalizedReview {
  if (!raw || typeof raw !== 'object') {
    throw new NormalizeError('google_play: review is not an object');
  }
  const r = raw as Record<string, any>;

  const platformReviewId = str(r.reviewId);
  if (!platformReviewId) {
    // Hard failure, never a generated id. See the note on the field itself.
    throw new NormalizeError('google_play: review has no reviewId');
  }

  const comments: any[] = Array.isArray(r.comments) ? r.comments : [];
  const user = comments.map((c) => c?.userComment).find(Boolean) ?? {};
  const dev = comments.map((c) => c?.developerComment).find(Boolean) ?? null;

  const lastModified = timestampMs(user.lastModified);

  return {
    platformReviewId,
    platform: 'android',
    source: 'google_play',
    appId,
    raw,
    rawHash: '',                       // filled by normalize(), which can await
    // ASSUMPTION: the API returns no separate title — `text` is the whole
    // review. The Play Console CSV DOES have a title column, so a review
    // imported from CSV may carry one where the same review from the API does
    // not. Left NULL rather than split out of the body by guesswork.
    reviewTitle: null,
    reviewBody: str(user.text) ?? str(user.originalText),
    rating: num(user.starRating),
    reviewerName: str(r.authorName),
    // ASSUMPTION: no territory/country field on this endpoint. `reviewerLanguage`
    // is a language, not a country, and must not be stored as one.
    territory: null,
    language: str(user.reviewerLanguage),
    /**
     * `lastModified` is the only timestamp Google gives, and it is the time of
     * the LATEST edit rather than of first posting. Using it as "created" is
     * imprecise and it is the best available answer; the version history in
     * `store_review_versions` is what actually reconstructs the timeline.
     *
     * Falling back to `nowMs` keeps this NOT NULL, which every queue in the
     * console orders by. An ordering column that can be null makes the order
     * undefined, which is worse than a slightly wrong timestamp.
     */
    reviewCreatedAt: lastModified ?? nowMs,
    reviewUpdatedAt: lastModified,

    appVersion: str(user.appVersionName),
    appVersionCode: num(user.appVersionCode),
    device: str(user.device),
    deviceProduct: str(user.deviceMetadata?.productName),
    osVersion: user.androidOsVersion == null ? null : String(user.androidOsVersion),

    existingReplyText: dev ? str(dev.text) : null,
    existingReplyAt: dev ? timestampMs(dev.lastModified) : null,
  };
}

/**
 * The one entry point. Normalises and hashes together, so a record can never
 * reach the database with an empty `rawHash` — which would make every sync of
 * it look like an edit.
 */
export async function normalizeGooglePlay(
  raw: unknown, appId: string, nowMs: number
): Promise<NormalizedReview> {
  const record = fromGooglePlay(raw, appId, nowMs);
  record.rawHash = await hashRaw(raw);
  return record;
}

/**
 * App Store Connect dates are ISO 8601 with an offset: 2017-11-15T08:10:34-08:00.
 * Strict on purpose: Date.parse also accepts shapes it then reads as local time.
 */
function isoMs(v: unknown): number | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v)) {
    return null;
  }
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * App Store Connect `customerReviews` -> NormalizedReview.
 *
 * A review is a JSON:API resource: `{ type: 'customerReviews', id, attributes:
 * { rating, title, body, reviewerNickname, createdDate, territory } }`. Unlike
 * Google's, it has a real title and a real creation date.
 *
 * `appId` is the bundle ID; see syncAppStore().
 */
export function fromAppStore(raw: unknown, appId: string, nowMs: number): NormalizedReview {
  if (!raw || typeof raw !== 'object') {
    throw new NormalizeError('app_store: review is not an object');
  }
  const r = raw as Record<string, any>;
  if (r.type !== 'customerReviews') {
    throw new NormalizeError('app_store: resource is not a customer review');
  }

  const platformReviewId = str(r.id);
  if (!platformReviewId) {
    // Hard failure, never a generated id. See the note on the field itself.
    throw new NormalizeError('app_store: review has no id');
  }
  const a: Record<string, any> = r.attributes && typeof r.attributes === 'object' ? r.attributes : {};

  return {
    platformReviewId,
    platform: 'ios',
    source: 'app_store',
    appId,
    raw,
    rawHash: '',                       // filled by normalize(), which can await
    reviewTitle: str(a.title),
    reviewBody: str(a.body),
    rating: num(a.rating),
    reviewerName: str(a.reviewerNickname),
    // A country, as ISO 3166-1 alpha-3: "USA".
    territory: str(a.territory),
    // ASSUMPTION: this endpoint gives no review language.
    language: null,
    // Falls back to `nowMs` for the reason given in fromGooglePlay().
    reviewCreatedAt: isoMs(a.createdDate) ?? nowMs,
    // ASSUMPTION: no edit time. An edit still shows, as a changed raw hash and
    // a row in store_review_versions.
    reviewUpdatedAt: null,

    // ASSUMPTION: no app version, device or OS on this endpoint.
    appVersion: null,
    appVersionCode: null,
    device: null,
    deviceProduct: null,
    osVersion: null,

    // A published developer response is a separate `response` resource, sent
    // only with `include=response`, which the sync does not ask for yet.
    existingReplyText: null,
    existingReplyAt: null,
  };
}

/** The App Store entry point: normalises and hashes together, as for Google. */
export async function normalizeAppStore(
  raw: unknown, appId: string, nowMs: number
): Promise<NormalizedReview> {
  const record = fromAppStore(raw, appId, nowMs);
  record.rawHash = await hashRaw(raw);
  return record;
}

/**
 * Guards a record from ANY producer before it is written.
 *
 * Called by upsertReview, so a future CSV importer gets the same check without
 * having to remember to ask for it. The checks are the invariants the schema
 * cannot express by itself.
 */
export function assertUpsertable(r: NormalizedReview): void {
  if (!r.platformReviewId) throw new NormalizeError('record has no platformReviewId');
  if (!r.appId) throw new NormalizeError('record has no appId');
  if (!r.rawHash) throw new NormalizeError('record has no rawHash — normalize, do not construct');
  if (!Number.isFinite(r.reviewCreatedAt)) throw new NormalizeError('reviewCreatedAt is not a number');
  if (r.rating != null && (r.rating < 1 || r.rating > 5)) {
    throw new NormalizeError(`rating out of range: ${r.rating}`);
  }
}
