import { helpCenterMainCategories } from './categories';
import type { ArticleImage, ArticleImages } from './markdown';
import type { HelpCenterArticle, HelpCenterMainCategory, HelpCenterPlatform } from './types';

/**
 * Articles are Markdown files with frontmatter, migrated verbatim from
 * content-source/, or for the FAQ articles from tasks/faq/bread-faq-content.md.
 * Nothing here rewrites, trims, or summarises a body. The migration may drop
 * "[image removed]" placeholder lines, and in the FAQ articles may turn a
 * referenced title into a link and give an image its alt text; content.test.ts
 * proves it did nothing else.
 *
 * A body that differs per platform is split with HTML comment markers rather
 * than headings, so a delimiter can never collide with article prose.
 */

const KNOWN_PLATFORMS: readonly HelpCenterPlatform[] = ['extension-desktop', 'mobile'];
const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;
const PLATFORM_MARKER = /^<!--\s*platform:\s*([A-Za-z0-9-]+)\s*-->\s*$/;

function isPlatform(value: string): value is HelpCenterPlatform {
  return (KNOWN_PLATFORMS as readonly string[]).includes(value);
}

export function parseArticle(source: string, origin: string): HelpCenterArticle {
  const frontmatter = FRONTMATTER.exec(source);
  if (!frontmatter) throw new Error(`${origin}: missing a frontmatter block.`);

  const fields = new Map<string, string>();
  for (const line of frontmatter[1].split('\n')) {
    if (!line.trim()) continue;
    const separator = line.indexOf(':');
    if (separator === -1) throw new Error(`${origin}: cannot read frontmatter line "${line}".`);
    fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }

  const required = (key: string) => {
    const value = fields.get(key);
    if (!value) throw new Error(`${origin}: frontmatter is missing "${key}".`);
    return value;
  };

  const platforms = required('platforms')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

  for (const platform of platforms) {
    if (!isPlatform(platform)) throw new Error(`${origin}: unknown platform "${platform}".`);
  }
  if (platforms.length === 0) throw new Error(`${origin}: declares no platforms.`);
  if (new Set(platforms).size !== platforms.length) {
    throw new Error(`${origin}: repeats a platform in its frontmatter.`);
  }

  const hiddenField = fields.get('hidden');
  if (hiddenField !== undefined && hiddenField !== 'true' && hiddenField !== 'false') {
    throw new Error(`${origin}: "hidden" must be true or false, not "${hiddenField}".`);
  }
  const hidden = hiddenField === 'true';
  const hiddenReason = fields.get('hiddenReason');
  if (hidden && !hiddenReason) {
    throw new Error(`${origin}: is hidden but gives no "hiddenReason".`);
  }

  const declared = platforms as readonly HelpCenterPlatform[];
  const sections = new Map<string, string[]>();
  const shared: string[] = [];
  let current: string | null = null;

  for (const line of source.slice(frontmatter[0].length).split('\n')) {
    const marker = PLATFORM_MARKER.exec(line);
    if (marker) {
      current = marker[1];
      if (sections.has(current)) throw new Error(`${origin}: repeats the "${current}" section.`);
      sections.set(current, []);
      continue;
    }
    (current === null ? shared : sections.get(current) ?? shared).push(line);
  }

  if (sections.size > 0 && shared.join('').trim() !== '') {
    throw new Error(`${origin}: has body text before its first platform marker.`);
  }

  for (const name of sections.keys()) {
    if (!isPlatform(name)) throw new Error(`${origin}: unknown platform section "${name}".`);
    if (!declared.includes(name)) {
      throw new Error(`${origin}: has a "${name}" section but does not declare that platform.`);
    }
  }

  const bodies: Partial<Record<HelpCenterPlatform, string>> = {};
  for (const platform of declared) {
    const text = (sections.get(platform) ?? shared).join('\n').trim();
    if (!text) throw new Error(`${origin}: declares "${platform}" but has no body for it.`);
    bodies[platform] = text;
  }

  return {
    id: required('id'),
    title: required('title'),
    mainCategory: required('mainCategory'),
    subcategory: required('subcategory'),
    platforms: declared,
    bodies,
    ...(hidden ? { hidden, hiddenReason } : {})
  };
}

