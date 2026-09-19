/** Shared fixtures for the Phase 0 regression suite. */
import {
  env, createExecutionContext, waitOnExecutionContext, createScheduledController,
} from 'cloudflare:test';
import worker from '../src/index';

/**
 * Outbound HTTP is stubbed at globalThis.fetch rather than through the pool's
 * undici mock agent. Two reasons: the `fetchMock` export was removed in pool
 * v0.22 / vitest 4, and a plain stub can assert that a call did NOT happen —
 * which is the entire point of the kill-switch test.
 */
export interface RecordedCall { url: string; method: string; body: string | null }

type Route = { match: (url: URL, method: string) => boolean; respond: (body: string | null) => Response | Promise<Response> };

let routes: Route[] = [];
let calls: RecordedCall[] = [];
let realFetch: typeof globalThis.fetch | null = null;

export function installFetchStub(): void {
  if (realFetch === null) realFetch = globalThis.fetch;
  routes = [];
  calls = [];
  globalThis.fetch = (async (input: any, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    // Only JSON bodies are captured. Turnstile posts multipart/form-data and
    // reading that as text makes workerd log a corruption warning for nothing.
    const ct = req.headers.get('content-type') ?? '';
    const body = ['POST', 'PATCH', 'PUT'].includes(method) && ct.includes('json')
      ? await req.clone().text()
      : null;
    calls.push({ url: req.url, method, body });
    for (const r of routes) if (r.match(url, method)) return r.respond(body);
    throw new Error(`unmocked outbound fetch: ${method} ${req.url}`);
  }) as typeof globalThis.fetch;
}

export function restoreFetch(): void {
  if (realFetch) globalThis.fetch = realFetch;
  routes = [];
  calls = [];
}

export function recordedCalls(): RecordedCall[] { return calls; }

export function callsTo(host: string): RecordedCall[] {
  return calls.filter((c) => new URL(c.url).host === host);
}

/**
 * Calls to `host` whose body mentions `needle`.
 *
 * `callsTo` alone is a GLOBAL assertion, and a drain tick processes every
 * eligible row in the table — including ones other tests left behind. Asserting
 * "no GitHub call happened" therefore fails for reasons that have nothing to do
 * with the row under test. Scope it to one submission instead: an issue body
 * carries the `mfv2:<id>` marker, and a classifier call carries the report text.
 */
export function callsMentioning(host: string, needle: string): RecordedCall[] {
  return callsTo(host).filter((c) => (c.body ?? '').includes(needle));
}

/**
 * Registers a stub route. Exported because several suites need an upstream to
 * answer with things a real one will not produce on demand — a refusal, a
 * truncated response, a malformed token, a 500 — which is exactly when the
 * guards around it have to hold. */
export function route(r: Route) { routes.push(r); }

export const REPO = '0xMiden/wallet';

/**
 * Unit-style invocation rather than SELF.fetch: the worker then runs in the
 * test isolate, which is where fetchMock intercepts outbound calls.
 */
