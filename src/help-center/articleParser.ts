import type { HelpCenterArticle, HelpCenterPlatform } from './types';

/**
 * Parsing one article file, kept apart from content.ts so code that cannot use
 * Vite's import.meta.glob can read articles too: the build step that writes the
 * Ask assistant's article set (vite.config.ts) parses the same files the same
 * way the page does, so the two cannot disagree about what an article says.
 */

export const KNOWN_PLATFORMS: readonly HelpCenterPlatform[] = ['extension-desktop', 'mobile'];
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