export function loadArticles(modules: Readonly<Record<string, string>>): readonly HelpCenterArticle[] {
  return Object.keys(modules)
    .sort()
    .map(path => parseArticle(modules[path] as string, path));
}

/**
 * Every article on disk, hidden ones included. Fidelity and validation run over
 * this list rather than the published one: hiding an article must not quietly
 * retire the guards that prove its text still matches content-source.
 */
export const helpCenterAllArticles: readonly HelpCenterArticle[] = loadArticles(
  import.meta.glob<string>('./content/*.md', { query: '?raw', import: 'default', eager: true })
);

/**
 * The images articles may show, by filename. Width and height are written down
 * rather than read at runtime, because the browser needs them before the file
 * arrives; content.test.ts reads each file's own header and fails if a size
 * here disagrees with it, or if a file is missing from the table.
 */
const ARTICLE_IMAGE_SIZES: Readonly<Record<string, readonly [number, number]>> = {
  'across-chains-two-routes.png': [1024, 444],
  'earn-across-the-privacy-line.png': [1024, 393],
  'guardian-backed-or-more-private.png': [1024, 434],
  'private-from-other-users.png': [916, 535],
  'three-keys-always-in-control.png': [1026, 396]
};

/**
 * The same table for step screenshots, which live in their own directory
 * because they are captured against a wallet release rather than drawn, and
 * are replaced whenever the screen they show changes. Filenames come from
 * `tasks/screenshot-capture-sheet.md`; §7 of `tasks/content-proposal.md` says
 * where each one goes. A position is only real once its file is, so an entry
 * lands with its capture, never ahead of it.
 *
 * A third element marks a narrow surface — a panel, menu or dialog, which is
 * the size it is and cannot be captured to a set width. That covers Chrome's
 * own menus and Bread Wallet's sidebar alike: what decides it is how wide the
 * surface naturally is, not who owns it. Everything else fills the 680px
 * column: a whole browser tab captured at exactly 1360px, or the part of one
 * that matters, cropped from a 150% screenshot to 1360–2040px. The image spec
 * in the capture sheet has the reasoning; content.test.ts holds each file to
 * whichever rule applies.
 */
export type ScreenshotSize = readonly [number, number] | readonly [number, number, 'narrow'];

export const SCREENSHOT_SIZES: Readonly<Record<string, ScreenshotSize>> = {
  // Phone captures, prepared to the phone capture spec (530px wide).
  'M01-install-app-store.png': [530, 888, 'narrow'],
  'E01-install-web-store.png': [1783, 363],
  'E01a-install-add-extension.png': [870, 486, 'narrow'],
  'E02-install-pin.png': [870, 487, 'narrow'],
  'E03-create-get-started.png': [820, 903, 'narrow'],
  'E04-create-testnet-notice.png': [817, 991, 'narrow'],
  'E05-create-password.png': [824, 879, 'narrow'],
  'E06-create-guardian.png': [819, 953, 'narrow'],
  'E06a-create-wallet-ready.png': [821, 582, 'narrow'],
  'E07-fund-homepage.png': [547, 909, 'narrow'],
  'E08-fund-activity.png': [549, 1305, 'narrow'],
  'E19-guardian-home.png': [530, 1255, 'narrow'],
  'E20-guardian-settings-menu.png': [529, 1248, 'narrow'],
  'E21-guardian-settings.png': [528, 1245, 'narrow'],
  'E22-guardian-choose.png': [530, 1249, 'narrow'],
  'E23-guardian-review.png': [530, 1246, 'narrow'],
  'E13-restore-welcome.png': [789, 902, 'narrow'],
  'E14-restore-testnet-notice.png': [764, 993, 'narrow'],
  'E15-restore-phrase-boxes.png': [820, 813, 'narrow'],
  'E15a-restore-password.png': [825, 849, 'narrow'],
  'E16-restore-recovery-choice.png': [820, 1284, 'narrow'],
  'E16a-restore-wallet-ready.png': [820, 871, 'narrow'],
  'E16b-restore-everyday-key.png': [1721, 387]
};

