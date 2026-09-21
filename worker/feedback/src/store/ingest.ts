/**
 * One sync run, end to end — and the only part of the ingestion path that
 * knows about all the others.
 *
 * It takes a fetcher, walks its pages, normalises each raw review, writes it
 * through the single dedup path, and records where it got to. It contains no
 * credential, no HTTP, and no knowledge of Google or Apple: Phase 1 supplies
 * `fetchPage`, and this is already built and tested by then.
 *
 * A FAILED RUN IS STILL A PARTIALLY SUCCESSFUL RUN.
 * If page four throws, pages one to three are still written. That is not
 * sloppiness — it is the only correct behaviour against a source that serves a
 * 7-day window. Discarding three good pages because a fourth failed risks
 * reviews that may never be offered again, and it is safe to keep them because
 * `upsertReview` is idempotent: the retry re-reads nothing it does not need to.
 *
 * ONE BAD REVIEW DOES NOT FAIL THE BATCH.
 * A payload that will not normalise is counted, logged and skipped. The
 * alternative — throwing — lets a single malformed record block every good
 * review behind it, on a clock, which is the worst possible trade here.
 */
import { assertUpsertable, type NormalizedReview } from './normalize';
import { upsertReview } from './upsert';
import { paginate, type FetchPage, type PaginateOptions } from './paginate';
import {
  syncKey, loadCheckpoint, holdReason, holdAfterClaim, beginAttempt,
  recordSuccess, recordFailure, recordDeferral, recordPause, recordCycle,
} from './checkpoint';
import { fingerprint, parsePassTokens, serializePassTokens, withPassToken } from './pass';
import { dispositionOf, type SyncDisposition } from './failure';

/**
 * Why a tick did nothing, said precisely.
 *
 * Three very different holds used to share one sentence about backing off,
 * which made a rate-limited sync and a sync with a dead key read the same in
 * the logs — and those are the two cases where knowing which is which is the
 * whole job.
 */
const HOLD_REASON: Record<'paused' | 'deferred' | 'cycle-done' | 'backoff', string> = {
  backoff: 'backing off after a previous failure',
  deferred: 'waiting out a rate limit the store asked for',
  paused: 'paused: a credential was refused, so only an occasional probe runs',
  'cycle-done': 'this cycle\'s pass is complete; nothing until the next one',
};

export interface IngestSource {
  source: 'google_play' | 'app_store';
  appId: string;
  /** Supplied by the platform client. Phase 1 for Google, Phase 2 for Apple. */
  fetchPage: FetchPage<unknown>;
  /** Raw payload -> canonical record. Throws on anything unusable. */
  normalize: (raw: unknown, appId: string, nowMs: number) => Promise<NormalizedReview>;
}

export interface IngestReport {
  key: string;
  ran: boolean;
  /** Set when the run was skipped, with why. */
  skipped: string | null;
  pages: number;
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  /** Payloads that could not be normalised or written. Never fatal. */
  rejected: number;
  flagged: number;
  exhausted: boolean;
  error: string | null;
  /** How the failure was handled. Null when the run did not fail. */
  disposition: SyncDisposition | null;
  /** The store sent this pass back to a page it had already read. */
  cycle: boolean;
}

export interface IngestOptions extends PaginateOptions {
  /** Ignore backoff. For an operator-triggered run, never for the cron. */
  force?: boolean;
  newId?: () => string;
  /** Injected so a test can interleave two runs deterministically. */
  newRunId?: () => string;
}

