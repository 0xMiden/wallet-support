import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { helpCenterMainCategories } from './categories';
import {
  GLOSSARY_TITLE,
  glossaryEntryId,
  helpCenterGlossary,
  helpCenterGlossaryEntries,
  resolveGlossary
} from './glossary';
import type { HelpCenterGlossaryEntry } from './glossary';
import { HelpCenterGlossary } from './HelpCenterGlossary';
import { createHelpCenterNavigation } from './navigation';

/*
 * The approved text as Ivan supplied it on 2026-09-10, apostrophe included:
 * "Bread’s" is U+2019, which the paste it arrived in had flattened.
 *
 * A second copy on purpose. glossary.ts is where terms are added, so a check
 * that read its expectations from there would agree with whatever it said.
 * This is checked as an ordered subset: a new term in glossary.ts needs no
 * change here, but rewording, reordering or removing an approved entry does,
 * and that edit should be a deliberate one. The social links in home.test.ts
 * are held the same way.
 */
const APPROVED: readonly HelpCenterGlossaryEntry[] = [
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

// Written straight into `id="glossary-…"` and read back out of the hash.
const HASH_SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/*
 * Rendered to a string rather than into a document: there is no DOM test stack
 * here by Ivan's call, and the question is what markup the page emits, which a
 * string answers. The browser half is e2e/glossary.spec.ts.
 */
function render(entries: readonly HelpCenterGlossaryEntry[]) {
  return renderToStaticMarkup(createElement(HelpCenterGlossary, { entries: resolveGlossary(entries) }));
}

function unescapeHtml(html: string) {
  return html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** What a reader is shown, in document order. */
function readEntries(html: string) {
  const pattern =
    /<div class="help-center-glossary-entry" id="([^"]*)"><dt>([\s\S]*?)<\/dt><dd>([\s\S]*?)<\/dd><\/div>/g;

  return [...html.matchAll(pattern)].map(match => ({
    anchor: match[1] as string,
    term: unescapeHtml(match[2] as string),
    definition: unescapeHtml(match[3] as string)
  }));
}

describe('the approved glossary copy', () => {
  it('keeps every approved entry exactly as supplied, in the supplied order', () => {
    let previous = -1;

    for (const approved of APPROVED) {
      const at = helpCenterGlossary.findIndex(entry => entry.term === approved.term);
      expect(at, `"${approved.term}" is missing from glossary.ts`).toBeGreaterThan(-1);
      expect(helpCenterGlossary[at]?.definition, approved.term).toBe(approved.definition);
      expect(at, `"${approved.term}" has moved ahead of an entry it followed`).toBeGreaterThan(previous);
      previous = at;
    }
  });
});

describe('entry ids and anchors', () => {
  it('derives an id from the term', () => {
    expect(glossaryEntryId('Commitment')).toBe('commitment');
    expect(glossaryEntryId('Intent-based protocol')).toBe('intent-based-protocol');
    expect(glossaryEntryId('Seed phrase (aka recovery phrase)')).toBe('seed-phrase-aka-recovery-phrase');
  });

  it('gives every shipped entry a unique, hash-safe id and a glossary- anchor', () => {
    const ids = helpCenterGlossaryEntries.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const entry of helpCenterGlossaryEntries) {
      expect(entry.id, entry.term).toMatch(HASH_SAFE_ID);
      expect(entry.anchor, entry.term).toBe(`glossary-${entry.id}`);
    }
  });

  it('refuses two terms that would share an anchor', () => {
    expect(() =>
      resolveGlossary([
        { term: 'Private account', definition: 'One.' },
        { term: 'private  account', definition: 'Two.' }
      ])
    ).toThrow(/would share the anchor "glossary-private-account"/);
  });

  it('refuses a term that gives no id at all', () => {
    expect(() => resolveGlossary([{ term: '—', definition: 'Nothing to link to.' }])).toThrow(
      /gives no usable id/
    );
  });
});

describe('the glossary page', () => {
  it('shows the title, then every entry as term and definition, exactly as written', () => {
    const html = render(helpCenterGlossary);

    expect(html).toContain(`<h1 id="help-center-glossary-title">${GLOSSARY_TITLE}</h1>`);
    expect(readEntries(html)).toEqual(
      helpCenterGlossaryEntries.map(({ anchor, term, definition }) => ({ anchor, term, definition }))
    );
    // Every term was read, so nothing rendered in a shape the reader above missed.
    expect(html.match(/<dt>/g)?.length ?? 0).toBe(helpCenterGlossary.length);
  });

  it('keeps the order it is given, and never sorts', () => {
    const reversed = [...helpCenterGlossary].reverse();
    expect(readEntries(render(reversed)).map(entry => entry.term)).toEqual(
      reversed.map(entry => entry.term)
    );
  });

  it('renders an added entry with no other change', () => {
    const extra = { term: 'Example term', definition: 'An example definition, added after the list.' };
    const shown = readEntries(render([...helpCenterGlossary, extra]));

    expect(shown).toHaveLength(helpCenterGlossary.length + 1);
    expect(shown.slice(0, -1).map(entry => entry.term)).toEqual(helpCenterGlossary.map(entry => entry.term));
    expect(shown[shown.length - 1]).toEqual({ anchor: 'glossary-example-term', ...extra });
  });

  it('renders with entries taken away, down to none', () => {
    const fewer = helpCenterGlossary.slice(1);
    expect(readEntries(render(fewer)).map(entry => entry.term)).toEqual(fewer.map(entry => entry.term));

    const none = render([]);
    expect(none).toContain(`<h1 id="help-center-glossary-title">${GLOSSARY_TITLE}</h1>`);
    expect(readEntries(none)).toEqual([]);
  });

  it('shows text as text, never as markup', () => {
    // Definitions are prose. A character HTML treats as syntax has to reach the
    // reader as that character, not as a tag.
    const [shown] = readEntries(render([{ term: 'A <b> tag', definition: 'Uses < and > & "quotes".' }]));
    expect(shown).toMatchObject({ term: 'A <b> tag', definition: 'Uses < and > & "quotes".' });
  });
});

describe('the glossary is not a category', () => {
  const navigation = createHelpCenterNavigation(helpCenterMainCategories);
  const isGlossaryId = (id: string) => id === 'glossary' || id.startsWith('glossary-');

  it('holds no place in the hierarchy, so it takes no number and no step in the reading order', () => {
    // Also what keeps the route safe: routing matches the glossary before any
    // category, so a category with a glossary- id would be unreachable.
    expect(navigation.categories.map(category => category.id).filter(isGlossaryId)).toEqual([]);
    expect(helpCenterMainCategories.map(mainCategory => mainCategory.id).filter(isGlossaryId)).toEqual([]);

    for (const category of navigation.categories) {
      const entry = navigation.resolve(category.id);
      for (const neighbour of [entry?.previous, entry?.next]) {
        if (neighbour) expect(isGlossaryId(neighbour.category.id), category.id).toBe(false);
      }
    }
  });
});
