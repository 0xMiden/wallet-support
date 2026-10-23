import { useState } from 'react';
import type { FormEvent } from 'react';
import { articlesInMainCategory, helpCenterArticles } from './content';
import { HelpCenterFooter } from './HelpCenterFooter';
import { CONTACT_SUPPORT_URL } from './links';
import { panelTintFor } from './panelTint';
import { articleHref, categoryHref } from './routing';
import { TopicIcon } from './TopicIcon';
import type { HelpCenterMainCategory } from './types';

export const POPULAR_SEARCHES: readonly string[] = ['Mainnet', 'Recovery phrase', 'Guardian', 'Bridge', 'Swap', 'Earn', 'Explore'];

/** Shortcuts link to reviewed consumer articles, never duplicated instructions. */
export const QUICK_HELP = [
  { title: 'Set up your wallet', detail: 'Install Bread and create an account', subcategory: 'setup-and-basic-use', article: 'how-do-i-create-a-bread-wallet', icon: 'getting-started' },
  { title: 'Restore wallet access', detail: 'Recover safely on a new device', subcategory: 'security-and-recovery', article: 'how-do-i-restore-my-wallet-with-a-recovery-phrase', icon: 'guardian' },
  { title: 'Find a missing transfer', detail: 'Check the status and next step', subcategory: 'common-issues-and-support', article: 'my-transfer-shows-as-completed-but-the-token-never-arrived', icon: 'cross-chain' }
] as const;

export function ArrowIcon() {
  return <svg aria-hidden="true" className="help-home-arrow" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
}

export interface HelpCenterHomeProps {
  readonly mainCategories: readonly HelpCenterMainCategory[];
  readonly firstCategoryId: string;
  readonly onSearch: (term: string) => void;
}

export function HelpCenterHome({ mainCategories, firstCategoryId, onSearch }: HelpCenterHomeProps) {
  const [term, setTerm] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (term.trim()) onSearch(term.trim());
  };

  return (
    <div className="help-center-home">
      <a className="help-center-skip-link" href="#help-center-content" onClick={event => { event.preventDefault(); document.getElementById('help-center-content')?.focus(); }}>Skip to content</a>
      <main className="help-home-main" id="help-center-content" tabIndex={-1}>
        <div className="help-home-intro">
          <section className="help-home-hero" aria-labelledby="help-home-title">
            <p className="help-home-kicker">Bread Wallet support</p>
            <h1 id="help-home-title">How can we help?</h1>
            <p className="help-home-lede">From your first account to your next transfer.<br className="help-home-desktop-break" /> Find the answer and get on with your day.</p>
            <form className="help-home-search-form" role="search" onSubmit={submit}>
              <label className="help-home-search">
                <span className="help-center-visually-hidden">Search the Help Center</span>
                <svg aria-hidden="true" className="help-home-search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
                <input type="search" value={term} onChange={event => setTerm(event.target.value)} placeholder="What do you need help with?" autoComplete="off" />
              </label>
              <button className="help-home-search-submit" type="submit"><span className="help-center-visually-hidden">Search</span><ArrowIcon /></button>
            </form>
            <div className="help-home-popular">
              <span id="help-home-popular-label">Try</span>
              <ul aria-labelledby="help-home-popular-label">{POPULAR_SEARCHES.map(suggestion => <li key={suggestion}><button type="button" onClick={() => onSearch(suggestion)}>{suggestion}</button></li>)}</ul>
            </div>
          </section>
          <nav className="help-home-quick" aria-label="Common questions">
            <h2>A good place to start</h2>
            <ul>{QUICK_HELP.map(item => <li key={item.article}><a href={articleHref(item.subcategory, item.article)}><TopicIcon categoryId={item.icon} /><span><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowIcon /></a></li>)}</ul>
          </nav>
        </div>

        <section className="help-home-limit" aria-labelledby="help-home-limit-title">
          <svg className="help-home-notice-icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></svg>
          <div><h2 id="help-home-limit-title">Partner Mainnet deposit limit</h2><p>Keep the total wallet balance after a deposit at or below <strong>$1,232.462</strong>. This includes the existing balance and each new deposit; the limit is not per transfer or per day.</p></div>
          <a href={articleHref('moving-across-chains', 'what-is-the-partner-mainnet-deposit-limit')}>Read the deposit limit<ArrowIcon /></a>
        </section>

        <section className="help-home-categories" aria-labelledby="help-home-categories-title">
          <div className="help-home-section-head"><div><h2 id="help-home-categories-title">Help for every step</h2><p>Explore the wallet, one topic at a time.</p></div><a className="help-home-section-link" href="/topics">View all topics<ArrowIcon /></a></div>
          <ul className="help-home-card-grid">{mainCategories.map((category, index) => {
            const first = category.subcategories[0];
            const count = articlesInMainCategory(helpCenterArticles, category.id).length;
            return <li key={category.id} data-panel-tint={panelTintFor(index)}><a className="help-home-card" href={categoryHref(first?.id ?? firstCategoryId)}><span className="help-home-card-icon"><TopicIcon categoryId={category.id} /></span><span className="help-home-card-copy"><span className="help-home-card-title">{category.title}</span><span className="help-home-card-description">{category.description}</span><span className="help-home-card-count">{count} {count === 1 ? 'article' : 'articles'}</span></span><ArrowIcon /></a></li>;
          })}</ul>
        </section>

        <section className="help-home-support" aria-labelledby="help-home-support-title">
          <div className="help-home-support-copy"><h2 id="help-home-support-title">A little more help?</h2><p>Tell us what happened, or share an idea for Bread.<br />Keep your recovery phrase and keys to yourself.</p></div>
          <a className="help-center-contact-button" href={CONTACT_SUPPORT_URL} target="_blank" rel="noopener noreferrer">Contact Support<ArrowIcon /></a>
        </section>
      </main>
      <HelpCenterFooter mainCategories={mainCategories} firstCategoryId={firstCategoryId} />
    </div>
  );
}
