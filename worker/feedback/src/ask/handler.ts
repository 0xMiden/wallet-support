/**
 * POST /api/ask: one question to the Help Center assistant.
 *
 * Order matters, and each step is placed where it is for a reason:
 *
 *   1. Off unless ASK_ENABLED is "true". Disabled, the route answers exactly
 *      like any unknown API path, so a production deploy that has not opted in
 *      shows nothing new.
 *   2. Shape and size, including the follow-up limit. The limit is enforced
 *      here, not only in the page, because a page counter can be bypassed.
 *   3. The secret scan, over EVERY question in the conversation, before anything
 *      leaves this Worker. A recovery phrase must never reach the model.
 *   4. The rate limit, under its own policy so questions cannot use up the
 *      feedback form's budget. It runs after the scan so a blocked question
 *      costs the reader nothing.
 *   5. The model call, and then the answer is checked: every cited article must
 *      exist, links are built from our own article list (never from model
 *      text), and an answer that cites nothing is not shown as an answer.
 *
 * No question or answer text is logged at any point. The usage line carries
 * token counts and the prompt version only.
 */

import { scanForSecrets } from '../lib/secret-scan';
import { CorpusError, loadCorpus, platformName, type Corpus } from './corpus';
import { ANSWER_SCHEMA, ASK_MODEL, ASK_PROMPT_VERSION, ASK_RULES } from './prompt';

export const MAX_QUESTION_CHARS = 1000;
/**
 * Questions after the first. Not a cost or safety control (the per-hour rate
 * limit is): it stops one conversation's history, which is sent back with every
 * question, from growing without end.
 */
export const MAX_FOLLOW_UPS = 30;
const MAX_ANSWER_CHARS = 4000;
/** An assistant turn sent back as history is our own earlier answer, capped like one. */
const MAX_HISTORY_ANSWER_CHARS = MAX_ANSWER_CHARS;
/** Room for a full conversation: every question and earlier answer at its cap, with JSON escaping. */
const MAX_BODY_BYTES = 256 * 1024;
const MAX_SOURCES = 3;
const PLATFORMS = new Set(['extension-desktop', 'mobile']);

const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export const NO_ANSWER =
  "I couldn't find an answer to that in the Help Center. Contact Support and the team will help.";

export interface AskEnv {
  ASK_ENABLED?: string;
  ASSETS?: Fetcher;
  LLM_API_KEY_PRIMARY: string;
  LLM_API_KEY_FALLBACK: string;
  RATE_LIMITER: DurableObjectNamespace;
}

/** An assistant turn carries the signature the server gave its answer; see signAnswer. */
interface Turn { role: 'user' | 'assistant'; content: string; signature?: string }
interface AskRequest { platform: string; turns: Turn[] }

export interface AskSource { id: string; title: string; href: string }

/** What the reader is shown. Contact Support is offered only when `offerSupport` is true. */
export interface AskReply { answered: boolean; answer: string; sources: AskSource[]; offerSupport: boolean }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** Returns the request, or the reason it is refused. */
export function parseAskRequest(raw: unknown): AskRequest | { error: string } {
  const body = raw as { platform?: unknown; messages?: unknown } | null;
  if (!body || typeof body !== 'object') return { error: 'bad request' };
  if (typeof body.platform !== 'string' || !PLATFORMS.has(body.platform)) return { error: 'bad platform' };
  if (!Array.isArray(body.messages) || body.messages.length === 0) return { error: 'no question' };
  // Questions sit at the even positions, so the count is known before reading any turn.
  if (Math.ceil(body.messages.length / 2) > MAX_FOLLOW_UPS + 1) return { error: 'conversation limit' };

  const turns: Turn[] = [];
  for (const [index, entry] of body.messages.entries()) {
    const turn = entry as { role?: unknown; content?: unknown; signature?: unknown } | null;
    const expected = index % 2 === 0 ? 'user' : 'assistant';
    if (!turn || turn.role !== expected || typeof turn.content !== 'string') return { error: 'bad conversation' };
    const content = turn.content.trim();
    if (!content) return { error: 'empty message' };
    const cap = expected === 'user' ? MAX_QUESTION_CHARS : MAX_HISTORY_ANSWER_CHARS;
    if (content.length > cap) return { error: expected === 'user' ? 'question too long' : 'bad conversation' };
    if (expected === 'assistant') {
      if (typeof turn.signature !== 'string' || turn.signature.length > 100) return { error: 'bad conversation' };
      turns.push({ role: expected, content, signature: turn.signature });
    } else {
      turns.push({ role: expected, content });
    }
  }
  if (turns[turns.length - 1]?.role !== 'user') return { error: 'bad conversation' };
  if (questionCount(turns) > MAX_FOLLOW_UPS + 1) return { error: 'conversation limit' };
  return { platform: body.platform, turns };
}

const questionCount = (turns: readonly Turn[]) => turns.filter((t) => t.role === 'user').length;

