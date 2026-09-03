export type HelpCenterPlatform = 'extension-desktop' | 'mobile';

export interface HelpCenterCategory {
  id: string;
  order: number;
  title: string;
  description: string;
  platforms: readonly HelpCenterPlatform[];
}

export interface HelpCenterMainCategory {
  id: string;
  order: number;
  title: string;
  subcategories: readonly HelpCenterCategory[];
}
