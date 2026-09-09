import breadMark from './assets/bread-mark.png';
import { CONTACT_SUPPORT_URL, helpCenterDownloads, helpCenterLegal, helpCenterSocials } from './links';
import { categoryHref, homeHref } from './routing';
import type { HelpCenterMainCategory } from './types';

/**
 * The site footer, on every page.
 *
 * It began inside the home page, which made it the one page that offered the
 * store links, the project's accounts and the legal documents — and the
 * article pages, where a reader is most likely to want the support form, the
 * only ones that did not.
 *
 * It carries only links that resolve. Documentation, About, Blog, Careers and
 * Status have no destination yet and are absent rather than dead.
 */

export interface HelpCenterFooterProps {
  readonly mainCategories: readonly HelpCenterMainCategory[];
  /** Fallback destination for a main category with no subcategories. */
  readonly firstCategoryId: string;
}

export function HelpCenterFooter({ mainCategories, firstCategoryId }: HelpCenterFooterProps) {
  return (
    <footer className="help-center-footer">
      <div className="help-center-footer-inner">
        <div className="help-center-footer-brand">
          <a className="help-center-brand" href={homeHref()}>
            <img src={breadMark} alt="" />
            <span>Bread Wallet</span>
          </a>

          <ul className="help-center-socials">
            {helpCenterSocials.map(social => (
              <li key={social.id}>
                <a href={social.href} target="_blank" rel="noopener noreferrer">
                  {/* The mark carries no text, so the name goes to the label. */}
                  <span className="help-center-visually-hidden">{social.label}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d={social.path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav className="help-center-footer-links" aria-label="Help Center topics">
          <h2>Topics</h2>
          <ul>
            {mainCategories.map(mainCategory => {
              const [first] = mainCategory.subcategories;
              return (
                <li key={mainCategory.id}>
                  <a href={categoryHref(first ? first.id : firstCategoryId)}>{mainCategory.title}</a>
                </li>
              );
            })}
          </ul>
        </nav>

        <nav className="help-center-footer-links" aria-label="Get Bread Wallet">
          <h2>Get the wallet</h2>
          <ul>
            {helpCenterDownloads.map(download => (
              <li key={download.id}>
                <a href={download.href} target="_blank" rel="noopener noreferrer">
                  {download.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="help-center-footer-links" aria-label="Support">
          <h2>Support</h2>
          <ul>
            <li>
              <a href={CONTACT_SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                Contact Support
              </a>
            </li>
            <li>
              <a href={CONTACT_SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                Send feedback
              </a>
            </li>
          </ul>
        </nav>

        <nav className="help-center-footer-links" aria-label="Legal">
          <h2>Legal</h2>
          <ul>
            {helpCenterLegal.map(document => (
              <li key={document.id}>
                <a href={document.href} target="_blank" rel="noopener noreferrer">
                  {document.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <p className="help-center-footer-note">© {new Date().getFullYear()} Bread Wallet.</p>
    </footer>
  );
}
