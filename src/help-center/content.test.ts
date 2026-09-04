import { describe, expect, it } from 'vitest';

import extensionSource from '../../content-source/extension.md?raw';
import mobileSource from '../../content-source/mobile.md?raw';

import { helpCenterMainCategories } from './categories';
import {
  articleExcerpt,
  articlesFor,
  articlesInSubcategory,
  findArticle,
  coverageReport,
  coverageWarnings,
  helpCenterArticles,
  loadArticles,
  parseArticle,
  subcategoryNeedsPlatformChoice,
  validationErrors
} from './content';
import type { HelpCenterArticle, HelpCenterPlatform } from './types';

const SHARED = `---
id: what-is-guardian
title: What is Guardian?
mainCategory: guardian
subcategory: guardian-protection
platforms: [extension-desktop, mobile]
---

Guardian is a recovery and backup layer.
`;

const VARIANT = `---
id: how-to-install
title: How to install Bread Wallet
mainCategory: getting-started
subcategory: setup-and-basic-use
platforms: [extension-desktop, mobile]
---

<!-- platform: extension-desktop -->

Click "Add to Chrome".

<!-- platform: mobile -->

Tap "Get" in the App Store.
`;

describe('parsing an article', () => {
  it('gives every declared platform the shared body when there are no markers', () => {
    const article = parseArticle(SHARED, 'shared.md');
    expect(article.id).toBe('what-is-guardian');
    expect(article.platforms).toEqual(['extension-desktop', 'mobile']);
    expect(article.bodies['extension-desktop']).toBe('Guardian is a recovery and backup layer.');
    expect(article.bodies['extension-desktop']).toBe(article.bodies.mobile);
  });

  it('keeps each platform body separate when markers are present', () => {
    const article = parseArticle(VARIANT, 'variant.md');
    expect(article.bodies['extension-desktop']).toBe('Click "Add to Chrome".');
    expect(article.bodies.mobile).toBe('Tap "Get" in the App Store.');
  });

  it('refuses an article with no frontmatter', () => {
    expect(() => parseArticle('Just a body.', 'bare.md')).toThrow(/missing a frontmatter block/);
  });

  it('refuses an article missing a required field', () => {
    const missing = SHARED.replace('title: What is Guardian?\n', '');
    expect(() => parseArticle(missing, 'missing.md')).toThrow(/missing "title"/);
  });

  it('refuses an unknown platform', () => {
    const bad = SHARED.replace('[extension-desktop, mobile]', '[extension-desktop, tablet]');
    expect(() => parseArticle(bad, 'bad.md')).toThrow(/unknown platform "tablet"/);
  });

  it('refuses a declared platform with no body', () => {
    const empty = VARIANT.replace('Tap "Get" in the App Store.\n', '');
    expect(() => parseArticle(empty, 'empty.md')).toThrow(/no body for it/);
  });

  it('refuses a section for a platform it does not declare', () => {
    const undeclared = VARIANT.replace('[extension-desktop, mobile]', '[extension-desktop]');
    expect(() => parseArticle(undeclared, 'undeclared.md')).toThrow(/does not declare that platform/);
  });

  it('refuses body text before the first platform marker', () => {
    const stray = VARIANT.replace('---\n\n<!--', '---\n\nStray text.\n\n<!--');
    expect(() => parseArticle(stray, 'stray.md')).toThrow(/body text before its first platform marker/);
  });

  it('loads a set of articles in a stable order', () => {
    const articles = loadArticles({ './content/b.md': SHARED, './content/a.md': VARIANT });
    expect(articles.map(article => article.id)).toEqual(['how-to-install', 'what-is-guardian']);
  });
});

