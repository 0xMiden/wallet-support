/**
 * WHAT A REFUSED REQUEST MEANS, decided in one place for both stores.
 *
 * Every sync failure used to be the same failure: count it, back off, try
 * again. That is right for a 503 and wrong for the two cases that actually
 * happen to a long-running sync.
 *
 * A RATE LIMIT IS AN INSTRUCTION, NOT AN ERROR. Both stores answer 429 with a
 * Retry-After telling us when to come back — Apple's customerReviews endpoint
 * is one of the ones that does it under load. Counting it as a failure is
 * doubly wrong: it inflates the backoff a real outage is supposed to earn, and
 * it puts the wait under our control rather than the store's.
 *
 * A REFUSED CREDENTIAL DOES NOT HEAL. A revoked key, an expired one, a role
 * taken off the account: no number of retries changes the answer, so retrying
 * every five minutes for ever is a request the store has already refused, plus
 * a `last_error` that says "401" without saying "this needs a person".
 *
 * 403 IS NOT A SYNONYM FOR "FORBIDDEN" AT GOOGLE. androidpublisher returns 403
 * for quota conditions as well as for permission ones — rateLimitExceeded and
 * quotaExceeded arrive as 403, and Google's own guidance is to back off on them
 * exactly as for 429. Parking on the status alone would stop a sync for a day
 * because it was briefly busy. THE REASON CODE IS THE DISCRIMINATOR, not the
 * status, which is why both classifiers read the body and neither switches on
 * `res.status` by itself.
 *
 * Nothing here reads or returns upstream prose. A machine code is matched
 * against a fixed list and then discarded; the message a caller stores is
 * built by the caller from fixed text, a status, and a code that has already
 * been shape-checked.
 */
import { MAX_BACKOFF_MS } from './checkpoint';

/** What to do about a failure, decided from the response and never the text. */
export type SyncDisposition =
  /** Normal failure. Count it, back off, retry — the behaviour that predates this. */
  | 'retry'
  /** The store asked for a wait. Do not count it; come back when it said. */
  | 'defer'
  /** A credential was refused. Stop the cadence; a person has to act. */
  | 'park';

export interface SyncFailure {
  disposition: SyncDisposition;
  /** Only meaningful for 'defer'. Already clamped. */
  deferMs?: number;
}

/**
 * The floor under any wait we honour.
 *
 * Retry-After can be small, and a 429 answered 3 seconds later is how a sync
 * stays rate limited. A minute costs nothing against a 7-day window.
 */
export const MIN_DEFER_MS = 60_000;

/**
 * The ceiling, and it is MAX_BACKOFF_MS deliberately.
 *
 * Retry-After is upstream-controlled input on its way into a scheduling
 * column. checkpoint.ts caps our OWN backoff at an hour because a longer wait
 * risks reviews ageing out of Google's window; a number chosen by the store
 * cannot be allowed to do what we refuse to do to ourselves.
 */
export const MAX_DEFER_MS = MAX_BACKOFF_MS;

/** The default wait when a store says "later" without saying when. */
export const DEFAULT_DEFER_MS = 15 * 60_000;

/**
 * Attaches a disposition to an error on its way up.
 *
 * The error classes already exist and already carry the message that gets
 * stored; this adds fields rather than a parallel hierarchy, so `paginate` goes
 * on passing the error through untouched and only `runIngest` has to know.
 * NEVER classify by matching the message text: the message is built for a
 * person to read and will be reworded.
 */
export function markFailure<E extends Error>(err: E, failure: SyncFailure): E {
  Object.assign(err, failure);
  return err;
}

/** What to do about this error. Anything unmarked is an ordinary failure. */
export function dispositionOf(err: unknown): SyncFailure {
  const marked = err as Partial<SyncFailure> | null;
  const disposition = marked?.disposition;
  if (disposition === 'defer') {
    return { disposition, deferMs: clampDefer(marked?.deferMs) };
  }
  if (disposition === 'park') return { disposition };
  return { disposition: 'retry' };
}

