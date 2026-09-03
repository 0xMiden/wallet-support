import { describe, expect, it } from 'vitest';

import { helpCenterMainCategories } from './categories';
import { articlesInMainCategory, helpCenterArticles } from './content';
import { POPULAR_SEARCHES } from './HelpCenterHome';
import { helpCenterDownloads } from './links';
import { searchHelpCenter } from './search';

describe('the home page promises', () => {
  it('offers only popular searches that actually find something', () => {
    // A suggested search is a promise the page makes on the reader's behalf.
    // These are written by hand and the articles are not, so nothing but a
    // test stops one of them from quietly starting to return nothing.
    for (const suggestion of POPULAR_SEARCHES) {
      const results = searchHelpCenter(
        helpCenterArticles,
        helpCenterMainCategories,
        suggestion,
        'extension-desktop'
      );
      expect(results.length, `"${suggestion}" found no articles`).toBeGreaterThan(0);
    }
  });

  it('gives every category card a description and somewhere to go', () => {
    for (const mainCategory of helpCenterMainCategories) {
      expect(mainCategory.description.length, mainCategory.id).toBeGreaterThan(0);
      // The card links to the first subcategory, because a main category is a
      // grouping rather than a route. One with none would be a dead card.
      expect(mainCategory.subcategories.length, mainCategory.id).toBeGreaterThan(0);
    }
  });

  it('shows a count on every card that adds up to the whole library', () => {
    // If an article is filed under a main category that no card represents,
    // the five counts stop summing and the article is unreachable from home.
    const counted = helpCenterMainCategories.reduce(
      (total, mainCategory) =>
        total + articlesInMainCategory(helpCenterArticles, mainCategory.id).length,
      0
    );

    expect(counted).toBe(helpCenterArticles.length);
  });

  it('counts each article under exactly one card', () => {
    for (const mainCategory of helpCenterMainCategories) {
      const counted = articlesInMainCategory(helpCenterArticles, mainCategory.id);
      for (const article of counted) expect(article.mainCategory).toBe(mainCategory.id);
    }
  });

  it('links to a download for each platform the articles name', () => {
    expect(helpCenterDownloads.map(download => download.id)).toEqual([
      'ios',
      'android',
      'extension'
    ]);

    // The footer must not be the one place a stale store link survives, so
    // every href here has to appear in the reviewed article content too.
    const content = helpCenterArticles
      .flatMap(article => Object.values(article.bodies))
      .join('\n');

    for (const download of helpCenterDownloads) {
      expect(content, download.id).toContain(download.href);
    }
  });
});
