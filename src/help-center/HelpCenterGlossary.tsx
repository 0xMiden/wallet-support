import { GLOSSARY_TITLE } from './glossary';
import type { HelpCenterGlossaryResolvedEntry } from './glossary';

/**
 * The glossary page's content: its title, then each term and its definition in
 * the order glossary.ts gives them.
 *
 * A description list because that is what the content is: a term, then what it
 * means. Nothing here sorts, groups, collapses or links. The entries are
 * approved copy, and they are shown the way they were written.
 *
 * A term and its definition share one wrapper carrying the anchor, so a link to
 * an entry lands on the term with its definition directly beneath it.
 *
 * Given its entries rather than importing them, so the page can be rendered in
 * a test with entries added or taken away.
 */

export interface HelpCenterGlossaryProps {
  readonly entries: readonly HelpCenterGlossaryResolvedEntry[];
}

export function HelpCenterGlossary({ entries }: HelpCenterGlossaryProps) {
  return (
    <>
      <h1 id="help-center-glossary-title">{GLOSSARY_TITLE}</h1>

      <dl className="help-center-glossary">
        {entries.map(entry => (
          <div className="help-center-glossary-entry" id={entry.anchor} key={entry.id}>
            <dt>{entry.term}</dt>
            <dd>{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
