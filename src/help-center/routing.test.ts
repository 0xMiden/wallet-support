import { describe, expect, it } from 'vitest';

import { helpCenterArticles, findArticle } from './content';
import {
  articleHref,
  categoryHref,
  defaultPlatform,
  parsePlatform,
  parseRoute,
  platformSearch
} from './routing';
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

  it('tolerates a leading slash, and sends an empty hash to the default', () => {
    expect(parseRoute('#/guardian-protection', lookups)).toEqual({ categoryId: 'guardian-protection' });
    expect(parseRoute('', lookups)).toEqual({ categoryId: 'setup-and-basic-use' });
    expect(parseRoute('#', lookups)).toEqual({ categoryId: 'setup-and-basic-use' });
  });

  it('returns null for a hash that is not a route, so the page stays put', () => {
    // The skip link targets #help-center-content. Treating that as an unknown
    // category used to reset the reader to the first subcategory.
    expect(parseRoute('#help-center-content', lookups)).toBeNull();
    expect(parseRoute('#nonsense/whatever', lookups)).toBeNull();
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

describe('the platform in the URL', () => {
  it('reads a platform the page understands', () => {
    expect(parsePlatform('?platform=mobile')).toBe('mobile');
    expect(parsePlatform('?platform=extension-desktop')).toBe('extension-desktop');
  });

  it('ignores anything else', () => {
    expect(parsePlatform('')).toBeNull();
    expect(parsePlatform('?platform=tablet')).toBeNull();
    expect(parsePlatform('?other=mobile')).toBeNull();
  });

  it('writes only the non-default platform, keeping the plain URL clean', () => {
    expect(platformSearch('extension-desktop')).toBe('');
    expect(platformSearch('mobile')).toBe('?platform=mobile');
  });

  it('round-trips', () => {
    for (const platform of ['extension-desktop', 'mobile'] as const) {
      expect(parsePlatform(platformSearch(platform)) ?? 'extension-desktop').toBe(platform);
    }
  });

  it('defaults a touch device to Mobile rather than desktop instructions', () => {
    expect(defaultPlatform(true)).toBe('mobile');
    expect(defaultPlatform(false)).toBe('extension-desktop');
  });
});
