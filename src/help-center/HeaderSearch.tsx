import { useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { helpCenterMainCategories } from './categories';
import { helpCenterArticles } from './content';
import { articleHref, defaultPlatform, parsePlatform } from './routing';
import { ASK_ENABLED } from './ask';
import { searchHelpCenter } from './search';

/** Short enough to scan without scrolling on a laptop; the rest are a scroll away. */
const SHOWN = 30;

/** The platform the reader is viewing, as the page itself decides it. */
export function readerPlatform() {
  return parsePlatform(window.location.search) ?? defaultPlatform(window.matchMedia?.('(pointer: coarse)').matches ?? false);
}

/**
 * Opens an article from anywhere. On the Help Center page only the address
 * changes, so the page (and Bread Assistant's conversation) stays loaded; from
 * another page, such as All topics, it is a normal visit.
 */
function openArticle(href: string) {
  if (window.location.pathname !== '/') window.location.assign(`/${href}`);
  // The article already open fires no hashchange, so the page would keep showing
  // an earlier search's results over it. Announce the move ourselves.
  else if (window.location.hash === href) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = href;
}

/**
 * The header's search: a round icon that opens a search window over the page,
 * with results as you type. Up and down move through the results, Enter opens
 * one, Esc closes. It searches the same articles, the same way, as the search
 * on the home page.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const results = useMemo(
    () => (open ? searchHelpCenter(helpCenterArticles, helpCenterMainCategories, query, readerPlatform()).slice(0, SHOWN) : []),
    [open, query]
  );
  const typed = query.trim().length >= 2;
  const optionId = (index: number) => `${listId}-${index}`;

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery('');
      setActive(0);
    }
  };

  const choose = (index: number) => {
    const result = results[index];
    if (!result) return;
    changeOpen(false);
    openArticle(articleHref(result.article.subcategory, result.article.id));
  };

  const moveTo = (index: number) => {
    setActive(index);
    document.getElementById(optionId(index))?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveTo((active + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveTo((active - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="public-search-trigger" aria-label="Search the Help Center">
          <Search aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="public-search-overlay" />
        <Dialog.Content
          className="public-search-dialog"
          aria-describedby={undefined}
          onOpenAutoFocus={event => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className="help-center-visually-hidden">Search the Help Center</Dialog.Title>
          <div className="public-search-field">
            <Search aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-label="Search the Help Center"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results.length > 0 ? optionId(active) : undefined}
              placeholder="Search the Help Center…"
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              autoComplete="off"
            />
          </div>

          {/* Always in the page, so a screen reader hears each change in the count. */}
          <p className="help-center-visually-hidden" role="status">
            {typed ? (results.length > 0 ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'No results') : ''}
          </p>
          {/* A Tab stop, so the results can be scrolled from the keyboard as well. */}
          <div className="public-search-body" role="region" tabIndex={0} aria-label="Search results">
            {results.length > 0 ? (
              <ul className="public-search-results" id={listId} role="listbox" ref={listRef} aria-label="Results">
                {results.map((result, index) => (
                  <li
                    key={result.article.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === active}
                    className="public-search-result"
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(index)}
                  >
                    <span className="public-search-result-title">{result.article.title}</span>
                    <span className="public-search-result-where">{result.mainCategoryTitle} › {result.subcategoryTitle}</span>
                    {result.snippet ? <span className="public-search-result-snippet">{result.snippet}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="public-search-empty">
                <Search aria-hidden="true" />
                <p>{typed ? `No articles match “${query.trim()}”. ${ASK_ENABLED ? 'Try another word, or ask Bread Assistant.' : 'Try another word.'}` : 'Start typing to search'}</p>
              </div>
            )}
          </div>

          <div className="public-search-footer" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd>Navigate</span>
            <span><kbd>↵</kbd>Select</span>
            <span><kbd>Esc</kbd>Close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
