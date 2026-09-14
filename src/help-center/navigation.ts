import type { HelpCenterCategory, HelpCenterMainCategory } from './types';

/**
 * Every position shown anywhere in the Help Center is derived here, from the
 * hierarchy's own shape. Nothing else may count, number, or order categories.
 *
 * The bug this module exists to prevent: the sidebar counted with its render
 * index, the breadcrumb ran its own search, and the previous/next cards read a
 * denormalised `order` field, so one subcategory could legitimately render as
 * `01` in one place and `02` in another. Three derivations cannot disagree if
 * there is only one.
 *
 * The hierarchy is a parameter rather than an import so that the rules can be
 * exercised against shapes the real data does not currently have.
 */

export interface HelpCenterNavigationNeighbour {
  readonly category: HelpCenterCategory;
  /** The main category that owns the neighbour, which may not own the origin. */
  readonly mainCategory: HelpCenterMainCategory;
  /** 1-based position of the neighbour among *its own* siblings. */
  readonly localIndex: number;
  /** True when moving here leaves the origin's main category. */
  readonly crossesMainCategory: boolean;
}

export interface HelpCenterNavigationEntry {
  readonly category: HelpCenterCategory;
  readonly mainCategory: HelpCenterMainCategory;
  /** 1-based position of the owning main category in the hierarchy. */
  readonly mainCategoryIndex: number;
  /** 1-based position of this category among its siblings. */
  readonly localIndex: number;
  readonly siblings: readonly HelpCenterCategory[];
  readonly siblingCount: number;
  readonly previous?: HelpCenterNavigationNeighbour;
  readonly next?: HelpCenterNavigationNeighbour;
}

export interface HelpCenterNavigation {
  /** Every category, in reading order. */
  readonly categories: readonly HelpCenterCategory[];
  readonly mainCategories: readonly HelpCenterMainCategory[];
  /** The first category in reading order, or undefined for an empty hierarchy. */
  readonly firstCategoryId: string | undefined;
  has(categoryId: string): boolean;
  /**
   * Resolves a category's position. Throws in development so a bad id cannot
   * reach a browser unnoticed; logs and returns undefined in production so the
   * caller must omit the affected markers rather than render a wrong number.
   */
  resolve(categoryId: string): HelpCenterNavigationEntry | undefined;
  /** 1-based position of a main category, or undefined when it is unknown. */
  mainCategoryIndex(mainCategoryId: string): number | undefined;
}

interface CategoryLocation {
  readonly category: HelpCenterCategory;
  readonly mainCategory: HelpCenterMainCategory;
  readonly mainCategoryIndex: number;
  readonly localIndex: number;
  readonly flatIndex: number;
}

function report(message: string): undefined {
  if (import.meta.env.DEV) throw new Error(message);
  console.error(message);
  return undefined;
}

export function createHelpCenterNavigation(
  mainCategories: readonly HelpCenterMainCategory[]
): HelpCenterNavigation {
  const locations = new Map<string, CategoryLocation>();
  const mainCategoryIndexes = new Map<string, number>();
  const categories: HelpCenterCategory[] = [];

  mainCategories.forEach((mainCategory, mainCategoryPosition) => {
    if (mainCategoryIndexes.has(mainCategory.id)) {
      throw new Error(
        `Help Center navigation: duplicate main category id "${mainCategory.id}" in the hierarchy.`
      );
    }
    mainCategoryIndexes.set(mainCategory.id, mainCategoryPosition + 1);

    mainCategory.subcategories.forEach((category, categoryPosition) => {
      if (locations.has(category.id)) {
        throw new Error(
          `Help Center navigation: duplicate category id "${category.id}" in the hierarchy.`
        );
      }

      locations.set(category.id, {
        category,
        mainCategory,
        mainCategoryIndex: mainCategoryPosition + 1,
        localIndex: categoryPosition + 1,
        flatIndex: categories.length
      });
      categories.push(category);
    });
  });

  const toNeighbour = (
    origin: CategoryLocation,
    flatIndex: number
  ): HelpCenterNavigationNeighbour | undefined => {
    const neighbour = categories[flatIndex];
    if (!neighbour) return undefined;

    const location = locations.get(neighbour.id);
    if (!location) return undefined;

    return {
      category: location.category,
      mainCategory: location.mainCategory,
      localIndex: location.localIndex,
      crossesMainCategory: location.mainCategory.id !== origin.mainCategory.id
    };
  };

  return {
    categories,
    mainCategories,
    firstCategoryId: categories[0]?.id,

    has(categoryId) {
      return locations.has(categoryId);
    },

    resolve(categoryId) {
      const location = locations.get(categoryId);
      if (!location) {
        return report(
          `Help Center navigation: no category with id "${categoryId}" exists in the hierarchy.`
        );
      }

      return {
        category: location.category,
        mainCategory: location.mainCategory,
        mainCategoryIndex: location.mainCategoryIndex,
        localIndex: location.localIndex,
        siblings: location.mainCategory.subcategories,
        siblingCount: location.mainCategory.subcategories.length,
        previous: toNeighbour(location, location.flatIndex - 1),
        next: toNeighbour(location, location.flatIndex + 1)
      };
    },

    mainCategoryIndex(mainCategoryId) {
      const index = mainCategoryIndexes.get(mainCategoryId);
      if (index === undefined) {
        return report(
          `Help Center navigation: no main category with id "${mainCategoryId}" exists in the hierarchy.`
        );
      }
      return index;
    }
  };
}