export async function callWorker(req: Request): Promise<Response> {
  const ctx = createExecutionContext();
  const res = await worker.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

/** Drives the 15-minute cron: mirror sync plus review-queue upkeep. */
export async function runMirrorCron(): Promise<void> {
  const ctx = createExecutionContext();
  const controller = createScheduledController({ cron: '*/15 * * * *' });
  await worker.scheduled(controller, env, ctx);
  await waitOnExecutionContext(ctx);
}

/** An empty issue list, so syncMirror succeeds without touching the network. */
export function mockIssueList(issues: unknown[] = []) {
  route({
    match: (u, m) => u.host === 'api.github.com' && m === 'GET',
    respond: () => Response.json(issues),
  });
}

const OPS_HOOK = 'https://hooks.slack.test/services/T/B/X';
let opsPosts: any[] = [];
export function mockOpsWebhook() {
  opsPosts = [];
  route({
    match: (u, m) => u.host === 'hooks.slack.test' && m === 'POST',
    respond: (body) => { opsPosts.push(JSON.parse(body ?? '{}')); return new Response('ok'); },
  });
  return OPS_HOOK;
}
export function opsAlerts(): any[] { return opsPosts; }

/** Drives the drain, on the every-minute cron it is actually registered for. */
export async function runDrain(): Promise<void> {
  await runCron('* * * * *');
}

/**
 * Fires an arbitrary cron string at the scheduled handler.
 *
 * Exists so a test can prove what an UNRECOGNISED schedule does. The handler
 * used to treat "not the mirror cron" as "drain", which made any future
 * trigger a second drain; that is now an explicit dispatch and this is how it
 * stays one.
 */
export async function runCron(cron: string, scheduledTime?: number): Promise<void> {
  const ctx = createExecutionContext();
  // Pass scheduledTime whenever the job depends on it. The store cron picks
  // its phase from the clock slot, so a default of "now" would make a test
  // pick Google or Apple by wall-clock time.
  const controller = createScheduledController(
    scheduledTime === undefined ? { cron } : { cron, scheduledTime }
  );
  await worker.scheduled(controller, env, ctx);
  await waitOnExecutionContext(ctx);
}

/**
 * Clears the global publish gate's rolling write log.
 *
 * REQUIRED in beforeEach for any suite that publishes. Durable Object storage
 * does NOT roll back between tests in this pool — verified with
 * `vitest run --sequence.shuffle`, where an unreset gate made tests 7/10/11
 * fail whenever they ran after the cap test. The DO's own /reset endpoint
 * exists for exactly this (it was written for production cutover).
 */
export async function resetGlobalGate(): Promise<void> {
  const gate = env.PUBLISH_GATE.get(env.PUBLISH_GATE.idFromName('global'));
  await gate.fetch('https://gate/reset', { method: 'POST' });
}

/**
 * Spends global publish-gate slots until it refuses. Independent of whatever
 * CAP_PER_HOUR is configured to, which matters because the Durable Object
 * reads its own env from miniflare and a test cannot mutate it.
 */
export async function exhaustGlobalGate(limit = 500): Promise<number> {
  const gate = env.PUBLISH_GATE.get(env.PUBLISH_GATE.idFromName('global'));
  for (let i = 0; i < limit; i++) {
    const d = await (await gate.fetch('https://gate/check?scope=global')).json<any>();
    if (!d.allowed) return i;
  }
  throw new Error(`global gate still open after ${limit} writes`);
}

// --- Attachment fixtures ---------------------------------------------------
// Real magic bytes. A file of arbitrary bytes is now refused with 415, so a
// test that wants an attachment ACCEPTED has to supply something that really
// is what it claims.

/** 8-byte PNG signature, then filler. */
export const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
/** JPEG SOI + marker. */
export const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
/**
 * A genuine minimal ISO base-media header: a 24-byte `ftyp` box declaring its
 * own length. The length is now validated, so a truncated stub no longer
 * passes -- which is the point: a real file's box fits inside the file.
 */
export const MP4_BYTES = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,   // size 24, 'ftyp'
  0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,   // major brand 'isom', minor version
  0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,   // compatible brands
]);
/** Recognised by nothing. */
export const JUNK_BYTES = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

export function fileOf(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes], name, { type });
}
export const pngFile = (name = 'shot.png') => fileOf(PNG_BYTES, name, 'image/png');
export const jpegFile = (name = 'shot.jpg') => fileOf(JPEG_BYTES, name, 'image/jpeg');
export const mp4File = (name = 'clip.mp4') => fileOf(MP4_BYTES, name, 'video/mp4');

export interface SubmitOverrides {
  submission_id?: string;
  body?: string;
  platform?: string | null;
  turnstile_token?: string | null;
  install_id?: string | null;
  meta?: Record<string, unknown>;
  attachment?: File;
}

export function submitRequest(over: SubmitOverrides = {}): Request {
  const form = new FormData();
  if (over.submission_id !== undefined) form.set('submission_id', over.submission_id);
  else form.set('submission_id', crypto.randomUUID());

  form.set('body', over.body ?? 'The wallet balance is wrong after I send a private note.');
  if (over.platform !== null) form.set('platform', over.platform ?? 'android');
  if (over.turnstile_token !== null) form.set('turnstile_token', over.turnstile_token ?? 'tok');

  const meta: Record<string, unknown> = { ...(over.meta ?? {}) };
  if (over.install_id !== null) meta.install_id = over.install_id ?? crypto.randomUUID();
  form.set('meta', JSON.stringify(meta));

  if (over.attachment) form.set('attachment', over.attachment);

  return new Request('https://mfv2.test/submit', { method: 'POST', body: form });
}

/** Turnstile siteverify. Persistent — the limiter tests submit repeatedly. */
export function mockTurnstile(opts: { ok?: boolean; codes?: string[] } = {}) {
  const { ok = true, codes = [] } = opts;
  route({
    match: (u, m) => u.host === 'challenges.cloudflare.com' && m === 'POST',
    respond: () => Response.json({ success: ok, 'error-codes': codes }),
  });
}

