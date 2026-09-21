import { ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/support/layout';
import { Separator } from '@/components/ui/separator';
import breadLockup from './assets/bread-lockup.png';
import { GLOSSARY_TITLE } from './glossary';
import {
  CONTACT_SUPPORT_URL,
  helpCenterDownloads,
  helpCenterLegal,
  helpCenterSocials
} from './links';
import { categoryHref, glossaryHref } from './routing';
import type { HelpCenterMainCategory } from './types';
export interface HelpCenterFooterProps {
  readonly mainCategories: readonly HelpCenterMainCategory[];
  readonly firstCategoryId: string;
}
export function HelpCenterFooter({ mainCategories, firstCategoryId }: HelpCenterFooterProps) {
  const groups = [
    {
      title: 'Topics',
      label: 'Help Center topics',
      links: mainCategories.map((category) => ({
        label: category.title,
        href: `/${categoryHref(category.subcategories[0]?.id ?? firstCategoryId)}`,
        external: false
      }))
    },
    {
      title: 'Get the wallet',
      label: 'Get Bread Wallet',
      links: helpCenterDownloads.map((link) => ({ ...link, external: true }))
    },
    {
      title: 'Support',
      label: 'Support',
      links: [
        { label: 'Contact Support', href: CONTACT_SUPPORT_URL, external: false },
        { label: GLOSSARY_TITLE, href: `/${glossaryHref()}`, external: false }
      ]
    },
    {
      title: 'Legal',
      label: 'Legal',
      links: helpCenterLegal.map((link) => ({ ...link, external: true }))
    }
  ];
  return (
    <footer className="help-center-footer mt-auto border-t bg-secondary/40">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1.2fr_1fr_1fr_1fr]">
          <div>
            <a href="/" className="inline-block rounded-lg" aria-label="Bread Wallet home">
              <img src={breadLockup} alt="Bread Wallet" className="w-28" />
            </a>
            <p className="mt-4 max-w-44 text-sm leading-6 text-muted-foreground">
              A little guidance.
              <br />
              More confidence.
            </p>
            <ul className="mt-5 flex gap-1">
              {helpCenterSocials.map((social) => (
                <li key={social.id}>
                  <a
                    className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                  >
                    <svg className="size-4 fill-current" aria-hidden="true" viewBox="0 0 24 24">
                      <path d={social.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {groups.map((group) => (
            <nav aria-label={group.label} key={group.title}>
              <h2 className="type-label mb-3">{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      className="inline-flex min-h-11 items-center gap-1 py-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {link.label}
                      {link.external && <ArrowUpRight className="size-3" aria-hidden="true" />}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <Separator className="mb-6 mt-10" />
        <div className="type-caption flex flex-wrap justify-between gap-3 text-muted-foreground">
          <p>© {new Date().getFullYear()} Bread Wallet.</p>
          <p>Built on Miden. Here to help.</p>
        </div>
      </Container>
    </footer>
  );
}
