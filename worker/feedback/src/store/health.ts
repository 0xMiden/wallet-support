/**
 * Per-store sync status, for /health.
 *
 * A sync that has stopped collecting is INVISIBLE from outside until somebody
 * opens the console and notices the queue has not grown. That is the wrong way
 * round for the one failure with a deadline attached: Google serves only the
 * last 7 days, so a Google Play sync that stops is losing reviews on a clock,
 * and the loss is unrecoverable through the API. The App Store has no such
 * cliff, which is why only one of these two sources reports a countdown.
 *
 * WHAT THE ALARM SHOULD WATCH IS `windowConsumed`, NOT `state`. checkpoint.ts
 * makes the argument in full: the question worth waking someone for is not
 * "did the last run fail" — runs fail transiently all day — but how long it has
 * been since collection got all the way round, measured against the window.
 * `state` says what the scheduler is doing and why; the number says how much
 * has been burned.
 *
 * AND IT IS MEASURED FROM COVERAGE, not from a page fetched without error. A
 * sync whose paging cycles answers every request successfully and would
 * otherwise report perfect health for ever while collecting the same two pages.
 * Progress is a pass that reaches the end; anything less is a request that
 * worked.
 *
 * WHERE NO PASS HAS EVER FINISHED, the measure falls back to when the current
 * attempt began, because a sync that has never got all the way round is the one
 * case that would otherwise report NOTHING — null coverage, null window, and a
 * `state` of `ok` because every request is working. That covers a first backlog
 * that never ends and a paging cycle too long for the cursor memory to catch.
 *
 * WHAT IS DELIBERATELY NOT HERE: `last_error` and `paused_reason`. Both are
 * built from upstream responses, and /health is untokened — the same reasoning
 * that moved the per-state census behind a token. An uptime monitor needs to
 * know that a sync is paused and for how long; the sentence explaining which
 * upstream code came back belongs where a person has signed in. No review text
 * and no configured app id leaves here either: the source is named, the app is
 * not.
 */
import { GOOGLE_WINDOW_MS, type Checkpoint } from './checkpoint';

/** The sources a reader should see, whether or not either has ever run. */
export const HEALTH_SOURCES = ['google_play', 'app_store'] as const;
export type HealthSource = (typeof HEALTH_SOURCES)[number];

/**
 * What the scheduler is doing with this source.
 *
 * One vocabulary, in precedence order: a row can be several of these at once,
 * and this reports the one that explains why nothing is happening.
 */
export type SyncState =
  /** The table could not be read — the migration has not reached this database. */
  | 'unavailable'
  /** A credential was refused. Only an hourly probe runs until it is fixed. */
  | 'paused'
  /** The store asked us to come back later, and we are waiting. */
  | 'deferred'
  /**
   * Paging went round in a circle: the store sent a pass back to a page it had
   * already read.
   *
   * STICKY UNTIL A PASS COMPLETES, and that is the point of it. A store that
   * keeps cycling still answers every request, so the ticks between detections
   * fetch pages without error and refresh `lastSuccessHours` — this state is
   * what stops that reading as a sync that is fine. It outranks `failing`
   * because it says WHY.
   */
  | 'stalled'
  /** Failing and backing off. */
  | 'failing'
  /**
   * No run has ever fetched a page without error.
   *
   * NEVER REPORTED AS `ok`, whatever else is true, because a sync that is
   * switched on and has never succeeded is the one case that would otherwise
   * look identical to a quiet, healthy one: no failures, no hold, nothing in
   * the queue. `enabled: true` with this state is an alarm.
   */
  | 'never'
  /** A page was fetched without error, and nothing is holding the next run. */
  | 'ok';