export interface VerdictOverrides {
  verdict?: 'new' | 'duplicate' | 'uncertain';
  issue_number?: number | null;
  confidence?: number;
  title?: string;
  rationale?: string;
  suggested_labels?: string[];
  /** Omitted by default so existing tests keep exercising the clean path. */
  spam_status?: unknown;
  spam_score?: unknown;
  spam_reasons?: unknown;
}

/** One Anthropic response shaped like the real Messages API. */
export function mockClassifier(v: VerdictOverrides = {}) {
  const payload = {
    verdict: v.verdict ?? 'new',
    issue_number: v.issue_number ?? null,
    confidence: v.confidence ?? 0.9,
    rationale: v.rationale ?? 'test verdict',
    suggested_labels: v.suggested_labels ?? [],
    title: v.title ?? 'Balance is wrong after sending a private note',
    // Deliberately settable to junk: test 25 checks that a malformed
    // spam_status is treated as clean rather than burying a report.
    spam_status: 'spam_status' in v ? v.spam_status : 'clean',
    spam_score: 'spam_score' in v ? v.spam_score : 0.02,
    spam_reasons: 'spam_reasons' in v ? v.spam_reasons : [],
  };
  route({
    match: (u, m) => u.host === 'api.anthropic.com' && m === 'POST',
    respond: () => Response.json({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
      stop_reason: 'end_turn',
      model: 'claude-haiku-4-5-20251001',
    }),
  });
}

/**
 * A classifier response with a SIDE EFFECT that runs before it answers.
 *
 * The only way to exercise the TOCTOU the publish guard exists to close: the
 * side effect stands in for a reviewer acting on the row after the drain has
 * claimed it and before the GitHub call. Nothing else in the suite can reach
 * that window.
 */
export function mockClassifierDuring(effect: () => Promise<void>, v: VerdictOverrides = {}) {
  const payload = {
    verdict: v.verdict ?? 'new',
    issue_number: v.issue_number ?? null,
    confidence: v.confidence ?? 0.9,
    rationale: v.rationale ?? 'test verdict',
    suggested_labels: v.suggested_labels ?? [],
    title: v.title ?? 'Balance is wrong after sending a private note',
    spam_status: 'spam_status' in v ? v.spam_status : 'clean',
    spam_score: 'spam_score' in v ? v.spam_score : 0.02,
    spam_reasons: 'spam_reasons' in v ? v.spam_reasons : [],
  };
  route({
    match: (u, m) => u.host === 'api.anthropic.com' && m === 'POST',
    respond: async () => {
      await effect();
      return Response.json({
        content: [{ type: 'text', text: JSON.stringify(payload) }],
        stop_reason: 'end_turn',
        model: 'claude-haiku-4-5-20251001',
      });
    },
  });
}

/** Both keys fail — classify() throws and the drain must defer. */
export function mockClassifierDown() {
  route({
    match: (u, m) => u.host === 'api.anthropic.com' && m === 'POST',
    respond: () => new Response('upstream boom', { status: 500 }),
  });
}

export function mockCreateIssue(number: number) {
  route({
    match: (u, m) => u.host === 'api.github.com' && m === 'POST'
      && u.pathname === `/repos/${REPO}/issues`,
    respond: () => Response.json({ number }, { status: 201 }),
  });
}

export function mockCreateComment(issue: number, id: number) {
  route({
    match: (u, m) => u.host === 'api.github.com' && m === 'POST'
      && u.pathname === `/repos/${REPO}/issues/${issue}/comments`,
    respond: () => Response.json({ id }, { status: 201 }),
  });
}

export function mockUpdateComment(commentId: number) {
  route({
    match: (u, m) => u.host === 'api.github.com' && m === 'PATCH'
      && u.pathname === `/repos/${REPO}/issues/comments/${commentId}`,
    respond: () => Response.json({ id: commentId }),
  });
}

/** The JSON body of the single POST that created an issue. */
export function issueCreateBody(): any {
  const c = calls.find((x) => x.method === 'POST' && x.url.endsWith(`/repos/${REPO}/issues`));
  return c?.body ? JSON.parse(c.body) : null;
}

/** The JSON body of the comment POST on a given issue. */
export function commentBody(issue: number): any {
  const c = calls.find((x) => x.method === 'POST' && x.url.endsWith(`/issues/${issue}/comments`));
  return c?.body ? JSON.parse(c.body) : null;
}

