import { useState } from 'react';
import type { FormEvent } from 'react';

import breadMark from './assets/bread-mark.png';
import { articlesInMainCategory, helpCenterArticles } from './content';
import { HelpCenterFooter } from './HelpCenterFooter';
import { CONTACT_SUPPORT_URL } from './links';
import { categoryHref, homeHref } from './routing';
import type { HelpCenterMainCategory } from './types';

/**
 * The Help Center's front door.
 *
 * Its own page rather than a band bolted onto the category view: the shell
 * there is a two-column grid built around the navigation sidebar, and a
 * full-width hero inside a 21rem column is not a hero. The two share the
 * design tokens, the brand, and the support intake — nothing else.
 *
 * Nothing here is decorative-only. The hero exists to hold the search field,
 * the cards exist to name the topics, and the panel at the bottom exists
 * because a reader who did not find an answer needs somewhere to go.
 */

/**
 * The chips under the search field: one route into each of the first five main
 * categories, phrased the way a reader would ask.
 *
 * Each is a real query run through the same search the field uses, and
 * home.test.ts asserts every one returns at least one article. Two of the four
 * first written here ("Restore wallet", "Transfer stuck") read perfectly well
 * and found nothing — the search is plain substring matching, so a suggestion
 * is only as good as the words actually in the articles. That test is the only
 * thing standing between a content edit and a chip that silently goes dead.
 */
export const POPULAR_SEARCHES: readonly string[] = [
  'Install Bread Wallet',
  'Recovery phrase',
  'Private account',
  'Guardian',
  'Token is stuck'
];