/**
 * A stated wait, kept inside the bounds we are willing to honour.
 *
 * A wait that has ALREADY ELAPSED — an HTTP-date a few seconds in the past —
 * is still a wait that was stated, so it takes the floor rather than the
 * default: the store said "now", and a minute from now is the soonest we are
 * prepared to read that as. Only the absence of a usable number falls through
 * to the default.
 */
function clampDefer(ms: unknown): number {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return DEFAULT_DEFER_MS;
  return Math.min(Math.max(ms, MIN_DEFER_MS), MAX_DEFER_MS);
}

/**
 * `Retry-After` as milliseconds, clamped, or null when it says nothing usable.
 *
 * Both forms are in the spec and both are served in practice: delay-seconds,
 * and an HTTP-date. A date in the past means "now", which the floor turns into
 * a minute rather than into a request fired immediately.
 */
export function retryAfterMs(header: string | null | undefined, nowMs: number): number | null {
  const raw = header?.trim();
  if (!raw) return null;

  if (/^[0-9]{1,9}$/.test(raw)) return clampDefer(Number(raw) * 1000);

  /**
   * Only the date form reaches Date.parse, and an HTTP-date always carries a
   * month name and GMT. Handing it anything else is how `-5` and `12.5` —
   * neither of them a delay-seconds value — come back as real instants and
   * turn into a wait that was never asked for.
   */
  if (!/[A-Za-z]/.test(raw)) return null;

  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return null;
  return clampDefer(at - nowMs);
}

/** Google's quota conditions, whichever of its two error shapes carries them. */
const GOOGLE_QUOTA_REASONS = new Set([
  'rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded', 'dailyLimitExceeded',
]);

/**
 * A Google Play refusal: wait, stop, or retry.
 *
 * The body is `{ error: { status, errors: [{ reason }] } }` for the API and
 * `{ error: "invalid_grant" }` for the token endpoint; both are read, because
 * a dead key is refused at the token endpoint and never reaches the API.
 */
export function classifyGoogle(status: number, headers: Headers | null, body: unknown, nowMs: number): SyncFailure {
  const error = (body as any)?.error;
  const quota = isGoogleQuota(error);

  if (status === 429 || quota) {
    return { disposition: 'defer', deferMs: retryAfterMs(headers?.get('retry-after'), nowMs) ?? DEFAULT_DEFER_MS };
  }
  // 400 belongs here because of the token endpoint: `invalid_grant` is what a
  // deleted service account and a revoked key both answer, with a 400.
  if (status === 401 || status === 403 || (status === 400 && isGoogleDeadKey(error))) {
    return { disposition: 'park' };
  }
  return { disposition: 'retry' };
}

function isGoogleQuota(error: unknown): boolean {
  if ((error as any)?.status === 'RESOURCE_EXHAUSTED') return true;
  const reasons = (error as any)?.errors;
  return Array.isArray(reasons)
    && reasons.some((e: any) => typeof e?.reason === 'string' && GOOGLE_QUOTA_REASONS.has(e.reason));
}

/** The token endpoint's way of saying the key itself is finished. */
function isGoogleDeadKey(error: unknown): boolean {
  return error === 'invalid_grant' || error === 'unauthorized_client' || error === 'invalid_client';
}

/**
 * An App Store Connect refusal: wait, stop, or retry.
 *
 * The body is `{ errors: [{ code }] }`. Apple's codes are dotted and its rate
 * limit is RATE_LIMIT_EXCEEDED; a 403 here is FORBIDDEN_ERROR, a permission
 * answer rather than Google's overloaded one, but the code is still what
 * decides in case Apple ever overloads it too.
 */
export function classifyApple(status: number, headers: Headers | null, body: unknown, nowMs: number): SyncFailure {
  const code = (body as any)?.errors?.[0]?.code;
  const rateLimited = typeof code === 'string' && code.startsWith('RATE_LIMIT');

  if (status === 429 || rateLimited) {
    return { disposition: 'defer', deferMs: retryAfterMs(headers?.get('retry-after'), nowMs) ?? DEFAULT_DEFER_MS };
  }
  if (status === 401 || status === 403) return { disposition: 'park' };
  return { disposition: 'retry' };
}
