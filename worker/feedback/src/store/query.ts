/**
 * Turning a URL into a safe SQL query — filters, search, sorting, paging.
 *
 * SEPARATE FROM RENDERING ON PURPOSE. This file is pure: URL in, SQL and binds
 * out, no database and no markup. That means the part where a mistake is
 * expensive — a caller's string reaching SQL, a filter silently not applying —
 * can be tested exhaustively without rendering a page.
 *
 * TWO RULES, AND EVERY FUNCTION HERE EXISTS TO ENFORCE THEM.
 *
 *   1. NOTHING FROM THE URL IS EVER INTERPOLATED INTO SQL. Filter values are
 *      matched against allowlists and the ALLOWLIST'S copy of the string is
 *      what gets bound — not the caller's, even when they are equal. Sort
 *      order, which cannot be a bind parameter, is looked up as a key into a
 *      table of fixed clauses. There is no path from the query string to the
 *      text of a statement.
 *
 *   2. AN UNRECOGNISED VALUE IS DROPPED, NOT PASSED THROUGH. A filter nobody
 *      knows how to apply must not become "match everything" silently — the
 *      review queue's `?q=` already works this way. Unknown values fall back to
 *      the default and the page renders what it actually filtered on, so a
 *      typo shows as an obviously wrong result rather than a subtly wrong one.
 */
import { REVIEW_STATES, REPLY_STATES, HANDOFF_STATES, ELIGIBILITY, LABELS } from './states';

export const PLATFORM_KEYS = ['android', 'ios'] as const;

/**
 * Sort orders, as fixed clauses.
 *
 * ORDER BY cannot be a bind parameter, so it is the one place a caller's
 * string could otherwise reach SQL. Looking it up as a KEY means the worst an
 * attacker can do is choose between four orderings we wrote.
 *
 * Every clause ends with a unique tiebreaker. Without one, two reviews sharing
 * a timestamp or a rating can swap places between page 1 and page 2, so a row
 * is shown twice and another is never shown at all — the classic paging bug,
 * and it is silent.
 */
export const SORTS: Record<string, { label: string; clause: string }> = {
  newest:      { label: 'Newest first',   clause: 'review_created_at DESC, store_review_id DESC' },
  oldest:      { label: 'Oldest first',   clause: 'review_created_at ASC, store_review_id ASC' },
  rating_low:  { label: 'Lowest rating',  clause: 'rating ASC, review_created_at DESC, store_review_id DESC' },
  rating_high: { label: 'Highest rating', clause: 'rating DESC, review_created_at DESC, store_review_id DESC' },
};

/**
 * One "GitHub" filter for the whole road to GitHub: the team's decision and, once
 * eligible, whether the review was queued. Two filters (eligibility and handoff)
 * used to answer halves of the same question, and most of their combinations
 * could not happen — a review cannot be queued without being eligible.
 *
 *   undecided     nobody has decided yet
 *   not_eligible  decided: stays in the console
 *   eligible      eligible, and not sent to GitHub yet
 *   queued        queued for GitHub
 *   failed        queuing failed or was interrupted (a stale 'requested')
 */
export const GITHUB_FILTERS = ['undecided', 'not_eligible', 'eligible', 'queued', 'failed'] as const;
const GITHUB_WHERE: Record<string, string> = {
  undecided: "eligibility = 'undecided' AND handoff_state = 'none'",
  not_eligible: "eligibility = 'not_eligible' AND handoff_state = 'none'",
  eligible: "eligibility = 'eligible' AND handoff_state = 'none'",
  queued: "handoff_state = 'accepted'",
  failed: "handoff_state IN ('failed', 'requested')",
};

export const PAGE_SIZE = 25;
/** Long enough for a sentence, short enough that no LIKE scan gets silly. */
export const MAX_SEARCH = 120;

export interface StoreQuery {
  platform: string;
  state: string | null;
  reply: string | null;
  handoff: string | null;
  eligibility: string | null;
  /** The combined GitHub filter; eligibility and handoff stay readable from old links. */
  github: string | null;
  label: string | null;
  rating: number | null;
  /** 'flagged' narrows to secret-scanner hits. Null means no filter. */
  flagged: boolean | null;
  search: string | null;
  sort: string;
  page: number;
}

/** Returns the ALLOWLIST's copy of a value, never the caller's. */
function pick(raw: string | null, allowed: readonly string[]): string | null {
  if (!raw) return null;
  return allowed.find((a) => a === raw) ?? null;
}

export function parseQuery(params: URLSearchParams): StoreQuery {
  const platform = pick(params.get('platform'), PLATFORM_KEYS) ?? 'android';

  const ratingRaw = Number(params.get('rating'));
  const rating = Number.isInteger(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;

  const flaggedRaw = params.get('flagged');
  const flagged = flaggedRaw === 'yes' ? true : flaggedRaw === 'no' ? false : null;

  // Collapsed whitespace and a hard length cap. Authentication does not make
  // an unbounded LIKE scan safe or affordable.
  const searchRaw = (params.get('q') ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_SEARCH);

  const pageRaw = Number(params.get('page'));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 400) : 1;

  return {
    platform,
    state: pick(params.get('state'), REVIEW_STATES),
    reply: pick(params.get('reply'), REPLY_STATES),
    handoff: pick(params.get('handoff'), HANDOFF_STATES),
    eligibility: pick(params.get('eligibility'), ELIGIBILITY),
    github: pick(params.get('github'), GITHUB_FILTERS),
    label: pick(params.get('label'), LABELS),
    rating,
    flagged,
    search: searchRaw === '' ? null : searchRaw,
    sort: pick(params.get('sort'), Object.keys(SORTS)) ?? 'newest',
    page,
  };
}

