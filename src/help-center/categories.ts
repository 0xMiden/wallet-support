import type { HelpCenterCategory, HelpCenterMainCategory, HelpCenterPlatform } from './types';

const walletPlatforms = ['extension-desktop', 'mobile'] as const satisfies readonly HelpCenterPlatform[];

/**
 * The category model is intentionally separate from the UI. The same records
 * can later be sourced from Markdown, JSON, or the Bread Wallet website.
 */
const gettingStartedSubcategories: readonly HelpCenterCategory[] = [
  {
    id: 'setup-and-basic-use',
    order: 1,
    title: 'Setup and basic use',
    description: 'The starting point for installing, creating, and navigating Bread Wallet.',
    platforms: walletPlatforms
  }
];

const manageWalletSubcategories: readonly HelpCenterCategory[] = [
  {
    id: 'security-and-recovery',
    order: 2,
    title: 'Security and recovery',
    description: 'Guidance for protecting wallet access and preparing for recovery.',
    platforms: walletPlatforms
  },
  {
    id: 'sending-receiving-and-claiming',
    order: 3,
    title: 'Sending, receiving, and claiming',
    description: 'Help for the wallet’s core asset flows.',
    platforms: walletPlatforms
  },
  {
    id: 'activity-and-transaction-status',
    order: 4,
    title: 'Activity and transaction status',
    description: 'Help for reviewing wallet activity and transaction progress.',
    platforms: []
  }
] as const;

export const helpCenterMainCategories: readonly HelpCenterMainCategory[] = [
  {
    id: 'getting-started',
    order: 1,
    title: 'Getting started',
    subcategories: gettingStartedSubcategories
  },
  {
    id: 'manage-wallet',
    order: 2,
    title: 'Manage wallet',
    subcategories: manageWalletSubcategories
  },
  {
    id: 'privacy',
    order: 3,
    title: 'Privacy',
    subcategories: [
      {
        id: 'public-and-private-transactions',
        order: 5,
        title: 'Public and private transactions',
        description: 'Clear explanations of privacy choices and their effects.',
        platforms: []
      }
    ]
  },
  {
    id: 'guardian',
    order: 4,
    title: 'Guardian',
    subcategories: [
      {
        id: 'guardian-protection',
        order: 6,
        title: 'Guardian protection',
        description: 'Help for understanding and managing Guardian protection.',
        platforms: []
      }
    ]
  },
  {
    id: 'troubleshooting',
    order: 5,
    title: 'Troubleshooting',
    subcategories: [
      {
        id: 'common-issues-and-support',
        order: 7,
        title: 'Common issues and support',
        description: 'A route to common fixes and the appropriate support channel.',
        platforms: []
      }
    ]
  }
] as const;

export const helpCenterCategories: readonly HelpCenterCategory[] = helpCenterMainCategories.flatMap(
  category => category.subcategories
);
