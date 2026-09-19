/**
 * Ingest Worker. Validate → scan → sanitize → persist → 202.
 *
 * Persisting IS the handoff: a row in state `received` is picked up by the
 * drain cron within a minute. There is no queue to enqueue to — see
 * docs/ARCHITECTURE.md for why, and tag `queue-design` for the version that
 * used one.
 *
 * The fetch handler holds no GitHub write credential path of its own; only
 * the scheduled handler publishes.
 */

import { drain } from './drain';
import { syncMirror, EMBED_BATCH } from './cron';
import { embedMissing, embedTexts, similarIssues, unpackVector } from './lib/embed';
import { verifyTurnstile, verifyHmac, sha256Hex, isUuidV4, timingSafeEqual } from './lib/validate';
import { scanForSecrets } from './lib/secret-scan';
import { sanitize } from './lib/sanitize';
import { inferErrorCode, fingerprint } from './lib/fingerprint';
import { storeAttachment, validateFile, admitBytes } from './lib/attachments';
import { floodHash, reporterKind, floodConfig, spamGateEnabled, checkFlood } from './lib/spam-signals';
import { handleReview } from './lib/review';
import { handleStore } from './store/admin';
import { runStoreTick } from './store/cron';
import { syncHealth } from './store/health';
import { DRAIN_CRON, MIRROR_CRON, STORE_CRON } from './crons';
import { handleAuthRoutes, handleTeam, requireAdmin } from './lib/admin-routes';
import { withTheme } from './lib/theme';
import { alertOverdue, purgeSpamAttachments, overdueCounts, opsConfig } from './lib/review-ops';
import { assertWalletTarget, getGitHubToken, verifyGitHubInstallation } from './lib/github-auth';
import { withRouteSecurityHeaders } from './lib/security-headers';

export interface Env {
  ASSETS?: Fetcher;
  DB: D1Database;
  /** Workers AI — embeddings for paraphrase-aware dedup. Free tier. */
  AI: Ai;
  ATTACHMENTS: R2Bucket;
  RATE_LIMITER: DurableObjectNamespace;
  PUBLISH_GATE: DurableObjectNamespace;
  TURNSTILE_SECRET: string;
  INGEST_HMAC_KEY: string;
  /**
   * Guards /admin/backfill. A SEPARATE secret, deliberately — INGEST_HMAC_KEY
   * ships inside the client bundle, so gating an operator route on it would
   * let anyone who opened devtools drive the mirror sync.
   */
  BACKFILL_TOKEN: string;
  /** Test-only fallback. Production mints installation tokens from the GitHub App. */
  GITHUB_WRITE_TOKEN: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  R2_PUBLIC_BASE?: string;
  LLM_API_KEY_PRIMARY: string;
  LLM_API_KEY_FALLBACK: string;
  TARGET_REPO: string;
  PUBLISH_ENABLED: string;
  CAP_PER_HOUR: string;
  CAP_PER_DAY: string;
  /** New issues one reporter may create per hour / per 24h. Fairness between
   *  honest reporters; the global caps above are the actual abuse wall. */
  REPORTER_CAP_PER_HOUR: string;
  REPORTER_CAP_PER_DAY: string;
  /** Below this a match is not mentioned at all. */
  REVIEW_THRESHOLD: string;
  /**
   * AUTHORISATION, not classification. At or above this a match may be acted
   * on: a comment written onto an issue this service does not own, or a real
   * cross-reference spent on one. Deliberately its own name — the threshold it
   * replaced also meant "this is a duplicate", and reusing a classification
   * number as write permission is how a 0.61 guess earned a public comment.
   */
  AUTO_ACTION_THRESHOLD: string;
  MARKER_PREFIX: string;
  /** Submissions claimed per drain tick. Bounded by the free plan's 50
   *  subrequests per invocation — one submission can spend six or seven. */
  DRAIN_BATCH_SIZE: string;
  /** Error retries before a submission is parked in state `failed`. */
  MAX_ATTEMPTS: string;
  /** Accepted submissions per hour per install id (else per IP). */
  RATE_LIMIT_PER_HOUR: string;