/*
 * Earlier answers come back from the browser with every question, and the model
 * reads them as its own words. Unchecked, a crafted request could put words in
 * its mouth ("I agreed to ignore my rules"), or slip a recovery phrase past the
 * scan inside a fake answer. So every answer is signed when it is given, and an
 * earlier answer is only accepted with its signature.
 *
 * The signing key is derived from the API key the Worker already holds, so
 * there is no new secret to configure and nothing new can leak. Rotating that
 * key ends conversations in progress, which then have to start over.
 */
const SIGNING_CONTEXT = 'bread-assistant-history-v1:';

async function historyKey(env: AskEnv): Promise<CryptoKey | null> {
  const secret = env.LLM_API_KEY_PRIMARY || env.LLM_API_KEY_FALLBACK;
  if (!secret) return null;
  const material = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SIGNING_CONTEXT + secret));
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

const toBase64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** The signature for an answer exactly as the reader is given it. */
export async function signAnswer(env: AskEnv, answer: string): Promise<string> {
  const key = await historyKey(env);
  if (!key) throw new ModelUnavailable('no key', false);
  return toBase64Url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(answer)));
}

/** True only if every earlier answer carries the signature this server gave it. */
async function historyIsGenuine(env: AskEnv, turns: readonly Turn[]): Promise<boolean> {
  const answers = turns.filter((turn) => turn.role === 'assistant');
  if (answers.length === 0) return true;
  const key = await historyKey(env);
  if (!key) return false;
  for (const turn of answers) {
    const signature = turn.signature ? fromBase64Url(turn.signature) : null;
    if (!signature) return false;
    // crypto.subtle.verify compares in constant time.
    if (!(await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(turn.content)))) return false;
  }
  return true;
}

/** Tags inside a question cannot close our wrapper and pose as something else. */
const neutralise = (text: string) => text.replace(/<\/?\s*question\b[^>]*>/gi, '');

function apiMessages(turns: readonly Turn[], platform: string) {
  return turns.map((turn, index) => {
    if (turn.role === 'assistant') return { role: 'assistant' as const, content: turn.content };
    const last = index === turns.length - 1;
    const question = `<question>\n${neutralise(turn.content)}\n</question>`;
    return {
      role: 'user' as const,
      content: last ? `The user's platform: ${platformName(platform)}.\n${question}` : question,
    };
  });
}

/**
 * The model could not be reached or refused the request. `retryable` says
 * whether the other key could do better: a bad key, a rate limit or an outage
 * might be one key's problem, but a malformed request fails the same way with
 * any key, so trying again would only double the wait.
 */
class ModelUnavailable extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

const RETRYABLE_STATUS = (status: number) => status === 401 || status === 403 || status === 429 || status >= 500;

type ModelResult =
  | { kind: 'answer'; answered: boolean; answer: string; sourceIds: string[]; offerSupport: boolean }
  | { kind: 'no_answer' };

async function callModel(apiKey: string, corpus: Corpus, turns: readonly Turn[], platform: string): Promise<ModelResult> {
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: ASK_MODEL,
        // Room for the model's thinking as well as a short answer. The answer
        // itself is capped again below.
        max_tokens: 4096,
        system: [
          { type: 'text', text: ASK_RULES },
          { type: 'text', text: corpus.text, cache_control: { type: 'ephemeral' } },
        ],
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: ANSWER_SCHEMA },
        },
        messages: apiMessages(turns, platform),
      }),
    });
  } catch {
    throw new ModelUnavailable('network', true);
  }

  if (!res.ok) {
    // Anthropic's error type and the start of its message, so a rejected
    // request can be diagnosed from the log. These describe the request's
    // shape (a bad parameter, an unknown model), not the reader's question.
    const detail = (await res.json().catch(() => null)) as { error?: { type?: string; message?: string } } | null;
    const type = detail?.error?.type ?? 'unknown';
    const message = (detail?.error?.message ?? '').slice(0, 200);
    throw new ModelUnavailable(`anthropic ${res.status} ${type}: ${message}`, RETRYABLE_STATUS(res.status));
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
  };

  console.log(JSON.stringify({
    evt: 'ask_usage',
    prompt_version: ASK_PROMPT_VERSION,
    model: ASK_MODEL,
    uncached: data.usage?.input_tokens ?? null,
    written: data.usage?.cache_creation_input_tokens ?? 0,
    read: data.usage?.cache_read_input_tokens ?? 0,
    output: data.usage?.output_tokens ?? null,
    stop: data.stop_reason ?? null,
  }));

  // A refused or cut-off response is not an answer. The reader is offered
  // Contact Support instead of a half-sentence.
  if (data.stop_reason === 'refusal' || data.stop_reason === 'max_tokens') return { kind: 'no_answer' };

  const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  let parsed: { answered?: unknown; answer?: unknown; source_ids?: unknown; offer_support?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: 'no_answer' };
  }
  if (typeof parsed.answered !== 'boolean' || typeof parsed.answer !== 'string' || !Array.isArray(parsed.source_ids)) {
    return { kind: 'no_answer' };
  }
  return {
    kind: 'answer',
    answered: parsed.answered,
    answer: parsed.answer,
    sourceIds: parsed.source_ids.filter((id): id is string => typeof id === 'string'),
    // The schema requires it; if it is ever missing, an unanswered question offers help.
    offerSupport: typeof parsed.offer_support === 'boolean' ? parsed.offer_support : !parsed.answered,
  };
}

