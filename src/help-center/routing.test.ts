import { describe, expect, it } from 'vitest';

import { helpCenterAllArticles, helpCenterArticles, findArticle } from './content';
import {
  articleHref,
  categoryHref,
  defaultPlatform,
  homeHref,
  parsePlatform,
  parseRoute,
  parseSearchQuery,
  withSearchParams
} from './routing';
import type { HelpCenterRouteLookups } from './routing';

const lookups: HelpCenterRouteLookups = {
  hasCategory: categoryId => ['setup-and-basic-use', 'guardian-protection'].includes(categoryId),
  hasArticle: (categoryId, articleId) =>
    categoryId === 'setup-and-basic-use' && articleId === 'how-to-install-bread-wallet'
};

describe('parsing a route', () => {
  it('reads a bare subcategory', () => {
    expect(parseRoute('#guardian-protection', lookups)).toEqual({
      view: 'category',
      categoryId: 'guardian-protection'
    });
  });

  it('reads a subcategory and article', () => {
    expect(parseRoute('#setup-and-basic-use/how-to-install-bread-wallet', lookups)).toEqual({
      view: 'category',
      categoryId: 'setup-and-basic-use',
      articleId: 'how-to-install-bread-wallet'
    });
  });

  it('tolerates a leading slash', () => {
    expect(parseRoute('#/guardian-protection', lookups)).toEqual({
      view: 'category',
      categoryId: 'guardian-protection'
    });
  });

  it('sends an empty hash to the home page, not into the content', () => {
    // The bare URL is the product's front door. It used to open the first
    // subcategory, which left the Help Center with no address of its own.
    expect(parseRoute('', lookups)).toEqual({ view: 'home' });
    expect(parseRoute('#', lookups)).toEqual({ view: 'home' });
    expect(parseRoute('#/', lookups)).toEqual({ view: 'home' });
  });

  it('addresses the home page with a bare hash', () => {
    expect(parseRoute(homeHref(), lookups)).toEqual({ view: 'home' });
  });

  it('returns null for a hash that is not a route, so the page stays put', () => {
    // The skip link targets #help-center-content. Treating that as an unknown
    // category used to reset the reader to the first subcategory.
    expect(parseRoute('#help-center-content', lookups)).toBeNull();
    expect(parseRoute('#nonsense/whatever', lookups)).toBeNull();
  });

  it('opens the subcategory, not a guess, when the article is unknown', () => {
    expect(parseRoute('#setup-and-basic-use/nonsense', lookups)).toEqual({
      view: 'category',
      categoryId: 'setup-and-basic-use'
    });
  });

  it('refuses an article that belongs to a different subcategory', () => {
    // The article exists, but not here. Routing must not lift it into this one.
    expect(parseRoute('#guardian-protection/how-to-install-bread-wallet', lookups)).toEqual({
      view: 'category',
      categoryId: 'guardian-protection'
    });
  });

  it('ignores anything after a second slash', () => {
    expect(parseRoute('#setup-and-basic-use/how-to-install-bread-wallet/extra', lookups)).toEqual({
      view: 'category',
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
        findArticle(helpCenterArticles, categoryId, articleId) !== undefined
    };

    for (const article of helpCenterArticles) {
      const href = articleHref(article.subcategory, article.id);
      expect(parseRoute(href, real), href).toEqual({
        view: 'category',
        categoryId: article.subcategory,
        articleId: article.id
      });
    }
  });

  it('lands a held-back article link on its category rather than nowhere', () => {
    const real: HelpCenterRouteLookups = {
      hasCategory: categoryId => helpCenterArticles.some(article => article.subcategory === categoryId),
      hasArticle: (categoryId, articleId) =>
        findArticle(helpCenterArticles, categoryId, articleId) !== undefined
    };

    const held = helpCenterAllArticles.find(article => article.hidden === true);
    expect(held, 'expected a held-back article to exercise this path').toBeDefined();

    const article = held as (typeof helpCenterAllArticles)[number];
    const href = articleHref(article.subcategory, article.id);

    expect(parseRoute(href, real)).toEqual({ view: 'category', categoryId: article.subcategory });

    // Pinned to the flag rather than to absence: the same href resolves all the
    // way to the article once the lookup is allowed to see held-back ones, so
    // this cannot pass for a typo'd id the way the assertion above alone would.
    const everything: HelpCenterRouteLookups = {
      hasCategory: categoryId => helpCenterAllArticles.some(a => a.subcategory === categoryId),
      hasArticle: (categoryId, articleId) =>
        findArticle(helpCenterAllArticles, categoryId, articleId) !== undefined
    };
    expect(parseRoute(href, everything)).toEqual({
      view: 'category',
      categoryId: article.subcategory,
      articleId: article.id
    });
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
    expect(withSearchParams('', { platform: null })).toBe('');
    expect(withSearchParams('', { platform: 'mobile' })).toBe('?platform=mobile');
  });

  it('round-trips', () => {
    for (const platform of ['extension-desktop', 'mobile'] as const) {
      const written = withSearchParams('', {
        platform: platform === 'extension-desktop' ? null : platform
      });
      expect(parsePlatform(written) ?? 'extension-desktop').toBe(platform);
    }
  });

  it('defaults a touch device to Mobile rather than desktop instructions', () => {
    expect(defaultPlatform(true)).toBe('mobile');
    expect(defaultPlatform(false)).toBe('extension-desktop');
  });
});

describe('the search query in the URL', () => {
  it('reads and trims a query', () => {
    expect(parseSearchQuery('?q=recovery%20phrase')).toBe('recovery phrase');
    expect(parseSearchQuery('?q=%20guardian%20')).toBe('guardian');
  });

  it('reads nothing as an empty query rather than as a missing one', () => {
    expect(parseSearchQuery('')).toBe('');
    expect(parseSearchQuery('?platform=mobile')).toBe('');
  });

  it('round-trips through the writer', () => {
    const written = withSearchParams('', { q: 'recovery phrase' });
    expect(parseSearchQuery(written)).toBe('recovery phrase');
  });
});

describe('writing the query string', () => {
  it('keeps the parameters it was not asked to change', () => {
    // The whole point: choosing a platform must not discard the reader's
    // search, and searching must not discard their platform.
    expect(parseSearchQuery(withSearchParams('?q=guardian', { platform: 'mobile' }))).toBe(
      'guardian'
    );
    expect(parsePlatform(withSearchParams('?platform=mobile', { q: 'guardian' }))).toBe('mobile');
  });

  it('removes a parameter set to empty or null, so the default state is a bare URL', () => {
    expect(withSearchParams('?q=guardian', { q: '' })).toBe('');
    expect(withSearchParams('?q=guardian', { q: null })).toBe('');
    expect(withSearchParams('?q=guardian&platform=mobile', { q: null })).toBe('?platform=mobile');
  });

  it('leaves an unrelated parameter alone', () => {
    // The defect the merge writer was introduced for: choosing a platform
    // assigned a freshly built search string over the whole query string, so
    // anything else the reader arrived with went with it.
    expect(withSearchParams('?utm=x', { q: 'guardian' })).toBe('?utm=x&q=guardian');
    expect(withSearchParams('?utm=x', { platform: 'mobile' })).toBe('?utm=x&platform=mobile');
    expect(withSearchParams('?utm=x&ref=y', { platform: null })).toBe('?utm=x&ref=y');
  });

  it('replaces a parameter it already holds rather than repeating it', () => {
    expect(withSearchParams('?platform=mobile', { platform: 'extension-desktop' })).toBe(
      '?platform=extension-desktop'
    );
  });
});
