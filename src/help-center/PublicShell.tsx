import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Menu, Search, X } from 'lucide-react';
import { BreadBrand } from './BreadBrand';
import { CONTACT_SUPPORT_URL } from './links';
import type { PublicRoute } from './publicRoute';

export function PublicShell({ active, children }: { active: PublicRoute; children: ReactNode }) {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const search = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) window.location.assign(`/?q=${encodeURIComponent(query.trim())}`);
  };
  const links = <>
    <a href="/" aria-current={active === 'help' ? 'page' : undefined}>Help Center</a>
    <a href="/topics" aria-current={active === 'topics' ? 'page' : undefined}>All topics</a>
    <a className="public-feedback-link" href={CONTACT_SUPPORT_URL} target="_blank" rel="noopener noreferrer">Send feedback<ArrowUpRight aria-hidden="true" /></a>
  </>;
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <a className="help-center-brand public-brand" href="/" aria-label="Bread Wallet Help Center home"><BreadBrand /><span className="help-center-visually-hidden">Bread Wallet</span><span className="public-product-name">Help Center</span></a>
          {active !== 'help' ? <form className="public-search" role="search" onSubmit={search}><Search aria-hidden="true" /><label><span className="help-center-visually-hidden">Search the Help Center</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search help…" /></label></form> : null}
          <nav className="public-nav" aria-label="Primary navigation">{links}</nav>
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger asChild><button type="button" className="public-menu-trigger" aria-label="Open site navigation"><Menu aria-hidden="true" /></button></Dialog.Trigger>
            <Dialog.Portal><Dialog.Overlay className="public-menu-overlay" /><Dialog.Content className="public-menu-content" aria-describedby={undefined}><div className="help-drawer-heading"><Dialog.Title>Help Center</Dialog.Title><Dialog.Close asChild><button type="button" className="help-drawer-close" aria-label="Close site navigation"><X aria-hidden="true" /></button></Dialog.Close></div><nav aria-label="Site navigation" onClick={() => setMenuOpen(false)}>{links}</nav></Dialog.Content></Dialog.Portal>
          </Dialog.Root>
        </div>
      </header>
      {children}
    </div>
  );
}