// ---- D1 read helpers -------------------------------------------------------

export async function getSubmission(id: string) {
  return env.DB.prepare('SELECT * FROM submissions WHERE submission_id = ?').bind(id).first<any>();
}

export async function countSubmissions(): Promise<number> {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM submissions').first<{ n: number }>();
  return r?.n ?? 0;
}

export async function getDupLinks(id: string) {
  const r = await env.DB.prepare('SELECT * FROM dup_links WHERE submission_id = ?').bind(id).all<any>();
  return r.results ?? [];
}

export async function getStateLog(id: string) {
  const r = await env.DB.prepare(
    'SELECT from_state, to_state, detail FROM state_log WHERE submission_id = ? ORDER BY id'
  ).bind(id).all<any>();
  return r.results ?? [];
}

/** Seeds an issue into the mirror so retrieval has something to offer. */
export async function seedMirrorIssue(opts: {
  number: number; title: string; body?: string; state?: string; marker?: string | null;
}) {
  await env.DB.prepare(
    `INSERT INTO issue_mirror (number, title, body, state, labels, author, created_at, updated_at, marker, synced_at)
     VALUES (?,?,?,?,'[]','tester',?,?,?,?)`
  ).bind(
    opts.number, opts.title, opts.body ?? 'seeded issue body', opts.state ?? 'open',
    Date.now(), Date.now(), opts.marker ?? null, Date.now()
  ).run();
}

/** Puts a row straight into `received`, skipping ingest. */
export async function seedSubmission(over: Record<string, unknown> = {}): Promise<string> {
  const id = (over.submission_id as string) ?? crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO submissions
       (submission_id, received_at, state, body_sanitized, body_hash, wallet_version,
        platform, network, route, error_code, fingerprint, reporter_key, attachment_keys, attempts,
        spam_status, spam_reasons, spam_reviewed_at, normalized_hash, reporter_kind,
        overdue_alert_tier, claimed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?,?)`
  ).bind(
    id,
    (over.received_at as number) ?? Date.now(),
    (over.state as string) ?? 'received',
    (over.body_sanitized as string) ?? 'The wallet cannot reach the node after an update.',
    (over.body_hash as string) ?? 'hash-' + id,
    (over.wallet_version as string) ?? '1.15.19',
    (over.platform as string) ?? 'android',
    (over.network as string) ?? 'testnet',
    (over.route as string) ?? '/send',
    over.error_code === undefined ? 'NODE_UNREACHABLE' : (over.error_code as string),
    (over.fingerprint as string) ?? 'NODE_UNREACHABLE|1.15|android|/send',
    (over.reporter_key as string) ?? 'reporter-' + id,
    (over.attachment_keys as string) ?? '[]',
    // Default NULL across the board: that is what a legacy row looks like, and
    // NULL spam_status means clean.
    (over.spam_status as string) ?? null,
    (over.spam_reasons as string) ?? null,
    (over.spam_reviewed_at as number) ?? null,
    (over.normalized_hash as string) ?? null,
    (over.reporter_kind as string) ?? null,
    (over.overdue_alert_tier as string) ?? null,
    // A row seeded in `claimed` with a NULL claimed_at looks STALE to the
    // drain, which reclaims it — in whatever test happens to run next.
    (over.claimed_at as number) ?? ((over.state as string) === 'claimed' ? Date.now() : null)
  ).run();
  return id;
}

/** Puts a row straight into `store_reviews`, skipping sync. */
export async function seedStoreReview(over: Record<string, unknown> = {}): Promise<string> {
  const id = (over.store_review_id as string) ?? crypto.randomUUID();
  const platform = (over.platform as string) ?? 'android';
  const raw = (over.raw_json as string) ?? JSON.stringify({ seeded: true });
  await env.DB.prepare(
    `INSERT INTO store_reviews
       (store_review_id, platform, source, app_id, platform_review_id,
        raw_json, raw_hash, first_seen_at, last_synced_at,
        review_title, review_body, rating, reviewer_name, territory, language,
        review_created_at, review_updated_at, app_version, device, device_product, os_version,
        review_state, reply_state, handoff_state, eligibility,
        ai_labels, ai_confidence, ai_structured, ai_model, ai_prompt_version, ai_classified_at,
        human_labels, secret_scan_status, sync_error)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id,
    platform,
    (over.source as string) ?? (platform === 'ios' ? 'app_store' : 'google_play'),
    (over.app_id as string) ?? 'com.miden.wallet',
    (over.platform_review_id as string) ?? 'pr-' + id,
    raw,
    (over.raw_hash as string) ?? 'rawhash-' + id,
    (over.first_seen_at as number) ?? Date.now(),
    (over.last_synced_at as number) ?? Date.now(),
    (over.review_title as string) ?? null,
    (over.review_body as string) ?? 'Sending a private note fails every time.',
    over.rating === undefined ? 2 : (over.rating as number),
    (over.reviewer_name as string) ?? null,
    (over.territory as string) ?? null,
    (over.language as string) ?? null,
    (over.review_created_at as number) ?? Date.now(),
    (over.review_updated_at as number) ?? null,
    (over.app_version as string) ?? null,
    (over.device as string) ?? null,
    (over.device_product as string) ?? null,
    (over.os_version as string) ?? null,
    (over.review_state as string) ?? 'new',
    (over.reply_state as string) ?? 'none',
    (over.handoff_state as string) ?? 'none',
    (over.eligibility as string) ?? 'undecided',
    (over.ai_labels as string) ?? null,
    (over.ai_confidence as number) ?? null,
    (over.ai_structured as string) ?? null,
    (over.ai_model as string) ?? null,
    (over.ai_prompt_version as string) ?? null,
    (over.ai_classified_at as number) ?? null,
    (over.human_labels as string) ?? null,
    (over.secret_scan_status as string) ?? null,
    (over.sync_error as string) ?? null
  ).run();
  return id;
}