  /**
   * Spam layer kill switch. Anything but the literal "true" means OFF, so the
   * safe state is the default and a typo cannot arm a filter that parks real
   * user reports. Stays "false" in production until the review page exists —
   * flagging with nowhere to read or release from is a black hole, which is
   * the thing this layer exists to prevent.
   *
   * While it is off the check still RUNS and logs what it would have done.
   * That shadow data is what justifies flipping it, and it costs one indexed
   * read. The same discipline was applied to duplicate-merging before it went
   * live, and it is the reason that switch was defensible.
   */
  /**
   * Slack incoming webhook for the private review-alert channel. A SECRET, not
   * a var — a webhook URL is a credential: anyone holding it can post to the
   * channel. Unset simply means no alerts are sent; the counts stay available
   * on /admin/quarantined either way, so alerting is additive and never the
   * only way to see the queue.
   */
  OPS_ALERT_WEBHOOK?: string;
  /** Hours before an unreviewed suspected report is surfaced, then escalated. */
  SPAM_REVIEW_OVERDUE_H?: string;
  SPAM_REVIEW_OVERDUE_ESCALATE_H?: string;
  /** Days after which a CONFIRMED spam row's attachments are deleted. */
  SPAM_ATTACHMENT_RETENTION_DAYS?: string;
  SPAM_GATE_ENABLED?: string;
  /** Nth identical submission that trips the flood check. Floored at 2. */
  FLOOD_THRESHOLD?: string;
  /** Window the count is taken over. Clamped to [1 minute, 24 hours]. */
  FLOOD_WINDOW_MS?: string;
  /**
   * Admin sign-in. All three are SECRETS, never vars.
   *
   * With any of them missing the console admits NOBODY — it fails closed, so a
   * missing secret locks the door rather than removing it.
   */
  ADMIN_SESSION_SECRET?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  /** Optional comma-separated domain fence, e.g. "miden.team". */
  ADMIN_EMAIL_DOMAINS?: string;
  /** Sign-in starts allowed per IP per 10 minutes. Floored at 1 in code. */
  ADMIN_AUTH_PER_WINDOW?: string;
  /**
   * Store Reviews classification. OFF unless the literal "true", the
   * convention PUBLISH_ENABLED and SPAM_GATE_ENABLED already follow, so a typo
   * can never arm it. Turning it off is safe: reviews accumulate in
   * `awaiting_review` and humans can still read, filter and act on them.
   */
  /** Overrides the classifier model without a code change. */
  /** Reviews classified per tick. Clamped to [1, 20] in code. */
  /**
   * Store Reviews sync. OFF unless the literal "true", and it ships off: it is
   * turned on deliberately once production is verified. Once on, turning it
   * off is data-destructive, since Google serves only the last 7 days of
   * reviews. See SAFETY-CONTROLS.md §12.
   */
  STORE_SYNC_ENABLED?: string;
  /** The Google Play service-account key file, pasted whole. A SECRET. */
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?: string;
  /** The Android app whose reviews are collected. Public, so a var. */
  GOOGLE_PLAY_PACKAGE_NAME?: string;
  /**
   * App Store review sync. Needs STORE_SYNC_ENABLED as well: both must be the
   * literal "true". A switch of its own because Google's is already on, and
   * turning it off loses nothing, since App Store Connect does not limit
   * reviews to the last 7 days.
   */
  APP_STORE_SYNC_ENABLED?: string;
  /** The iOS app whose reviews are collected, by bundle ID. Public, so a var. */
  APP_STORE_BUNDLE_ID?: string;
  /** The App Store Connect team API key's Key ID. A SECRET. */
  APPLE_ASC_KEY_ID?: string;
  /** The issuer ID of the team that key belongs to. A SECRET. */
  APPLE_ASC_ISSUER_ID?: string;
  /** The key's .p8 file, pasted whole. A SECRET. */
  APPLE_ASC_PRIVATE_KEY?: string;
  /**
   * The git commit this Worker was built from, injected at deploy time by
   * scripts/deploy.sh. Optional because `wrangler dev` sets nothing — a local
   * run reports "dev" rather than lying about a commit.
   */
  COMMIT_SHA?: string;
}

// The cron strings scheduled() dispatches on live in src/crons.ts.

/**
 * Internal pipeline state -> what the reporter is told.
 *
 * Deliberately lossy. `capped` and `deferred` are different problems for an
 * operator and the same fact for a reporter — it is processed and waiting on
 * publishing capacity — and which limiter closed is not theirs to reason
 * about. The exact reason stays in D1 and the logs.
 *
 *   received  — accepted, not yet picked up
 *   reviewing — in the pipeline right now
 *   queued    — classified, waiting on publish budget
 *   attached  — its text is on an existing issue (dup_links proves it)
 *   filed     — it has an issue of its own
 *
 * quarantined and failed both map to `received` ON PURPOSE. Quarantine
 * answers 202 by design so a false positive tells an attacker nothing, and a
 * parked row is an operator's problem the reporter cannot act on. Neither
 * looks different on the page than it does today; changing that is a product
 * decision, not a rename.
 *
 * `suspected_spam` and `spam` map to `received` for the same reason, and they
 * do it by falling through to the default branch rather than by a case of
 * their own. That is intentional on both counts:
 *
 *   - Telling a reporter their report was flagged as spam tells a spammer
 *     their probe worked, and tells a false-positive victim something they
 *     cannot act on. Neutral is the only answer that is safe in both
 *     directions.
 *   - Fall-through means any state added later is neutral by DEFAULT. A new
 *     internal state cannot leak to the public API by someone forgetting to
 *     add it here — the failure mode is a state that reads as `received`,
 *     never one that reveals pipeline internals.
 *
 * test/status.test.ts case 16e pins this. Changing it is a product decision.
 */
