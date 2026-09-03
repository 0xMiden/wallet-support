/**
 * Hash routing for the Help Center. Two shapes only:
 *
 *   #subcategory            the subcategory's article cards
 *   #subcategory/article    one article
 *
 * Pure, and given its lookups rather than importing them, so the rules can be
 * tested without standing up the component. An unknown id in either position
 * falls back to something it can verify — never to a guess, and never to an
 * article that does not belong to the subcategory in the hash.
 *
 * A hash that is not a route at all returns null, meaning "leave the page
 * where it is". The page also uses in-document anchors — the skip link targets
 * #help-center-content — and treating those as an unknown category used to
 * reset the reader to the first subcategory, so the one control an assistive
 * user reaches first was the one that discarded their place.
 */

export interface HelpCenterRoute {
  categoryId: string;
  articleId?: string;
}

export interface HelpCenterRouteLookups {
  hasCategory(categoryId: string): boolean;
  hasArticle(categoryId: string, articleId: string): boolean;
  fallbackCategoryId: string;
}

export function parseRoute(hash: string, lookups: HelpCenterRouteLookups): HelpCenterRoute | null {
  const [categoryPart = '', articlePart] = hash.replace(/^#\/?/, '').split('/');

  if (!categoryPart) return { categoryId: lookups.fallbackCategoryId };
  if (!lookups.hasCategory(categoryPart)) return null;
  if (!articlePart) return { categoryId: categoryPart };

  return lookups.hasArticle(categoryPart, articlePart)
    ? { categoryId: categoryPart, articleId: articlePart }
    : { categoryId: categoryPart };
}

export function articleHref(categoryId: string, articleId: string) {
  return `#${categoryId}/${articleId}`;
}

export function categoryHref(categoryId: string) {
  return `#${categoryId}`;
}
