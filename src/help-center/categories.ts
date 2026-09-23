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
 *
 * A main category's description summarises the subcategories beneath it. It is
 * stored rather than generated because concatenating three subcategory
 * sentences produces a paragraph, not a summary — but it is written from them,
 * so the two cannot describe different topics. Article counts are never stored
 * here; content.ts counts the articles.
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
    description: 'Install Bread Wallet, create your first account, and find your way around.',
    subcategories: gettingStartedSubcategories
  },
  {
    id: 'manage-wallet',
    title: 'Manage wallet',
    description:
      'Protect access to your wallet, move assets, and follow a transaction through to arrival.',
    subcategories: manageWalletSubcategories
  },
  {
    id: 'privacy',
    title: 'Privacy',
    description: 'Understand public and private transactions, and what each one reveals.',
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
    description: 'Learn what Guardian backs up, how recovery works, and what it can never do.',
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
    description: 'Work through the common problems, and reach support when you need a person.',
    subcategories: [
      {
        id: 'common-issues-and-support',
        title: 'Common issues',
        description: 'A route to common fixes and the appropriate support channel.'
      }
    ]
  },
  {
    id: 'cross-chain',
    title: 'Cross-chain',
    description: 'Send and swap across chains, and compare the routes.',
    subcategories: [
      {
        id: 'moving-across-chains',
        title: 'Moving across chains',
        description: 'Help for sending and swapping funds between Miden and other chains.'
      }
    ]
  },
  {
    id: 'earning',
    title: 'Earn',
    description: 'See how earning yield works in Bread Wallet, and how it affects privacy.',
    subcategories: [
      {
        id: 'earn',
        title: 'Earning yield',
        description: 'How earning yield works in Bread Wallet, and what is visible while funds earn.'
      }
    ]
  }
] as const;
