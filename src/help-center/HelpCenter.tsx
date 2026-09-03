import { useEffect, useMemo, useRef, useState } from 'react';

import breadMark from './assets/bread-mark.svg';
import { helpCenterMainCategories } from './categories';
import {
  articleExcerpt,
  articlesFor,
  articlesInSubcategory,
  findArticle,
  helpCenterArticles,
  subcategoryNeedsPlatformChoice
} from './content';
import { renderMarkdown } from './markdown';
import { createHelpCenterNavigation } from './navigation';
import { searchHelpCenter } from './search';
import {
  articleHref,
  categoryHref,
  defaultPlatform,
  parsePlatform,
  parseRoute,
  platformSearch
} from './routing';
import type { HelpCenterPlatform } from './types';
import './help-center.css';

/** Approved destination for the support intake (content proposal §3A). */
const CONTACT_SUPPORT_URL = 'https://miden-feedback-v2.miden-feedback-relay.workers.dev/';

/**
 * Positions are never computed in this file. Every index, total, and
 * previous/next relationship on the page is read from the navigation module,
 * which derives all of them from one hierarchy.
 */
const navigation = createHelpCenterNavigation(helpCenterMainCategories);

const firstCategoryId = navigation.firstCategoryId;
if (firstCategoryId === undefined) {
  throw new Error('Help Center: the category hierarchy contains no categories.');
}

const defaultCategoryId: string = firstCategoryId;
const defaultMainCategoryId = navigation.resolve(defaultCategoryId)?.mainCategory.id;

/** Wires the pure router in routing.ts to this page's data. */
function routeFromHash(hash: string) {
  return parseRoute(hash, {
    hasCategory: categoryId => navigation.has(categoryId),
    hasArticle: (categoryId, articleId) =>
      findArticle(helpCenterArticles, categoryId, articleId) !== undefined,
    fallbackCategoryId: defaultCategoryId
  });
}

interface SequenceLink {
  href: string;
  title: string;
  index: number;
  /** Set only when moving here leaves the current main category. */
  crossesInto?: string;
}

function formatIndex(index: number) {
  return String(index).padStart(2, '0');
}

function ChevronIcon({ direction = 'right' }: { direction?: 'down' | 'left' | 'right' }) {
  const rotation = direction === 'down' ? 90 : direction === 'left' ? 180 : 0;

  return (
    <svg
      aria-hidden="true"
      className="help-center-icon"
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="help-center-menu-icon" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="help-center-menu-icon" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg aria-hidden="true" className="help-center-contact-icon" viewBox="0 0 24 24">
      <path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg aria-hidden="true" className="help-center-contact-icon" viewBox="0 0 24 24">
      <path d="M5 6.5h14v9H9l-4 3v-12Z" />
    </svg>
  );
}