/**
 * Escapes a LIKE pattern.
 *
 * `%` and `_` are wildcards inside LIKE, so a search for "100_" would otherwise
 * match "1002" — not a security hole, but a search box that quietly returns the
 * wrong rows is worse than one that returns none. The backslash must be escaped
 * first or it would escape the escapes.
 */
export function escapeLike(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export interface BuiltQuery {
  where: string;
  binds: unknown[];
  orderBy: string;
  limit: number;
  offset: number;
}

/**
 * Builds the WHERE clause. Every value is a bind; only allowlisted fragments
 * are ever concatenated.
 */
export function buildWhere(q: StoreQuery): { where: string; binds: unknown[] } {
  const clauses: string[] = ['platform = ?'];
  const binds: unknown[] = [q.platform];

  if (q.state) { clauses.push('review_state = ?'); binds.push(q.state); }
  if (q.reply) { clauses.push('reply_state = ?'); binds.push(q.reply); }
  if (q.handoff) { clauses.push('handoff_state = ?'); binds.push(q.handoff); }
  if (q.eligibility) { clauses.push('eligibility = ?'); binds.push(q.eligibility); }
  // A fixed clause looked up by an allowlisted key, like ORDER BY: no bind needed.
  if (q.github) clauses.push(`(${GITHUB_WHERE[q.github]})`);
  if (q.rating != null) { clauses.push('rating = ?'); binds.push(q.rating); }

  if (q.flagged === true) {
    clauses.push("secret_scan_status = 'flagged'");
  } else if (q.flagged === false) {
    // NULL means never scanned, which is not the same as flagged. Rows that
    // predate the scanner must not vanish from an unflagged filter.
    clauses.push("COALESCE(secret_scan_status, 'clean') <> 'flagged'");
  }

  if (q.label) {
    /**
     * A person's labels only. The AI's suggested labels are not shown anywhere in
     * the console (maintainer, 2026-09-15), so a filter matching them would list
     * reviews under a label nobody on the page can see.
     *
     * LIKE on a JSON array with the quotes included, so `bug` cannot match
     * `debug` and `ui_issue` cannot match `ux_issue`. FTS or json_each would be
     * tidier; this is a handful of fixed values on a small table.
     */
    clauses.push(`COALESCE(human_labels, '[]') LIKE ? ESCAPE '\\'`);
    binds.push(`%"${escapeLike(q.label)}"%`);
  }

  if (q.search) {
    /**
     * A redacted review's text is never searched. It is never shown either, and a
     * search that could still match it would let anyone confirm the hidden words
     * one guess at a time — the list would say "1 review matching" for the right
     * word of a seed phrase. Redacted reviews stay reachable through the Redacted
     * filter, which reveals nothing about their text.
     */
    const like = `%${escapeLike(q.search)}%`;
    clauses.push(
      `(COALESCE(secret_scan_status, 'clean') <> 'flagged' AND `
      + `(COALESCE(review_title, '') LIKE ? ESCAPE '\\' OR COALESCE(review_body, '') LIKE ? ESCAPE '\\'))`
    );
    binds.push(like, like);
  }

  return { where: clauses.join(' AND '), binds };
}

export function buildQuery(q: StoreQuery): BuiltQuery {
  const { where, binds } = buildWhere(q);
  return {
    where,
    binds,
    // Looked up by key. `q.sort` is already an allowlist member.
    orderBy: SORTS[q.sort].clause,
    limit: PAGE_SIZE,
    offset: (q.page - 1) * PAGE_SIZE,
  };
}

/**
 * Rebuilds the query string with one parameter changed.
 *
 * Used by every filter link and by paging, so a filter can be added without
 * losing the others — and `page` resets whenever anything else changes, because
 * staying on page 7 of a result set that just became three rows long shows an
 * empty page and looks like a bug.
 */
export function withParam(q: StoreQuery, key: string, value: string | null): string {
  const p = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v !== null && v !== undefined && v !== '') p.set(k, String(v));
  };
  set('platform', q.platform);
  set('state', q.state);
  set('reply', q.reply);
  set('handoff', q.handoff);
  set('eligibility', q.eligibility);
  set('github', q.github);
  set('label', q.label);
  set('rating', q.rating);
  set('flagged', q.flagged === null ? null : q.flagged ? 'yes' : 'no');
  set('q', q.search);
  if (q.sort !== 'newest') set('sort', q.sort);
  if (q.page > 1) set('page', q.page);

  if (value === null) p.delete(key);
  else p.set(key, value);

  if (key !== 'page') p.delete('page');
  return `/admin/store?${p.toString()}`;
}

/** True when anything narrows the list beyond the platform itself. */
export function hasFilters(q: StoreQuery): boolean {
  return Boolean(
    q.state || q.reply || q.handoff || q.eligibility || q.github || q.label ||
    q.rating != null || q.flagged !== null || q.search
  );
}
