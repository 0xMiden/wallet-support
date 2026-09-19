/**
 * The paging loop, with the fetcher injected.
 *
 * WHY THE FETCHER IS A PARAMETER.
 * Everything hard about syncing a store — how many pages to take before the
 * invocation budget runs out, what to do when page four fails, what the next
 * run resumes from — is independent of who is being called and of any
 * credential. Passing the fetcher in means all of it is built and tested now,
 * while the Google service account is still being provisioned, and Phase 1
 * becomes a wiring job rather than a build job: supply a function that returns
 * one page.
 *
 * It is also how the App Store client reuses this instead of growing its own
 * paging loop with its own subtly different idea of when to stop.
 *
 * PARTIAL PROGRESS IS KEPT, ALWAYS.
 * When a page fails, this returns everything collected up to that point
 * ALONGSIDE the error rather than throwing it away. The caller writes what it
 * has and records the failure. That is safe only because `upsertReview` is
 * idempotent — a page re-read on the next run writes nothing — and it is worth
 * doing because Google's window is 7 days wide: reviews discarded because page
 * four failed may not be offered again.
 */

export interface Page<T> {
  items: T[];
  /** Null or absent means this was the last page. */
  nextToken: string | null;
  /**
   * Set when the client abandoned the cursor it was given and asked for the
   * first page instead — a cursor the store refused.
   *
   * IT MEANS THE PASS STARTED AGAIN, and the cycle check has to be told,
   * because the tokens that follow are the ones this pass has already used.
   * Without it, a stale cursor would look exactly like a store sending the
   * pass back round in a circle.
   */
  restarted?: boolean;
}

export type FetchPage<T> = (token: string | null) => Promise<Page<T>>;

export interface PaginateOptions {
  /** Resume from here. Null starts at the beginning. */
  startToken?: string | null;
  /**
   * Hard ceiling on pages per invocation.
   *
   * The Workers free plan allows 50 subrequests per invocation, and a sync
   * spends them on more than pages — minting an access token, and whatever the
   * runtime counts for storage. Eight pages leaves generous headroom, and the
   * cost of stopping early is nil: the cursor is saved and the next tick picks
   * up where this one stopped. Running OUT of budget mid-page, by contrast,
   * fails the whole invocation.
   */
  maxPages?: number;
  /** Guards against a server that returns a token pointing at itself. */
  maxItems?: number;
}

export interface PaginateResult<T> {
  items: T[];
  /** Where the next run should resume. Null means the source was exhausted. */
  nextToken: string | null;
  pages: number;
  /** True when the last page was reached — nothing left to collect. */
  exhausted: boolean;
  /**
   * Set when a page threw. `items` still holds everything collected before it,
   * and `nextToken` still points at the page that failed, so the next run
   * retries exactly there.
   */
  error: unknown | null;
  /** The store sent this pass back to a page it had already read. */
  cycle: boolean;
  /** A page was fetched from the top after a cursor was refused. */
  restarted: boolean;
}

export const DEFAULT_MAX_PAGES = 8;
export const DEFAULT_MAX_ITEMS = 2000;

export async function paginate<T>(
  fetchPage: FetchPage<T>,
  options: PaginateOptions = {}
): Promise<PaginateResult<T>> {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;

  const items: T[] = [];
  let token = options.startToken ?? null;
  let pages = 0;
  let restarted = false;
  /**
   * WITHIN THIS INVOCATION ONLY, and deliberately so.
   *
   * At maxPages: 1 this holds one token, so what it catches across runs is a
   * cursor that points at the page it came from and nothing longer. The memory
   * a longer cycle needs spans runs, which is not paging's to keep: `runIngest`
   * holds it against the checkpoint and checks the token this walk ends on.
   * Both report the same `cycle`, because to everything downstream they are the
   * same event.
   */
  const seenTokens = new Set<string>();

  while (pages < maxPages && items.length < maxItems) {
    /**
     * A token that has already been used means the server is pointing back at
     * a page we have read. Left alone that is an infinite loop that burns the
     * whole invocation budget and produces nothing; treated as the end of the
     * data it costs, at worst, one delayed page.
     */
    if (token && seenTokens.has(token)) {
      return { items, nextToken: null, pages, exhausted: false, error: null, cycle: true, restarted };
    }
    if (token) seenTokens.add(token);

    let page: Page<T>;
    try {
      page = await fetchPage(token);
    } catch (error) {
      // Everything gathered so far is returned, not discarded. `token` still
      // points at the page that failed, so the next run retries exactly there.
      return { items, nextToken: token, pages, exhausted: false, error, cycle: false, restarted };
    }

    pages += 1;
    items.push(...(page.items ?? []));
    /**
     * A refused cursor means the client went back to the first page, so every
     * token from here belongs to a pass that has started over — INCLUDING the
     * one this walk began with, which is why the set is emptied rather than
     * just flagged. Leaving it would make the first page's own next token look
     * like a cursor pointing at itself.
     */
    if (page.restarted) {
      restarted = true;
      seenTokens.clear();
    }

    if (!page.nextToken) {
      // The source is exhausted. A null cursor is stored deliberately: the next
      // run starts from the beginning of a 7-day window, which is what a
      // complete pass should do.
      return { items, nextToken: null, pages, exhausted: true, error: null, cycle: false, restarted };
    }
    token = page.nextToken;
  }

  /**
   * THE CYCLE GUARD HAS TO RUN HERE TOO, or it never runs at all in production.
   *
   * The check at the top of the loop only catches a repeat WITHIN one
   * invocation, and both store syncs pass maxPages: 1 — so the loop body runs
   * once and exits here every time. A token that points back at the page just
   * read would therefore be stored as the cursor, read again next tick, stored
   * again, for ever: a sync that calls the store every five minutes, collects
   * the same page, and records a SUCCESS each time, which keeps the staleness
   * alarm quiet while nothing new is ever collected. Silence is the failure
   * mode this whole file is built to avoid.
   *
   * WHAT THIS HALF CATCHES. `seenTokens` lives for one invocation and holds the
   * token this run started from plus each page's. At maxPages: 1 that is a set
   * of one, so across runs it catches the SELF-REFERENTIAL CURSOR — a page
   * whose next token is the token used to ask for it (A -> A) — and nothing
   * longer. A cycle spanning several pages repeats nothing inside any single
   * invocation, so no set that dies with the invocation can see it; that half
   * is `runIngest`'s, against the pass memory in the checkpoint.
   *
   * REPORTED AS A CYCLE, NOT AS THE END OF THE DATA. It used to be dressed up
   * as exhaustion, which cleared the cursor and had the caller record a
   * SUCCESS: a sync going round in circles was indistinguishable from one
   * finishing a pass, which is precisely the silence this file exists to
   * prevent. The caller resets the pass and records what actually happened.
   */
  if (token && seenTokens.has(token)) {
    return { items, nextToken: null, pages, exhausted: false, error: null, cycle: true, restarted };
  }

  // Budget spent with pages still to come. Not a failure — the cursor is saved
  // and the next tick continues.
  return { items, nextToken: token, pages, exhausted: false, error: null, cycle: false, restarted };
}
