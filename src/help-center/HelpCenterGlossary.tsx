import { useState } from 'react';

import { GLOSSARY_TITLE } from './glossary';
import type { HelpCenterGlossaryResolvedEntry } from './glossary';

/**
 * The glossary page's content: its title, a filter, then each term and its
 * definition in the order glossary.ts gives them.
 *
 * Laid out as a two-column table of term and definition, but a description list
 * underneath, so a screen reader hears a term and then what it means; the
 * header row is for the eye only. Nothing here sorts, groups or collapses. The
 * entries are approved copy, and they are shown as written.
 *
 * Two interactions, both about finding a term. The filter narrows the list to
 * the entries whose term or definition contains what was typed. Each term links
 * to its own entry, so a definition can be shared, and the entry the address
 * points at is marked. That entry stays in the list whatever the filter says,
 * because the page scrolls to it and a link must find what it names.
 *
 * Given its entries rather than importing them, so the page can be rendered in
 * a test with entries added or taken away.
 */

export interface HelpCenterGlossaryProps {
  readonly entries: readonly HelpCenterGlossaryResolvedEntry[];
  /** The entry the address points at, if any. */
  readonly currentEntryId?: string;
}

export function HelpCenterGlossary({ entries, currentEntryId }: HelpCenterGlossaryProps) {
  const [filter, setFilter] = useState('');

  const query = filter.trim().toLowerCase();
  const matches = (entry: HelpCenterGlossaryResolvedEntry) =>
    entry.term.toLowerCase().includes(query) || entry.definition.toLowerCase().includes(query);
  const shown = query ? entries.filter(entry => entry.id === currentEntryId || matches(entry)) : entries;
  const nothingMatches = query !== '' && !entries.some(matches);

  return (
    <>
      <h1 id="help-center-glossary-title">{GLOSSARY_TITLE}</h1>

      <label className="help-center-search help-center-glossary-filter">
        <span className="help-center-visually-hidden">Filter the glossary</span>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <input
          type="search"
          value={filter}
          onChange={event => setFilter(event.target.value)}
          placeholder="Filter terms…"
          autoComplete="off"
        />
      </label>

      <div className="help-center-glossary-table">
        <div className="help-center-glossary-head" aria-hidden="true">
          <span>Term</span>
          <span>Definition</span>
        </div>

        <dl className="help-center-glossary">
          {shown.map(entry => (
            <div
              className={
                entry.id === currentEntryId ? 'help-center-glossary-entry is-current' : 'help-center-glossary-entry'
              }
              id={entry.anchor}
              key={entry.id}
            >
              <dt>
                <a href={`#${entry.anchor}`}>{entry.term}</a>
              </dt>
              <dd>{entry.definition}</dd>
            </div>
          ))}
        </dl>

        {nothingMatches ? (
          <p className="help-center-glossary-empty" role="status">
            No terms match “{filter.trim()}”.
          </p>
        ) : null}
      </div>
    </>
  );
}
