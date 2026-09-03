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

export function parseRoute(hash: string, lookups: HelpCenterRouteLookups): HelpCenterRoute {
  const [categoryPart = '', articlePart] = hash.replace(/^#\/?/, '').split('/');

  if (!lookups.hasCategory(categoryPart)) return { categoryId: lookups.fallbackCategoryId };
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
