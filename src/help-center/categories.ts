import type { HelpCenterCategory, HelpCenterMainCategory } from './types';

/**
 * The category model is intentionally separate from the UI. The same records
 * can later be sourced from Markdown, JSON, or the Bread Wallet website.
 *
 * Reading order is array order. There is deliberately no `order` field: a
 * position stored beside the data is a second source of truth, and the two
 * disagreeing is exactly how one subcategory came to render as 01 in the
 * sidebar and 02 on the previous/next card.
 *
 * Platform applicability is not stored here either. Whether a subcategory
 * offers a platform choice is a fact about its articles, so content.ts derives
 * it from them; a field here would be a second answer free to disagree.
 */
const gettingStartedSubcategories: readonly HelpCenterCategory[] = [
  {
    id: 'setup-and-basic-use',
    title: 'Setup and basic use',
    description: 'The starting point for installing, creating, and navigating Bread Wallet.'
  }
];

const manageWalletSubcategories: readonly HelpCenterCategory[] = [
  {
    id: 'security-and-recovery',
    title: 'Security and recovery',
    description: 'Guidance for protecting wallet access and preparing for recovery.'
  },
  {
    id: 'sending-receiving-and-claiming',
    title: 'Sending, receiving, and claiming',
    description: 'Help for the wallet’s core asset flows.'
  },
  {
    id: 'activity-and-transaction-status',
    title: 'Activity and transaction status',
    description: 'Help for reviewing wallet activity and transaction progress.'
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
        description: 'Clear explanations of privacy choices and their effects.'
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
        description: 'Help for understanding and managing Guardian protection.'
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
        description: 'A route to common fixes and the appropriate support channel.'
      }
    ]
  }
] as const;

/**
 * The one category whose articles offer a direct route to a person. Support is
 * the subject there, so the prompt belongs on those pages and nowhere else.
 *
 * Named here rather than written into the component so a rename of the
 * category breaks a test instead of silently removing the prompt.
 */
export const supportCategoryId = 'troubleshooting';
