import { useState } from 'react';
import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { BreadBrand } from './BreadBrand';
import { HeaderSearch } from './HeaderSearch';
import { CONTACT_SUPPORT_URL } from './links';
import type { PublicRoute } from './publicRoute';

export function PublicShell({ active, children }: { active: PublicRoute; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = <>
    <a href="/" aria-current={active === 'help' ? 'page' : undefined}>Help Center</a>
    <a href="/topics" aria-current={active === 'topics' ? 'page' : undefined}>All topics</a>
    <a className="public-feedback-link" href={CONTACT_SUPPORT_URL} target="_blank" rel="noopener noreferrer">Send feedback<ArrowUpRight aria-hidden="true" /></a>
  </>;
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <a className="help-center-brand public-brand" href="/" aria-label="Bread Wallet Help Center home"><BreadBrand /><span className="help-center-visually-hidden">Bread Wallet</span></a>
          <div className="public-header-actions">
          <nav className="public-nav" aria-label="Primary navigation">{links}</nav>
          <HeaderSearch />
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger asChild><button type="button" className="public-menu-trigger" aria-label="Open site navigation"><Menu aria-hidden="true" /></button></Dialog.Trigger>
            <Dialog.Portal><Dialog.Overlay className="public-menu-overlay" /><Dialog.Content className="public-menu-content" aria-describedby={undefined}><div className="help-drawer-heading"><Dialog.Title>Help Center</Dialog.Title><Dialog.Close asChild><button type="button" className="help-drawer-close" aria-label="Close site navigation"><X aria-hidden="true" /></button></Dialog.Close></div><nav aria-label="Site navigation" onClick={() => setMenuOpen(false)}>{links}</nav></Dialog.Content></Dialog.Portal>
          </Dialog.Root>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