function publicStatus(state: string, published: number | null, folded: number | null): string {
  if (published !== null) return 'filed';
  if (folded !== null) return 'attached';
  if (state === 'claimed' || state === 'publishing') return 'reviewing';
  if (state === 'capped' || state === 'deferred') return 'queued';
  return 'received';
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const worker = {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const response = await worker.fetchRaw(req, env, ctx);
    return withRouteSecurityHeaders(req, response);
  },

  async fetchRaw(req: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    assertWalletTarget(env.TARGET_REPO);
    if (!env.GITHUB_WRITE_TOKEN && env.GITHUB_APP_ID) env.GITHUB_WRITE_TOKEN = await getGitHubToken(env);
    const url = new URL(req.url);
    const requestedPath = url.pathname;
    if (requestedPath === '/submit' || requestedPath === '/status') {
      const canonical = new URL(req.url);
      canonical.pathname = requestedPath === '/submit' ? '/api/feedback/submit' : '/api/feedback/status';
      const response = await worker.fetchRaw(new Request(canonical, req), env, _ctx);
      const headers = new Headers(response.headers);
      headers.set('deprecation', 'true');
      headers.set('link', `<${canonical.pathname}>; rel="successor-version"`);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    if (requestedPath === '/api/feedback/submit') url.pathname = '/submit';
    if (requestedPath === '/api/feedback/status') url.pathname = '/status';

    if (url.pathname === '/health') {
      // Exposes cap consumption so the kill switch and volume budget are
      // observable without opening the dashboard.
      const gate = env.PUBLISH_GATE.get(env.PUBLISH_GATE.idFromName('global'));
      const status = await (await gate.fetch('https://gate/status')).json();

      // THE PER-STATE CENSUS IS NOT PUBLIC. It used to be, and the spam layer
      // is what changed the calculus.
      //
      // /health is untokened by design, and a per-state map was harmless while
      // the states were operational ones. With `suspected_spam` and `spam` in
      // the table it becomes a classifier-tuning oracle: submit a probe, poll,
      // see whether it landed in the spam bucket — or, once those buckets are
      // hidden, whether `published` failed to move — adjust the payload, and
      // repeat, for free and anonymously. Gating only the derived overdue
      // counts while leaving the raw counts public one route over would have
      // closed the front door and left the window open.
      //
      // An uptime monitor needs "is it up and is publishing open", not a
      // census. The full map now lives behind BACKFILL_TOKEN alongside the
      // overdue counts on /admin/quarantined.
      const attention = await env.DB.prepare(
        `SELECT state, COUNT(*) AS n FROM submissions
          WHERE state IN ('quarantined', 'failed') GROUP BY state`
      ).all<{ state: string; n: number }>();
      const counts: Record<string, number> = {};
      for (const r of attention.results ?? []) counts[r.state] = r.n;

      return json({
        ok: true,
        /**
         * WHICH COMMIT IS ACTUALLY SERVING.
         *
         * Cloudflare recorded `Source: Unknown` for every deployment this
         * Worker has had, which on 2026-09-02 made "is master what is running?"
         * answerable only by comparing commit dates to deployment timestamps.
         * The tag and message that scripts/deploy.sh now sets describe what was
         * UPLOADED; this describes what is RUNNING, and it can be checked from
         * outside without dashboard access.
         *
         * Public deliberately: the repository is public, so a commit hash
         * reveals nothing a reader could not already look up, and being able to
         * verify the running version without a credential is worth more.
         */
        commit: env.COMMIT_SHA ?? 'dev',
        publish: status,
        // Kept public deliberately, unlike the spam states. Quarantine answers
        // 202 to the reporter on purpose, so a false positive is otherwise
        // invisible to everyone — a non-zero count here is the only signal one
        // happened. Nobody iterates payloads against secret-material detection
        // the way they would against a spam classifier.
        needsAttention: {
          quarantined: counts.quarantined ?? 0,
          failed: counts.failed ?? 0,
        },
        /**
         * PER-STORE SYNC STATUS, because a stopped sync is otherwise invisible
         * from outside until someone notices the queue has not grown — and it
         * is the one failure with a deadline: Google serves 7 days, so a sync
         * that has stopped is losing reviews that the API will never offer
         * again. `windowConsumed` is the number to alarm on; `state` says what
         * the scheduler is doing and why.
         *
         * Counts and clocks only. No `last_error`, no pause reason, no app id
         * and no review text: this route is untokened, the same reason the
         * per-state census above it is not here any more.
         */
        stores: await syncHealth(env.DB, env as any, Date.now()),
      });
    }

    /**
     * Clear the publish gate's rolling counters. Cutover only: the hourly and
     * daily windows otherwise carry testing writes into production, and the
     * day-one caps refuse real reports for the wrong reason.
     *
     *   curl -X POST https://<worker>/admin/gate-reset -H "authorization: Bearer $BACKFILL_TOKEN"
     */
    /**
     * SIGN-IN FIRST, then the gate, then the pages.
     *
     * The four auth routes have to work while signed out or nobody could ever
     * sign in. Everything else a browser opens under /admin/ goes through
     * requireAdmin, so a page added later is protected by WHERE IT LIVES rather
     * than by its author remembering to check — which is the failure mode that
     * makes per-route auth checks unreliable.
     *
     * The machine endpoints below (/admin/backfill, /admin/gate-reset,
     * /admin/quarantined, /admin/whoami, /admin/retrieval-test) keep their
     * BACKFILL_TOKEN and are deliberately NOT behind the session: they are
     * called by scripts, which have no browser to sign in with.
     */
    // Every console page, signed in or not, arrives in the theme chosen in Settings.
    const auth = await handleAuthRoutes(req, env as any, url, Date.now());
    if (auth) return withTheme(req, auth);

    const BROWSER_ADMIN = ['/admin/review', '/admin/store', '/admin/team', '/admin/settings'];
    if (BROWSER_ADMIN.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
      const gate = await requireAdmin(req, env as any, url, Date.now());
      if ('response' in gate) return withTheme(req, gate.response);

      const team = await handleTeam(req, env as any, url, gate.user, Date.now());
      if (team) return withTheme(req, team);

      const review = await handleReview(req, env as any, url, gate.user);
      if (review) return withTheme(req, review);

      const store = await handleStore(req, env as any, url, gate.user);
      if (store) return withTheme(req, store);
    }

    if (url.pathname === '/admin/gate-reset' && req.method === 'POST') {
      const auth = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
      if (!env.BACKFILL_TOKEN || !timingSafeEqual(auth, env.BACKFILL_TOKEN)) {
        return json({ error: 'unauthorized' }, 401);
      }
      const gate = env.PUBLISH_GATE.get(env.PUBLISH_GATE.idFromName('global'));
      const res = await (await gate.fetch('https://gate/reset', { method: 'POST' })).json();
      return json({ ok: true, gate: res });
    }

    /**
     * The quarantine and parked queues, with reasons. Token-gated because a
     * submission id plus a timestamp is submitter data, unlike the bare counts
     * on /health.
     *
     *   curl https://<worker>/admin/quarantined -H "authorization: Bearer $BACKFILL_TOKEN"
     */
    if (url.pathname === '/admin/quarantined' && req.method === 'GET') {
      const auth = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
      if (!env.BACKFILL_TOKEN || !timingSafeEqual(auth, env.BACKFILL_TOKEN)) {
        return json({ error: 'unauthorized' }, 401);
      }
      const rows = await env.DB.prepare(
        `SELECT submission_id, state, quarantine_reason, last_error, attempts, received_at
           FROM submissions
          WHERE state IN ('quarantined', 'failed')
          ORDER BY received_at DESC LIMIT 50`
      ).all<{
        submission_id: string; state: string; quarantine_reason: string | null;
        last_error: string | null; attempts: number; received_at: number;
      }>();

      // Overdue REVIEW counts live here rather than on /health, and the
      // asymmetry with the existing public counts is deliberate. /health is
      // untokened by design, which is fine for `quarantined` — nobody iterates
      // against secret-material detection. Spam is different: an attacker
      // could submit, poll a public count, watch it move, adjust the payload
      // and repeat. That is a free tuning oracle for the exact classifier this
      // layer depends on.
      const overdue = await overdueCounts(env.DB, opsConfig(env));

      // The per-state census, moved off the untokened /health — see the
      // comment there. An authorised operator gets the full picture; an
      // anonymous prober gets nothing to tune against.
      const stateRows = await env.DB.prepare(
        'SELECT state, COUNT(*) AS n FROM submissions GROUP BY state'
      ).all<{ state: string; n: number }>();
      const pipeline: Record<string, number> = {};
      for (const r of stateRows.results ?? []) pipeline[r.state] = r.n;

      // The body is already redacted in D1 for quarantined rows, so there is
      // nothing here to leak even to an authorised caller — the reason is the
      // only thing that identifies WHY, and it is what a false positive needs.
      return json({
        ok: true,
        pipeline,
        review: {
          overdue_warn: overdue.warn,
          overdue_escalate: overdue.escalate,
        },
        rows: (rows.results ?? []).map((r) => ({
          submission_id: r.submission_id,
          state: r.state,
          reason: r.quarantine_reason ?? r.last_error,
          attempts: r.attempts,
          received_at: new Date(r.received_at).toISOString(),
        })),
      });
    }
    /**
     * GitHub App installation self-test. It lists repositories visible to the
     * short-lived installation token and confirms the one allowed target is
     * present. No repository is modified.
     *
     * Needed because a healthy mirror is NOT evidence of write access: GitHub
     * serves public issues to a scopeless token, so "synced 180 issues" and
     * "cannot open an issue" look identical from outside. Without this, the
     * first genuine report is the test — and a 401 is not in the deferral
     * list, so it would burn all MAX_ATTEMPTS and park in `failed`.
     *
     *   curl "https://<worker>/admin/whoami" -H "authorization: Bearer $BACKFILL_TOKEN"
     */
    if (url.pathname === '/admin/whoami' && req.method === 'GET') {
      const auth = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
      if (!env.BACKFILL_TOKEN || !timingSafeEqual(auth, env.BACKFILL_TOKEN)) {
        return json({ error: 'unauthorized' }, 401);
      }
      return json(await verifyGitHubInstallation(env, env.TARGET_REPO));
    }

    /**
     * Retrieval self-test. Semantic retrieval fails SILENTLY — similarIssues
     * skips any row whose stored vector it cannot unpack, so a type mismatch
     * between what D1 returns for a BLOB and what unpackVector accepts yields
     * an empty candidate list with no error anywhere. This reports the shapes
     * instead of guessing at them.
     *
     *   curl "https://<worker>/admin/retrieval-test?q=camera+preview+black" \
     *        -H "authorization: Bearer $BACKFILL_TOKEN"
     */
    if (url.pathname === '/admin/retrieval-test' && req.method === 'GET') {
      const auth = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
      if (!env.BACKFILL_TOKEN || !timingSafeEqual(auth, env.BACKFILL_TOKEN)) {
        return json({ error: 'unauthorized' }, 401);
      }
      const q = url.searchParams.get('q') ?? 'camera preview stays black when opening the QR scanner';
      const out: Record<string, unknown> = {};

      // 1. can we embed at all?
      try {
        const [v] = await embedTexts(env, [q]);
        out.queryVector = { ok: true, dims: v?.length ?? 0 };
      } catch (e) {
        out.queryVector = { ok: false, error: String(e) };
      }

      // 2. what does D1 actually hand back for a BLOB column?
      const row = await env.DB.prepare(
        'SELECT number, embedding FROM issue_mirror WHERE embedding IS NOT NULL LIMIT 1'
      ).first<{ number: number; embedding: unknown }>();
      const raw = row?.embedding;
      const unpacked = unpackVector(raw);
      out.storedVector = {
        issue: row?.number ?? null,
        jsType: typeof raw,
        ctor: raw === null || raw === undefined ? String(raw) : raw.constructor?.name ?? 'unknown',
        isArrayBuffer: raw instanceof ArrayBuffer,
        isView: ArrayBuffer.isView(raw),
        isArray: Array.isArray(raw),
        byteLength: raw instanceof ArrayBuffer ? raw.byteLength
          : ArrayBuffer.isView(raw) ? (raw as ArrayBufferView).byteLength
          : Array.isArray(raw) ? raw.length : null,
        unpackedDims: unpacked?.length ?? null,
      };

      // 3. end to end
      try {
        const hits = await similarIssues(env, q, 8);
        out.similarIssues = { ok: true, returned: hits.map((h) => h.number) };
      } catch (e) {
        out.similarIssues = { ok: false, error: String(e) };
      }
      return json({ ok: true, ...out });
    }

    // Lets the form's "Your reports" list resolve submission ids to issue
    // numbers. Returns nothing but the issue number and state — no bodies,
    // no other submitters' data.
    if (url.pathname === '/status' && req.method === 'GET') {
      const ids = (url.searchParams.get('ids') ?? '').split(',').filter(isUuidV4).slice(0, 25);
      if (!ids.length) return json({ results: {}, repo: env.TARGET_REPO });
      // The join is what actually repairs the form's history list. Folds never
      // reach the publish path, so a duplicate has no title of its own — the
      // mirror is the only place its title exists.
      //
      // Sourced from dup_links, NOT submissions.matched_issue. Those stopped
      // being the same question when closed matches became new issues:
      // matched_issue records what the CLASSIFIER matched, and a match against
      // a closed issue is deliberately not folded. Reading it here announced
      // "Duplicate of #454 — merged into an existing report" for a report that
      // was queued to get its own issue, and kept announcing it for as long as
      // the cap held the row in `capped` — hours, at CAP_PER_HOUR=1.
      // dup_links means "this report was commented onto that issue", which is
      // precisely the claim the form is making.
      const rows = await env.DB.prepare(
        `SELECT s.submission_id, s.state, s.published_issue, s.published_title,
                d.issue_number AS folded_issue, m.title AS mirror_title
           FROM submissions s
           LEFT JOIN dup_links d ON d.submission_id = s.submission_id
           LEFT JOIN issue_mirror m
             ON m.number = COALESCE(s.published_issue, d.issue_number)
          WHERE s.submission_id IN (${ids.map(() => '?').join(',')})`
      ).bind(...ids).all();
      const results: Record<string, {
        status: string; issue: number | null;
        duplicate: boolean; title: string | null;
      }> = {};
      for (const r of rows.results ?? []) {
        const published = (r as any).published_issue ?? null;
        const folded = (r as any).folded_issue ?? null;
        results[(r as any).submission_id] = {
          // PRESENTATION status, and NOTHING ELSE. The form used to read
          // `capped` and other pipeline vocabulary straight off the wire,
          // which both leaked how the limiter works and meant an internal
          // rename would break the page.
          //
          // The raw `state` used to ride along beside it, "so an operator
          // reading /status by hand still sees it". That single field defeated
          // the entire neutrality design: /status needs no credential, and a
          // reporter picks their OWN submission_id, so anyone could submit a
          // probe, read back `suspected_spam`, adjust the payload and repeat —
          // a per-submission, immediate, unambiguous classifier oracle. The
          // careful fall-through in publicStatus() was answering the question
          // neutrally in one field while the next field answered it exactly.
          //
          // The operator convenience it existed for now lives on
          // /admin/quarantined, behind a token. Nothing goes on this response
          // that publicStatus() would not say.
          status: publicStatus((r as any).state, published, folded),
          // Null until one of the two actually happened. A report still
          // waiting on publish budget reads as queued, which is what it is.
          issue: published ?? folded,
          // Collapsing these two into one number told the reporter "Filed #41"
          // for a report that folded into someone else's issue. They are
          // different outcomes and the form says so.
          duplicate: published === null && folded !== null,
          // Mirror first, deliberately: it reflects GitHub as it is now, so a
          // maintainer renaming the issue reaches the reporter. published_title
          // is only the stand-in for the gap before the next sync.
          //
          // CALLER MUST CHECK THE REPO. issue_mirror is keyed by number alone
          // and only ever holds the current TARGET_REPO, so a pre-cutover
          // report can collide with a same-numbered issue here. The form
          // discards this unless the report was filed in the repo below.
          title: (r as any).mirror_title ?? (r as any).published_title ?? null,
        };
      }
      // The repo travels with the results so the form never hardcodes it —
      // wrangler.jsonc stays the single source of truth across cutover.
      return json({ results, repo: env.TARGET_REPO });
    }

    /**
     * One-shot mirror backfill. Pulls EVERY issue, open and closed, then
     * embeds a bounded batch.
     *
     * Call it repeatedly until `remaining` is 0. It is not a single long run
     * on purpose: the free plan allows 10 ms CPU and 50 subrequests per
     * invocation, so a few hundred issues cannot be embedded in one pass.
     * Idempotent — the upsert and the embedding fill are both safe to repeat.
     *
     *   curl -X POST https://<worker>/admin/backfill \
     *        -H "authorization: Bearer $BACKFILL_TOKEN"
     */
    if (url.pathname === '/admin/backfill' && req.method === 'POST') {
      const auth = (req.headers.get('authorization') ?? '').replace(/^Bearer /, '');
      // Constant-time: a length-leaking === on a bearer token is a free oracle.
      if (!env.BACKFILL_TOKEN || !timingSafeEqual(auth, env.BACKFILL_TOKEN)) {
        return json({ error: 'unauthorized' }, 401);
      }
      // syncMirror runs its own embedding pass, so this request embeds in two
      // passes and must report their SUM. Reporting only the second one made a
      // successful backfill look like it had done nothing.
      const sync = await syncMirror(env, true);
      const second = await embedMissing(env, EMBED_BATCH);
      return json({
        ok: true,
        // Issues fetched from GitHub. A full sync refetches all of them, so
        // this does not shrink on repeat calls and is not a change count.
        synced: sync.issues,
        embedded: sync.embedded + second.embedded,
        // Fresh COUNT taken after both passes. `remaining > 0` means call
        // again — it is not an error.
        remaining: second.remaining,
      });
    }

    if (url.pathname !== '/submit' || req.method !== 'POST') {
      if (requestedPath.startsWith('/api/')) return json({ error: 'not found' }, 404);
      if (requestedPath.startsWith('/admin/')) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      return env.ASSETS ? env.ASSETS.fetch(req) : json({ error: 'not found' }, 404);
    }

    // multipart/form-data: text fields plus at most one attachment
    let form: FormData;
    try { form = await req.formData(); } catch { return json({ error: 'bad form data' }, 400); }

    const submission_id = form.get('submission_id');
    const body = form.get('body');
    const platform = form.get('platform');
    const turnstile_token = form.get('turnstile_token');
    let meta: any = {};
    try { meta = JSON.parse((form.get('meta') as string) ?? '{}'); } catch { /* optional */ }
    meta.platform = typeof platform === 'string' ? platform : null;

    if (!isUuidV4(submission_id)) return json({ error: 'bad submission_id' }, 400);
    if (typeof body !== 'string' || body.trim().length < 10) return json({ error: 'body too short' }, 400);
    if (!['android', 'ios', 'extension'].includes(meta.platform)) {
      return json({ error: 'bad platform' }, 400);
    }

    // 1. OPTIONAL signature. NOT an ingress control — Turnstile below is.
    //
    //    The key ships inside the client bundle, which the wallet distributes
    //    as an extension and a mobile app, so anyone can extract it and sign
    //    anything. Requiring it would stop no attacker and would falsely read
    //    like authentication in review. It is verified only when supplied, to
    //    catch a broken or forked client sending malformed requests — a wrong
    //    signature is a bug signal, an absent one is normal.
    //
    //    Do not promote this back to a requirement. If ingest ever needs real
    //    authentication, it needs a credential the client does not hold.
    const bodyHash = await sha256Hex(body);
    const signature = req.headers.get('x-mfv2-signature');
    if (signature) {
      const canonical = `mfv2.v1\n${submission_id}\n${bodyHash}\n${meta.platform}`;
      if (!(await verifyHmac(canonical, signature, env.INGEST_HMAC_KEY))) {
        return json({ error: 'bad signature' }, 401);
      }
    }

    const attachment = form.get('attachment');
    if (attachment instanceof File && attachment.size > 0) {
      const bad = validateFile(attachment);
      if (bad) return json({ error: bad }, 413);
    }

    const ip = req.headers.get('cf-connecting-ip') ?? undefined;
    // form.get() yields File | string | null — only a non-empty string can be a
    // token, and anything else is rejected without a round trip to Cloudflare.
    if (typeof turnstile_token !== 'string' || !turnstile_token) {
      return json({ error: 'challenge failed', codes: ['missing-input-response'] }, 403);
    }
    const ts = await verifyTurnstile(turnstile_token, env.TURNSTILE_SECRET, ip);
    if (!ts.ok) {
      // Return Cloudflare's own codes. They are diagnostic, not sensitive, and
      // "challenge failed" with no reason is unactionable — it cannot tell a
      // mismatched secret from a token that was simply used twice.
      console.warn('turnstile rejected', ts.codes);
      return json({ error: 'challenge failed', codes: ts.codes }, 403);
    }

    // 2. Rate limit (per install if provided, else per IP)
    const rlKey = typeof meta.install_id === 'string' ? `i:${meta.install_id}` : `ip:${ip ?? 'unknown'}`;
    // The same identity, hashed, is stored on the row so the DRAIN can apply a
    // per-reporter publish cap an hour later. It has no other reader: nothing
    // displays it, and /status never returns it. Hashed rather than raw
    // because publishing does not need to know who someone is, only that two
    // reports came from the same someone. See migration 0004 on what that
    // does and does not buy for the IP fallback.
    const reporterKey = await sha256Hex(rlKey);
    const rl = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(rlKey));
    const rlRes = await rl.fetch('https://rl/check');
    if (rlRes.status === 429) return json({ error: 'rate limited' }, 429);

    // 3. Secret scan BEFORE storing. Quarantine, never log the value.
    const hits = scanForSecrets(body);
    const now = Date.now();

    if (hits.length > 0) {
      await env.DB.prepare(
        `INSERT INTO submissions (submission_id, received_at, state, body_sanitized, body_hash, quarantine_reason)
         VALUES (?, ?, 'quarantined', '[redacted — secret material detected]', ?, ?)
         ON CONFLICT(submission_id) DO NOTHING`
      ).bind(submission_id, now, bodyHash, hits.map((h) => h.kind).join(',')).run();

      // Deliberately a 202: do not tell a potential attacker what tripped it,
      // and do not alarm a legitimate user who pasted a phrase by accident.
      return json({ ok: true, submission_id, status: 'received' }, 202);
    }

    // 4. Flood check — the same person sending the same thing repeatedly.
    //
    //    AFTER the secret scan on purpose: a body that is both secret material
    //    and a flood must be redacted, not preserved for review. Secret
    //    material is the more severe finding and has to win.
    //
    //    Both columns are computed HERE, before any branch, and written by
    //    every path below. That is the load-bearing half and the easy one to
    //    drop: if the ordinary `received` INSERT omits normalized_hash, the
    //    COUNT above it matches nothing and flood detection silently never
    //    fires — no error, no log, just a control that does not exist. It also
    //    means history accumulates while the gate is off, so the check has
    //    something to count the day it is switched on.
    const normalizedHash = await floodHash(body);
    const kind = reporterKind(meta.install_id);

    const flood = await checkFlood(env.DB, reporterKey, normalizedHash, now, floodConfig(env));
    const gateOn = spamGateEnabled(env);
    const flagged = gateOn && flood.flagged;

    if (flood.flagged) {
      // Never the body. A reason code, a count, and whether it was enforced —
      // enough to tune the threshold, nothing that echoes attacker-controlled
      // text into logs an operator reads.
      console.warn(JSON.stringify({
        job: 'flood',
        submission: submission_id,
        reporter_kind: kind,
        prior: flood.priorCount,
        enforced: gateOn,
      }));
    }

    // 5. Sanitize + classify structurally
    const clean = sanitize(body);
    const errorCode = inferErrorCode(clean);
    const fp = fingerprint({
      errorCode,
      walletVersion: meta.wallet_version,
      platform: meta.platform,
      route: meta.route,
    });

    // 6. Attachment — only after the text passed the secret scan.
    //    The user was warned twice in the form; we still keep a durable copy
    //    in R2 so a leaked file can be revoked even after it reaches GitHub.
    //
    //    Skipped for a flagged flood, and only there. Suspected reports keep
    //    their attachments (a reviewer needs to see what was sent) — but the
    //    Nth identical submission's attachment is redundant by definition,
    //    since the first N-1 already stored theirs. Evidence is preserved
    //    without handing a flooder unbounded R2. The skip is recorded in
    //    state_log so a reviewer sees why a file is missing rather than
    //    wondering whether one was ever sent.
    //
    //    THE BYTES ARE READ HERE, not at the top with the size check. Reading
    //    10 MB before Turnstile and the rate limiter would let an unverified
    //    request make this Worker buffer 10 MB, which is a cheaper attack than
    //    the one the sniff prevents. By this point the request has passed the
    //    challenge, the limiter and the secret scan.
    //    VALIDATION RUNS FOR EVERYONE. Only the R2 STORE is skipped for a
    //    flagged flood.
    //
    //    Skipping the sniff along with the store made this endpoint a flood
    //    oracle: bad bytes got a 415 when unflagged and a plain 202 when
    //    flagged, so anyone could binary-search their way to FLOOD_THRESHOLD
    //    and calibrate to threshold-1. That is the same mistake as returning
    //    the raw state from /status — the visible state was neutral while a
    //    side channel answered the identical question. Any branch on `flagged`
    //    that changes what the reporter SEES reintroduces it.
    let attachmentKeys: string[] = [];
    let attachmentSkipped = false;
    if (attachment instanceof File && attachment.size > 0) {
      const bytes = new Uint8Array(await attachment.arrayBuffer());
      const sniffed = admitBytes(bytes, attachment.type);
      if ('error' in sniffed) {
        // 415, and NOTHING is written: no row, no R2 object. The report is
        // refused whole rather than filed without the evidence it referred
        // to, which would leave a maintainer reading about a screenshot
        // that does not exist.
        return json({ error: sniffed.error }, 415);
      }
      if (flagged) {
        // The Nth identical submission's attachment is redundant by
        // definition — the first N-1 already stored theirs — so a flooder
        // gets no unbounded R2. The bytes were still read and validated, so
        // the response is byte-identical to the clean path.
        attachmentSkipped = true;
      } else {
        const stored = await storeAttachment(attachment, bytes, sniffed, submission_id, env as any);
        attachmentKeys = [JSON.stringify(stored)];
      }
    }

    // 7. Idempotency layer 1
    // state and spam_status are written TOGETHER, always. Setting the state
    // without the status would leave spam_status NULL, which every later guard
    // reads as `clean` — so the defence-in-depth layer would be inert exactly
    // where it should fire, and the row would be held only by the drain's
    // state filter. One missing column, one silent single point of failure.
    const state = flagged ? 'suspected_spam' : 'received';
    const spamStatus = flagged ? 'suspected' : null;
    // Reason CODES only, never quoted content. Never 'spam' from a flood
    // alone: a flood is grounds for a human to look, not for a verdict.
    const spamReasons = flagged ? JSON.stringify(['flood_repeat']) : null;

    const res = await env.DB.prepare(
      `INSERT INTO submissions
         (submission_id, received_at, state, body_sanitized, body_hash,
          wallet_version, platform, network, route, error_code, fingerprint,
          reporter_key, attachment_keys,
          normalized_hash, reporter_kind, spam_status, spam_reasons)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(submission_id) DO NOTHING`
    ).bind(
      submission_id, now, state, clean, bodyHash,
      meta.wallet_version ?? null, meta.platform ?? null, meta.network ?? null,
      meta.route ?? null, errorCode, fp, reporterKey, JSON.stringify(attachmentKeys),
      normalizedHash, kind, spamStatus, spamReasons
    ).run();

    // Already seen — a retry, not a new report. Do not re-enqueue.
    if (res.meta.changes === 0) return json({ ok: true, submission_id, status: 'duplicate_submission' }, 200);

    const detail = flagged
      ? `${fp} flood_repeat prior=${flood.priorCount}${attachmentSkipped ? ' attachment_skipped' : ''}`
      : fp;
    await env.DB.prepare(
      `INSERT INTO state_log (submission_id, at, from_state, to_state, detail) VALUES (?, ?, NULL, ?, ?)`
    ).bind(submission_id, now, state, detail).run();

    // No enqueue. A row in state `received` IS the work item; the drain cron
    // claims it on the next tick. A row in `suspected_spam` is excluded from
    // that claim by ABSENCE from its state filter, not by a check that could
    // be forgotten — see the drain's WHERE clause.
    //
    // The reporter is told exactly what a clean submission is told, with the
    // same 202. Telling someone they were flagged tells a spammer their probe
    // worked and tells a false positive something they cannot act on.
    return json({ ok: true, submission_id, status: 'received' }, 202);
  },

  /**
   * All jobs run here. Handlers must be properties of the default export —
   * a named `export function scheduled` is never registered, which is how the
   * previous wiring managed to look correct and never run.
   */
  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    assertWalletTarget(env.TARGET_REPO);
    if (!env.GITHUB_WRITE_TOKEN) env.GITHUB_WRITE_TOKEN = await getGitHubToken(env);
    if (controller.cron === MIRROR_CRON) {
      // Upkeep for the review queue rides the SLOW cron, not the drain's
      // every-minute tick: neither job is urgent, and the drain's subrequest
      // budget is the scarce one.
      //
      // `finally`, not a plain sequence. syncMirror rethrows anything that is
      // not a rate limit, so a GitHub outage would otherwise silently stop
      // overdue alerting — and "nobody is looking at the review queue" is
      // exactly the condition that must still be announced when other things
      // are broken. The sync's error still propagates afterwards.
      try {
        await syncMirror(env);
      } finally {
        try {
          await alertOverdue(env);
          await purgeSpamAttachments(env as any);
        } catch (err) {
          console.warn('review upkeep failed', (err as Error)?.message);
        }
      }
      return;
    }

    if (controller.cron === DRAIN_CRON) {
      await drain(env);
      return;
    }

    if (controller.cron === STORE_CRON) {
      /**
       * One Store Reviews phase per tick, on an invocation budget of its own.
       *
       * ONE CLOCK FOR THE WHOLE TICK. The phase already comes from the
       * scheduled time; the collection cycle now does too, so a tick delivered
       * a little late cannot land in a different cycle from the window it was
       * scheduled for. Cloudflare's scheduled time is the intended instant,
       * which is the one this tick is meant to be acting on.
       */
      await runStoreTick(env, controller.scheduledTime, controller.scheduledTime);
      return;
    }

    /**
     * An unrecognised cron does NOTHING, and says so.
     *
     * This used to be a bare `await drain(env)` fallthrough: anything that was
     * not the mirror cron ran the drain. With exactly two triggers registered
     * that was correct and invisible. It stops being either the moment a third
     * trigger is added — a new schedule would silently run the drain on top of
     * its own every-minute tick, at whatever rate the new trigger fires,
     * spending the publish budget on nothing. The failure would look like the
     * caps closing early, which points at the wrong thing entirely.
     *
     * Dispatching explicitly makes a forgotten branch a no-op with a log line
     * instead of a second drain.
     */
    console.warn('scheduled: no handler for cron', controller.cron);
  },
};

