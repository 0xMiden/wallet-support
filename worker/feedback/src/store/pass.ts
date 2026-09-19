/**
 * The memory a paging pass needs in order to notice it is going in circles.
 *
 * A store sync reads ONE page per invocation, so everything about a pass that
 * spans more than one page spans more than one run too. `paginate` can only see
 * inside a single invocation; this is what lets a pass remember, between runs,
 * which cursors it has already held.
 *
 * WHAT MAKES A REPEAT A CYCLE, AND WHAT MAKES IT ORDINARY.
 * A cursor coming back while the SAME pass is still open means the store has
 * sent the pass back to a page it has already walked — there is no other way to
 * reach a cursor twice in one pass, because a store that pages forward hands
 * out a new cursor each time. The identical token on a LATER pass is not a
 * cycle at all: a completed pass clears this memory, and a re-scan from the top
 * is supposed to walk the same pages again, which is how the 7-day window gets
 * re-read. The clearing is the whole distinction.
 *
 * FINGERPRINTS, NOT CURSORS. Apple's cursors run to a thousand characters and
 * Google's are opaque; a few hundred of them in a column would be kilobytes of
 * upstream-controlled text, stored, in a row that is read on every tick. A
 * truncated SHA-256 is 16 characters and answers the only question asked of it.
 * At 64 bits a collision inside one pass is somewhere around one in 10^15,
 * which matters because a collision would be a FALSE cycle — a pass cut short
 * and re-walked, costing time rather than data, but for no reason.
 */

/** How many cursors of a pass are remembered. */
export const MAX_PASS_TOKENS = 200;

const utf8 = new TextEncoder();

/**
 * A cursor, as 16 hex characters.
 *
 * SHA-256 rather than something cheap and synchronous, because a 32-bit hash
 * collides often enough to matter here — and it would do so DETERMINISTICALLY,
 * cutting the same pass short at the same page on every attempt, which is a
 * backlog that never finishes rather than a one-off.
 */
export async function fingerprint(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', utf8.encode(token));
  const bytes = new Uint8Array(digest).slice(0, 8);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The fingerprints stored against a pass. Anything unreadable is no memory at all. */
export function parsePassTokens(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === 'string').slice(-MAX_PASS_TOKENS);
  } catch {
    // A column that will not parse must not take the sync down with it. The
    // cost of forgetting is a cycle caught one pass later, not data.
    return [];
  }
}

/**
 * The pass's memory with `token` added, oldest dropped past the cap.
 *
 * Bounded because a backlog can be long and this is written on every tick. The
 * cap is what a cycle has to be shorter than to be caught: any period up to 200
 * pages, which covers a store that is misbehaving rather than one that is
 * hostile. A longer cycle is not detected, and that is a real limit rather than
 * a theoretical one — it is written down in docs/ and pinned by a test.
 */
export function withPassToken(tokens: string[], token: string): string[] {
  const next = [...tokens, token];
  return next.length > MAX_PASS_TOKENS ? next.slice(next.length - MAX_PASS_TOKENS) : next;
}

export const serializePassTokens = (tokens: string[]): string | null =>
  tokens.length > 0 ? JSON.stringify(tokens) : null;
