import { glossaryEntryAnchor } from './routing';

/**
 * The glossary: terms and their definitions, in the order they are written here.
 *
 * Adding a term is an edit to this array and nothing else. The page, the
 * anchors and the links all read from it, and no test counts it, so the list
 * can grow or shrink without touching code.
 *
 * The text is approved copy and ships as written. Nothing sorts, trims or
 * rewrites it, and it never passes through the Markdown renderer: it is prose
 * for a reader, so it reaches the page as plain text.
 *
 * An entry's id is derived from its term rather than stored beside it, for the
 * reason categories.ts gives for not storing positions: a second answer is free
 * to disagree with the first. The consequence worth knowing is that renaming a
 * term changes its anchor, so a link someone shared to the old one opens the
 * glossary at its top.
 */

/** The page's title, and the label every link to the page uses. */
export const GLOSSARY_TITLE = 'Glossary';

export interface HelpCenterGlossaryEntry {
  readonly term: string;
  readonly definition: string;
}

export interface HelpCenterGlossaryResolvedEntry extends HelpCenterGlossaryEntry {
  /** Derived from the term: lower-case and hyphenated. */
  readonly id: string;
  /** The element id an entry link scrolls to, `glossary-<id>`. */
  readonly anchor: string;
}

export const helpCenterGlossary: readonly HelpCenterGlossaryEntry[] = [
  {
    term: 'Private account',
    definition:
      'A Miden account whose state is kept offchain rather than being publicly recorded on the network. On Miden, accounts are private by default.'
  },
  {
    term: 'Account state',
    definition:
      'The private data that represents an account at a given moment, including its assets, balance and activity.'
  },
  {
    term: 'Commitment',
    definition:
      'A cryptographic fingerprint of the account state. It allows the network to verify that the state has changed without revealing what the state contains.'
  },
  {
    term: 'Hash',
    definition:
      'A fixed-length value generated from data using a cryptographic function. The same input always produces the same hash, while even a very small change in the input produces a very different output. A hash acts like a fingerprint and is designed to be extremely impractical to reverse back into the original data. Miden uses hashes when creating commitments to private account state.'
  },
  {
    term: 'Block explorer',
    definition:
      'A tool for viewing the information publicly recorded on a blockchain.'
  },
  {
    term: 'Guardian',
    definition:
      'A third-party service that backs up private account state and coordinates account updates and recovery actions. At the current stage of development, the operator can see the state of a Guardian-backed account but cannot move its funds on its own.'
  },
  {
    term: 'Key',
    definition:
      'A value used by cryptographic software to authorize or verify actions. Keys commonly come in related pairs: a private key that must be kept secret and a public key that can be shared. This setup is widely used in internet security and crypto wallets. Bread uses the everyday and emergency keys for wallet actions, while the Guardian key acknowledges state updates.'
  },
  {
    term: 'Seed phrase (aka recovery phrase)',
    definition:
      'A sequence of words containing the information needed to recreate one or more private keys. In Bread, the recovery phrase recreates the emergency key on a new device. The phrase is the backup used to rebuild the key, rather than the key itself.'
  },
  {
    term: 'Signing',
    definition:
      'Using a private key to create a cryptographic signature linked to specific data, such as a transaction. It works like a tamper-evident stamp: the corresponding public key can verify that someone controlling the private key signed that exact data. Changing any part of the transaction invalidates the signature, while the private key remains hidden.'
  },
  {
    term: 'Solver',
    definition:
      'A service that fulfills requests such as moving or swapping assets across chains. In Bread’s faster route, the solver briefly holds the funds while completing the request.'
  },
  {
    term: 'Intent-based protocol',
    definition:
      'A system where the user specifies the outcome they want and a solver handles the steps needed to complete it. Bread can use intent-based protocols such as Epoch or NEAR Intents for its faster crosschain route.'
  },
  {
    term: 'Bridge',
    definition:
      'A system for moving assets between blockchains. Bread can use fast solver-based routes through Epoch or NEAR Intents, or canonical bridges: CCTP for USDCx and Agglayer for other assets.'
  }
];

export function glossaryEntryId(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Gives each entry its id and anchor, in the order given. Throws when two terms
 * would share an anchor or a term yields none: either one is a link that cannot
 * say which definition it means.
 */
export function resolveGlossary(
  entries: readonly HelpCenterGlossaryEntry[]
): readonly HelpCenterGlossaryResolvedEntry[] {
  const terms = new Map<string, string>();

  return entries.map(entry => {
    const id = glossaryEntryId(entry.term);
    if (!id) {
      throw new Error(`Help Center glossary: the term "${entry.term}" gives no usable id.`);
    }

    const clash = terms.get(id);
    if (clash !== undefined) {
      throw new Error(
        `Help Center glossary: "${entry.term}" and "${clash}" would share the anchor "${glossaryEntryAnchor(id)}".`
      );
    }
    terms.set(id, entry.term);

    return { ...entry, id, anchor: glossaryEntryAnchor(id) };
  });
}

export const helpCenterGlossaryEntries: readonly HelpCenterGlossaryResolvedEntry[] =
  resolveGlossary(helpCenterGlossary);
