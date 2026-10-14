import { HelpCenterFooter } from '../help-center/HelpCenterFooter';
import { helpCenterMainCategories } from '../help-center/categories';
import { CONTACT_SUPPORT_URL } from '../help-center/links';
import './feedback.css';

/** Compatibility landing page for previously shared /feedback links. */
export function FeedbackPage() {
  return (
    <div className="help-center-home feedback-page">
      <main className="feedback-main" id="help-center-content" tabIndex={-1}>
        <header className="feedback-intro">
          <p className="help-center-eyebrow">Send feedback</p>
          <h1>Help us improve Bread Wallet</h1>
          <p>Report a problem or share a suggestion through the Bread Wallet feedback form.</p>
        </header>
        <section className="feedback-form" aria-label="Before you send feedback">
          <div className="feedback-warning" role="note">
            <strong>Keep your wallet safe.</strong> Never include a recovery phrase, signing key,
            password, or a screenshot that shows one.
          </div>
          <p>
            Use <strong>Short title</strong> for a clear summary and <strong>Description</strong> for
            the details. For a bug, include what you did, what you expected, what happened, your
            platform, app version and network. Hide sensitive information before adding a screenshot.
          </p>
          <a className="help-center-contact-button" href={CONTACT_SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            Submit feedback
          </a>
        </section>
      </main>
      <HelpCenterFooter mainCategories={helpCenterMainCategories} firstCategoryId="setup-and-basic-use" />
    </div>
  );
}
