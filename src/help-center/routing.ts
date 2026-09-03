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

/**
 * The platform choice lives in the URL so a Mobile view can be linked, shared
 * and survive a reload. It was component state only, so a reader who sent
 * someone a mobile article sent them the extension instructions.
 *
 * A query parameter rather than a hash segment: the hash is the route, and
 * overloading it would make "#a/b" ambiguous.
 */
export type HelpCenterPlatformId = 'extension-desktop' | 'mobile';

export function parsePlatform(search: string): HelpCenterPlatformId | null {
  const value = new URLSearchParams(search).get('platform');
  return value === 'mobile' || value === 'extension-desktop' ? value : null;
}

export function platformSearch(platform: HelpCenterPlatformId): string {
  return platform === 'extension-desktop' ? '' : `?platform=${platform}`;
}

/**
 * With nothing in the URL, a touch device should not be handed desktop
 * extension instructions first. CLAUDE.md asks for mobile-first.
 */
export function defaultPlatform(isTouchDevice: boolean): HelpCenterPlatformId {
  return isTouchDevice ? 'mobile' : 'extension-desktop';
}