describe('validating articles against the hierarchy', () => {
  const base = parseArticle(SHARED, 'base.md');

  it('accepts an article whose subcategory exists under the right main category', () => {
    expect(validationErrors([base])).toEqual([]);
  });

  it('rejects a subcategory that does not exist — the Oxford-comma class of mistake', () => {
    const wrong: HelpCenterArticle = { ...base, subcategory: 'sending-receiving-and-claiming-typo' };
    expect(validationErrors([wrong])[0]).toMatch(/does not exist/);
  });

  it('rejects an article filed under the wrong main category', () => {
    const wrong: HelpCenterArticle = { ...base, mainCategory: 'privacy' };
    expect(validationErrors([wrong])[0]).toMatch(/belongs to "guardian", not "privacy"/);
  });

  it('rejects duplicate ids and duplicate titles', () => {
    const errors = validationErrors([base, base]);
    expect(errors.some(error => /Duplicate article id/.test(error))).toBe(true);
    expect(errors.some(error => /Duplicate article title/.test(error))).toBe(true);
  });

  it('reports no errors for the shipped article set', () => {
    expect(validationErrors(helpCenterArticles)).toEqual([]);
  });
});

describe('coverage', () => {
  it('reports one row per subcategory per platform', () => {
    const subcategories = helpCenterMainCategories.reduce(
      (total, mainCategory) => total + mainCategory.subcategories.length,
      0
    );
    expect(coverageReport(helpCenterArticles)).toHaveLength(subcategories * 2);
  });

  it('warns about an empty subcategory instead of failing', () => {
    const rows = coverageReport([]);
    expect(coverageWarnings(rows)).toHaveLength(rows.length);
    expect(coverageWarnings(rows)[0]).toMatch(/^No articles for /);
  });

  it('counts only articles that declare the platform', () => {
    const extensionOnly: HelpCenterArticle = {
      ...parseArticle(SHARED, 'ext.md'),
      platforms: ['extension-desktop'],
      bodies: { 'extension-desktop': 'Extension only.' }
    };
    expect(articlesFor([extensionOnly], 'guardian-protection', 'extension-desktop')).toHaveLength(1);
    expect(articlesFor([extensionOnly], 'guardian-protection', 'mobile')).toHaveLength(0);
  });
});

/**
 * Fidelity. content-source/ is parsed here by a parser written for this test
 * alone, deliberately independent of whatever produced the article files, so
 * this compares two derivations of the same text rather than checking a
 * round-trip against itself.
 *
 * The only transformation the migration may make is dropping "[image removed]"
 * placeholder lines. Blank-line runs and trailing spaces are normalised on both
 * sides equally, so that forgives layout noise without forgiving content.
 */
const SOURCE_TEXT: Readonly<Record<HelpCenterPlatform, string>> = {
  'extension-desktop': extensionSource,
  mobile: mobileSource
};

function readSource(platform: HelpCenterPlatform): ReadonlyMap<string, string> {
  const text = SOURCE_TEXT[platform];

  const articles = new Map<string, string>();
  let title: string | null = null;
  let buffer: string[] = [];

  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) {
      if (title !== null) articles.set(title, buffer.join('\n'));
      title = line.slice(4).trim();
      buffer = [];
      continue;
    }
    if (line.startsWith('## ')) continue;
    if (title !== null) buffer.push(line);
  }
  if (title !== null) articles.set(title, buffer.join('\n'));
  return articles;
}