export interface SourceHealth {
  /** Whether the switches would let this source run at all. */
  enabled: boolean;
  state: SyncState;
  /**
   * Hours since the last sync run that FETCHED A PAGE WITHOUT ERROR, and
   * nothing more than that.
   *
   * IT IS NOT A COMPLETENESS MEASURE. A run takes one page, so a fresh number
   * here says a page was read and written minutes ago — not that every review
   * the store holds has been collected, and not that none has been missed. A
   * pass that is only a third of the way through a backlog reports the same
   * zero-point-something as one that has just finished. Reviews can also be
   * missed WITHIN a healthy pass: GP21 pins the case where a review edited
   * mid-pass moves behind the cursor and is caught only by the next pass.
   *
   * Null means no run has ever succeeded. Read with `enabled`, that is the
   * loudest thing on this object: a sync that is switched on and has never
   * collected anything is broken, however calm the rest of it looks.
   */
  lastSuccessHours: number | null;
  /**
   * Hours since a pass last reached the END of the source.
   *
   * THIS IS THE PROGRESS MEASURE, and `lastSuccessHours` is not. A run fetches
   * one page, so a fresh success time says a request worked; only a finished
   * pass says everything the store was offering has been seen. A sync going
   * round in a circle fetches pages without error indefinitely — it can keep
   * `lastSuccessHours` at zero for ever and can never move this.
   *
   * Null until a first pass completes, which for a backlog can be many hours
   * after collection starts and is not by itself a fault.
   */
  lastCompletedPassHours: number | null;
  /**
   * How long collection has been unable to claim full coverage: hours since the
   * last COMPLETED pass, or — if none has ever completed — since the current
   * attempt to get all the way round began.
   *
   * THE FALLBACK IS THE POINT. `lastCompletedPassHours` is null until a first
   * pass finishes, and a sync that never finishes one would otherwise report
   * null for ever: no completed pass, no elapsed time, nothing to alarm on,
   * while `state` sat at `ok` because every request was working. That is the
   * shape of a first backlog that never ends and of a paging cycle too long
   * for the cursor memory to catch — the two ways collection can stall without
   * a single error. Measured from when the attempt STARTED, both of them climb.
   *
   * Null only when no pass has ever been opened or completed, which means the
   * sync has not collected anything at all — `state` is `never` there, and
   * that is the louder signal.
   */
  coverageGapHours: number | null;
  consecutiveFailures: number;
  /**
   * `coverageGapHours` against the 7 days Google Play serves. GOOGLE PLAY ONLY;
   * null for every other source.
   *
   * MEASURED FROM COVERAGE, not from the last page fetched. That distinction is
   * the whole value of the number. A sync whose paging has gone round in a
   * circle fetches pages without error for ever, so measured from the last
   * success it would sit near zero — reporting no exposure at all — while the
   * window emptied behind it. Measured from the last pass that got all the way
   * round, or from when the current attempt began, it climbs.
   *
   * At 1 the oldest reviews in that window have begun ageing out of the API,
   * so anything not already collected is unreachable — recoverable only from a
   * Play Console CSV export.
   *
   * WHAT IT DOES NOT MEASURE: whether anything was actually lost. Below 1 is
   * not proof that every review was collected; above 1 is not proof that
   * anything WAS. It is a countdown on exposure, not an audit of what was
   * collected. It also climbs during a long first backlog, which is honest —
   * that pass has not yet seen the whole window — and is not a fault.
   *
   * App Store Connect serves a review's whole history and has no such cliff,
   * so reporting a fraction for it would assert a deadline that does not
   * exist. Null there always, and null for Google only while nothing has ever
   * been collected.
   */
  windowConsumed: number | null;
}

export interface SyncHealthEnv {
  STORE_SYNC_ENABLED?: string;
  APP_STORE_SYNC_ENABLED?: string;
}

/** The switches, read exactly as the sync path reads them. */
function enabledFor(source: HealthSource, env: SyncHealthEnv): boolean {
  if (env.STORE_SYNC_ENABLED !== 'true') return false;
  return source === 'app_store' ? env.APP_STORE_SYNC_ENABLED === 'true' : true;
}

const round = (n: number, places: number) => Number(n.toFixed(places));

