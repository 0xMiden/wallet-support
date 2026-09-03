import { describe, expect, it } from 'vitest';

import { helpCenterArticles, findArticle } from './content';
import { articleHref, categoryHref, parseRoute } from './routing';
import type { HelpCenterRouteLookups } from './routing';

const lookups: HelpCenterRouteLookups = {
  hasCategory: categoryId => ['setup-and-basic-use', 'guardian-protection'].includes(categoryId),
  hasArticle: (categoryId, articleId) =>
    categoryId === 'setup-and-basic-use' && articleId === 'how-to-install-bread-wallet',
  fallbackCategoryId: 'setup-and-basic-use'
};

describe('parsing a route', () => {
  it('reads a bare subcategory', () => {
    expect(parseRoute('#guardian-protection', lookups)).toEqual({ categoryId: 'guardian-protection' });
  });

  it('reads a subcategory and article', () => {
    expect(parseRoute('#setup-and-basic-use/how-to-install-bread-wallet', lookups)).toEqual({
      categoryId: 'setup-and-basic-use',
      articleId: 'how-to-install-bread-wallet'
    });
  });

  it('tolerates a leading slash and an empty hash', () => {
    expect(parseRoute('#/guardian-protection', lookups)).toEqual({ categoryId: 'guardian-protection' });
    expect(parseRoute('', lookups)).toEqual({ categoryId: 'setup-and-basic-use' });
  });

  it('falls back to the default subcategory when the subcategory is unknown', () => {
    expect(parseRoute('#nonsense/whatever', lookups)).toEqual({ categoryId: 'setup-and-basic-use' });
  });

  it('opens the subcategory, not a guess, when the article is unknown', () => {
    expect(parseRoute('#setup-and-basic-use/nonsense', lookups)).toEqual({
      categoryId: 'setup-and-basic-use'
    });
  });

  it('refuses an article that belongs to a different subcategory', () => {
    // The article exists, but not here. Routing must not lift it into this one.
    expect(parseRoute('#guardian-protection/how-to-install-bread-wallet', lookups)).toEqual({
      categoryId: 'guardian-protection'
    });
  });

  it('ignores anything after a second slash', () => {
    expect(parseRoute('#setup-and-basic-use/how-to-install-bread-wallet/extra', lookups)).toEqual({
      categoryId: 'setup-and-basic-use',
      articleId: 'how-to-install-bread-wallet'
    });
  });
});

describe('building hrefs', () => {
  it('round-trips every shipped article through its own href', () => {
    const real: HelpCenterRouteLookups = {
      hasCategory: categoryId => helpCenterArticles.some(article => article.subcategory === categoryId),
      hasArticle: (categoryId, articleId) =>
        findArticle(helpCenterArticles, categoryId, articleId) !== undefined,
      fallbackCategoryId: 'setup-and-basic-use'
    };

    for (const article of helpCenterArticles) {
      const href = articleHref(article.subcategory, article.id);
      expect(parseRoute(href, real), href).toEqual({
        categoryId: article.subcategory,
        articleId: article.id
      });
    }
  });

  it('builds a subcategory href', () => {
    expect(categoryHref('guardian-protection')).toBe('#guardian-protection');
  });
});
