import type { HelpCenterArticle, HelpCenterMainCategory, HelpCenterPlatform } from './types';

/**
 * Search over the articles themselves, not just the category names.
 *
 * The field previously matched only the 5 main-category and 7 subcategory
 * titles, so "recovery phrase", "stuck", "seed" and "Chrome" all returned
 * nothing while articles covering them sat one click away. It also wrote its
 * results into the sidebar, which is off-canvas below 900px — so on a phone
 * typing produced no visible change at all. Results are a view of their own
 * now, in the main column, reachable at every width.
 *
 * Deliberately plain substring matching: 23 articles do not need an index, and
 * a scoring model nobody can predict is worse than one everybody can.
 */

export interface HelpCenterSearchResult {
  readonly article: HelpCenterArticle;
  readonly mainCategoryTitle: string;
  readonly subcategoryTitle: string;
  /** Text around the match, so the reader can see why this result is here. */
  readonly snippet: string;
  readonly matchedTitle: boolean;
}

const SNIPPET_RADIUS = 90;

function flatten(text: string) {
  return text
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:\d+\.|[-*+])\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<!--[^>]*-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippetAround(body: string, query: string) {
  const flat = flatten(body);
  const at = flat.toLocaleLowerCase().indexOf(query);
  if (at === -1) return flat.slice(0, SNIPPET_RADIUS * 2).trim();

  const from = Math.max(0, at - SNIPPET_RADIUS);
  const to = Math.min(flat.length, at + query.length + SNIPPET_RADIUS);
  return `${from > 0 ? '…' : ''}${flat.slice(from, to).trim()}${to < flat.length ? '…' : ''}`;
}

export function searchHelpCenter(
  articles: readonly HelpCenterArticle[],
  mainCategories: readonly HelpCenterMainCategory[],
  rawQuery: string,
  platform: HelpCenterPlatform
): readonly HelpCenterSearchResult[] {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (query.length < 2) return [];

  const titles = new Map<string, { main: string; sub: string }>();
  for (const mainCategory of mainCategories) {
    for (const subcategory of mainCategory.subcategories) {
      titles.set(subcategory.id, { main: mainCategory.title, sub: subcategory.title });
    }
  }

  const results: (HelpCenterSearchResult & { rank: number })[] = [];

  for (const article of articles) {
    const where = titles.get(article.subcategory);
    if (!where) continue;

    // Prefer the platform being viewed; fall back to whichever body exists, so
    // an extension-only article is still findable while Mobile is selected.
    const body =
      article.bodies[platform] ?? article.bodies['extension-desktop'] ?? article.bodies.mobile ?? '';

    const matchedTitle = article.title.toLocaleLowerCase().includes(query);
    const matchedBody = flatten(body).toLocaleLowerCase().includes(query);
    const matchedCategory =
      where.sub.toLocaleLowerCase().includes(query) || where.main.toLocaleLowerCase().includes(query);

    if (!matchedTitle && !matchedBody && !matchedCategory) continue;

    results.push({
      article,
      mainCategoryTitle: where.main,
      subcategoryTitle: where.sub,
      snippet: matchedBody ? snippetAround(body, query) : snippetAround(body, ''),
      matchedTitle,
      rank: matchedTitle ? 0 : matchedCategory && !matchedBody ? 2 : 1
    });
  }

  return results
    .sort((a, b) => a.rank - b.rank || a.article.title.localeCompare(b.article.title))
    .map(({ rank: _rank, ...result }) => result);
}