/**
 * A CONDITION, NOT A MOMENT.
 *
 * This deliberately does not ask `holdReason` whether the next run is due this
 * instant. A paused sync is due once an hour, by design, and reading the hold
 * would make it report `paused` for 59 minutes and `failing` for the minute
 * its probe is ready — dropping the diagnosis exactly when someone looking at
 * a broken sync most needs it. `paused_at` is set until a run SUCCEEDS, and
 * that is what this reports.
 */
function stateOf(cp: Checkpoint | null, nowMs: number): SyncState {
  if (cp?.paused_at) return 'paused';
  if (cp?.defer_until && nowMs < cp.defer_until) return 'deferred';
  if (cp?.cycle_at) return 'stalled';
  if ((cp?.consecutive_failures ?? 0) > 0) return 'failing';
  if (!cp?.last_success_at) return 'never';
  return 'ok';
}

/**
 * One entry per source, always — a source with no row at all is the state
 * worth reporting most plainly, and leaving it out would read as healthy.
 *
 * ONE QUERY, and it survives the table not existing: /health is what an uptime
 * monitor calls, so a database that has not been migrated yet must make the
 * store status say so rather than make the whole endpoint fail.
 */
export async function syncHealth(
  db: D1Database, env: SyncHealthEnv, nowMs: number
): Promise<Record<HealthSource, SourceHealth>> {
  let rows: Checkpoint[] | null = null;
  try {
    const { results } = await db.prepare(
      `SELECT key, cursor, last_success_at, last_attempt_at, consecutive_failures,
              last_error, updated_at, defer_until, paused_at, paused_reason,
              pass_tokens, cycle_at, last_pass_at, pass_started_at
         FROM store_sync_state`
    ).all<Checkpoint>();
    rows = results ?? [];
  } catch (err) {
    console.warn('store sync state unavailable', (err as Error)?.message);
  }

  const out = {} as Record<HealthSource, SourceHealth>;
  for (const source of HEALTH_SOURCES) {
    const enabled = enabledFor(source, env);
    if (rows === null) {
      out[source] = {
        enabled, state: 'unavailable', lastSuccessHours: null,
        lastCompletedPassHours: null, coverageGapHours: null,
        consecutiveFailures: 0, windowConsumed: null,
      };
      continue;
    }

    /**
     * The key is `<source>:<app id>`, and the app id stays out of the payload.
     * Where more than one row shares a source, the WORST one is reported: a
     * healthy row must never hide a stalled one behind an average.
     */
    const forSource = rows.filter((r) => r.key.startsWith(`${source}:`));
    const cp = forSource.reduce<Checkpoint | null>(
      (worst, r) => (worst === null || (r.last_success_at ?? 0) < (worst.last_success_at ?? 0) ? r : worst),
      null
    );

    const sinceSuccess = cp?.last_success_at ? nowMs - cp.last_success_at : null;
    const sincePass = cp?.last_pass_at ? nowMs - cp.last_pass_at : null;
    /**
     * The completed pass if there is one, otherwise the attempt in progress.
     * A pass that has been open for three days says as much about coverage as
     * one that finished three days ago, and it is the only thing a sync which
     * has never finished one can say at all.
     */
    const coverageAnchor = cp?.last_pass_at ?? cp?.pass_started_at ?? null;
    const gap = coverageAnchor === null ? null : nowMs - coverageAnchor;
    const burnsAWindow = source === 'google_play' && gap !== null;
    out[source] = {
      enabled,
      state: stateOf(cp, nowMs),
      lastSuccessHours: sinceSuccess === null ? null : round(sinceSuccess / 3_600_000, 2),
      lastCompletedPassHours: sincePass === null ? null : round(sincePass / 3_600_000, 2),
      coverageGapHours: gap === null ? null : round(gap / 3_600_000, 2),
      consecutiveFailures: cp?.consecutive_failures ?? 0,
      windowConsumed: burnsAWindow ? round(gap! / GOOGLE_WINDOW_MS, 3) : null,
    };
  }
  return out;
}