export function registerImages(
  files: Readonly<Record<string, string>>,
  sizes: Readonly<Record<string, ScreenshotSize>>,
  table: string,
  kind?: ArticleImage['kind']
): [string, ArticleImage][] {
  return Object.entries(files).map(([path, src]) => {
    const name = path.slice(path.lastIndexOf('/') + 1);
    const size = sizes[name];
    if (!size) {
      throw new Error(
        `${name}: add its width and height to ${table}, as '${name}': [width, height]. ` +
          'They are written down because the browser needs them before the file arrives.'
      );
    }
    const image: ArticleImage = {
      src,
      width: size[0],
      height: size[1],
      ...(kind ? { kind } : {}),
      // The renderer shows a narrow surface at half size; dropping this flag
      // here is what once left every narrow capture at twice life size.
      ...(size.length === 3 && size[2] === 'narrow' ? { narrow: true as const } : {})
    };
    return [name, image];
  });
}

export const helpCenterArticleImages: ArticleImages = Object.fromEntries([
  ...registerImages(
    import.meta.glob<string>('./assets/faq/*.png', { query: '?url', import: 'default', eager: true }),
    ARTICLE_IMAGE_SIZES,
    'ARTICLE_IMAGE_SIZES'
  ),
  ...registerImages(
    import.meta.glob<string>('./assets/screenshots/*.png', { query: '?url', import: 'default', eager: true }),
    SCREENSHOT_SIZES,
    'SCREENSHOT_SIZES',
    'screenshot'
  )
]);

/**
 * What the site renders, searches, counts and routes to. A hidden article is
 * absent from this list, so parseRoute() falls back to the category view for a
 * link someone still holds, rather than resolving to a page that describes a
 * flow the wallet does not offer.
 */
export const helpCenterArticles: readonly HelpCenterArticle[] = helpCenterAllArticles.filter(
  article => article.hidden !== true
);

export function articlesFor(
  articles: readonly HelpCenterArticle[],
  subcategoryId: string,
  platform: HelpCenterPlatform
): readonly HelpCenterArticle[] {
  return articles.filter(
    article => article.subcategory === subcategoryId && article.platforms.includes(platform)
  );
}

export interface HelpCenterCoverageRow {
  readonly mainCategory: string;
  readonly subcategory: string;
  readonly platform: HelpCenterPlatform;
  readonly count: number;
}

export function coverageReport(
  articles: readonly HelpCenterArticle[],
  mainCategories: readonly HelpCenterMainCategory[] = helpCenterMainCategories
): readonly HelpCenterCoverageRow[] {
  return mainCategories.flatMap(mainCategory =>
    mainCategory.subcategories.flatMap(subcategory =>
      KNOWN_PLATFORMS.map(platform => ({
        mainCategory: mainCategory.id,
        subcategory: subcategory.id,
        platform,
        count: articlesFor(articles, subcategory.id, platform).length
      }))
    )
  );
}

/**
 * An empty subcategory is a legitimate state the owner wants to see, so it is
 * reported and never fatal. Only malformed data fails.
 */
export function coverageWarnings(rows: readonly HelpCenterCoverageRow[]): readonly string[] {
  return rows
    .filter(row => row.count === 0)
    .map(row => `No articles for ${row.platform} in ${row.mainCategory} › ${row.subcategory}.`);
}

