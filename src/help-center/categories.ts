import type { HelpCenterCategory, HelpCenterMainCategory, HelpCenterPlatform } from './types';

const walletPlatforms = ['extension-desktop', 'mobile'] as const satisfies readonly HelpCenterPlatform[];

/**
 * The category model is intentionally separate from the UI. The same records
 * can later be sourced from Markdown, JSON, or the Bread Wallet website.
 *
 * Reading order is array order. There is deliberately no `order` field: a
 * position stored beside the data is a second source of truth, and the two
 * disagreeing is exactly how one subcategory came to render as 01 in the
 * sidebar and 02 on the previous/next card.
 */
const gettingStartedSubcategories: readonly HelpCenterCategory[] = [
  {
    id: 'setup-and-basic-use',
    title: 'Setup and basic use',
    description: 'The starting point for installing, creating, and navigating Bread Wallet.',
    platforms: walletPlatforms
  }
];

const manageWalletSubcategories: readonly HelpCenterCategory[] = [
  {
    id: 'security-and-recovery',
    title: 'Security and recovery',
    description: 'Guidance for protecting wallet access and preparing for recovery.',
    platforms: walletPlatforms
  },
  {
    id: 'sending-receiving-and-claiming',
    title: 'Sending, receiving, and claiming',
    description: 'Help for the wallet’s core asset flows.',
    platforms: walletPlatforms
  },
  {
    id: 'activity-and-transaction-status',
    title: 'Activity and transaction status',
    description: 'Help for reviewing wallet activity and transaction progress.',
    platforms: []
  }
] as const;

export const helpCenterMainCategories: readonly HelpCenterMainCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    subcategories: gettingStartedSubcategories
  },
  {
    id: 'manage-wallet',
    title: 'Manage wallet',
    subcategories: manageWalletSubcategories
  },
  {
    id: 'privacy',
    title: 'Privacy',
    subcategories: [
      {
        id: 'public-and-private-transactions',
        title: 'Public and private transactions',
        description: 'Clear explanations of privacy choices and their effects.',
        platforms: []
      }
    ]
  },
  {
    id: 'guardian',
    title: 'Guardian',
    subcategories: [
      {
        id: 'guardian-protection',
        title: 'Guardian protection',
        description: 'Help for understanding and managing Guardian protection.',
        platforms: []
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    subcategories: [
      {
        id: 'common-issues-and-support',
        title: 'Common issues and support',
        description: 'A route to common fixes and the appropriate support channel.',
        platforms: []
      }
    ]
  }
] as const;
