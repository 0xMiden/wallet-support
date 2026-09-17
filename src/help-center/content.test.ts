import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import claudeGuide from '../../CLAUDE.md?raw';
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
  SCREENSHOT_SIZES,
  helpCenterArticles,
  loadArticles,
  parseArticle,
  registerImages,
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
  it('spans 7 main categories, 9 subcategories and 40 articles', () => {
    const navigation = createHelpCenterNavigation(helpCenterMainCategories);
    expect(navigation.mainCategories).toHaveLength(7);
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

/**
 * Just enough PNG decoding to compare two files by what they draw: 8-bit
 * truecolour, with or without alpha, not interlaced, which is what the FAQ
 * images are before and after optimisation. Anything else throws, so a format
 * this cannot read fails loudly rather than comparing garbage. The chunks that
 * change how pixels are shown are returned too, because identical pixels under
 * a different colour profile are not the same picture.
 */
function readPng(file: Uint8Array, origin: string) {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const compressed: Uint8Array[] = [];
  const colour: Record<string, string> = {};
  let width = 0;
  let height = 0;
  let channels = 0;

  for (let offset = 8; offset < file.length; ) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...file.subarray(offset + 4, offset + 8));
    const data = file.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      const [depth, colourType, , , interlace] = data.subarray(8, 13);
      if (depth !== 8 || (colourType !== 2 && colourType !== 6) || interlace !== 0) {
        throw new Error(`${origin}: depth ${depth}, colour type ${colourType}, interlace ${interlace} is not readable here.`);
      }
      channels = colourType === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      compressed.push(data);
    } else if (['sRGB', 'gAMA', 'cHRM', 'iCCP', 'cICP'].includes(type)) {
      colour[type] = [...data].join(',');
    }
    offset += 12 + length;
  }

  const joined = new Uint8Array(compressed.reduce((total, part) => total + part.length, 0));
  compressed.reduce((at, part) => (joined.set(part, at), at + part.length), 0);
  const raw = inflateSync(joined);

  // Undo each row's filter, in place, against the row above.
  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);
  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)];
    const start = row * (stride + 1) + 1;
    const out = row * stride;
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? (pixels[out + i - channels] as number) : 0;
      const up = row > 0 ? (pixels[out - stride + i] as number) : 0;
      const upLeft = row > 0 && i >= channels ? (pixels[out - stride + i - channels] as number) : 0;
      let predictor: number;
      if (filter === 0) predictor = 0;
      else if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = (left + up) >> 1;
      else if (filter === 4) {
        const estimate = left + up - upLeft;
        const [toLeft, toUp, toUpLeft] = [left, up, upLeft].map(value => Math.abs(estimate - value));
        predictor = toLeft! <= toUp! && toLeft! <= toUpLeft! ? left : toUp! <= toUpLeft! ? up : upLeft;
      } else throw new Error(`${origin}: unknown filter ${filter} on row ${row}.`);
      pixels[out + i] = ((raw[start + i] as number) + predictor) & 0xff;
    }
  }

  // Compared as RGBA, so dropping an alpha channel that was opaque everywhere is not a difference.
  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    rgba[pixel * 4] = pixels[pixel * channels] as number;
    rgba[pixel * 4 + 1] = pixels[pixel * channels + 1] as number;
    rgba[pixel * 4 + 2] = pixels[pixel * channels + 2] as number;
    rgba[pixel * 4 + 3] = channels === 4 ? (pixels[pixel * channels + 3] as number) : 255;
  }

  return { bytes: file.length, width, height, colour, rgba };
}

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
    // Step screenshots are placed by the capture sheet, not the FAQ. Most sit
    // indented under a step and never matched, but one between paragraphs does.
    const shown = helpCenterAllArticles
      .flatMap(article =>
        [...(article.bodies['extension-desktop'] ?? '').matchAll(/^!\[([^\]]*)\]\(([^)\s]+)\)$/gm)].map(
          match => [match[2] as string, match[1] as string] as const
        )
      )
      .filter(([name]) => helpCenterArticleImages[name]?.kind !== 'screenshot');

    expect(shown).toHaveLength(5);
    expect(Object.fromEntries(shown)).toEqual(FAQ_IMAGE_ALT);
    expect([...faqSource.matchAll(/^!\[\]\(([^)\s]+)\)$/gm)].map(match => match[1]).sort()).toEqual(
      Object.keys(FAQ_IMAGE_ALT).sort()
    );
  });

  /**
   * The step screenshots of §7. A capture needs no change here — only its one
   * size entry in SCREENSHOT_SIZES, which this test then holds to the file's
   * own header.
   */
  /**
   * The image spec in tasks/screenshot-capture-sheet.md, enforced rather than
   * left to the eye. Every capture is at least 2x the width it is shown at,
   * which is what keeps the set crisp and consistent. The annotation stroke is
   * set from the width so it lands at 3px on screen; that one is checked by eye.
   */
  it('holds every step screenshot to the capture spec', () => {
    const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
    const dir = join(repoRoot, 'src/help-center/assets/screenshots');

    for (const name of [...readdirSync(dir)].filter(file => file.endsWith('.png')).sort()) {
      const bytes = readFileSync(join(dir, name));
      const file = readPng(bytes, `src/help-center/assets/screenshots/${name}`);
      const entry = SCREENSHOT_SIZES[name];
      expect(entry, `${name}: missing from SCREENSHOT_SIZES`).toBeDefined();

      if ((entry as readonly unknown[])[2] === 'narrow') {
        /*
         * A panel, menu or dialog: whatever the surface is at 2x. The floor is
         * 560 rather than 800 because the smallest surface in the run, Chrome's
         * jigsaw menu, is about 310–370 CSS px and lands near 620 at 200%
         * scaling; an 800 floor would have made that position unshootable. 560
         * still catches what the floor is for, a capture taken at 1x, which for
         * these surfaces lands between 310 and 400.
         */
        expect(file.width, `${name}: a narrow-surface capture should be 560–1200px wide at 2x`)
          .toBeGreaterThanOrEqual(560);
        expect(file.width, `${name}: a narrow-surface capture should be 560–1200px wide at 2x`)
          .toBeLessThanOrEqual(1200);
      } else {
        /*
         * Fills the column: a whole tab from the DevTools device toolbar at
         * width 1360, DPR 1, or the part of a tab that matters, cropped from an
         * OS screenshot at 150% scaling. 1360 is the floor because anything
         * narrower is under 2x on the 680px column. 2040 is the ceiling because
         * at 150% that is 1360 CSS px of page, as much as a whole-tab capture
         * holds; any wider and the page shows smaller than a whole tab does.
         */
        const rule = `${name}: a column-width capture should be 1360–2040px wide ` +
          '(a whole tab at viewport 1360, DPR 1, or part of one at 150% scaling)';
        expect(file.width, rule).toBeGreaterThanOrEqual(1360);
        expect(file.width, rule).toBeLessThanOrEqual(2040);
      }

      expect(file.height, `${name}: taller than 1.3x its width, so it dominates the article`)
        .toBeLessThanOrEqual(Math.round(file.width * 1.3));
      expect(bytes.length, `${name}: over the 400 KB ceiling`).toBeLessThanOrEqual(400 * 1024);
    }
  });

  it('carries the narrow tag through to the image the renderer gets', () => {
    const files = { './assets/screenshots/menu.png': '/menu.png', './assets/screenshots/page.png': '/page.png' };
    const sizes = { 'menu.png': [620, 380, 'narrow'], 'page.png': [1360, 900] } as const;
    const images = Object.fromEntries(registerImages(files, sizes, 'SIZES', 'screenshot'));
    expect(images['menu.png']).toEqual({ src: '/menu.png', width: 620, height: 380, kind: 'screenshot', narrow: true });
    expect(images['page.png']).toEqual({ src: '/page.png', width: 1360, height: 900, kind: 'screenshot' });
  });

  it('registers every step screenshot on disk, at the size its header gives', () => {
    const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
    const dir = join(repoRoot, 'src/help-center/assets/screenshots');
    const onDisk = [...readdirSync(dir)].filter(name => name.endsWith('.png')).sort();

    const registered = Object.entries(helpCenterArticleImages)
      .filter(([, image]) => image.kind === 'screenshot')
      .map(([name]) => name)
      .sort();
    expect(registered).toEqual(onDisk);

    for (const name of onDisk) {
      const file = readPng(readFileSync(join(dir, name)), `src/help-center/assets/screenshots/${name}`);
      expect([file.width, file.height], name).toEqual([
        helpCenterArticleImages[name]?.width,
        helpCenterArticleImages[name]?.height
      ]);
    }
  });

  it('ships each image pixel for pixel as delivered, never larger, at the size its header gives', () => {
    const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
    const deliveredDir = join(repoRoot, 'tasks/faq/faq-images');
    const shippedDir = join(repoRoot, 'src/help-center/assets/faq');
    const delivered = [...readdirSync(deliveredDir)].sort();

    expect(delivered).toEqual(Object.keys(FAQ_IMAGE_ALT).sort());
    expect([...readdirSync(shippedDir)].sort()).toEqual(delivered);
    // Step screenshots register from their own directory and are checked by the
    // test below. Every other image must still be exactly these five diagrams:
    // dropping one from the registry has to fail here, and still does.
    expect(
      Object.keys(helpCenterArticleImages)
        .filter(name => helpCenterArticleImages[name]?.kind !== 'screenshot')
        .sort()
    ).toEqual(delivered);

    for (const name of delivered) {
      // tasks/faq/ keeps the files as delivered; what ships is losslessly optimised.
      const original = readPng(readFileSync(join(deliveredDir, name)), `tasks/faq/faq-images/${name}`);
      const shipped = readPng(readFileSync(join(shippedDir, name)), `src/help-center/assets/faq/${name}`);
      // Not vacuous: a decoder that returned blank pixels would pass the comparison below.
      expect(new Set(original.rgba).size, `${name} decoded to a blank image`).toBeGreaterThan(64);

      expect(shipped.bytes, `${name} is larger than the delivered file`).toBeLessThanOrEqual(original.bytes);
      expect([shipped.width, shipped.height], name).toEqual([original.width, original.height]);
      expect([shipped.width, shipped.height], name).toEqual([
        helpCenterArticleImages[name]?.width,
        helpCenterArticleImages[name]?.height
      ]);
      expect(shipped.colour, `${name}: a chunk that changes how its pixels are shown was altered`).toEqual(
        original.colour
      );

      let differing = 0;
      for (let at = 0; at < original.rgba.length; at += 4) {
        for (let channel = 0; channel < 4; channel += 1) {
          if (original.rgba[at + channel] !== shipped.rgba[at + channel]) {
            differing += 1;
            break;
          }
        }
      }
      expect(differing, `${name}: pixels that differ from the delivered file`).toBe(0);
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
   *
   * It reads the same files as the key-structure vocabulary check below: every
   * article, held-back ones included, content-source/, the FAQ source, the
   * interface, the glossary and CLAUDE.md. The two once read different sets,
   * which was history rather than design.
   */
  const NAMED = /bread[ \u00a0]+wallet/gi;
  const CORRECT = 'Bread Wallet';

  function misspellings(text: string) {
    return (text.match(NAMED) ?? []).filter(match => match !== CORRECT);
  }

  it('is spelled "Bread Wallet" in every article title and body, held-back ones included', () => {
    // helpCenterAllArticles, not helpCenterArticles: a held-back article is one
    // line away from publishing, so it has to comply before it gets there.
    for (const article of helpCenterAllArticles) {
      expect(misspellings(article.title), `${article.id} title`).toEqual([]);

      for (const platform of article.platforms) {
        const body = article.bodies[platform] as string;
        expect(misspellings(body), `${article.id} (${platform})`).toEqual([]);
      }
    }
  });

  it('is spelled "Bread Wallet" on the content-source pages too, so fidelity cannot pull it back', () => {
    // The migrated articles are held to content-source verbatim, so a misspelling
    // left there would make correcting an article fail the fidelity check
    // instead. The two files have to move together.
    expect(misspellings(extensionSource), 'content-source/extension.md').toEqual([]);
    expect(misspellings(mobileSource), 'content-source/mobile.md').toEqual([]);
  });

  it('is spelled "Bread Wallet" in the FAQ source too, for the same reason', () => {
    // The FAQ articles are held to tasks/faq/bread-faq-content.md byte for byte.
    expect(misspellings(faqSource), 'tasks/faq/bread-faq-content.md').toEqual([]);
  });

  it('is spelled "Bread Wallet" in the interface too, not only the articles', () => {
    // The article check above cannot see the home page's lede: it reads the
    // articles, and the interface's own copy lives in the components.
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

  it('is spelled "Bread Wallet" in CLAUDE.md too', () => {
    // The guidance file sets the standard the articles are written to, so it
    // cannot carry a misspelling itself. Read with its line breaks joined: the
    // file is hard-wrapped, and a break between the two words would hide one.
    // Only the breaks, so every other character reads as it does in the
    // articles' check.
    expect(misspellings(claudeGuide.replace(/[ \t]*\n[ \t]*/g, ' ')), 'CLAUDE.md').toEqual([]);
  });
});

describe('the key-structure vocabulary', () => {
  /*
   * A Guardian-backed account has three keys: the everyday key, the emergency
   * key and the Guardian key. The recovery phrase is not a key; it rebuilds the
   * emergency key. The Miden blog calls the first two "hot key" and "cold key",
   * and the articles once said "device key" and "recovery key", which also made
   * the phrase sound like a key. None of those appear on the site, and this is
   * what keeps it that way when the next article is written from the blog.
   *
   * The hot and cold patterns are deliberately NOT symmetrical. "hot key" and
   * "hot-key" are caught; the closed "hotkey" is not, because that spelling
   * belongs to keyboard shortcuts and this repo documents keyboard navigation.
   * "coldkey" has no such competing sense, so the closed form stays banned
   * there, and so do "recoverykey" and "devicekey". A guard that only catches
   * the spacing the source happened to pick is not a guard — but neither is one
   * that fails on a word used correctly: every pattern needs "key" straight
   * after its first word, so "recovery phrase" never matches.
   */
  const BANNED = [
    { pattern: /hot[ \u00a0-]keys?/gi, instead: 'everyday key' },
    { pattern: /cold[ \u00a0-]?keys?/gi, instead: 'emergency key' },
    { pattern: /recovery[ \u00a0-]?keys?/gi, instead: 'emergency key' },
    { pattern: /device[ \u00a0-]?keys?/gi, instead: 'everyday key' }
  ] as const;

  function retired(text: string) {
    return BANNED.flatMap(({ pattern, instead }) =>
      (text.match(pattern) ?? []).map(match => `"${match}" — say "${instead}"`)
    );
  }

  it('names the keys everyday, emergency and Guardian in every article, held-back ones included', () => {
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

  it('is the vocabulary in the FAQ source too, for the same reason', () => {
    // The FAQ articles are held to tasks/faq/bread-faq-content.md byte for byte,
    // so a retired term left there would make correcting one of them fail the
    // FAQ fidelity check instead.
    expect(retired(faqSource), 'tasks/faq/bread-faq-content.md').toEqual([]);
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

  it('is the vocabulary in the glossary too', () => {
    // The glossary is where a reader looks these terms up, and none of the
    // checks above can see it: it is data in a .ts file. Read as raw source, as
    // the product-name check reads it, so a field or a comment added later is
    // covered without this test having to name it.
    const glossary = import.meta.glob<string>('./glossary.ts', {
      query: '?raw',
      import: 'default',
      eager: true
    });

    expect(Object.keys(glossary), 'glossary.ts was moved or renamed').toEqual(['./glossary.ts']);

    for (const [file, source] of Object.entries(glossary)) {
      expect(retired(source), file).toEqual([]);
    }
  });

  it('is the vocabulary in CLAUDE.md too, which names the retired terms only to retire them', () => {
    /*
     * CLAUDE.md states the standard, so it has to print the retired names, and
     * does so once: in the sentence Ivan approved on 2026-09-11, held here as a
     * second copy the way glossary.test.ts holds the approved glossary. The file
     * must still say it word for word, so the standard cannot be dropped or
     * weakened without a deliberate edit here too; a scan alone would pass a
     * file that had lost it. Everything else in the file is scanned.
     *
     * Read unwrapped: the file is hard-wrapped, and a line break between
     * "recovery" and "key" would otherwise hide one.
     */
    const VOCABULARY =
      'Use the house vocabulary for the account keys: everyday key (not "hot key" or "device key"), ' +
      'emergency key (not "cold key" or "recovery key"), recovery phrase for the phrase itself ' +
      '(never a "key"), and Guardian key (it acknowledges state updates; it does not co-sign).';
    const guide = claudeGuide.replace(/\s+/g, ' ');

    expect(guide.includes(VOCABULARY), 'CLAUDE.md no longer states the approved key vocabulary').toBe(true);
    expect(retired(guide.replace(VOCABULARY, '')), 'CLAUDE.md').toEqual([]);
  });

  it('catches each retired name in every spelling, and leaves the recovery phrase alone', () => {
    const caught = [
      ['hot key', 'everyday key'],
      ['Hot-keys', 'everyday key'],
      ['cold key', 'emergency key'],
      ['coldkey', 'emergency key'],
      ['recovery key', 'emergency key'],
      ['Recovery Key', 'emergency key'],
      ['recovery-key', 'emergency key'],
      ['recoverykey', 'emergency key'],
      ['recovery keys', 'emergency key'],
      ['recovery\u00a0key', 'emergency key'],
      ['device key', 'everyday key'],
      ['Device Keys', 'everyday key'],
      ['device-keys', 'everyday key'],
      ['devicekey', 'everyday key']
    ] as const;
    for (const [name, instead] of caught) {
      expect(retired(`Keep your ${name} safe.`), name).toEqual([`"${name}" — say "${instead}"`]);
    }

    // The words the site does use, the recovery phrase above all.
    for (const sentence of [
      'Keep your recovery phrase offline and never share it.',
      'Your seed phrase is your recovery phrase.',
      'Write down both recovery phrases.',
      'an everyday key on your device, an emergency key rebuilt from your recovery phrase, and the Guardian key',
      'Guardian keeps a backup so you can recover on another device.',
      'Press a hotkey to open search.'
    ]) {
      expect(retired(sentence), sentence).toEqual([]);
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
    ['a delivered FAQ image', 'tasks/faq/faq-images/three-keys-always-in-control.png'],
    ['the guidance file, which the terminology guard reads', 'CLAUDE.md']
  ])('runs the checks for %s', (_label, path) => {
    expect(wouldSkip(path), `${path} must not skip the checks`).toBe(false);
  });

  it('runs the checks when one shipping file is staged among docs', () => {
    expect(wouldSkip('tasks/todo.md', 'README.md', 'src/help-center/tokens.css')).toBe(false);
    expect(wouldSkip('tasks/notes.md', 'src/help-center/content/01-how-to-install-bread-wallet.md')).toBe(
      false
    );
    expect(wouldSkip('tasks/todo.md', 'tasks/faq/bread-faq-content.md')).toBe(false);
    expect(wouldSkip('README.md', 'CLAUDE.md')).toBe(false);
  });

  it('runs the checks when nothing is staged, rather than assuming there is nothing to do', () => {
    expect(wouldSkip()).toBe(false);
  });

  it.each([
    ['a task note', 'tasks/todo.md'],
    ['an audit report', 'tasks/brand-audit-2026-09-09.md'],
    ['a screenshot', 'tasks/brand-audit/home-1440.jpg'],
    ['the readme', 'README.md']
  ])('lets %s skip', (_label, path) => {
    expect(wouldSkip(path), `${path} should not need the checks`).toBe(true);
  });

  it('lets a set of docs skip together', () => {
    expect(wouldSkip('README.md', 'tasks/lessons.md', 'tasks/brand-audit/article-390.jpg')).toBe(true);
  });
});
