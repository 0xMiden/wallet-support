import { useEffect, useMemo, useState } from 'react';

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
import { articleHref, categoryHref, parseRoute } from './routing';
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
  const [activePlatform, setActivePlatform] = useState<HelpCenterPlatform>('extension-desktop');
  const [openMainCategoryIds, setOpenMainCategoryIds] = useState<ReadonlySet<string>>(
    () => new Set(defaultMainCategoryId ? [defaultMainCategoryId] : [])
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      const route = routeFromHash(window.location.hash);
      // Not a route — an in-document anchor such as the skip link. Leave the
      // reader where they are rather than sending them to the first page.
      if (route === null) return;

      const nextMainCategoryId = navigation.resolve(route.categoryId)?.mainCategory.id;

      setActiveCategoryId(previous => {
        if (previous !== route.categoryId) window.scrollTo({ top: 0 });
        return route.categoryId;
      });
      setActiveArticleId(previous => {
        if (previous !== route.articleId) window.scrollTo({ top: 0 });
        return route.articleId;
      });
      if (nextMainCategoryId) {
        setOpenMainCategoryIds(current => new Set(current).add(nextMainCategoryId));
      }
      setIsMobileMenuOpen(false);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const visibleMainCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return helpCenterMainCategories;

    return helpCenterMainCategories
      .map(mainCategory => {
        if (mainCategory.title.toLocaleLowerCase().includes(normalizedQuery)) return mainCategory;

        return {
          ...mainCategory,
          subcategories: mainCategory.subcategories.filter(category =>
            category.title.toLocaleLowerCase().includes(normalizedQuery)
          )
        };
      })
      .filter(mainCategory => mainCategory.subcategories.length > 0);
  }, [query]);

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

  const platformLabel = activePlatform === 'extension-desktop' ? 'Extension' : 'Mobile';

  return (
    <div className="help-center-shell">
      <a className="help-center-skip-link" href="#help-center-content">
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
      >
        <a className="help-center-brand help-center-desktop-brand" href={`#${defaultCategoryId}`}>
          <img src={breadMark} alt="" />
          <span>
            Bread Wallet
            <small>Help Center</small>
          </span>
        </a>

        <nav aria-label="Help Center categories" className="help-center-navigation">
          {visibleMainCategories.length > 0 ? (
            visibleMainCategories.map(mainCategory => {
              const isSearchActive = query.trim().length > 0;
              const isGroupOpen = isSearchActive || openMainCategoryIds.has(mainCategory.id);
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

      <main className="help-center-main" id="help-center-content">
        <div className="help-center-main-inner">
          <div className="help-center-utility-bar">
            <label className="help-center-search">
              <span className="help-center-visually-hidden">Search Help Center categories</span>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search Help Center categories..."
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

          <section className="help-center-category" aria-labelledby="help-center-category-title">
            {activeArticle ? (
              <a className="help-center-back" href={categoryHref(entry.category.id)}>
                <span aria-hidden="true">
                  <ChevronIcon direction="left" />
                </span>
                Back to {entry.category.title}
              </a>
            ) : null}

            {activeArticle ? (
              <p className="help-center-eyebrow">
                {entry.mainCategory.title} <span aria-hidden="true">/</span>{' '}
                <a className="help-center-eyebrow-link" href={categoryHref(entry.category.id)}>
                  {entry.category.title}
                </a>
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
                  onClick={() => setActivePlatform('extension-desktop')}
                >
                  Extension
                </button>
                <button
                  id="mobile-tab"
                  type="button"
                  role="tab"
                  aria-selected={activePlatform === 'mobile'}
                  aria-controls="category-content-panel"
                  onClick={() => setActivePlatform('mobile')}
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
              className={`help-center-content-panel help-center-bread-card${
                showPlatformTabs ? ' has-platform-tabs' : ' is-category-overview'
              }${activeArticle ? ' is-article' : ' is-index'}`}
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
              <div className="help-center-panel-label">
                <img src={breadMark} alt="" />
                <span>{showPlatformTabs ? platformLabel : 'Bread Wallet guide'}</span>
              </div>

              {activeArticle ? (
                /* Every tag and attribute here is emitted by renderMarkdown, which
                   escapes all text and refuses any construct it does not know. */
                <div
                  className="help-center-article-body"
                  dangerouslySetInnerHTML={{ __html: articleHtml }}
                />
              ) : cards.length > 0 ? (
                <ul className="help-center-article-list">
                  {cards.map((card, cardIndex) => (
                    <li key={card.id}>
                      <a className="help-center-article-row" href={card.href}>
                        <span className="help-center-article-marker" aria-hidden="true">
                          {formatIndex(cardIndex + 1)}
                        </span>
                        <h2 className="help-center-article-title">{card.title}</h2>
                        <p className="help-center-article-excerpt">{card.excerpt}</p>
                        <span className="help-center-article-open" aria-hidden="true">
                          <ChevronIcon />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="help-center-empty-articles" role="status">
                  No articles for {listPlatform === 'extension-desktop' ? 'Extension' : 'Mobile'} yet.
                </p>
              )}
            </div>

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
