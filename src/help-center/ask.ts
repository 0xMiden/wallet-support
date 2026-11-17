import type { HelpCenterPlatform } from './types';

/**
 * The page side of the Ask assistant. The Worker (worker/feedback/src/ask/)
 * holds every rule that matters: the follow-up limit, the recovery phrase check,
 * the rate limit and which articles exist. The numbers here only shape the page,
 * so a reader is told about a limit before the server has to refuse.
 */

/**
 * Off unless the build sets VITE_ASK_ENABLED=true. A production build without
 * it shows no panel, and the Worker's ASK_ENABLED keeps the endpoint shut too.
 */
export const ASK_ENABLED = import.meta.env.VITE_ASK_ENABLED === 'true';

export const MAX_FOLLOW_UPS = 30;
export const MAX_QUESTION_CHARS = 1000;

export interface AskSource {
  readonly id: string;
  readonly title: string;
  readonly href: string;
}

export interface AskTurn {
  readonly role: 'user' | 'assistant';
  readonly content: string;
  /** For an earlier answer: the signature the server gave it, without which it is refused. */
  readonly signature?: string;
}

export type AskResult =
  | {
      readonly status: 'answer';
      readonly answered: boolean;
      readonly answer: string;
      readonly sources: readonly AskSource[];
      /** True only when the reader needs a person: Contact Support is shown then and only then. */
      readonly offerSupport: boolean;
      /** Sent back with this answer on the next question, so the server knows it gave it. */
      readonly signature: string;
    }
  | { readonly status: 'blocked' };

export class AskError extends Error {
  constructor(readonly kind: 'rate-limited' | 'limit' | 'unavailable' | 'invalid') {
    super(kind);
  }
}

export async function askQuestion(platform: HelpCenterPlatform, messages: readonly AskTurn[]): Promise<AskResult> {
  let response: Response;
  try {
    response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ platform, messages })
    });
  } catch {
    throw new AskError('unavailable');
  }

  if (response.status === 429) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new AskError(payload.error === 'conversation limit' ? 'limit' : 'rate-limited');
  }
  if (response.status === 400 || response.status === 413) throw new AskError('invalid');
  if (!response.ok) throw new AskError('unavailable');

  const payload = await response.json() as { status?: string; answered?: unknown; answer?: unknown; sources?: unknown; offerSupport?: unknown; signature?: unknown };
  if (payload.status === 'blocked') return { status: 'blocked' };
  if (payload.status !== 'answer' || typeof payload.answered !== 'boolean' || typeof payload.answer !== 'string' || !Array.isArray(payload.sources) || typeof payload.signature !== 'string') {
    throw new AskError('unavailable');
  }
  return {
    status: 'answer',
    answered: payload.answered,
    answer: payload.answer,
    sources: payload.sources as AskSource[],
    offerSupport: payload.offerSupport === true,
    signature: payload.signature
  };
}

export type AnswerBlock =
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'steps'; readonly start: number; readonly items: readonly string[] };

const STEP = /^(\d{1,2})\.\s+(.*)$/;

/**
 * Where a line runs numbered steps together ("… ready. 1. Open Bread. 2. Select
 * …"), the offsets at which each step starts. Only a run counting up from 1 is
 * split, so a stray "2. " inside a sentence is left alone.
 */
function inlineStepStarts(line: string): number[] {
  const starts: number[] = [];
  let expected = 1;
  for (const match of line.matchAll(/(^|\s)(\d{1,2})\.\s/g)) {
    if (Number(match[2]) !== expected) continue;
    starts.push((match.index ?? 0) + match[1].length);
    expected += 1;
  }
  return starts.length >= 2 ? starts : [];
}

function splitLine(line: string): string[] {
  const starts = inlineStepStarts(line);
  if (starts.length === 0) return [line];
  const parts = [line.slice(0, starts[0])];
  starts.forEach((start, index) => parts.push(line.slice(start, starts[index + 1])));
  return parts.map(part => part.trim()).filter(Boolean);
}

/**
 * Plain text in, paragraphs and numbered steps out. The answer is never treated
 * as HTML or Markdown; the only structure read from it is a line that starts
 * with a step number, so steps render as a list even when the model writes them
 * as one paragraph.
 */
export function answerBlocks(answer: string): readonly AnswerBlock[] {
  const lines = answer.split(/\n+/).map(line => line.trim()).filter(Boolean).flatMap(splitLine);
  const blocks: AnswerBlock[] = [];
  for (const line of lines) {
    const step = STEP.exec(line);
    const last = blocks[blocks.length - 1];
    if (!step) blocks.push({ kind: 'paragraph', text: line });
    else if (last?.kind === 'steps') blocks[blocks.length - 1] = { ...last, items: [...last.items, step[2]] };
    else blocks.push({ kind: 'steps', start: Number(step[1]), items: [step[2]] });
  }
  return blocks;
}
