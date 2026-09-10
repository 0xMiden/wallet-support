import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import extensionSource from '../../content-source/extension.md?raw';
import mobileSource from '../../content-source/mobile.md?raw';
import faqSource from '../../tasks/faq/bread-faq-content.md?raw';

import { helpCenterMainCategories } from './categories';
import {
  articleExcerpt,
  articlesFor,
  articlesInSubcategory,
  findArticle,
  coverageReport,
  coverageWarnings,
  helpCenterAllArticles,
  helpCenterArticleImages,
  helpCenterArticles,
  loadArticles,
  parseArticle,
  subcategoryNeedsPlatformChoice,
  validationErrors
} from './content';
import { createHelpCenterNavigation } from './navigation';
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

  it('leaves an article published when it says nothing about being hidden', () => {
    expect(parseArticle(SHARED, 'shared.md').hidden).toBeUndefined();
  });

  it('reads a hidden article and the reason it is held back', () => {
    const article = parseArticle(
      SHARED.replace(
        'platforms: [extension-desktop, mobile]',
        'platforms: [extension-desktop, mobile]\nhidden: true\nhiddenReason: The flow is not in the wallet UI.'
      ),
      'hidden.md'
    );
    expect(article.hidden).toBe(true);
    expect(article.hiddenReason).toBe('The flow is not in the wallet UI.');
  });

  it('refuses to hide an article without saying why', () => {
    expect(() =>
      parseArticle(
        SHARED.replace('platforms: [extension-desktop, mobile]', 'platforms: [extension-desktop, mobile]\nhidden: true'),
        'unexplained.md'
      )
    ).toThrow(/is hidden but gives no "hiddenReason"/);
  });

  it('refuses a hidden flag that is not true or false', () => {
    expect(() =>
      parseArticle(
        SHARED.replace('platforms: [extension-desktop, mobile]', 'platforms: [extension-desktop, mobile]\nhidden: yes'),
        'bad-flag.md'
      )
    ).toThrow(/"hidden" must be true or false/);
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
    expect(validationErrors(helpCenterAllArticles)).toEqual([]);
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

  /*
   * The totals, written down rather than derived, so adding a category or an
   * article is a decision this file has to be told about.
   */
  it('spans 6 main categories, 9 subcategories and 40 articles', () => {
    const navigation = createHelpCenterNavigation(helpCenterMainCategories);
    expect(navigation.mainCategories).toHaveLength(6);
    expect(navigation.categories).toHaveLength(9);
    expect(helpCenterAllArticles).toHaveLength(40);
  });

  it('resolves every article to exactly one position, through navigation.ts', () => {
    // The position the pages show: main category, subcategory within it, and
    // article within that. navigation.ts owns the first two; the third is the
    // article's place in its subcategory's listing.
    const navigation = createHelpCenterNavigation(helpCenterMainCategories);
    const taken = new Map<string, string>();

    for (const article of helpCenterAllArticles) {
      const entry = navigation.resolve(article.subcategory);
      expect(entry, `${article.id}: "${article.subcategory}" is not a category`).toBeDefined();
      expect(entry?.mainCategory.id, `${article.id}: filed under the wrong main category`).toBe(
        article.mainCategory
      );

      const listedUnder = navigation.categories.filter(category =>
        articlesInSubcategory(helpCenterAllArticles, category.id).some(candidate => candidate.id === article.id)
      );
      expect(listedUnder.map(category => category.id), article.id).toEqual([article.subcategory]);

      const siblings = articlesInSubcategory(helpCenterAllArticles, article.subcategory);
      expect(siblings.filter(candidate => candidate.id === article.id), article.id).toHaveLength(1);

      const position = `${entry?.mainCategoryIndex}.${entry?.localIndex}.${siblings.indexOf(article) + 1}`;
      expect(taken.get(position), `${article.id} shares position ${position}`).toBeUndefined();
      taken.set(position, article.id);
    }

    expect(taken.size).toBe(40);
  });

  it('keeps Activity and transaction status in the hierarchy, with no FAQ article added', () => {
    // The FAQ files nothing here. It holds the one article filed before the FAQ.
    const navigation = createHelpCenterNavigation(helpCenterMainCategories);
    expect(navigation.has('activity-and-transaction-status')).toBe(true);
    expect(
      articlesInSubcategory(helpCenterAllArticles, 'activity-and-transaction-status').map(article => article.id)
    ).toEqual(['what-is-delegate-proof-generation']);
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

/**
 * The approved FAQ, read by a parser of its own for the reason content-source
 * is: two derivations of one text, not a round trip through the migration.
 * The file holds a placement table, then one section per article — a numbered
 * title, a Category line, a blank line and the body.
 */
interface FaqEntry {
  readonly number: number;
  readonly title: string;
  readonly mainCategory: string;
  readonly subcategory: string;
  readonly body: string;
}

function readFaq(text: string) {
  const [head = '', articles = ''] = text.split('\n## Articles\n');

  const placement = [...head.matchAll(/^\| (\d+) \| (.+?) \| (.+?) \| (.+?) \|$/gm)].map(row => ({
    number: Number(row[1]),
    title: row[2] as string,
    mainCategory: row[3] as string,
    subcategory: row[4] as string
  }));

  const entries: readonly FaqEntry[] = articles
    .split(/\n(?=### \d+\. )/)
    .slice(1)
    .map(section => {
      const match = /^### (\d+)\. (.+)\nCategory: (.+) › (.+)\n\n([\s\S]+?)\n*$/.exec(section);
      if (!match) throw new Error(`Cannot read the FAQ section starting "${section.slice(0, 60)}".`);
      return {
        number: Number(match[1]),
        title: match[2] as string,
        mainCategory: match[3] as string,
        subcategory: match[4] as string,
        body: match[5] as string
      };
    });

  return { placement, entries };
}

const FAQ = readFaq(faqSource);
const FAQ_TITLES: ReadonlySet<string> = new Set(FAQ.entries.map(entry => entry.title));

describe('fidelity to content-source', () => {
  const sources = {
    'extension-desktop': readSource('extension-desktop'),
    mobile: readSource('mobile')
  } as const;

  // The FAQ articles have a source of their own and are held to it below.
  // Every other article is held to content-source here, and "draws every
  // article from exactly one approved source" stops one escaping both checks.
  const migrated = helpCenterAllArticles.filter(article => !FAQ_TITLES.has(article.title));

  it('reads the expected article counts out of content-source', () => {
    expect(sources['extension-desktop'].size).toBe(23);
    expect(sources.mobile.size).toBe(21);
  });

  it('carries every migrated body verbatim, image placeholders aside', () => {
    expect(migrated).toHaveLength(23);
    for (const article of migrated) {
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
    for (const article of migrated) {
      for (const platform of ['extension-desktop', 'mobile'] as const) {
        expect(
          article.platforms.includes(platform),
          `${article.id}: platform declaration disagrees with the ${platform} source page`
        ).toBe(sources[platform].has(article.title));
      }
    }
  });
});

describe('article sources', () => {
  it('draws every article from exactly one approved source', () => {
    const pages = new Set([...readSource('extension-desktop').keys(), ...readSource('mobile').keys()]);

    for (const article of helpCenterAllArticles) {
      const sources = [
        ...(pages.has(article.title) ? ['content-source'] : []),
        ...(FAQ_TITLES.has(article.title) ? ['tasks/faq'] : [])
      ];
      expect(sources, `${article.id}: "${article.title}"`).toHaveLength(1);
    }

    expect(helpCenterAllArticles.filter(article => pages.has(article.title))).toHaveLength(23);
    expect(helpCenterAllArticles.filter(article => FAQ_TITLES.has(article.title))).toHaveLength(17);
  });
});

/**
 * Fidelity to the approved FAQ, and stricter than the check above: nothing is
 * normalised. Once link and image markup is taken back out, each body equals
 * its section of tasks/faq/bread-faq-content.md byte for byte. The migration
 * may do exactly two things — wrap a referenced title in a link to the article
 * it names, and give an image its alt text — and the tests after the
 * comparison hold it to those two.
 */
function withoutMigrationMarkup(body: string) {
  return body
    .replace(/\[([^\]]+)\]\(#[^)\s]+\)/g, '$1')
    .replace(/^!\[[^\]]*\]\(([^)\s]+)\)$/gm, '![]($1)');
}

/** Written out by hand from the placement table: FAQ numbers, in reading order. */
const FAQ_PLACEMENT: Readonly<Record<string, readonly number[]>> = {
  'setup-and-basic-use': [1],
  'security-and-recovery': [10, 11, 12],
  'public-and-private-transactions': [9],
  'guardian-protection': [2, 3, 4, 5, 6, 7, 8],
  'moving-across-chains': [13, 14, 15],
  earn: [16, 17]
};

/** Alt text for each image, taken from the heading drawn inside it. */
const FAQ_IMAGE_ALT: Readonly<Record<string, string>> = {
  'guardian-backed-or-more-private.png': 'Guardian-backed, or more private',
  'three-keys-always-in-control.png': 'Three keys, always in control',
  'private-from-other-users.png': 'Private from other users',
  'across-chains-two-routes.png': 'Across chains, two routes',
  'earn-across-the-privacy-line.png': 'Earn across the privacy line'
};

describe('fidelity to the FAQ', () => {
  const navigation = createHelpCenterNavigation(helpCenterMainCategories);
  const byTitle = new Map(helpCenterAllArticles.map(article => [article.title, article]));
  const faqArticle = (entry: FaqEntry) => {
    const article = byTitle.get(entry.title);
    if (!article) throw new Error(`FAQ ${entry.number}: no article is titled "${entry.title}".`);
    return article;
  };

  it('reads seventeen articles, numbered in order, that agree with the placement table', () => {
    expect(FAQ.entries.map(entry => entry.number)).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
    expect(FAQ.placement).toEqual(
      FAQ.entries.map(({ number, title, mainCategory, subcategory }) => ({ number, title, mainCategory, subcategory }))
    );
  });

  it('carries all seventeen titles and bodies byte for byte, link and image markup aside', () => {
    // The title is matched exactly by the lookup, so a changed character in
    // one fails here as a missing article.
    for (const entry of FAQ.entries) {
      const article = faqArticle(entry);
      for (const platform of article.platforms) {
        expect(withoutMigrationMarkup(article.bodies[platform] ?? ''), `${article.id} (${platform})`).toBe(
          entry.body
        );
      }
    }
  });

  it('gives every FAQ article both platforms and one body, with no platform sections', () => {
    const files = import.meta.glob<string>('./content/*.md', { query: '?raw', import: 'default', eager: true });

    for (const entry of FAQ.entries) {
      const article = faqArticle(entry);
      expect(article.platforms, article.id).toEqual(['extension-desktop', 'mobile']);
      expect(article.bodies.mobile, article.id).toBe(article.bodies['extension-desktop']);

      const file = Object.values(files).filter(source => source.includes(`\nid: ${article.id}\n`));
      expect(file, article.id).toHaveLength(1);
      expect(file[0], article.id).not.toMatch(/<!--\s*platform:/);
    }
  });

  it('files each FAQ article where the placement table says, through navigation.ts', () => {
    for (const row of FAQ.placement) {
      const article = byTitle.get(row.title) as HelpCenterArticle;
      const entry = navigation.resolve(article.subcategory);
      expect(entry?.mainCategory.title, article.id).toBe(row.mainCategory);
      expect(entry?.category.title, article.id).toBe(row.subcategory);
      expect(article.mainCategory, article.id).toBe(entry?.mainCategory.id);
    }
  });

  it('appends FAQ articles after the existing ones in each subcategory, in FAQ order', () => {
    const numberOf = new Map(FAQ.entries.map(entry => [entry.title, entry.number]));

    for (const category of navigation.categories) {
      const listed = articlesInSubcategory(helpCenterAllArticles, category.id);
      const firstFaq = listed.findIndex(article => numberOf.has(article.title));
      const tail = firstFaq === -1 ? [] : listed.slice(firstFaq);

      // An existing article after the first FAQ one shows up here as undefined.
      expect(tail.map(article => numberOf.get(article.title)), category.id).toEqual(
        FAQ_PLACEMENT[category.id] ?? []
      );
    }

    expect(articlesInSubcategory(helpCenterAllArticles, 'moving-across-chains')).toHaveLength(3);
    expect(articlesInSubcategory(helpCenterAllArticles, 'earn')).toHaveLength(2);
  });

  it('links each referenced title to the published article it names, or leaves it italic', () => {
    // A title in italics is a reference. One that names a published article is
    // a link to it; one that names nothing stays plain italic and is collected
    // here, so it is reported rather than shipped quietly as emphasis.
    const REFERENCE = /(\[)?(?<!\*)\*([^*]+)\*(?!\*)(?:\]\(#([a-z0-9-]+)\/([a-z0-9-]+)\))?/g;
    const unresolved: string[] = [];
    let linked = 0;

    for (const entry of FAQ.entries) {
      const article = faqArticle(entry);

      for (const match of (article.bodies['extension-desktop'] as string).matchAll(REFERENCE)) {
        const title = match[2] as string;
        const target = helpCenterArticles.find(candidate => candidate.title === title);

        if (!target) {
          expect(match[1] ?? match[3], `${article.id}: "${title}" names no article but is linked`).toBeUndefined();
          unresolved.push(`${article.id}: ${title}`);
          continue;
        }

        expect([match[1], match[3], match[4]], `${article.id}: "${title}"`).toEqual([
          '[',
          target.subcategory,
          target.id
        ]);
        linked += 1;
      }
    }

    expect(unresolved).toEqual([]);
    expect(linked).toBe(25);
  });

  it('points every internal link at a published article, labelled with its title', () => {
    for (const article of helpCenterAllArticles) {
      for (const platform of article.platforms) {
        for (const match of (article.bodies[platform] as string).matchAll(/\[([^\]]+)\]\(#([^)]*)\)/g)) {
          const [subcategory = '', id = ''] = (match[2] as string).split('/');
          const target = findArticle(helpCenterArticles, subcategory, id);
          expect(target, `${article.id} (${platform}): #${match[2]} is not a published article`).toBeDefined();
          expect(match[1], `${article.id} (${platform}): link label`).toBe(`*${target?.title}*`);
        }
      }
    }
  });

  it('shows each image where the FAQ places it, with its heading as alt text', () => {
    const shown = helpCenterAllArticles.flatMap(article =>
      [...(article.bodies['extension-desktop'] ?? '').matchAll(/^!\[([^\]]*)\]\(([^)\s]+)\)$/gm)].map(
        match => [match[2] as string, match[1] as string] as const
      )
    );

    expect(shown).toHaveLength(5);
    expect(Object.fromEntries(shown)).toEqual(FAQ_IMAGE_ALT);
    expect([...faqSource.matchAll(/^!\[\]\(([^)\s]+)\)$/gm)].map(match => match[1]).sort()).toEqual(
      Object.keys(FAQ_IMAGE_ALT).sort()
    );
  });

  it('ships each image exactly as delivered, at the size its own header gives', () => {
    const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
    const deliveredDir = join(repoRoot, 'tasks/faq/faq-images');
    const shippedDir = join(repoRoot, 'src/help-center/assets/faq');
    const delivered = [...readdirSync(deliveredDir)].sort();

    expect(delivered).toEqual(Object.keys(FAQ_IMAGE_ALT).sort());
    expect([...readdirSync(shippedDir)].sort()).toEqual(delivered);
    expect(Object.keys(helpCenterArticleImages).sort()).toEqual(delivered);

    for (const name of delivered) {
      const original = readFileSync(join(deliveredDir, name));
      const shipped = readFileSync(join(shippedDir, name));
      expect(
        shipped.length === original.length && shipped.every((byte, index) => byte === original[index]),
        `${name} differs from the delivered file`
      ).toBe(true);

      // A PNG's IHDR chunk: width and height, big-endian, at bytes 16 and 20.
      const header = new DataView(original.buffer, original.byteOffset, original.byteLength);
      expect(String.fromCharCode(...original.subarray(12, 16)), name).toBe('IHDR');
      expect([header.getUint32(16), header.getUint32(20)], name).toEqual([
        helpCenterArticleImages[name]?.width,
        helpCenterArticleImages[name]?.height
      ]);
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
    expect(helpCenterAllArticles).toHaveLength(40);
    expect(helpCenterAllArticles.filter(a => a.platforms.includes('extension-desktop'))).toHaveLength(40);
    expect(helpCenterAllArticles.filter(a => a.platforms.includes('mobile'))).toHaveLength(38);
  });

  it('publishes every article except the ones held back', () => {
    expect(helpCenterArticles).toHaveLength(39);
    expect(helpCenterArticles.map(article => article.id)).not.toContain(
      'how-to-restore-the-wallet-using-an-encrypted-file'
    );
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

  it('passes over an image, which is not a sentence, and leaves no mark of it', () => {
    const body =
      '![Three keys, always in control](keys.png)\n\nEvery action needs two of the three keys, so no single key moves funds.';
    expect(articleExcerpt(body)).toBe('Every action needs two of the three keys, so no single key moves funds.');
    expect(articleExcerpt('Short lead:\n\n![Keys](keys.png)\n\n- A first list item that follows the image.')).toBe(
      'Short lead: A first list item that follows the image.'
    );
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
  it('lists every published article in a subcategory regardless of platform', () => {
    expect(articlesInSubcategory(helpCenterArticles, 'security-and-recovery')).toHaveLength(9);
  });

  it('keeps the held-back article out of its subcategory listing', () => {
    expect(articlesInSubcategory(helpCenterAllArticles, 'security-and-recovery')).toHaveLength(10);
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

  it('is spelled "Bread Wallet" in the glossary too', () => {
    // The glossary is data in a .ts file, so neither check above can see it: one
    // reads the articles, the other only the components. Read as raw source for
    // the reason the components are, so a field added later is covered without
    // this test having to name it.
    const glossary = import.meta.glob<string>('./glossary.ts', {
      query: '?raw',
      import: 'default',
      eager: true
    });

    expect(Object.keys(glossary), 'glossary.ts was moved or renamed').toEqual(['./glossary.ts']);

    for (const [file, source] of Object.entries(glossary)) {
      expect(misspellings(source), file).toEqual([]);
    }
  });
});

describe('the key-structure vocabulary', () => {
  /*
   * The house terms for Guardian's two account keys are "everyday key" and
   * "recovery key". The Miden blog calls the same pair "hot key" and "cold
   * key"; nothing on the site does, and this is what keeps it that way when
   * the next article is written from the blog.
   *
   * The two patterns are deliberately NOT symmetrical. "hot key" and
   * "hot-key" are caught; the closed "hotkey" is not, because that spelling
   * belongs to keyboard shortcuts and this repo documents keyboard
   * navigation. "coldkey" has no such competing sense, so the closed form
   * stays banned there. A guard that only catches the spacing the source
   * happened to pick is not a guard — but neither is one that fails on a
   * word used correctly.
   */
  const BANNED = [
    { pattern: /hot[ \u00a0-]keys?/gi, instead: 'everyday key' },
    { pattern: /cold[ \u00a0-]?keys?/gi, instead: 'recovery key' }
  ] as const;

  function retired(text: string) {
    return BANNED.flatMap(({ pattern, instead }) =>
      (text.match(pattern) ?? []).map(match => `"${match}" — say "${instead}"`)
    );
  }

  it('is "everyday key" and "recovery key" in every article, held-back ones included', () => {
    // helpCenterAllArticles, not helpCenterArticles: a held-back article is
    // one line away from publishing, so it has to comply before it gets there.
    for (const article of helpCenterAllArticles) {
      expect(retired(article.title), `${article.id} title`).toEqual([]);

      for (const platform of article.platforms) {
        const body = article.bodies[platform] as string;
        expect(retired(body), `${article.id} (${platform})`).toEqual([]);
      }
    }
  });

  it('is the vocabulary on the content-source pages too, so fidelity cannot pull it back', () => {
    // The articles are checked verbatim against content-source. Leaving the
    // retired terms there would make correcting an article fail the fidelity
    // check instead — the two files have to move together.
    expect(retired(extensionSource), 'content-source/extension.md').toEqual([]);
    expect(retired(mobileSource), 'content-source/mobile.md').toEqual([]);
  });

  it('is the vocabulary in the interface too, not only the articles', () => {
    const components = import.meta.glob<string>('./*.tsx', {
      query: '?raw',
      import: 'default',
      eager: true
    });

    expect(Object.keys(components).length).toBeGreaterThan(0);

    for (const [file, source] of Object.entries(components)) {
      expect(retired(source), file).toEqual([]);
    }
  });
});

describe('quotation marks', () => {
  /*
   * There are none, by Ivan's call 2026-09-09. A UI label is bold, a word
   * being talked about rather than used is italic, and a concept is plain
   * text — so a straight double quote in an article is a label that never
   * got converted.
   *
   * Titles are checked with the bodies. They are escaped plain text, so
   * neither bold nor italic reaches them: the quotes there were simply
   * dropped, and this is what stops them coming back.
   *
   * Only the articles are scanned. content-source carries a provenance
   * header that quotes the Notion page it was read from, and that header is
   * never rendered; the fidelity check is what keeps the article bodies and
   * their source in step.
   */
  function quoted(text: string) {
    return text.match(/"[^"]*"/g) ?? [];
  }

  it('are absent from every article, held-back ones included', () => {
    for (const article of helpCenterAllArticles) {
      expect(quoted(article.title), `${article.id} title`).toEqual([]);

      for (const platform of article.platforms) {
        const body = article.bodies[platform] as string;
        expect(quoted(body), `${article.id} (${platform}) — bold a UI label, italicise a word-as-word`).toEqual([]);
      }
    }
  });
});

describe('a subcategory with nothing on the selected platform', () => {
  /*
   * Unreachable today: every subcategory has at least one article on both
   * platforms, so the empty branch in HelpCenter never renders. It becomes
   * reachable the moment content goes uneven — one extension-only article
   * added to a thin subcategory is enough — and an untested branch that only
   * fires on a content change is one that rots quietly until it fires.
   *
   * This is the logic the branch turns on, not the markup: there is no DOM
   * test stack here by Ivan's call, and Playwright cannot reach a state the
   * content cannot produce.
   */
  const extensionOnly = parseArticle(
    `---
id: extension-only
title: Extension only
mainCategory: getting-started
subcategory: setup-and-basic-use
platforms: [extension-desktop]
---

Only on the extension.`,
    'extension-only.md'
  );

  it('has no articles on the platform it does not declare', () => {
    expect(articlesFor([extensionOnly], 'setup-and-basic-use', 'extension-desktop')).toHaveLength(1);
    expect(articlesFor([extensionOnly], 'setup-and-basic-use', 'mobile')).toHaveLength(0);
  });

  it('still offers the platform choice, so the reader can see why it is empty', () => {
    // A subcategory that silently showed nothing, with no way to tell that the
    // other platform has pages, would read as a broken page rather than as an
    // answer. The tabs are what make the empty state legible.
    expect(subcategoryNeedsPlatformChoice([extensionOnly], 'setup-and-basic-use')).toBe(true);
  });

  it('is empty for a subcategory that has no articles at all', () => {
    expect(articlesFor([extensionOnly], 'guardian-protection', 'extension-desktop')).toHaveLength(0);
  });
});

describe('design tokens', () => {
  /*
   * Three of the four findings in the 2026-09-09 brand audit were the same
   * shape: a rule written and never wired up. --measure sat in the scale
   * unreferenced while article text ran to 88 characters; :focus-visible named
   * a root the home page does not use; the underline-on-hover rule named
   * .help-home-shell, a class that exists nowhere. A token defined and never
   * read is the cheapest of those to detect, so it is detected here.
   */
  /*
   * Read off disk. Vite's CSS pipeline intercepts a .css import in the node
   * test environment and returns an empty string for ?raw, ?inline and
   * import.meta.glob alike — measured, not assumed — so the bundler cannot
   * show us the source at all.
   */
  const cssDir = fileURLToPath(new URL('.', import.meta.url));
  const cssFiles = readdirSync(cssDir).filter(name => name.endsWith('.css'));
  const allCss = cssFiles.map(name => readFileSync(join(cssDir, name), 'utf8')).join('\n');

  it('are every one of them referenced somewhere', () => {
    expect(cssFiles.length).toBeGreaterThan(0);

    // Anywhere, not just at the start of a line. Anchoring to line starts let
    // a token declared inline — `.x { --never-read: red; }` — walk straight
    // past the guard, which a mutation caught. A reference reads `var(--x)`
    // and has no colon after the name, so this cannot mistake one for a
    // declaration.
    const defined = [...allCss.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(match => match[1] as string);
    expect(defined.length).toBeGreaterThan(20);

    const unused = [...new Set(defined)].filter(token => !allCss.includes(`var(${token})`));

    expect(unused, 'defined but never read — wire it up or delete it').toEqual([]);
  });
});

describe('the pre-commit filter', () => {
  /*
   * The filter decides whether the checks run at all, so it is the one piece
   * of logic whose failure hides every other failure. It has already been
   * wrong once: as an allowlist of extensions it omitted .css, and every
   * stylesheet-only commit this week skipped typecheck and unit tests
   * silently. One of those commits broke three Playwright cases.
   *
   * This runs the real script rather than a copy of its rules. A test that
   * reimplemented the predicate could agree with itself while disagreeing
   * with the hook, which is the failure it exists to prevent.
   */
  const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

  function wouldSkip(...paths: readonly string[]) {
    const result = spawnSync('bash', ['.githooks/skippable.sh', ...paths], { cwd: repoRoot });
    return result.status === 0;
  }

  it.each([
    ['a component', 'src/help-center/HelpCenter.tsx'],
    ['the entry point', 'src/main.tsx'],
    ['a stylesheet', 'src/help-center/help-center.css'],
    ['the token sheet', 'src/help-center/tokens.css'],
    ['the global sheet', 'src/styles.css'],
    ['an article body', 'src/help-center/content/02-how-do-i-create-a-bread-wallet.md'],
    ['a content source page', 'content-source/mobile.md'],
    ['the manifest', 'package.json'],
    ['the lockfile', 'yarn.lock'],
    ['the hook itself', '.githooks/pre-commit'],
    ['the filter itself', '.githooks/skippable.sh'],
    ['an e2e spec', 'e2e/navigation.spec.ts'],
    ['a font', 'src/help-center/assets/fonts/inter-latin-var.woff2'],
    ['a shipped article image', 'src/help-center/assets/faq/three-keys-always-in-control.png'],
    ['the FAQ source', 'tasks/faq/bread-faq-content.md'],
    ['a delivered FAQ image', 'tasks/faq/faq-images/three-keys-always-in-control.png']
  ])('runs the checks for %s', (_label, path) => {
    expect(wouldSkip(path), `${path} must not skip the checks`).toBe(false);
  });

  it('runs the checks when one shipping file is staged among docs', () => {
    expect(wouldSkip('tasks/todo.md', 'README.md', 'src/help-center/tokens.css')).toBe(false);
    expect(wouldSkip('tasks/notes.md', 'src/help-center/content/01-how-to-install-bread-wallet.md')).toBe(
      false
    );
    expect(wouldSkip('tasks/todo.md', 'tasks/faq/bread-faq-content.md')).toBe(false);
  });

  it('runs the checks when nothing is staged, rather than assuming there is nothing to do', () => {
    expect(wouldSkip()).toBe(false);
  });

  it.each([
    ['a task note', 'tasks/todo.md'],
    ['an audit report', 'tasks/brand-audit-2026-09-09.md'],
    ['a screenshot', 'tasks/brand-audit/home-1440.jpg'],
    ['the readme', 'README.md'],
    ['the guidance file', 'CLAUDE.md']
  ])('lets %s skip', (_label, path) => {
    expect(wouldSkip(path), `${path} should not need the checks`).toBe(true);
  });

  it('lets a set of docs skip together', () => {
    expect(wouldSkip('README.md', 'tasks/lessons.md', 'tasks/brand-audit/article-390.jpg')).toBe(true);
  });
});
