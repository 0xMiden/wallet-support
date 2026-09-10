/**
 * Hash routing for the Help Center. Four shapes only:
 *
 *   (no hash)               the home page
 *   #subcategory            the subcategory's article cards
 *   #subcategory/article    one article
 *   #glossary               the glossary, or #glossary-<entry> at one entry
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
 *
 * An empty hash used to mean "the first subcategory", which left the product
 * with no address of its own: the bare URL opened halfway into the content and
 * the brand had nowhere to link to. It is now the home page, and every other
 * route is unchanged.
 *
 * The glossary is matched before any category. It is reference rather than part
 * of the hierarchy, and an entry link has to survive being shared: as "not a
 * route" it would open the home page on arrival instead of the definition it
 * names.
 */

export type HelpCenterRoute =
  | { readonly view: 'home' }
  | { readonly view: 'category'; readonly categoryId: string; readonly articleId?: string }
  | { readonly view: 'glossary'; readonly entryId?: string };

export interface HelpCenterRouteLookups {
  hasCategory(categoryId: string): boolean;
  hasArticle(categoryId: string, articleId: string): boolean;
  hasGlossaryEntry(entryId: string): boolean;
}

const home: HelpCenterRoute = { view: 'home' };
const GLOSSARY = 'glossary';
const glossary: HelpCenterRoute = { view: 'glossary' };

export function parseRoute(hash: string, lookups: HelpCenterRouteLookups): HelpCenterRoute | null {
  const [categoryPart = '', articlePart] = hash.replace(/^#\/?/, '').split('/');

  if (!categoryPart) return home;

  if (categoryPart === GLOSSARY) return glossary;
  if (categoryPart.startsWith(`${GLOSSARY}-`)) {
    const entryId = categoryPart.slice(GLOSSARY.length + 1);
    // An unknown entry opens the glossary at its top rather than guessing.
    return lookups.hasGlossaryEntry(entryId) ? { view: 'glossary', entryId } : glossary;
  }

  if (!lookups.hasCategory(categoryPart)) return null;
  if (!articlePart) return { view: 'category', categoryId: categoryPart };

  return lookups.hasArticle(categoryPart, articlePart)
    ? { view: 'category', categoryId: categoryPart, articleId: articlePart }
    : { view: 'category', categoryId: categoryPart };
}

export function articleHref(categoryId: string, articleId: string) {
  return `#${categoryId}/${articleId}`;
}

export function categoryHref(categoryId: string) {
  return `#${categoryId}`;
}

/**
 * The home page's address. A bare "#" rather than the pathname, so following
 * it from any route is a hash change the page already listens for, and so the
 * link does not discard the query string the reader arrived with.
 */
export function homeHref() {
  return '#';
}

export function glossaryHref() {
  return `#${GLOSSARY}`;
}

/** The element id of one glossary entry. Its href is this with a leading "#". */
export function glossaryEntryAnchor(entryId: string) {
  return `${GLOSSARY}-${entryId}`;
}

export function glossaryEntryHref(entryId: string) {
  return `#${glossaryEntryAnchor(entryId)}`;
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

/**
 * The search query, for the same reason as the platform: a reader who has
 * found the answer by searching for it can send someone the search.
 */
export function parseSearchQuery(search: string): string {
  return new URLSearchParams(search).get('q')?.trim() ?? '';
}

/**
 * Writes named parameters into an existing query string, leaving the rest of it
 * alone.
 *
 * The helper this replaces returned a complete search string built from the
 * platform alone, and its caller assigned that over whatever was already
 * there. So any other parameter the reader arrived with — a campaign tag, or
 * anything else a shared link carried — was dropped the moment they touched
 * the platform toggle. Two parameters share the string now, which is the
 * second reason not to rebuild it: writing one must not cost the other.
 *
 * An empty or null value removes the parameter rather than writing "?x=",
 * which keeps the default state of the page addressable as a bare URL.
 */
export function withSearchParams(
  search: string,
  changes: Readonly<Record<string, string | null>>
): string {
  const params = new URLSearchParams(search);

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
  }

  const next = params.toString();
  return next ? `?${next}` : '';
}

/**
 * With nothing in the URL, a touch device should not be handed desktop
 * extension instructions first. CLAUDE.md asks for mobile-first.
 */
export function defaultPlatform(isTouchDevice: boolean): HelpCenterPlatformId {
  return isTouchDevice ? 'mobile' : 'extension-desktop';
}