function normalise(text: string) {
  return text
    .split('\n')
    .filter(line => line.trim() !== '[image removed]')
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

describe('fidelity to content-source', () => {
  const sources = {
    'extension-desktop': readSource('extension-desktop'),
    mobile: readSource('mobile')
  } as const;

  it('reads the expected article counts out of content-source', () => {
    expect(sources['extension-desktop'].size).toBe(23);
    expect(sources.mobile.size).toBe(21);
  });

  it('carries every migrated body verbatim, image placeholders aside', () => {
    for (const article of helpCenterArticles) {
      for (const platform of article.platforms) {
        const expected = sources[platform].get(article.title);
        expect(expected, `${article.id}: "${article.title}" is not on the ${platform} source page`).toBeDefined();
        expect(normalise(article.bodies[platform] ?? ''), `${article.id} (${platform}) diverges from source`).toBe(
          normalise(expected as string)
        );
      }
    }
  });

  it('declares a platform only where the source page carries the title', () => {
    for (const article of helpCenterArticles) {
      for (const platform of ['extension-desktop', 'mobile'] as const) {
        expect(
          article.platforms.includes(platform),
          `${article.id}: platform declaration disagrees with the ${platform} source page`
        ).toBe(sources[platform].has(article.title));
      }
    }
  });
});

/**
 * The coverage report the proposal asks to run with the suite. An empty
 * subcategory is warned about and never fatal; only malformed data fails, and
 * validationErrors() above is what enforces that.
 */
describe('the migrated article set', () => {
  it('carries every article in the approved mapping', () => {
    expect(helpCenterArticles).toHaveLength(23);
    expect(helpCenterArticles.filter(a => a.platforms.includes('extension-desktop'))).toHaveLength(23);
    expect(helpCenterArticles.filter(a => a.platforms.includes('mobile'))).toHaveLength(21);
  });

  it('splits bodies exactly where the source pages diverge', () => {
    const variants = helpCenterArticles.filter(
      article =>
        article.platforms.length === 2 &&
        article.bodies['extension-desktop'] !== article.bodies.mobile
    );
    expect(variants.map(article => article.id).sort()).toEqual(
      [
        'how-do-i-create-a-bread-wallet',
        'how-do-i-restore-my-wallet-with-a-recovery-phrase',
        'how-to-find-a-token-contract-address-in-bread-wallet',
        'how-to-fund-your-bread-wallet',
        'how-to-install-bread-wallet',
        'is-bread-wallet-available-on-mobile'
      ].sort()
    );
  });

  it('keeps no image placeholders in migrated bodies', () => {
    for (const article of helpCenterArticles) {
      for (const platform of article.platforms) {
        expect(article.bodies[platform], `${article.id} (${platform})`).not.toContain('[image removed]');
      }
    }
  });

  it('prints the coverage report and warns on empty subcategories', () => {
    const rows = coverageReport(helpCenterArticles);
    const warnings = coverageWarnings(rows);

    const lines = rows.map(
      row => `  ${String(row.count).padStart(2)}  ${row.platform.padEnd(18)} ${row.mainCategory} › ${row.subcategory}`
    );
    console.info(['', 'Help Center coverage (articles per subcategory per platform):', ...lines].join('\n'));
    if (warnings.length > 0) {
      console.warn(['', `Coverage warnings (${warnings.length}) — empty is a visible state, not a failure:`,
        ...warnings.map(warning => `  ! ${warning}`)].join('\n'));
    }

    // Warnings never fail the suite. Malformed data does, via validationErrors().
    expect(validationErrors(helpCenterArticles)).toEqual([]);
  });
});

/**
 * Replaces the old category-level "zero or two platforms" rule. Platform
 * applicability is no longer stored beside the categories, so the checks are
 * that each article declares a sound platform set and that tab visibility is
 * computed from those articles rather than written down somewhere.
 */
describe('platform applicability', () => {
  it('gives every article a valid platform set', () => {
    for (const article of helpCenterArticles) {
      expect(article.platforms.length, `${article.id} declares no platform`).toBeGreaterThan(0);
      expect(new Set(article.platforms).size, `${article.id} repeats a platform`).toBe(
        article.platforms.length
      );
      for (const platform of article.platforms) {
        expect(['extension-desktop', 'mobile']).toContain(platform);
      }
      expect(Object.keys(article.bodies).sort()).toEqual([...article.platforms].sort());
    }
  });

  it('derives which subcategories offer a platform choice', () => {
    const needsChoice = helpCenterMainCategories
      .flatMap(mainCategory => mainCategory.subcategories)
      .filter(subcategory => subcategoryNeedsPlatformChoice(helpCenterArticles, subcategory.id))
      .map(subcategory => subcategory.id);

    expect(needsChoice).toEqual(['setup-and-basic-use', 'security-and-recovery']);
  });

  it('answers from the articles, not from a stored flag', () => {
    const shared = parseArticle(SHARED, 'shared.md');
    expect(subcategoryNeedsPlatformChoice([shared], 'guardian-protection')).toBe(false);

    const variant: HelpCenterArticle = {
      ...shared,
      id: 'variant',
      bodies: { 'extension-desktop': 'Click.', mobile: 'Tap.' }
    };
    expect(subcategoryNeedsPlatformChoice([shared, variant], 'guardian-protection')).toBe(true);

    const extensionOnly: HelpCenterArticle = {
      ...shared,
      id: 'extension-only',
      platforms: ['extension-desktop'],
      bodies: { 'extension-desktop': 'Extension only.' }
    };
    expect(subcategoryNeedsPlatformChoice([shared, extensionOnly], 'guardian-protection')).toBe(true);
  });

  it('reports no choice for a subcategory with no articles at all', () => {
    expect(subcategoryNeedsPlatformChoice([], 'sending-receiving-and-claiming')).toBe(false);
  });
});

describe('card excerpts', () => {
  it('uses the first real paragraph', () => {
    expect(articleExcerpt('Guardian is a recovery layer for private accounts and it protects you.')).toBe(
      'Guardian is a recovery layer for private accounts and it protects you.'
    );
  });

  it('skips a leading callout', () => {
    const body = '> Caution: only use official links.\n\nThis paragraph is the one a reader wants to see.';
    expect(articleExcerpt(body)).toBe('This paragraph is the one a reader wants to see.');
  });

  it('joins a short label to the first list item rather than showing the label alone', () => {
    // Several articles open with a bare "**Steps:**", which summarises nothing.
    const body = '**Steps:**\n\n1. From the homepage, select the token you want to view.';
    expect(articleExcerpt(body)).toBe('Steps: From the homepage, select the token you want to view.');
  });

  it('strips bold, italic and link syntax but keeps the words', () => {
    const body = 'Report it to our [**SUPPORT**](https://example.com/) desk and wait *a little* longer.';
    expect(articleExcerpt(body)).toBe('Report it to our SUPPORT desk and wait a little longer.');
  });

  it('truncates on a word boundary with an ellipsis', () => {
    const excerpt = articleExcerpt('word '.repeat(60), 40);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(41);
    expect(excerpt).not.toMatch(/\s…$/);
  });

  it('gives every shipped article a usable excerpt', () => {
    for (const article of helpCenterArticles) {
      for (const platform of article.platforms) {
        const excerpt = articleExcerpt(article.bodies[platform] as string);
        expect(excerpt.length, `${article.id} (${platform}) excerpt too short`).toBeGreaterThan(20);
        expect(excerpt, `${article.id} (${platform}) leaked markdown`).not.toMatch(/\*\*|\]\(|^>/);
      }
    }
  });
});

describe('finding articles', () => {
  it('lists every article in a subcategory regardless of platform', () => {
    expect(articlesInSubcategory(helpCenterArticles, 'security-and-recovery')).toHaveLength(7);
  });

  it('finds an article only inside its own subcategory', () => {
    expect(findArticle(helpCenterArticles, 'setup-and-basic-use', 'how-to-install-bread-wallet')).toBeDefined();
    expect(findArticle(helpCenterArticles, 'guardian-protection', 'how-to-install-bread-wallet')).toBeUndefined();
  });
});

describe('the product name', () => {
  /*
   * Case-insensitive on purpose. The first version of this matched
   * /Bread\s+wallet/ — a capital B — so it caught "Bread wallet" and sailed
   * straight past "bread wallet". A guard that only finds the mistake you
   * happened to make first is not a guard.
   *
   * The hyphenated form is a different thing: store URLs, the Android package
   * id and the article ids all contain "bread-wallet" and must not change. The
   * space in the pattern is what keeps them out.
   */
  const NAMED = /bread[ \u00a0]+wallet/gi;
  const CORRECT = 'Bread Wallet';

  function misspellings(text: string) {
    return (text.match(NAMED) ?? []).filter(match => match !== CORRECT);
  }

  it('is spelled "Bread Wallet" in every article title and body', () => {
    for (const article of helpCenterArticles) {
      expect(misspellings(article.title), `${article.id} title`).toEqual([]);

      for (const platform of article.platforms) {
        const body = article.bodies[platform] as string;
        expect(misspellings(body), `${article.id} (${platform})`).toEqual([]);
      }
    }
  });

  it('is spelled "Bread Wallet" in the interface too, not only the articles', () => {
    // The article check above cannot see the home page's lede: it reads
    // helpCenterArticles, and the interface's own copy lives in the components.
    // "Uniform to all" has to mean both.
    const components = import.meta.glob<string>('./*.tsx', {
      query: '?raw',
      import: 'default',
      eager: true
    });

    expect(Object.keys(components).length).toBeGreaterThan(0);

    for (const [file, source] of Object.entries(components)) {
      expect(misspellings(source), file).toEqual([]);
    }
  });
});
