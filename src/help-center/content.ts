import { helpCenterMainCategories } from './categories';
import type { HelpCenterArticle, HelpCenterMainCategory, HelpCenterPlatform } from './types';

/**
 * Articles are Markdown files with frontmatter, migrated verbatim from
 * content-source/. Nothing here rewrites, trims, or summarises a body: the
 * only transformation the migration is permitted to make is dropping the
 * "[image removed]" placeholder lines, and content.test.ts proves it.
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
    bodies
  };
}

export function loadArticles(modules: Readonly<Record<string, string>>): readonly HelpCenterArticle[] {
  return Object.keys(modules)
    .sort()
    .map(path => parseArticle(modules[path] as string, path));
}

export const helpCenterArticles: readonly HelpCenterArticle[] = loadArticles(
  import.meta.glob<string>('./content/*.md', { query: '?raw', import: 'default', eager: true })
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
