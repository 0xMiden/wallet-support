/**
 * The two stores' reply endpoints, behind one shape: read the reply a review
 * has now, and send one.
 *
 * WHAT MATTERS HERE IS TELLING THREE OUTCOMES APART, because the console shows
 * them differently and acts on them differently:
 *
 *   rejected  the store answered and refused. Nothing was published. "Not sent"
 *             is a true statement.
 *   unknown   the request may have reached the store and the answer never came
 *             back — a network error, a timeout, a 5xx or 408. Resending
 *             blindly could publish twice or overwrite; the reply is marked
 *             "Delivery unconfirmed" and the store is checked first.
 *   success   published (Google), or accepted and not yet published (Apple's
 *             PENDING_PUBLISH).
 *
 * Endpoints are pinned constants. Errors carry an HTTP status and the store's
 * machine code, or what went wrong with the connection — never a token, a key,
 * or upstream prose. They leave the store's name out: the caller says which
 * store, once.
 *
 * Checked against the published references on 2026-09-15:
 *   Google  POST .../applications/{pkg}/reviews/{id}:reply  { replyText } -> { result: { replyText, lastEdited } }
 *           GET  .../applications/{pkg}/reviews/{id}         -> Review (developerComment); only reviews
 *                created or modified within the last week are returned
 *   Apple   POST /v1/customerReviewResponses  -> 201 { data: { id, attributes: { responseBody, lastModifiedDate, state } } }
 *           GET  /v1/customerReviews/{id}/response -> 200 as above, 404 when there is none
 *           state is PUBLISHED or PENDING_PUBLISH
 */
import {
  defaultFetch, mintAccessToken, parseServiceAccount, upstreamCode, type FetchLike,
} from './auth/google';
import { parseAppStoreKey, signAppStoreJwt } from './auth/apple';
import { APP_STORE_CONNECT_API, appleErrorCode } from './sync/apple';
import { fromGooglePlay } from './normalize';

export const GOOGLE_PUBLISHER_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

/** The review a reply belongs to, as the store knows it. */
export interface ReplyTarget {
  source: string;               // google_play | app_store
  appId: string;                // package name, or bundle ID
  platformReviewId: string;
}

export type CurrentReply =
  | { kind: 'none' }
  | { kind: 'reply'; text: string; at: number | null; externalId: string | null; pending: boolean }
  /** The store will not say — Google stops returning a review after a week. */
  | { kind: 'unavailable'; detail: string };

export type SendOutcome =
  | { kind: 'published'; at: number | null; externalId: string | null }
  | { kind: 'pending'; at: number | null; externalId: string | null }
  | { kind: 'rejected'; detail: string; retryable: boolean }
  | { kind: 'unknown'; detail: string };

/** Thrown when the store could not be asked at all: nothing reached it. */
export class ReplyStoreError extends Error {}

export interface ReplyStore {
  current(target: ReplyTarget): Promise<CurrentReply>;
  send(target: ReplyTarget, text: string): Promise<SendOutcome>;
}

export interface ReplyStoreEnv {
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?: string;
  APPLE_ASC_KEY_ID?: string;
  APPLE_ASC_ISSUER_ID?: string;
  APPLE_ASC_PRIVATE_KEY?: string;
}

/** A status the store answered with, where a resend might not be a duplicate. */
const AMBIGUOUS = (status: number) => status === 408 || status >= 500;

async function json(res: Response): Promise<any> {
  try { return await res.json(); } catch { return null; }
}

/**
 * One request whose failure to complete is itself information.
 *
 * A throw from fetch — DNS, reset, timeout — happens after the request may have
 * left, so for a SEND it is `unknown`, never `rejected`.
 */
