import { useEffect, useMemo, useState } from 'react';

import breadMark from './assets/bread-mark.svg';
import { helpCenterCategories, helpCenterMainCategories } from './categories';
import type { HelpCenterPlatform } from './types';
import './help-center.css';

const defaultCategoryId = helpCenterCategories[0].id;

function categoryIdFromHash(hash: string) {
  const candidate = hash.replace(/^#\/?/, '');
  return helpCenterCategories.some(category => category.id === candidate) ? candidate : defaultCategoryId;
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
  const [activePlatform, setActivePlatform] = useState<HelpCenterPlatform>('extension-desktop');
  const [openMainCategoryIds, setOpenMainCategoryIds] = useState<ReadonlySet<string>>(
    () => new Set(['getting-started'])
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      const nextCategoryId = categoryIdFromHash(window.location.hash);
      const nextMainCategory = helpCenterMainCategories.find(mainCategory =>
        mainCategory.subcategories.some(category => category.id === nextCategoryId)
      );

      setActiveCategoryId(nextCategoryId);
      if (nextMainCategory) {
        setOpenMainCategoryIds(current => new Set(current).add(nextMainCategory.id));
      }
      setIsMobileMenuOpen(false);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const activeCategoryIndex = helpCenterCategories.findIndex(category => category.id === activeCategoryId);
  const activeCategory = helpCenterCategories[activeCategoryIndex] ?? helpCenterCategories[0];
  const previousCategory = activeCategoryIndex > 0 ? helpCenterCategories[activeCategoryIndex - 1] : undefined;
  const nextCategory =
    activeCategoryIndex < helpCenterCategories.length - 1 ? helpCenterCategories[activeCategoryIndex + 1] : undefined;

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

  const activeMainCategory =
    helpCenterMainCategories.find(mainCategory =>
      mainCategory.subcategories.some(category => category.id === activeCategory.id)
    ) ?? helpCenterMainCategories[1];
  const activeSubcategoryIndex = activeMainCategory.subcategories.findIndex(
    category => category.id === activeCategory.id
  );

  const toggleMainCategory = (mainCategoryId: string) => {
    setOpenMainCategoryIds(current => {
      const next = new Set(current);
      if (next.has(mainCategoryId)) next.delete(mainCategoryId);
      else next.add(mainCategoryId);
      return next;
    });
  };

  const platformLabel = activePlatform === 'extension-desktop' ? 'Extension' : 'Mobile';
  const hasPlatformVariants = activeCategory.platforms.length > 1;

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
              const isActiveGroup = mainCategory.id === activeMainCategory.id;
              const panelId = `${mainCategory.id}-subcategories`;

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
                      <span className="help-center-main-category-number">
                        {String(mainCategory.order).padStart(2, '0')}
                      </span>
                      <span>{mainCategory.title}</span>
                    </span>
                    <ChevronIcon direction={isGroupOpen ? 'down' : 'right'} />
                  </button>

                  <div id={panelId} hidden={!isGroupOpen}>
                    {mainCategory.subcategories.length > 0 ? (
                      <ol className="help-center-category-list">
                        {mainCategory.subcategories.map((category, categoryIndex) => (
                          <li key={category.id}>
                            <a
                              className={category.id === activeCategory.id ? 'is-active' : undefined}
                              href={`#${category.id}`}
                              aria-current={category.id === activeCategory.id ? 'page' : undefined}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <span className="help-center-category-number">
                                {String(categoryIndex + 1).padStart(2, '0')}
                              </span>
                              <span>{category.title}</span>
                              <ChevronIcon />
                            </a>
                          </li>
                        ))}
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

            <button
              className="help-center-contact-button"
              type="button"
              disabled
              aria-label="Contact Support (destination will be added later)"
            >
              <span>Contact Support</span>
              <SupportIcon />
            </button>
          </div>

          <section className="help-center-category" aria-labelledby="help-center-category-title">
            <p className="help-center-eyebrow">
              {activeMainCategory.title} <span aria-hidden="true">/</span> Subcategory{' '}
              {activeSubcategoryIndex + 1} of {activeMainCategory.subcategories.length}
            </p>
            <h1 id="help-center-category-title">{activeCategory.title}</h1>
            <p className="help-center-category-description">{activeCategory.description}</p>

            {hasPlatformVariants ? (
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

            <div
              className={`help-center-content-panel help-center-bread-card${
                hasPlatformVariants ? ' has-platform-tabs' : ' is-category-overview'
              }`}
              id="category-content-panel"
              role={hasPlatformVariants ? 'tabpanel' : 'region'}
              aria-labelledby={
                hasPlatformVariants
                  ? activePlatform === 'extension-desktop'
                    ? 'extension-desktop-tab'
                    : 'mobile-tab'
                  : 'help-center-category-title'
              }
            >
              <div className="help-center-panel-label">
                <img src={breadMark} alt="" />
                <span>{hasPlatformVariants ? platformLabel : 'Bread Wallet guide'}</span>
              </div>
              <h2>Essential pages will be added next.</h2>
              <p>
                The category framework is ready. Verified article titles and content will be introduced in the next
                phase.
              </p>
              <div className="help-center-placeholder-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <nav className="help-center-sequence" aria-label="Category sequence">
              {previousCategory ? (
                <a
                  className="help-center-sequence-card is-previous"
                  href={`#${previousCategory.id}`}
                  aria-label={`Previous subcategory: ${previousCategory.title}`}
                >
                  <span className="help-center-sequence-button" aria-hidden="true">
                    <ChevronIcon direction="left" />
                  </span>
                  <span className="help-center-sequence-copy">
                    <span className="help-center-sequence-meta">
                      <span className="help-center-sequence-index">
                        {String(previousCategory.order).padStart(2, '0')}
                      </span>
                      Previous subcategory
                    </span>
                    <strong>{previousCategory.title}</strong>
                  </span>
                </a>
              ) : (
                <div className="help-center-sequence-spacer" aria-hidden="true" />
              )}

              {nextCategory ? (
                <a
                  className="help-center-sequence-card is-next"
                  href={`#${nextCategory.id}`}
                  aria-label={`Next subcategory: ${nextCategory.title}`}
                >
                  <span className="help-center-sequence-copy">
                    <span className="help-center-sequence-meta">
                      Next subcategory
                      <span className="help-center-sequence-index">
                        {String(nextCategory.order).padStart(2, '0')}
                      </span>
                    </span>
                    <strong>{nextCategory.title}</strong>
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
