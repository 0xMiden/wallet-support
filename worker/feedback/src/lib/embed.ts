/**
 * Semantic retrieval over the issue mirror.
 *
 * Fingerprint and keyword matching find the frequent tail; neither finds a
 * paraphrase, which is the whole reason this pipeline exists. Embeddings close
 * that gap.
 *
 * Runs on Workers AI, which is on the free tier (10,000 Neurons/day; this
 * model costs 1,841 Neurons per million input tokens, so the budget is not the
 * constraint). The constraint is the free plan's 10 ms CPU per invocation, and
 * two decisions here exist because of it:
 *
 *   1. Vectors are normalised once at write time, so similarity at read time
 *      is a plain dot product — no square roots in the scan loop.
 *   2. The scan is bounded to issues updated in the last 12 months.
 *
 * Vectorize would remove the in-Worker scan entirely, but its free-tier status
 * is unconfirmed, so it is deliberately not used.
 */

import type { Candidate } from './classify';

export const EMBED_MODEL = '@cf/baai/bge-small-en-v1.5';
export const EMBED_DIMS = 384;

/**
 * PINNED, AND NOT SAFELY CHANGEABLE.
 *
 * Cloudflare's own type docs: "embeddings created with cls pooling are not
 * compatible with embeddings generated with mean pooling". Query vectors and
 * stored vectors must come from the same mode or every similarity score is
 * meaningless — and it fails silently, as bad retrieval rather than an error.
 * Changing this means re-embedding the entire mirror: set embedding = NULL on
 * every row and let the drain refill it.
 */
export const EMBED_POOLING = 'cls' as const;

/** Model input cap is 512 tokens. Title plus this many body chars stays under. */
export const EMBED_BODY_CHARS = 1500;

/** Only issues touched this recently are scanned at query time. */
export const RECENCY_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

type EmbedEnv = { AI: Ai; DB: D1Database };

/** What actually gets embedded. Title carries most of the signal per token. */
export function embedInput(title: string, body: string | null): string {
  return `${title}\n\n${(body ?? '').slice(0, EMBED_BODY_CHARS)}`;
}

/** Unit-normalise in place so read-time similarity is a dot product. */
function normalise(v: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum);
  if (norm > 0) for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

export function packVector(v: Float32Array): ArrayBuffer {
  // Slice the VIEW's window, not the whole backing buffer. unpackVector can
  // hand back a Float32Array at a non-zero byteOffset, and `buffer.slice(0)`
  // on one of those silently stores the neighbouring bytes too.
  return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) as ArrayBuffer;
}

export function unpackVector(blob: unknown): Float32Array | null {
  if (blob instanceof ArrayBuffer) return new Float32Array(blob);
  if (ArrayBuffer.isView(blob)) {
    const view = blob as ArrayBufferView;
    return new Float32Array(view.buffer, view.byteOffset, view.byteLength / 4);
  }
  if (Array.isArray(blob)) {
    // D1 hands a BLOB back as a plain Array of BYTES — 1536 numbers for a
    // 384-dim vector. `new Float32Array(bytes)` would coerce each byte to one
    // float and produce a 1536-length vector, which then fails the dimension
    // check and is silently skipped. That is what disabled semantic retrieval
    // entirely: every stored vector was discarded, every candidate list came
    // back lexical-only, and nothing anywhere said so.
    // Reinterpret the bytes instead.
    const bytes = Uint8Array.from(blob as number[]);
    if (bytes.byteLength % 4 !== 0) return null;
    return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  }
  return null;
}

/** Both vectors are unit length, so this IS cosine similarity. */
function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** One batched call. Throws — callers decide whether that is fatal. */
export async function embedTexts(env: EmbedEnv, texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return [];
  const out = await env.AI.run(EMBED_MODEL, { text: texts, pooling: EMBED_POOLING });
  const data = (out as { data?: number[][] }).data;
  if (!data || data.length !== texts.length) {
    // The union also covers an async-queue response carrying only a
    // request_id. We do not use queue mode, so that shape means something
    // changed upstream and the vectors cannot be trusted.
    throw new Error('embedding response missing data');
  }
  return data.map((row) => normalise(new Float32Array(row)));
}

/**
 * Fill in embeddings for mirror rows that lack them, oldest first.
 *
 * This is the single embedding path: the cron nulls the column when an
 * issue's text changes, so refreshes and the initial backfill are the same
 * operation. Bounded per call, and reports what is left, so it is safe to run
 * inside a one-minute cron and safe to drive to completion from a route.
 */
export async function embedMissing(
  env: EmbedEnv,
  limit: number
): Promise<{ embedded: number; remaining: number }> {
  const rows = await env.DB.prepare(
    `SELECT number, title, body FROM issue_mirror
      WHERE embedding IS NULL ORDER BY updated_at DESC LIMIT ?`
  ).bind(limit).all<{ number: number; title: string; body: string | null }>();

  const pending = rows.results ?? [];
  if (pending.length > 0) {
    const vectors = await embedTexts(env, pending.map((r) => embedInput(r.title, r.body)));
    await env.DB.batch(
      pending.map((r, i) =>
        env.DB.prepare('UPDATE issue_mirror SET embedding = ? WHERE number = ?')
          .bind(packVector(vectors[i]), r.number)
      )
    );
  }

  const left = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM issue_mirror WHERE embedding IS NULL'
  ).first<{ n: number }>();

  return { embedded: pending.length, remaining: left?.n ?? 0 };
}

/**
 * Top-k mirror issues by cosine similarity to the report.
 *
 * Closed issues are included deliberately — a regression is the highest-value
 * duplicate to catch.
 */
export async function similarIssues(
  env: EmbedEnv,
  report: string,
  k: number
): Promise<Candidate[]> {
  const [query] = await embedTexts(env, [embedInput('', report)]);
  if (!query) return [];

  const rows = await env.DB.prepare(
    `SELECT number, title, body, state, embedding FROM issue_mirror
      WHERE embedding IS NOT NULL AND updated_at >= ?`
  ).bind(Date.now() - RECENCY_WINDOW_MS)
   .all<Candidate & { embedding: unknown }>();

  const scored: Array<{ c: Candidate; score: number }> = [];
  let skipped = 0;
  let firstSkipShape = '';
  for (const row of rows.results ?? []) {
    const vec = unpackVector(row.embedding);
    if (!vec || vec.length !== query.length) {
      // Was a bare `continue`. A stored vector this code cannot read is
      // indistinguishable from "nothing is similar" — it returns an empty
      // candidate list and dedup silently stops working. Count it and record
      // the shape once, so the failure names itself.
      if (!skipped) {
        const r = row.embedding as unknown;
        firstSkipShape = r === null || r === undefined
          ? String(r)
          : `${typeof r}/${(r as any).constructor?.name ?? '?'}/len=${vec ? vec.length : 'unpack-failed'}`;
      }
      skipped++;
      continue;
    }
    scored.push({
      c: { number: row.number, title: row.title, body: row.body, state: row.state },
      score: dot(query, vec),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, k);
  console.log(JSON.stringify({
    job: 'similar',
    scanned: (rows.results ?? []).length,
    scored: scored.length,
    skipped,
    skipShape: firstSkipShape || undefined,
    topScore: top[0] ? Number(top[0].score.toFixed(3)) : null,
    top: top.map((t) => t.c.number),
  }));
  if (skipped && !scored.length) {
    // Every stored vector was unreadable. That is a bug, not an absence of
    // similar issues, and it must not masquerade as one.
    throw new Error(`all ${skipped} stored vectors unreadable (${firstSkipShape})`);
  }
  return top.map((s) => s.c);
}