function CategoryGlyph({ categoryId }: { categoryId: string }) {
  // One glyph per main category, drawn in the stroke style the rest of the
  // page uses. Differentiation is by shape, not by hue: five unrelated colours
  // would read as five unrelated products.
  const paths: Record<string, string> = {
    // A flag planted at the start, not a bare plus — which read as "add".
    'getting-started': 'M6 4v16M6 4.5h11l-2.2 3.5L17 11.5H6',
    'manage-wallet': 'M4 8.5h16v10H4zM4 8.5 15 5l2 3.5M15.5 13.5h1.5',
    /*
     * An eye with a slash. This was a bare circle with a line through it,
     * which at panel scale reads as "prohibited" rather than as anything to
     * do with seeing — and it sat one grid cell away from a compass-shaped
     * candidate for another category, which would have made two circles with
     * diagonals in one view. Painted bounds 1.90..22.10 x 3.50..20.50, inside
     * the viewBox on every side.
     */
    privacy:
      'M2.6 12s3.7-6.2 9.4-6.2S21.4 12 21.4 12s-3.7 6.2-9.4 6.2S2.6 12 2.6 12ZM12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2ZM4.2 4.2 19.8 19.8',
    guardian: 'M12 4l7 2.5V12c0 4-3 6.6-7 8-4-1.4-7-4-7-8V6.5L12 4Z',
    /*
     * A wrench. This was a gear, because an earlier wrench drew as a small
     * diamond at 24px — but the glyph is no longer an icon. It fills the
     * category panel at illustration scale, where the gear's radiating teeth
     * read as a sun rather than as a tool, and where a wrench has room to be
     * a wrench.
     *
     * Centred by measurement, not by eye. The first version of this path ran
     * to x=24.31 in a 24-unit viewBox and, with half of the 1.4 stroke on top,
     * painted to 25.01 — so the jaw was sliced off down its right edge. The
     * shape is unchanged; it is translated by (-2.19, +0.64) so the painted
     * box, stroke included, is centred and clears every side.
     */
    troubleshooting:
      'M12.71 7.24a4.1 4.1 0 0 1 5.2-5.1l-2.8 2.8.8 3.2 3.2.8 2.8-2.8a4.1 4.1 0 0 1-5.1 5.2L5.51 21.54a2.2 2.2 0 0 1-3.1-3.1Z',
    /*
     * Two arrows passing in opposite directions: funds going out to another
     * chain and coming back, which is what both subcategories describe — a
     * transfer or swap across, and the round trip to earn. Painted bounds
     * 3.30..20.70 x 3.30..20.70, centred and inside the viewBox on every side.
     */
    'cross-chain-and-earn': 'M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4'
  };

  return (
    <svg aria-hidden="true" className="help-home-card-glyph" viewBox="0 0 24 24">
      <path d={paths[categoryId] ?? 'M12 5v14M5 12h14'} />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="help-home-arrow" viewBox="0 0 24 24">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="help-home-search-icon" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function SupportGlyph() {
  return (
    <svg aria-hidden="true" className="help-home-support-glyph" viewBox="0 0 48 48">
      <path d="M6 10.5h27v18H16l-10 7v-25Z" />
      <path d="M14 17.5h11M14 22h7" />
      <path d="M37 17.5h5v16h-6l-6 4v-4" />
    </svg>
  );
}

export interface HelpCenterHomeProps {
  readonly mainCategories: readonly HelpCenterMainCategory[];
  /** Where "View all topics" and the first card's fallback point. */
  readonly firstCategoryId: string;
  /** Hands a query to the search the category view already renders. */
  readonly onSearch: (term: string) => void;
}

export function HelpCenterHome({ mainCategories, firstCategoryId, onSearch }: HelpCenterHomeProps) {
  const [term, setTerm] = useState('');
  const totalArticles = helpCenterArticles.length;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = term.trim();
    if (trimmed.length > 0) onSearch(trimmed);
  };

  return (
    <div className="help-center-home">
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

      <header className="help-home-header">
        <a className="help-center-brand" href={homeHref()} aria-label="Bread Wallet Help Center">
          <img src={breadMark} alt="" />
            <span>Bread Wallet</span>
        </a>

        {/* Its own element, outside the nav, so the links can sit on the
            page's centre line rather than the centre of what is left over
            after the button. */}
        <nav className="help-home-nav" aria-label="Help Center">
          <a href={homeHref()} aria-current="page">
            Help Center
          </a>
          <a href={categoryHref(firstCategoryId)}>All topics</a>
        </nav>

        <a
          className="help-center-contact-button help-home-header-action"
          href={CONTACT_SUPPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Contact Support
        </a>
      </header>

      <main className="help-home-main" id="help-center-content" tabIndex={-1}>
        <section className="help-home-hero" aria-labelledby="help-home-title">
          <h1 id="help-home-title">
            How can we <em>help?</em>
          </h1>
          <p className="help-home-lede">
            Find answers, learn how Bread Wallet works, and get the most out of the wallet.
          </p>

          <form className="help-home-search-form" role="search" onSubmit={submit}>
            <label className="help-home-search">
              <span className="help-center-visually-hidden">Search the Help Center</span>
              <SearchIcon />
              <input
                type="search"
                value={term}
                onChange={event => setTerm(event.target.value)}
                placeholder="Search for help articles…"
                autoComplete="off"
              />
            </label>
            <button className="help-home-search-submit" type="submit">
              <span className="help-center-visually-hidden">Search</span>
              <ArrowIcon />
            </button>
          </form>

          <div className="help-home-popular">
            <span id="help-home-popular-label">Popular searches</span>
            <ul aria-labelledby="help-home-popular-label">
              {POPULAR_SEARCHES.map(suggestion => (
                <li key={suggestion}>
                  <button type="button" onClick={() => onSearch(suggestion)}>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="help-home-categories" aria-labelledby="help-home-categories-title">
          <div className="help-home-section-head">
            <div>
              <h2 id="help-home-categories-title">Support categories</h2>
              <p>
                {totalArticles} articles across {mainCategories.length} topics. Start where your
                question lives.
              </p>
            </div>
            <a className="help-home-section-link" href={categoryHref(firstCategoryId)}>
              View all topics
              <ArrowIcon />
            </a>
          </div>

          <ul className="help-home-card-grid">
            {mainCategories.map(mainCategory => {
              // The destination is the first subcategory because a main
              // category is a grouping, not a route. Reading order is array
              // order, the same rule the sidebar follows.
              const [first] = mainCategory.subcategories;
              const count = articlesInMainCategory(helpCenterArticles, mainCategory.id).length;

              return (
                <li key={mainCategory.id}>
                  <a
                    className="help-home-card"
                    href={categoryHref(first ? first.id : firstCategoryId)}
                  >
                    {/*
                     * The panel is the artwork area and carries the category's
                     * own colour. It holds a glyph today; dropping a real
                     * illustration in later means replacing what is inside
                     * .help-home-card-art and nothing else — the panel, its
                     * ratio and its colour are all CSS.
                     */}
                    <span className="help-home-card-panel">
                      <span className="help-home-card-art">
                        <CategoryGlyph categoryId={mainCategory.id} />
                      </span>
                    </span>
                    <span className="help-home-card-title">{mainCategory.title}</span>
                    <span className="help-home-card-description">{mainCategory.description}</span>
                    <span className="help-home-card-count">
                      {count} {count === 1 ? 'article' : 'articles'}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="help-home-support" aria-labelledby="help-home-support-title">
          <SupportGlyph />
          <div className="help-home-support-copy">
            <p className="help-center-eyebrow">Still need help?</p>
            <h2 id="help-home-support-title">We&rsquo;re here for you</h2>
            <p>
              Can&rsquo;t find what you&rsquo;re looking for? Send us the details and we&rsquo;ll
              take a look.
            </p>
          </div>
          <a
            className="help-center-contact-button"
            href={CONTACT_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Support
            <ArrowIcon />
          </a>
        </section>
      </main>

      <HelpCenterFooter mainCategories={mainCategories} firstCategoryId={firstCategoryId} />
    </div>
  );
}
