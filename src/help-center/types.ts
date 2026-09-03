export type HelpCenterPlatform = 'extension-desktop' | 'mobile';

export interface HelpCenterCategory {
  id: string;
  title: string;
  description: string;
  platforms: readonly HelpCenterPlatform[];
}

export interface HelpCenterMainCategory {
  id: string;
  title: string;
  subcategories: readonly HelpCenterCategory[];
}