async function attempt(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<Response | { thrown: string }> {
  try {
    return await fetchImpl(url, init);
  } catch (err) {
    return { thrown: (err as Error)?.name === 'TimeoutError' ? 'the request timed out' : 'the connection failed' };
  }
}

const isoMs = (v: unknown) => {
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};

export function googleReplyStore(env: ReplyStoreEnv, nowMs: number, fetchImpl: FetchLike = defaultFetch): ReplyStore {
  let token: Promise<string> | null = null;
  const getToken = () => (token ??= mintAccessToken(parseServiceAccount(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON), nowMs, fetchImpl));
  const reviewUrl = (t: ReplyTarget) =>
    `${GOOGLE_PUBLISHER_API}/applications/${encodeURIComponent(t.appId)}/reviews/${encodeURIComponent(t.platformReviewId)}`;

  return {
    async current(t) {
      const res = await attempt(fetchImpl, reviewUrl(t), { headers: { authorization: `Bearer ${await getToken()}` } });
      if ('thrown' in res) throw new ReplyStoreError(res.thrown);
      if (res.status === 404) return { kind: 'unavailable', detail: 'HTTP 404' };
      const body = await json(res);
      if (!res.ok) throw new ReplyStoreError(`HTTP ${res.status}${upstreamCode(body?.error?.status)}`);
      let rec;
      try { rec = fromGooglePlay(body, t.appId, nowMs); } catch {
        throw new ReplyStoreError('the review it returned could not be read');
      }
      return rec.existingReplyText
        ? { kind: 'reply', text: rec.existingReplyText, at: rec.existingReplyAt, externalId: null, pending: false }
        : { kind: 'none' };
    },

    async send(t, text) {
      const res = await attempt(fetchImpl, `${reviewUrl(t)}:reply`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await getToken()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ replyText: text }),
      });
      if ('thrown' in res) return { kind: 'unknown', detail: res.thrown };
      const body = await json(res);
      const detail = `HTTP ${res.status}${upstreamCode(body?.error?.status)}`;
      if (res.ok) {
        const s = Number(body?.result?.lastEdited?.seconds);
        return { kind: 'published', at: Number.isFinite(s) ? s * 1000 : null, externalId: null };
      }
      if (AMBIGUOUS(res.status)) return { kind: 'unknown', detail };
      return { kind: 'rejected', detail, retryable: res.status === 429 };
    },
  };
}

export function appleReplyStore(env: ReplyStoreEnv, nowMs: number, fetchImpl: FetchLike = defaultFetch): ReplyStore {
  let token: Promise<string> | null = null;
  const getToken = () => (token ??= signAppStoreJwt(
    parseAppStoreKey(env.APPLE_ASC_KEY_ID, env.APPLE_ASC_ISSUER_ID, env.APPLE_ASC_PRIVATE_KEY), nowMs));

  const toReply = (data: any): CurrentReply => {
    const a = data?.attributes ?? {};
    if (typeof a.responseBody !== 'string') throw new ReplyStoreError('the response it returned had no text');
    return {
      kind: 'reply', text: a.responseBody, at: isoMs(a.lastModifiedDate),
      externalId: typeof data?.id === 'string' ? data.id : null, pending: a.state === 'PENDING_PUBLISH',
    };
  };

  return {
    async current(t) {
      const url = `${APP_STORE_CONNECT_API}/v1/customerReviews/${encodeURIComponent(t.platformReviewId)}/response`;
      const res = await attempt(fetchImpl, url, { headers: { authorization: `Bearer ${await getToken()}` } });
      if ('thrown' in res) throw new ReplyStoreError(res.thrown);
      if (res.status === 404) return { kind: 'none' };
      const body = await json(res);
      if (!res.ok) throw new ReplyStoreError(`HTTP ${res.status}${appleErrorCode(body)}`);
      return toReply(body?.data);
    },

    async send(t, text) {
      const res = await attempt(fetchImpl, `${APP_STORE_CONNECT_API}/v1/customerReviewResponses`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await getToken()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ data: {
          type: 'customerReviewResponses',
          attributes: { responseBody: text },
          relationships: { review: { data: { type: 'customerReviews', id: t.platformReviewId } } },
        } }),
      });
      if ('thrown' in res) return { kind: 'unknown', detail: res.thrown };
      const body = await json(res);
      const detail = `HTTP ${res.status}${appleErrorCode(body)}`;
      if (res.status === 201 || res.ok) {
        let r: CurrentReply;
        try { r = toReply(body?.data); } catch {
          // Accepted, but the answer could not be read: whether it is live is
          // not known, so it is checked rather than assumed.
          return { kind: 'unknown', detail: `${detail}, and the answer could not be read` };
        }
        if (r.kind !== 'reply') return { kind: 'unknown', detail };
        return r.pending
          ? { kind: 'pending', at: r.at, externalId: r.externalId }
          : { kind: 'published', at: r.at, externalId: r.externalId };
      }
      if (AMBIGUOUS(res.status)) return { kind: 'unknown', detail };
      return { kind: 'rejected', detail, retryable: res.status === 429 };
    },
  };
}

export function replyStoreFor(source: string, env: ReplyStoreEnv, nowMs: number, fetchImpl?: FetchLike): ReplyStore {
  return source === 'app_store' ? appleReplyStore(env, nowMs, fetchImpl) : googleReplyStore(env, nowMs, fetchImpl);
}
