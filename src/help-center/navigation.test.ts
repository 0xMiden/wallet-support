import { afterEach, describe, expect, it, vi } from 'vitest';

import { helpCenterMainCategories } from './categories';
import { createHelpCenterNavigation } from './navigation';
import type { HelpCenterCategory, HelpCenterMainCategory } from './types';

function leaf(id: string): HelpCenterCategory {
  return { id, title: `Leaf ${id}`, description: `About ${id}`, platforms: [] };
}

function group(id: string, leaves: readonly HelpCenterCategory[]): HelpCenterMainCategory {
  return { id, title: `Group ${id}`, subcategories: leaves };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('position within a main category', () => {
  const navigation = createHelpCenterNavigation([
    group('alpha', [leaf('a1'), leaf('a2'), leaf('a3')]),
    group('beta', [leaf('b1'), leaf('b2')])
  ]);

  it('numbers the first category in a group as 1, not by its global position', () => {
    const entry = navigation.resolve('b1');
    expect(entry?.localIndex).toBe(1);
    expect(entry?.siblingCount).toBe(2);
    expect(entry?.mainCategoryIndex).toBe(2);
  });

  it('numbers the last category in a group by its local position', () => {
    const entry = navigation.resolve('a3');
    expect(entry?.localIndex).toBe(3);
    expect(entry?.siblingCount).toBe(3);
  });

  it('exposes the siblings of a category, in order', () => {
    expect(navigation.resolve('a2')?.siblings.map(sibling => sibling.id)).toEqual(['a1', 'a2', 'a3']);
  });
});

describe('previous and next', () => {
  const navigation = createHelpCenterNavigation([
    group('alpha', [leaf('a1'), leaf('a2'), leaf('a3')]),
    group('beta', [leaf('b1'), leaf('b2')])
  ]);

  it('has no previous at the very first category', () => {
    const entry = navigation.resolve('a1');
    expect(entry?.previous).toBeUndefined();
    expect(entry?.next?.category.id).toBe('a2');
  });

  it('has no next at the very last category', () => {
    const entry = navigation.resolve('b2');
    expect(entry?.next).toBeUndefined();
    expect(entry?.previous?.category.id).toBe('b1');
  });

  it('does not flag a move inside the same main category as a crossing', () => {
    const entry = navigation.resolve('a2');
    expect(entry?.previous).toMatchObject({ category: { id: 'a1' }, crossesMainCategory: false });
    expect(entry?.next).toMatchObject({ category: { id: 'a3' }, crossesMainCategory: false });
  });

  it('flags the last category of a group as crossing on next', () => {
    const entry = navigation.resolve('a3');
    expect(entry?.next).toMatchObject({
      category: { id: 'b1' },
      mainCategory: { id: 'beta' },
      localIndex: 1,
      crossesMainCategory: true
    });
  });

  it('flags the first category of a group as crossing on previous', () => {
    const entry = navigation.resolve('b1');
    expect(entry?.previous).toMatchObject({
      category: { id: 'a3' },
      mainCategory: { id: 'alpha' },
      localIndex: 3,
      crossesMainCategory: true
    });
  });

  it('numbers a crossed-into neighbour by its own group, not the origin group', () => {
    // b1 is the 4th category overall but the 1st in its group. The card must say 1.
    expect(navigation.resolve('a3')?.next?.localIndex).toBe(1);
  });
});

describe('single-category groups', () => {
  const navigation = createHelpCenterNavigation([
    group('alpha', [leaf('only-a')]),
    group('beta', [leaf('only-b')])
  ]);

  it('reports 1 of 1 for a lone category', () => {
    const entry = navigation.resolve('only-a');
    expect(entry?.localIndex).toBe(1);
    expect(entry?.siblingCount).toBe(1);
  });

  it('crosses in both directions when every group holds one category', () => {
    expect(navigation.resolve('only-a')?.next?.crossesMainCategory).toBe(true);
    expect(navigation.resolve('only-b')?.previous?.crossesMainCategory).toBe(true);
  });
});

describe('degenerate hierarchies', () => {
  it('handles a hierarchy holding a single category', () => {
    const navigation = createHelpCenterNavigation([group('alpha', [leaf('lonely')])]);
    const entry = navigation.resolve('lonely');
    expect(entry?.localIndex).toBe(1);
    expect(entry?.previous).toBeUndefined();
    expect(entry?.next).toBeUndefined();
  });

  it('skips an empty main category when walking previous and next', () => {
    const navigation = createHelpCenterNavigation([
      group('alpha', [leaf('a1')]),
      group('empty', []),
      group('beta', [leaf('b1')])
    ]);
    expect(navigation.resolve('a1')?.next?.category.id).toBe('b1');
    expect(navigation.resolve('b1')?.previous?.category.id).toBe('a1');
  });

  it('reports no first category for an empty hierarchy', () => {
    const navigation = createHelpCenterNavigation([]);
    expect(navigation.categories).toEqual([]);
    expect(navigation.firstCategoryId).toBeUndefined();
  });
});

describe('unknown and duplicate ids', () => {
  const navigation = createHelpCenterNavigation([group('alpha', [leaf('a1')])]);

  it('reports whether a category exists without throwing', () => {
    expect(navigation.has('a1')).toBe(true);
    expect(navigation.has('nope')).toBe(false);
  });

  it('throws on an unknown category in development', () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(() => navigation.resolve('nope')).toThrow(/no category with id "nope"/);
    expect(() => navigation.mainCategoryIndex('nope')).toThrow(/no main category with id "nope"/);
  });

  it('logs and yields undefined on an unknown category in production', () => {
    vi.stubEnv('DEV', false);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(navigation.resolve('nope')).toBeUndefined();
    expect(logged).toHaveBeenCalledOnce();
    expect(logged.mock.calls[0]?.[0]).toMatch(/no category with id "nope"/);
  });

  it('rejects a hierarchy with duplicate ids outright', () => {
    expect(() => createHelpCenterNavigation([group('alpha', [leaf('dupe'), leaf('dupe')])])).toThrow(
      /duplicate category id "dupe"/
    );
    expect(() =>
      createHelpCenterNavigation([group('same', [leaf('x')]), group('same', [leaf('y')])])
    ).toThrow(/duplicate main category id "same"/);
  });
});