export function HelpCenter() {
  const [activeCategoryId, setActiveCategoryId] = useState(defaultCategoryId);
  const [activeArticleId, setActiveArticleId] = useState<string | undefined>(undefined);
  const [activePlatform, setActivePlatform] = useState<HelpCenterPlatform>(
    () =>
      parsePlatform(window.location.search) ??
      defaultPlatform(window.matchMedia?.('(pointer: coarse)').matches ?? false)
  );

  const choosePlatform = (platform: HelpCenterPlatform) => {
    setActivePlatform(platform);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${platformSearch(platform)}${window.location.hash}`
    );
  };
  const [openMainCategoryIds, setOpenMainCategoryIds] = useState<ReadonlySet<string>>(
    () => new Set(defaultMainCategoryId ? [defaultMainCategoryId] : [])
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [helpful, setHelpful] = useState<'yes' | 'no' | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const lastRoute = useRef<string | null>(null);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const route = routeFromHash(window.location.hash);
      // Not a route — an in-document anchor such as the skip link. Leave the
      // reader where they are rather than sending them to the first page.
      if (route === null) return;

      const nextMainCategoryId = navigation.resolve(route.categoryId)?.mainCategory.id;

      const key = `${route.categoryId}/${route.articleId ?? ''}`;
      if (lastRoute.current !== null && lastRoute.current !== key) window.scrollTo({ top: 0 });
      lastRoute.current = key;

      setActiveCategoryId(route.categoryId);
      setActiveArticleId(route.articleId);
      if (nextMainCategoryId) setOpenMainCategoryIds(new Set([nextMainCategoryId]));
      setIsMobileMenuOpen(false);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMobileMenuOpen(false);
      menuButton.current?.focus();
    };

    window.addEventListener('keydown', closeOnEscape);
    // Not the first focusable in the DOM: that is the desktop brand link, which
    // is display:none at drawer widths and silently refuses focus.
    sidebar.current?.querySelector<HTMLElement>('.help-center-navigation-heading')?.focus();
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMobileMenuOpen]);

  // A verdict belongs to the article it was given about.
  useEffect(() => {
    setHelpful(null);
    setLinkCopied(false);
  }, [activeArticleId]);

  const copyArticleLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
    } catch {
      // Clipboard access can be refused; leave the label unchanged rather than
      // claiming a copy that did not happen.
    }
  };

  const searchQuery = query.trim();
  const isSearching = searchQuery.length > 0;

  // Only reachable if a category disappears from the hierarchy while its id is
  // still selected. The navigation module has already thrown in development and
  // logged in production; the page must not invent a position to replace it.
  const entry = navigation.resolve(activeCategoryId);

  const activeArticle =
    entry && activeArticleId
      ? findArticle(helpCenterArticles, entry.category.id, activeArticleId)
      : undefined;

  // In a subcategory, the choice is offered when its articles differ by platform.
  // Inside one article, only when that article itself differs — otherwise the
  // reader is asked to choose between two identical pages.
  const showPlatformTabs =
    entry !== undefined &&
    (activeArticle
      ? activeArticle.platforms.length === 2 &&
        activeArticle.bodies['extension-desktop'] !== activeArticle.bodies.mobile
      : subcategoryNeedsPlatformChoice(helpCenterArticles, entry.category.id));

  const listPlatform: HelpCenterPlatform = showPlatformTabs ? activePlatform : 'extension-desktop';
  const bodyPlatform: HelpCenterPlatform = activeArticle
    ? activeArticle.platforms.includes(activePlatform)
      ? activePlatform
      : (activeArticle.platforms[0] as HelpCenterPlatform)
    : listPlatform;

  const articleHtml = useMemo(
    () =>
      activeArticle
        ? renderMarkdown(activeArticle.bodies[bodyPlatform] ?? '', `${activeArticle.id} (${bodyPlatform})`)
        : '',
    [activeArticle?.id, bodyPlatform]
  );

  const searchResults = useMemo(
    () =>
      isSearching
        ? searchHelpCenter(helpCenterArticles, helpCenterMainCategories, searchQuery, listPlatform)
        : [],
    [isSearching, searchQuery, listPlatform]
  );

  const cards = useMemo(() => {
    if (!entry || activeArticle) return [];
    const selected = showPlatformTabs
      ? articlesFor(helpCenterArticles, entry.category.id, activePlatform)
      : articlesInSubcategory(helpCenterArticles, entry.category.id);

    return selected.map(article => ({
      id: article.id,
      title: article.title,
      href: articleHref(entry.category.id, article.id),
      excerpt: articleExcerpt(article.bodies[listPlatform] ?? article.bodies['extension-desktop'] ?? '')
    }));
  }, [entry?.category.id, activeArticle?.id, showPlatformTabs, activePlatform, listPlatform]);

  // Inside an article the sequence walks its siblings; on a subcategory page it
  // walks subcategories. Both are rendered by the same markup below.
  // Deliberately the subcategory's own rule, not this article's. The grid the
  // reader came from was filtered that way, so walking a different list would
  // offer them an article that was never in it.
  const siblingArticles =
    entry && activeArticle
      ? subcategoryNeedsPlatformChoice(helpCenterArticles, entry.category.id)
        ? articlesFor(helpCenterArticles, entry.category.id, activePlatform)
        : articlesInSubcategory(helpCenterArticles, entry.category.id)
      : [];
  const articleIndex = activeArticle
    ? siblingArticles.findIndex(article => article.id === activeArticle.id)
    : -1;

  const previousLink: SequenceLink | undefined = activeArticle
    ? articleIndex > 0
      ? {
          href: articleHref(entry?.category.id ?? '', (siblingArticles[articleIndex - 1] as { id: string }).id),
          title: (siblingArticles[articleIndex - 1] as { title: string }).title,
          index: articleIndex
        }
      : undefined
    : entry?.previous
      ? {
          href: categoryHref(entry.previous.category.id),
          title: entry.previous.category.title,
          index: entry.previous.localIndex,
          ...(entry.previous.crossesMainCategory
            ? { crossesInto: entry.previous.mainCategory.title }
            : {})
        }
      : undefined;

  const nextLink: SequenceLink | undefined = activeArticle
    ? articleIndex >= 0 && articleIndex < siblingArticles.length - 1
      ? {
          href: articleHref(entry?.category.id ?? '', (siblingArticles[articleIndex + 1] as { id: string }).id),
          title: (siblingArticles[articleIndex + 1] as { title: string }).title,
          index: articleIndex + 2
        }
      : undefined
    : entry?.next
      ? {
          href: categoryHref(entry.next.category.id),
          title: entry.next.category.title,
          index: entry.next.localIndex,
          ...(entry.next.crossesMainCategory ? { crossesInto: entry.next.mainCategory.title } : {})
        }
      : undefined;

  const sequenceNoun = activeArticle ? 'article' : 'subcategory';

  if (!entry) {
    return (
      <div className="help-center-shell">
        <main className="help-center-main" id="help-center-content">
          <div className="help-center-main-inner">
            <section className="help-center-category">
              <h1>Category unavailable</h1>
              <p className="help-center-category-description">
                This category is no longer part of the Help Center.{' '}
                <a href={`#${defaultCategoryId}`}>Return to the first category</a>.
              </p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const toggleMainCategory = (mainCategoryId: string) => {
    setOpenMainCategoryIds(current => {
      const next = new Set(current);
      if (next.has(mainCategoryId)) next.delete(mainCategoryId);
      else next.add(mainCategoryId);
      return next;
    });
  };


  return (
    <div className="help-center-shell">
      <a
        className="help-center-skip-link"
        href="#help-center-content"
        onClick={event => {
          event.preventDefault();
          document.getElementById('help-center-content')?.focus();
        }}
      >
        Skip to content
      </a>

      <header className="help-center-mobile-header">
        <a className="help-center-brand" href={`#${defaultCategoryId}`} aria-label="Bread Wallet Help Center home">
          <img src={breadMark} alt="" />
          <span>
            Bread Wallet
            <small>Help Center</small>
          </span>
        </a>
        <button
          className="help-center-menu-button"
          type="button"
          ref={menuButton}
          aria-controls="help-center-sidebar"
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setIsMobileMenuOpen(current => !current)}
        >
          {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      <button
        aria-label="Close navigation"
        className={`help-center-backdrop${isMobileMenuOpen ? ' is-visible' : ''}`}
        type="button"
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <aside
        className={`help-center-sidebar${isMobileMenuOpen ? ' is-open' : ''}`}
        id="help-center-sidebar"
        ref={sidebar}
        aria-label="Help Center navigation"
      >
        <a className="help-center-brand help-center-desktop-brand" href={`#${defaultCategoryId}`}>
          <img src={breadMark} alt="" />
          <span>
            Bread Wallet
            <small>Help Center</small>
          </span>
        </a>

        <nav aria-label="Help Center categories" className="help-center-navigation">
          {helpCenterMainCategories.length > 0 ? (
            helpCenterMainCategories.map(mainCategory => {
              const isGroupOpen = openMainCategoryIds.has(mainCategory.id);
              const isActiveGroup = mainCategory.id === entry.mainCategory.id;
              const panelId = `${mainCategory.id}-subcategories`;
              const mainCategoryIndex = navigation.mainCategoryIndex(mainCategory.id);

              return (
                <section className="help-center-navigation-group" key={mainCategory.id}>
                  <button
                    className={`help-center-navigation-heading${isActiveGroup ? ' is-active' : ''}`}
                    type="button"
                    aria-expanded={isGroupOpen}
                    aria-controls={panelId}
                    onClick={() => toggleMainCategory(mainCategory.id)}
                  >
                    <span className="help-center-main-category-label">
                      {mainCategoryIndex === undefined ? null : (
                        <span className="help-center-main-category-number">
                          {formatIndex(mainCategoryIndex)}
                        </span>
                      )}
                      <span>{mainCategory.title}</span>
                    </span>
                    <ChevronIcon direction={isGroupOpen ? 'down' : 'right'} />
                  </button>

                  <div id={panelId} hidden={!isGroupOpen}>
                    {mainCategory.subcategories.length > 0 ? (
                      <ol className="help-center-category-list">
                        {mainCategory.subcategories.map(category => {
                          // Read from the hierarchy, not from this list: under an
                          // active search this list is filtered, and a render index
                          // would renumber the categories that survive the filter.
                          const localIndex = navigation.resolve(category.id)?.localIndex;

                          return (
                            <li key={category.id}>
                              <a
                                className={category.id === entry.category.id ? 'is-active' : undefined}
                                href={`#${category.id}`}
                                aria-current={category.id === entry.category.id ? 'page' : undefined}
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {localIndex === undefined ? null : (
                                  <span className="help-center-category-number">{formatIndex(localIndex)}</span>
                                )}
                                <span>{category.title}</span>
                                <ChevronIcon />
                              </a>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className="help-center-empty-group">No pages yet</p>
                    )}
                  </div>
                </section>
              );
            })
          ) : (
            <p className="help-center-no-results">No matching categories.</p>
          )}
        </nav>

        <p className="help-center-sidebar-status">Category structure · Draft</p>
      </aside>

      <main className="help-center-main" id="help-center-content" tabIndex={-1}>
        <div className="help-center-main-inner">
          <div className="help-center-utility-bar">
            <label className="help-center-search">
              <span className="help-center-visually-hidden">Search the Help Center</span>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search articles and categories…"
              />
            </label>

            <a
              className="help-center-contact-button"
              href={CONTACT_SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Contact Support</span>
              <SupportIcon />
            </a>
          </div>

          {isSearching ? (
            <section className="help-center-category" aria-label="Search results">
              <p className="help-center-eyebrow">Search</p>
              <h1>
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for “
                {searchQuery}”
              </h1>

              {searchResults.length > 0 ? (
                <ul className="help-center-card-grid">
                  {searchResults.map(result => (
                    <li key={result.article.id}>
                      <div className="help-center-card">
                        <span className="help-center-card-context">
                          {result.mainCategoryTitle} <span aria-hidden="true">·</span>{' '}
                          {result.subcategoryTitle}
                        </span>
                        <h2 className="help-center-card-title">
                          <a
                            className="help-center-card-link"
                            href={articleHref(result.article.subcategory, result.article.id)}
                          >
                            {result.article.title}
                          </a>
                        </h2>
                        <p className="help-center-card-excerpt">{result.snippet}</p>
                        <span className="help-center-card-open" aria-hidden="true">
                          <ChevronIcon />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="help-center-no-results" role="status">
                  Nothing matched “{searchQuery}”. Try a different word, or pick a category from the
                  navigation.
                </p>
              )}
            </section>
          ) : null}

          <section
            className="help-center-category"
            hidden={isSearching}
            aria-labelledby="help-center-category-title"
          >
            {activeArticle ? (
              <a
                className="help-center-back"
                href={categoryHref(entry.category.id)}
                aria-label={`Back to ${entry.category.title}`}
                title={`Back to ${entry.category.title}`}
              >
                <ChevronIcon direction="left" />
              </a>
            ) : null}

            {activeArticle ? (
              <p className="help-center-eyebrow">
                {entry.mainCategory.title} <span aria-hidden="true">/</span>{' '}
                {entry.category.title}
              </p>
            ) : (
              <p className="help-center-eyebrow">
                {entry.mainCategory.title} <span aria-hidden="true">/</span> Subcategory{' '}
                {entry.localIndex} of {entry.siblingCount}
              </p>
            )}

            <h1 id="help-center-category-title">
              {activeArticle ? activeArticle.title : entry.category.title}
            </h1>

            {activeArticle ? null : (
              <p className="help-center-category-description">{entry.category.description}</p>
            )}

            {showPlatformTabs ? (
              <div className="help-center-platform-tabs" role="tablist" aria-label="Platform">
                <button
                  id="extension-desktop-tab"
                  type="button"
                  role="tab"
                  aria-selected={activePlatform === 'extension-desktop'}
                  aria-controls="category-content-panel"
                  onClick={() => choosePlatform('extension-desktop')}
                >
                  Extension
                </button>
                <button
                  id="mobile-tab"
                  type="button"
                  role="tab"
                  aria-selected={activePlatform === 'mobile'}
                  aria-controls="category-content-panel"
                  onClick={() => choosePlatform('mobile')}
                >
                  Mobile
                </button>
              </div>
            ) : null}

            {activeArticle && activeArticle.platforms.length === 1 ? (
              <p className="help-center-platform-note">
                {activeArticle.platforms[0] === 'extension-desktop' ? 'Extension only' : 'Mobile only'}
              </p>
            ) : null}

            <div
              className={`help-center-content-panel${showPlatformTabs ? ' has-platform-tabs' : ''}${
                activeArticle ? '' : ' is-index'
              }`}
              id="category-content-panel"
              role={showPlatformTabs ? 'tabpanel' : 'region'}
              aria-labelledby={
                showPlatformTabs
                  ? activePlatform === 'extension-desktop'
                    ? 'extension-desktop-tab'
                    : 'mobile-tab'
                  : 'help-center-category-title'
              }
            >
              {activeArticle ? (
                /* Every tag and attribute here is emitted by renderMarkdown, which
                   escapes all text and refuses any construct it does not know. */
                <div
                  className="help-center-article-body"
                  dangerouslySetInnerHTML={{ __html: articleHtml }}
                />
              ) : cards.length > 0 ? (
                <ul className="help-center-card-grid">
                  {cards.map((card, cardIndex) => (
                    <li key={card.id}>
                      <div className="help-center-card">
                        <span className="help-center-card-index" aria-hidden="true">
                          {formatIndex(cardIndex + 1)}
                        </span>
                        <h2 className="help-center-card-title">
                          <a className="help-center-card-link" href={card.href}>
                            {card.title}
                          </a>
                        </h2>
                        <p className="help-center-card-excerpt">{card.excerpt}</p>
                        <span className="help-center-card-open" aria-hidden="true">
                          <ChevronIcon />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="help-center-empty-articles" role="status">
                  No articles for {listPlatform === 'extension-desktop' ? 'Extension' : 'Mobile'} yet.
                </p>
              )}
            </div>

            {activeArticle ? (
              <div className="help-center-article-footer">
                {helpful === null ? (
                  <div className="help-center-helpful">
                    <span id="help-center-helpful-label">Was this helpful?</span>
                    <button
                      type="button"
                      aria-describedby="help-center-helpful-label"
                      onClick={() => setHelpful('yes')}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      aria-describedby="help-center-helpful-label"
                      onClick={() => setHelpful('no')}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <p className="help-center-helpful-reply" role="status">
                    {helpful === 'yes' ? (
                      'Thanks — good to know.'
                    ) : (
                      <>
                        Sorry about that.{' '}
                        <a href={CONTACT_SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                          Tell us what was missing
                        </a>
                        .
                      </>
                    )}
                  </p>
                )}

                <button className="help-center-copy-link" type="button" onClick={copyArticleLink}>
                  <LinkIcon />
                  <span>{linkCopied ? 'Link copied' : 'Copy link'}</span>
                </button>
              </div>
            ) : null}

            <nav
              className="help-center-sequence"
              aria-label={activeArticle ? 'Article sequence' : 'Category sequence'}
            >
              {previousLink ? (
                <a
                  className="help-center-sequence-card is-previous"
                  href={previousLink.href}
                  aria-label={
                    previousLink.crossesInto
                      ? `Previous ${sequenceNoun}: ${previousLink.title}, in ${previousLink.crossesInto}`
                      : `Previous ${sequenceNoun}: ${previousLink.title}`
                  }
                >
                  <span className="help-center-sequence-button" aria-hidden="true">
                    <ChevronIcon direction="left" />
                  </span>
                  <span className="help-center-sequence-copy">
                    <span className="help-center-sequence-meta">
                      <span className="help-center-sequence-index">{formatIndex(previousLink.index)}</span>
                      Previous {sequenceNoun}
                      {previousLink.crossesInto ? (
                        <span className="help-center-sequence-category">{previousLink.crossesInto}</span>
                      ) : null}
                    </span>
                    <strong>{previousLink.title}</strong>
                  </span>
                </a>
              ) : (
                <div className="help-center-sequence-spacer" aria-hidden="true" />
              )}

              {nextLink ? (
                <a
                  className="help-center-sequence-card is-next"
                  href={nextLink.href}
                  aria-label={
                    nextLink.crossesInto
                      ? `Next ${sequenceNoun}: ${nextLink.title}, in ${nextLink.crossesInto}`
                      : `Next ${sequenceNoun}: ${nextLink.title}`
                  }
                >
                  <span className="help-center-sequence-copy">
                    <span className="help-center-sequence-meta">
                      Next {sequenceNoun}
                      {nextLink.crossesInto ? (
                        <span className="help-center-sequence-category">{nextLink.crossesInto}</span>
                      ) : null}
                      <span className="help-center-sequence-index">{formatIndex(nextLink.index)}</span>
                    </span>
                    <strong>{nextLink.title}</strong>
                  </span>
                  <span className="help-center-sequence-button" aria-hidden="true">
                    <ChevronIcon />
                  </span>
                </a>
              ) : (
                <div className="help-center-sequence-spacer" aria-hidden="true" />
              )}
            </nav>
          </section>

          <footer className="help-center-security-reminder">
            <strong>Security reminder</strong>
            <span>
              Bread Wallet support will never ask for your recovery phrase, private key, password, Guardian
              authentication information, or another wallet secret.
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
