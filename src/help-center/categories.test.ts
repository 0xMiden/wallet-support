import { describe, expect, it } from 'vitest';

import { helpCenterMainCategories } from './categories';
import { createHelpCenterNavigation } from './navigation';

/**
 * These assertions are about the shipped data itself, not about how it is
 * rendered. navigation.test.ts proves the position rules are correct; this file
 * proves the hierarchy they run against is well formed, so a bad edit to
 * categories.ts fails here rather than in a browser.
 */

const mainCategoryIds = helpCenterMainCategories.map(mainCategory => mainCategory.id);
const subcategories = helpCenterMainCategories.flatMap(mainCategory =>
  mainCategory.subcategories.map(category => ({ category, mainCategory }))
);
const subcategoryIds = subcategories.map(({ category }) => category.id);

// Ids are written straight into `href="#id"` and read back out of the hash.
const HASH_SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function duplicatesIn(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

describe('identifiers', () => {
  it('gives every main category a unique id', () => {
    expect(duplicatesIn(mainCategoryIds)).toEqual([]);
  });

  it('gives every subcategory a unique id across the whole hierarchy', () => {
    expect(duplicatesIn(subcategoryIds)).toEqual([]);
  });

  it('never reuses one id at both levels', () => {
    // A collision would not break routing today, because only subcategory ids
    // are addressable, but it makes every id-keyed lookup ambiguous to read.
    const shared = mainCategoryIds.filter(id => subcategoryIds.includes(id));
    expect(shared).toEqual([]);
  });

  it('keeps every id safe to use as a URL hash', () => {
    for (const id of [...mainCategoryIds, ...subcategoryIds]) {
      expect(id, `${id} is not a lower-case hyphenated slug`).toMatch(HASH_SAFE_ID);
      expect(encodeURIComponent(id), `${id} is not hash-safe`).toBe(id);
    }
  });
});

describe('structure', () => {
  it('attaches every subcategory to exactly one main category', () => {
    // Nesting makes this true by construction today. Asserted anyway, because a
    // future move to a flat file with a parentId would silently lose it.
    for (const id of subcategoryIds) {
      const owners = helpCenterMainCategories.filter(mainCategory =>
        mainCategory.subcategories.some(category => category.id === id)
      );
      expect(owners.map(owner => owner.id), `${id} has the wrong number of parents`).toHaveLength(1);
    }
  });

  it('has no main category without subcategories', () => {
    const empty = helpCenterMainCategories
      .filter(mainCategory => mainCategory.subcategories.length === 0)
      .map(mainCategory => mainCategory.id);
    expect(empty).toEqual([]);
  });

  it('gives every category a title and a description', () => {
    for (const mainCategory of helpCenterMainCategories) {
      expect(mainCategory.title.trim(), `${mainCategory.id} has no title`).not.toBe('');
    }
    for (const { category } of subcategories) {
      expect(category.title.trim(), `${category.id} has no title`).not.toBe('');
      expect(category.description.trim(), `${category.id} has no description`).not.toBe('');
    }
  });
});

describe('platform applicability', () => {
  it('lists only known platforms, without repeats', () => {
    for (const { category } of subcategories) {
      const platforms = [...category.platforms];
      expect(duplicatesIn(platforms), `${category.id} repeats a platform`).toEqual([]);
      for (const platform of platforms) {
        expect(['extension-desktop', 'mobile']).toContain(platform);
      }
    }
  });

  it('never gives a category exactly one platform', () => {
    // The shell shows platform tabs only when a category has more than one
    // variant, so a single-entry list is data that can never render.
    const unrenderable = subcategories
      .filter(({ category }) => category.platforms.length === 1)
      .map(({ category }) => category.id);
    expect(unrenderable).toEqual([]);
  });
});

describe('the landing target', () => {
  const navigation = createHelpCenterNavigation(helpCenterMainCategories);

  it('has a first category that resolves', () => {
    expect(navigation.firstCategoryId).toBeDefined();
    expect(navigation.resolve(navigation.firstCategoryId as string)).toBeDefined();
  });

  it('opens Getting started on Setup and basic use with no selection', () => {
    // Pins the landing state the deployed preview has. The component derives the
    // initially open sidebar group from this category's owner rather than naming
    // a group literally, so this is what stops that derivation from drifting.
    const entry = navigation.resolve(navigation.firstCategoryId as string);
    expect(entry?.category.id).toBe('setup-and-basic-use');
    expect(entry?.mainCategory.id).toBe('getting-started');
    expect(entry?.localIndex).toBe(1);
    expect(entry?.siblingCount).toBe(1);
    expect(entry?.previous).toBeUndefined();
  });
});
