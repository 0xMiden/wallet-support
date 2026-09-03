export type HelpCenterPlatform = 'extension-desktop' | 'mobile';

export interface HelpCenterCategory {
  id: string;
  title: string;
  description: string;
}

export interface HelpCenterMainCategory {
  id: string;
  title: string;
  /**
   * One line for the reader, used on the home page's category cards.
   * Subcategories have carried a description since the beginning; a main
   * category without one meant the home page had to invent copy at the point
   * of render, which is how a card and a sidebar entry come to describe the
   * same topic differently.
   */
  description: string;
  subcategories: readonly HelpCenterCategory[];
}

/**
 * One migrated Help Center article. `bodies` holds one entry per declared
 * platform; where the source pages agree the strings are identical, and where
 * they diverge each platform keeps its own verbatim text.
 */
export interface HelpCenterArticle {
  id: string;
  title: string;
  mainCategory: string;
  subcategory: string;
  platforms: readonly HelpCenterPlatform[];
  bodies: Readonly<Partial<Record<HelpCenterPlatform, string>>>;
}