export default worker satisfies ExportedHandler<Env>;

/** Sliding-window limiter, RATE_LIMIT_PER_HOUR per key. */
/**
 * A positive integer from configuration, or the fallback.
 *
 * `Math.max(1, Number(v))` was the old form and it FAILS OPEN. `Number('twenty')`
 * is NaN, `Math.max(1, NaN)` is NaN, and `hits.length >= NaN` is false for every
 * possible hits.length — so a single typo in RATE_LIMIT_PER_HOUR silently
 * disabled the limiter entirely, while the comment beside it claimed it failed
 * tight. That was true of /submit's ingest limiter from the day it was written.
 *
 * Rejected here: NaN, Infinity, fractions, zero, negatives, and anything a
 * string does not fully parse to. Each falls back to the conservative value
 * rather than to "no limit".
 */
export function positiveIntOr(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return fallback;
  return n;
}

export class RateLimiter {
  constructor(
    private state: DurableObjectState,
    private env: { RATE_LIMIT_PER_HOUR?: string; ADMIN_AUTH_PER_WINDOW?: string }
  ) {}

  /**
   * Sliding window. The PATH names a policy; the NUMBERS come from env.
   *
   * THE CALLER CANNOT CHOOSE THE LIMIT. An earlier version read `?limit=` and
   * `?windowMs=` from the request URL, which was safe only while every caller —
   * present and future — remembered to build that URL itself. Forwarding a
   * Request into a Durable Object is the natural thing to do, so the first
   * `rl.fetch(req)` would have handed an attacker `?limit=1000`.
   *
   * AN UNKNOWN PATH IS DENIED, not quietly mapped to one of the two. Mapping it
   * to /check would be "the stricter policy" only for as long as /check happens
   * to be the stricter of the two — a claim that a configuration change can
   * falsify without touching this file. Denying is true whatever the numbers
   * are, and a caller that reaches an unknown path is broken and should say so.
   */
  async fetch(req: Request): Promise<Response> {
    const now = Date.now();
    const path = new URL(req.url).pathname;

    let policy: { key: string; windowMs: number; limit: number };
    if (path === '/auth') {
      policy = {
        key: 'hits:auth',
        windowMs: 10 * 60 * 1000,
        // Fallbacks sit BELOW the configured value on purpose: if a var goes
        // missing or is mistyped, an abuse control must fail tight.
        limit: positiveIntOr(this.env.ADMIN_AUTH_PER_WINDOW, 10),
      };
    } else if (path === '/check') {
      policy = {
        key: 'hits',
        windowMs: 3_600_000,
        limit: positiveIntOr(this.env.RATE_LIMIT_PER_HOUR, 5),
      };
    } else {
      return new Response('unknown rate limit policy', { status: 400 });
    }

    // Counted under a per-policy key. No instance sees both policies today, but
    // that is a property of the callers rather than of this class, and a shared
    // counter would let sign-in attempts consume a reporter's submit budget.
    const hits = ((await this.state.storage.get<number[]>(policy.key)) ?? [])
      .filter((t) => now - t < policy.windowMs);
    if (hits.length >= policy.limit) return new Response('rate limited', { status: 429 });
    hits.push(now);
    await this.state.storage.put(policy.key, hits);
    return new Response('ok');
  }
}

// Durable Object classes are the one thing that IS a named export — the
// runtime resolves them by class name from the migrations entry.
export { PublishGate } from './lib/gate';