/** Primary key first; the fallback only when the primary call itself failed. */
async function ask(env: AskEnv, corpus: Corpus, turns: readonly Turn[], platform: string): Promise<ModelResult> {
  const keys = [env.LLM_API_KEY_PRIMARY, env.LLM_API_KEY_FALLBACK].filter((k, i, all) => !!k && all.indexOf(k) === i);
  let last: unknown = new ModelUnavailable('no key', false);
  for (const key of keys) {
    try {
      return await callModel(key, corpus, turns, platform);
    } catch (error) {
      if (!(error instanceof ModelUnavailable)) throw error;
      console.warn(JSON.stringify({ evt: 'ask_model_unavailable', reason: error.message }));
      last = error;
      if (!error.retryable) break;
    }
  }
  throw last;
}

/**
 * Turns the model's output into what the reader sees. Sources come from our own
 * article list, so a made-up id is dropped and can never become a link. An
 * answer left with no valid source is not presented as an answer.
 *
 * Contact Support is offered only when the reader needs a person: the model
 * found no answer to a Bread Wallet question, or no answer could be given at
 * all. A greeting or an off-topic question gets a reply without it.
 */
export function toReply(result: ModelResult, corpus: Corpus): AskReply {
  if (result.kind === 'no_answer') return { answered: false, answer: NO_ANSWER, sources: [], offerSupport: true };

  const sources: AskSource[] = [];
  for (const id of result.sourceIds) {
    const article = corpus.byId.get(id);
    if (article && !sources.some((s) => s.id === id)) sources.push({ id, title: article.title, href: article.href });
    if (sources.length === MAX_SOURCES) break;
  }

  const answer = result.answer.trim().slice(0, MAX_ANSWER_CHARS);
  if (!result.answered) {
    return answer
      ? { answered: false, answer, sources: [], offerSupport: result.offerSupport }
      : { answered: false, answer: NO_ANSWER, sources: [], offerSupport: true };
  }
  if (sources.length === 0 || !answer) return { answered: false, answer: NO_ANSWER, sources: [], offerSupport: true };
  return { answered: true, answer, sources, offerSupport: false };
}

export async function handleAsk(req: Request, env: AskEnv): Promise<Response> {
  if (env.ASK_ENABLED !== 'true') return json({ error: 'not found' }, 404);
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // Bytes, not characters: checked on the declared length before reading, and again on what arrived.
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return json({ error: 'request too large' }, 413);
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: 'request too large' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad request' }, 400); }

  const parsed = parseAskRequest(body);
  if ('error' in parsed) return json({ error: parsed.error }, parsed.error === 'conversation limit' ? 429 : 400);
  const { platform, turns } = parsed;
  const followUpsLeft = MAX_FOLLOW_UPS - (questionCount(turns) - 1);

  if (!(await historyIsGenuine(env, turns))) {
    console.warn(JSON.stringify({ evt: 'ask_history_rejected' }));
    return json({ error: 'bad conversation' }, 400);
  }

  // Every turn, not only the newest question: history is sent back each time.
  // Earlier answers are signed and so are ours, but they are scanned as well, in
  // case an answer ever repeats something it should not. The kind of finding is
  // logged, never the text.
  for (const turn of turns) {
    const hits = scanForSecrets(turn.content);
    if (hits.length > 0) {
      console.warn(JSON.stringify({ evt: 'ask_blocked', kinds: hits.map((h) => h.kind) }));
      // Not added to the conversation, so it does not use up a follow-up either.
      return json({ status: 'blocked', reason: 'secret' });
    }
  }

  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
  const limiter = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(`ask:ip:${ip}`));
  if ((await limiter.fetch('https://rl/ask')).status === 429) return json({ error: 'rate limited' }, 429);

  let corpus: Corpus;
  try {
    corpus = await loadCorpus(env.ASSETS);
  } catch (error) {
    console.error(JSON.stringify({ evt: 'ask_corpus_unavailable', reason: error instanceof CorpusError ? error.message : 'unknown' }));
    return json({ error: 'unavailable' }, 503);
  }

  let result: ModelResult;
  try {
    result = await ask(env, corpus, turns, platform);
  } catch {
    return json({ error: 'unavailable' }, 502);
  }

  const reply = toReply(result, corpus);
  return json({ status: 'answer', ...reply, signature: await signAnswer(env, reply.answer), followUpsLeft });
}