export async function runIngest(
  db: D1Database,
  src: IngestSource,
  nowMs: number,
  options: IngestOptions = {}
): Promise<IngestReport> {
  const key = syncKey(src.source, src.appId);
  const report: IngestReport = {
    key, ran: false, skipped: null, pages: 0, fetched: 0,
    created: 0, updated: 0, unchanged: 0, rejected: 0, flagged: 0,
    exhausted: false, error: null, disposition: null, cycle: false,
  };

  /**
   * A cheap look before claiming anything. Most ticks in a window have nothing
   * to do — the pass for this cycle is already complete — and they should cost
   * one read rather than a write. What this row says is NOT what the run works
   * from: that is the row the claim below returns.
   */
  const checkpoint = await loadCheckpoint(db, key);
  if (!options.force) {
    // `force` is the operator's way past all three holds, a pause included:
    // the person who has just rotated a key should not have to wait out a
    // probe interval to find out whether it worked.
    const hold = holdReason(checkpoint, nowMs);
    if (hold) {
      report.skipped = HOLD_REASON[hold];
      return report;
    }
  }

  /**
   * CLAIM, AND WORK FROM WHAT THE CLAIM HANDS BACK — never from the read above.
   *
   * Two invocations can be in flight at once: a tick that runs long is still
   * running when the next fires, and a retry is another. That needs two things,
   * and the guard on the writes below is only one of them.
   *
   * The read at the top of this function happens BEFORE any claim, so another
   * run can take the pass forward, or finish it, in between. A claim made after
   * that is still the newest and still valid, so the write guard would let it
   * through — and it would write the successor of a cursor that has moved on.
   * Nothing about the write is stale there; the READ was. So the row this run
   * uses is the one its own claim returned, and the read above is used for
   * nothing but deciding whether to bother.
   */
  const runId = (options.newRunId ?? (() => crypto.randomUUID()))();
  const claimed = await beginAttempt(db, key, nowMs, runId);

  /**
   * One hold is re-read against the claimed row: whether another run finished
   * the pass while this one was reading. Starting a fresh pass inside a
   * completed cycle is the interleaving that corrupts state, and it is the only
   * one — `ran` stays false, because this run did not run. See holdAfterClaim
   * for why backoff and pauses are decided before the claim and not after it.
   */
  if (!options.force) {
    const hold = holdAfterClaim(claimed, nowMs);
    if (hold) {
      report.skipped = HOLD_REASON[hold];
      return report;
    }
  }

  report.ran = true;
  const startToken = options.startToken ?? claimed?.cursor ?? null;
  const walked = await paginate(src.fetchPage, { ...options, startToken });
  report.pages = walked.pages;
  report.fetched = walked.items.length;
  report.exhausted = walked.exhausted;

  /**
   * THE PASS'S MEMORY, which is the only place a multi-page cycle is visible.
   *
   * One run reads one page, so a store answering A -> B and then B -> A repeats
   * nothing inside any single invocation — the guard in `paginate` cannot see
   * it by construction. What gives it away is the cursor coming back to a value
   * this PASS has already held, and a pass outlives the run.
   *
   * A cursor the store REFUSED resets this rather than tripping it: the fetcher
   * answered by going back to the first page, so the tokens that follow belong
   * to a pass that has started again and are legitimately the ones already
   * seen. Without that distinction a stale cursor would look exactly like a
   * store sending the pass round in a circle.
   */
  let passTokens = walked.restarted ? [] : parsePassTokens(claimed?.pass_tokens);
  if (startToken && !walked.restarted) {
    passTokens = withPassToken(passTokens, await fingerprint(startToken));
  }

  /**
   * A FAILED WALK IS NEVER A CYCLE, whatever the tokens say. When a page
   * throws, `nextToken` is the token the run STARTED from — that is how the
   * retry resumes on the page that failed rather than past it — so it matches
   * the pass memory by construction. Reading that as the store sending us
   * round in a circle would turn every transient 503 into a reset pass and a
   * `cycle_at` that only a completed pass can clear.
   */
  const returnedTo = !walked.error
    && walked.nextToken !== null
    && passTokens.includes(await fingerprint(walked.nextToken));

  // Everything collected is written, INCLUDING when the walk ended in an error.
  for (const raw of walked.items) {
    try {
      const record = await src.normalize(raw, src.appId, nowMs);
      assertUpsertable(record);
      const result = await upsertReview(db, record, nowMs, options.newId);
      report[result.outcome] += 1;
      if (result.flagged) report.flagged += 1;
    } catch (err) {
      // Counted, not thrown. The message is logged rather than stored against
      // a row, because there is no row — normalisation is what failed.
      report.rejected += 1;
      console.warn('store ingest: skipped an unusable review', key, (err as Error)?.message);
    }
  }

  /**
   * A CYCLE IS NOT A FINISHED PASS, however much it looks like one from inside
   * a single tick. Reported before the error branch because it is not an error
   * from the store — every request succeeded — and it must not be reported as a
   * success either, which is what used to happen.
   */
  if (walked.cycle || returnedTo) {
    report.cycle = true;
    report.error = 'the store sent this pass back to a page it had already read';
    await recordCycle(db, key, report.error, nowMs, runId);
    return report;
  }

  if (walked.error) {
    report.error = String((walked.error as Error)?.message ?? walked.error).slice(0, 300);

    /**
     * NOT EVERY FAILURE IS THE SAME FAILURE. The store client classified this
     * one from the response — never from the message — and the three answers
     * are genuinely different operations, not three severities of one.
     *
     * The cursor is handled identically in all three: it advances to the page
     * that FAILED, so whenever the sync resumes it does so there rather than
     * re-walking what was just stored.
     */
    const failure = dispositionOf(walked.error);
    report.disposition = failure.disposition;

    if (failure.disposition === 'park') {
      await recordPause(db, key, walked.error, nowMs, walked.nextToken, runId);
    } else if (failure.disposition === 'defer') {
      await recordDeferral(db, key, nowMs + failure.deferMs!, nowMs, walked.nextToken, runId);
    } else {
      await recordFailure(db, key, walked.error, nowMs, walked.nextToken, runId);
    }
    return report;
  }

  await recordSuccess(db, key, walked.nextToken, nowMs, serializePassTokens(passTokens), runId);
  return report;
}