/**
 * A signed-in admin.
 *
 * Mints the same cookie the sign-in flow does, using the same secret, so tests
 * exercise the REAL session verification rather than a bypass. There is no
 * "skip auth" switch anywhere in the Worker, and adding one to make tests
 * easier would be adding the thing the tests exist to prevent.
 */
export const ADMIN_EMAIL = 'ivan.l@miden.team';

export async function seedAdmin(email = ADMIN_EMAIL, over: Record<string, unknown> = {}): Promise<string> {
  await env.DB.prepare(
    `INSERT INTO admin_allowed (email, name, added_at, added_by, disabled_at)
     VALUES (?,?,?,?,?)
     ON CONFLICT(email) DO UPDATE SET disabled_at = excluded.disabled_at`
  ).bind(
    email, (over.name as string) ?? 'Ivan', (over.added_at as number) ?? Date.now(),
    (over.added_by as string) ?? 'seed', (over.disabled_at as number) ?? null
  ).run();
  return email;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The `cookie` header for a signed-in admin. */
export async function adminCookie(email = ADMIN_EMAIL, ttlMs = 3_600_000): Promise<string> {
  const payload = `${email}.${Date.now() + ttlMs}`;
  const token = `${payload}.${await hmacHex((env as any).ADMIN_SESSION_SECRET, payload)}`;
  return `__Host-mfv2_admin=${token}`;
}

/** The CSRF token the console puts in its forms, for the same session. */
export async function adminCsrf(email = ADMIN_EMAIL): Promise<string> {
  return hmacHex((env as any).ADMIN_SESSION_SECRET, `csrf:${email}`);
}

/** Headers for a signed-in GET. */
export async function adminHeaders(email = ADMIN_EMAIL): Promise<Record<string, string>> {
  return { cookie: await adminCookie(email) };
}

/** Temporarily override an env var for one test. */
export async function withEnv<T>(patch: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const prev: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) {
    prev[k] = (env as any)[k];
    (env as any)[k] = v;
  }
  try { return await fn(); }
  finally { for (const [k, v] of Object.entries(prev)) (env as any)[k] = v; }
}

/** Wraps D1 and counts every statement executed — the unit the free plan limits. */
export function countingDb(db: D1Database) {
  let n = 0;
  const statement = (s: D1PreparedStatement): D1PreparedStatement => new Proxy(s, {
    get(target, prop) {
      if (prop === 'bind') return (...args: unknown[]) => statement((target as any).bind(...args));
      if (prop === 'run' || prop === 'first' || prop === 'all' || prop === 'raw') {
        return (...args: unknown[]) => { n += 1; return (target as any)[prop](...args); };
      }
      const value = Reflect.get(target, prop);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const wrapped = new Proxy(db, {
    get(target, prop) {
      if (prop === 'prepare') return (sql: string) => statement(target.prepare(sql));
      if (prop === 'batch') {
        return (stmts: D1PreparedStatement[]) => { n += stmts.length; return target.batch(stmts); };
      }
      const value = Reflect.get(target, prop);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return { db: wrapped, count: () => n };
}
