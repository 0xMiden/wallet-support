/**
 * Neutralize anything in submitter-controlled text that can act on GitHub.
 *
 * A feedback submitter must not be able to notify arbitrary users, cross-link
 * unrelated issues, or inject markup. Auto-close keywords (Fixes #N) only act
 * from PRs and commits, so those are low risk — cross-reference noise is not.
 */

/** @user and @org/team → zero-width-joined so they render but don't notify. */
export function neutralizeMentions(text: string): string {
  return text.replace(/(^|[^\w`])@([A-Za-z0-9](?:[A-Za-z0-9-]{0,38})(?:\/[A-Za-z0-9._-]+)?)/g,
    (_m, pre, handle) => `${pre}@\u200b${handle}`);
}

/** #123 → #\u200b123 so it does not create a cross-reference. */
export function neutralizeIssueRefs(text: string): string {
  return text.replace(/(^|[^\w`&])#(\d+)\b/g, (_m, pre, num) => `${pre}#\u200b${num}`);
}

/** Full URLs to other repos' issues also cross-link. Render as code. */
export function defangIssueUrls(text: string): string {
  return text.replace(
    /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(issues|pull)\/\d+/g,
    (m) => `\`${m}\``
  );
}

export function stripHtml(text: string): string {
  return text.replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

/** Cap length before it ever reaches a model or an issue body. */
export function truncate(text: string, max = 8000): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n\n…[truncated]`;
}

export function sanitize(raw: string): string {
  let t = raw.replace(/\r\n/g, '\n');
  t = stripHtml(t);
  t = neutralizeMentions(t);
  t = neutralizeIssueRefs(t);
  t = defangIssueUrls(t);
  return truncate(t);
}