export function validationErrors(
  articles: readonly HelpCenterArticle[],
  mainCategories: readonly HelpCenterMainCategory[] = helpCenterMainCategories
): readonly string[] {
  const errors: string[] = [];
  const owners = new Map<string, string>();
  for (const mainCategory of mainCategories) {
    for (const subcategory of mainCategory.subcategories) owners.set(subcategory.id, mainCategory.id);
  }

  const byId = new Map<string, number>();
  const byTitle = new Map<string, number>();

  for (const article of articles) {
    byId.set(article.id, (byId.get(article.id) ?? 0) + 1);
    byTitle.set(article.title, (byTitle.get(article.title) ?? 0) + 1);

    const owner = owners.get(article.subcategory);
    if (owner === undefined) {
      errors.push(`${article.id}: subcategory "${article.subcategory}" does not exist.`);
    } else if (owner !== article.mainCategory) {
      errors.push(
        `${article.id}: subcategory "${article.subcategory}" belongs to "${owner}", not "${article.mainCategory}".`
      );
    }

    for (const platform of article.platforms) {
      if (!article.bodies[platform]?.trim()) {
        errors.push(`${article.id}: declares "${platform}" but has no body for it.`);
      }
    }
  }

  for (const [id, count] of byId) if (count > 1) errors.push(`Duplicate article id "${id}".`);
  for (const [title, count] of byTitle) if (count > 1) errors.push(`Duplicate article title "${title}".`);

  return errors;
}

/**
 * Whether a subcategory offers a platform choice. True when any of its articles
 * is missing from a platform, or carries a different body per platform. A
 * subcategory whose articles read identically everywhere shows one list and no
 * tabs, because there is nothing to choose between.
 *
 * Derived, never stored. The category data used to carry a `platforms` field,
 * which was a second answer to this question and free to drift from the content.
 */
export function subcategoryNeedsPlatformChoice(
  articles: readonly HelpCenterArticle[],
  subcategoryId: string
): boolean {
  return articles
    .filter(article => article.subcategory === subcategoryId)
    .some(
      article =>
        article.platforms.length !== KNOWN_PLATFORMS.length ||
        article.bodies['extension-desktop'] !== article.bodies.mobile
    );
}

export function articlesInSubcategory(
  articles: readonly HelpCenterArticle[],
  subcategoryId: string
): readonly HelpCenterArticle[] {
  return articles.filter(article => article.subcategory === subcategoryId);
}

/**
 * Counted, never stored. A main category's article total is a fact about the
 * articles filed under it, and a number kept beside the category would be free
 * to disagree with them the moment one article moved.
 */
export function articlesInMainCategory(
  articles: readonly HelpCenterArticle[],
  mainCategoryId: string
): readonly HelpCenterArticle[] {
  return articles.filter(article => article.mainCategory === mainCategoryId);
}

export function findArticle(
  articles: readonly HelpCenterArticle[],
  subcategoryId: string,
  articleId: string
): HelpCenterArticle | undefined {
  return articles.find(article => article.subcategory === subcategoryId && article.id === articleId);
}

function stripMarkdown(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:\d+\.|[-*+])\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A one-line summary for a card. Taken from the body rather than written,
 * because an article summary that is authored separately is one more thing that
 * can drift from the article.
 *
 * Prefers the first real paragraph. Several articles open with a callout or a
 * bare label like "**Steps:**", so a short lead is joined to the first list item
 * instead of being shown alone — "Steps:" is not a summary of anything.
 */
export function articleExcerpt(body: string, limit = 150): string {
  // An image line is not a sentence, and its alt text describes a picture
  // rather than summarising the article.
  const blocks = body
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(block => block !== '' && !/^!\[[^\]]*\]\([^)\s]*\)$/.test(block));

  const isQuote = (block: string) => block.trimStart().startsWith('>');
  const isList = (block: string) => /^\s*(?:\d+\.|[-*+])\s/.test(block);
  const plain = blocks.filter(block => !isQuote(block) && !isList(block));
  const lists = blocks.filter(isList);

  let text = plain.map(stripMarkdown).find(candidate => candidate.length >= 40) ?? '';

  if (!text) {
    const lead = plain[0] ? stripMarkdown(plain[0]) : '';
    const firstItem = lists[0] ? stripMarkdown((lists[0].split('\n')[0] ?? '')) : '';
    text = [lead, firstItem].filter(Boolean).join(' ');
  }
  if (!text) text = stripMarkdown(blocks.find(block => !isQuote(block)) ?? blocks[0] ?? '');
  if (text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[ ,.;:]+$/, '')}…`;
}