/**
 * Written out by hand from categories.ts. Deriving it from the module would make
 * the agreement check below true by construction and therefore worthless.
 */
const EXPECTED = [
  { id: 'setup-and-basic-use', mainCategory: 'getting-started', mainIndex: 1, local: 1, siblings: 1 },
  { id: 'security-and-recovery', mainCategory: 'manage-wallet', mainIndex: 2, local: 1, siblings: 3 },
  { id: 'sending-receiving-and-claiming', mainCategory: 'manage-wallet', mainIndex: 2, local: 2, siblings: 3 },
  { id: 'activity-and-transaction-status', mainCategory: 'manage-wallet', mainIndex: 2, local: 3, siblings: 3 },
  { id: 'public-and-private-transactions', mainCategory: 'privacy', mainIndex: 3, local: 1, siblings: 1 },
  { id: 'guardian-protection', mainCategory: 'guardian', mainIndex: 4, local: 1, siblings: 1 },
  { id: 'common-issues-and-support', mainCategory: 'troubleshooting', mainIndex: 5, local: 1, siblings: 1 }
] as const;

const EXPECTED_CROSSINGS = [
  { from: 'setup-and-basic-use', to: 'security-and-recovery', crosses: true },
  { from: 'security-and-recovery', to: 'sending-receiving-and-claiming', crosses: false },
  { from: 'sending-receiving-and-claiming', to: 'activity-and-transaction-status', crosses: false },
  { from: 'activity-and-transaction-status', to: 'public-and-private-transactions', crosses: true },
  { from: 'public-and-private-transactions', to: 'guardian-protection', crosses: true },
  { from: 'guardian-protection', to: 'common-issues-and-support', crosses: true }
] as const;

describe('the shipped hierarchy', () => {
  const navigation = createHelpCenterNavigation(helpCenterMainCategories);

  it('holds exactly the categories the expectation table describes, in order', () => {
    expect(navigation.categories.map(category => category.id)).toEqual(EXPECTED.map(row => row.id));
  });

  it.each(EXPECTED)('places $id at local index $local of $siblings', row => {
    const entry = navigation.resolve(row.id);
    expect(entry?.mainCategory.id).toBe(row.mainCategory);
    expect(entry?.mainCategoryIndex).toBe(row.mainIndex);
    expect(entry?.localIndex).toBe(row.local);
    expect(entry?.siblingCount).toBe(row.siblings);
  });

  it.each(EXPECTED_CROSSINGS)('going $from -> $to crosses: $crosses', row => {
    const forward = navigation.resolve(row.from)?.next;
    const backward = navigation.resolve(row.to)?.previous;

    expect(forward?.category.id).toBe(row.to);
    expect(forward?.crossesMainCategory).toBe(row.crosses);
    expect(backward?.category.id).toBe(row.from);
    expect(backward?.crossesMainCategory).toBe(row.crosses);
  });

  it('renders one number per category everywhere it appears', () => {
    for (const row of EXPECTED) {
      const entry = navigation.resolve(row.id);

      // What the sidebar renders: resolved by the category's own id.
      const sidebarIndex = entry?.localIndex;

      // What the breadcrumb renders: "N of M" for the active category.
      const breadcrumbIndex = entry?.localIndex;
      const breadcrumbTotal = entry?.siblingCount;

      // What a previous/next card renders: reached as a neighbour of the category
      // before it, so this genuinely exercises a second code path.
      const cardIndex = entry?.previous
        ? navigation.resolve(entry.previous.category.id)?.next?.localIndex
        : undefined;

      expect(sidebarIndex).toBe(row.local);
      expect(breadcrumbIndex).toBe(row.local);
      expect(breadcrumbTotal).toBe(row.siblings);
      if (entry?.previous) expect(cardIndex).toBe(row.local);
    }
  });
});
