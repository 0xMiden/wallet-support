import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import breadLockup from './assets/bread-lockup.png';
import type { PublicRoute } from './publicRoute';

export function PublicShell({ active, children }: { active: PublicRoute; children: ReactNode }) {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');

  const search = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (term) window.location.assign(`/?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="public-shell">
      <header className="public-header">
        <a className="help-center-brand public-brand" href="/" aria-label="Bread Wallet Help Center home">
          <img src={breadLockup} alt="" />
          <span className="help-center-visually-hidden">Bread Wallet</span>
          <span className="public-product-name">Help Center</span>
        </a>

        <form className="public-search" role="search" onSubmit={search}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <label>
            <span className="help-center-visually-hidden">Search the Help Center</span>
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search help…"
            />
          </label>
        </form>

        <nav className="public-nav" aria-label="Primary navigation">
          <a href="/" aria-current={active === 'help' ? 'page' : undefined}>Help Center</a>
          <a href="/topics" aria-current={active === 'topics' ? 'page' : undefined}>All topics</a>
          <a className="public-feedback-link" href="/feedback" aria-current={active === 'feedback' ? 'page' : undefined}>
            Send feedback
          </a>
        </nav>
      </header>
      {children}
    </div>
  );
}
