import { parseArticle } from './articleParser';
import { helpCenterMainCategories } from './categories';
import { articleHref } from './routing';
import type { HelpCenterPlatform } from './types';

/**
 * The article set the Ask assistant answers from, written into the build as
 * one JSON file (see the ask-corpus plugin in vite.config.ts) and read by the
 * Worker through its assets binding.
 *
 * It is built from the same Markdown files, by the same parser, as the pages a
 * reader opens, so the assistant cannot answer from text the Help Center no
 * longer shows. Hidden articles are left out for the same reason. The article
 * text is not rewritten; only image references are reduced to their alt text,
 * since the model cannot see the picture and the file name means nothing to it.
 */

export const ASK_CORPUS_FILE = 'ask-corpus.json';

export interface AskCorpusArticle {
  readonly id: string;
  readonly title: string;
  /** "Main category › Subcategory", so the model knows where the article sits. */
  readonly section: string;
  /** The article's address in the Help Center, e.g. "#security-and-recovery/how-do-i-…". */
  readonly href: string;
  readonly platforms: readonly HelpCenterPlatform[];
  readonly bodies: Readonly<Partial<Record<HelpCenterPlatform, string>>>;
}

export interface AskCorpus {
  readonly articles: readonly AskCorpusArticle[];
}

const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;

function withoutImages(body: string) {
  return body.replace(IMAGE, (_match, alt: string) => (alt.trim() ? `[Image: ${alt.trim()}]` : ''));
}

function sectionTitle(subcategoryId: string) {
  for (const main of helpCenterMainCategories) {
    const sub = main.subcategories.find(entry => entry.id === subcategoryId);
    if (sub) return `${main.title} › ${sub.title}`;
  }
  throw new Error(`Ask corpus: no category holds the subcategory "${subcategoryId}".`);
}

/** `modules` maps a file path to its raw Markdown, as import.meta.glob would. */
export function buildAskCorpus(modules: Readonly<Record<string, string>>): AskCorpus {
  const articles = Object.keys(modules)
    .sort()
    .map(path => parseArticle(modules[path] as string, path))
    .filter(article => article.hidden !== true)
    .map(article => {
      const bodies: Partial<Record<HelpCenterPlatform, string>> = {};
      for (const platform of article.platforms) {
        bodies[platform] = withoutImages(article.bodies[platform] as string);
      }
      return {
        id: article.id,
        title: article.title,
        section: sectionTitle(article.subcategory),
        href: articleHref(article.subcategory, article.id),
        platforms: article.platforms,
        bodies
      };
    });

  return { articles };
}
