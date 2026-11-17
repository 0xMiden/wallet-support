import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { HelpCenterFooter } from '../help-center/HelpCenterFooter';
import { helpCenterMainCategories } from '../help-center/categories';
import { errorMessage, sendContactReport } from './api';
import type { ContactResult } from './api';
import './contact.css';

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

const FEEDBACK_TYPES = [['bug', 'Bug'], ['feature', 'Feature'], ['suggestion', 'Suggestion'], ['general', 'General']] as const;
const PLATFORMS = [['ios', 'iOS'], ['android', 'Android'], ['extension', 'Chrome extension']] as const;
const NETWORKS = [['mainnet', 'Mainnet'], ['testnet', 'Testnet']] as const;

type State =
  | { kind: 'editing' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'failed'; message: string; field?: string };

function Label({ htmlFor, children, required }: { htmlFor: string; children: string; required?: boolean }) {
  return (
    <label className="contact-label" htmlFor={htmlFor}>
      {children}
      {required ? <span className="contact-required"> (required)</span> : null}
    </label>
  );
}

/** The Help Center contact form. Reports go to the support inbox through worker/contact. */
export function ContactPage() {
  const [state, setState] = useState<State>({ kind: 'editing' });
  const status = useRef<HTMLDivElement>(null);
  const sentHeading = useRef<HTMLHeadingElement>(null);

  const invalidField = state.kind === 'failed' ? state.field : undefined;

  /** Ties a control to its hint and, when the Worker rejected it, to the error. */
  const describe = (name: string, hint?: string) => {
    const ids = [hint, invalidField === name ? 'contact-error' : undefined].filter(Boolean).join(' ');
    return { 'aria-invalid': invalidField === name ? true : undefined, 'aria-describedby': ids || undefined };
  };

  useEffect(() => {
    if (state.kind === 'failed') {
      const field = state.field ? document.getElementById(`contact-${state.field}`) : null;
      (field ?? status.current)?.focus();
    }
    if (state.kind === 'sent') sentHeading.current?.focus();
  }, [state]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const screenshot = data.get('screenshot');
    if (screenshot instanceof File && screenshot.size > MAX_SCREENSHOT_BYTES) {
      setState({ kind: 'failed', message: errorMessage({ ok: false, error: 'too_large' }) });
      return;
    }
    if (screenshot instanceof File && screenshot.size === 0) data.delete('screenshot');

    setState({ kind: 'sending' });
    const result: ContactResult = await sendContactReport(data);
    if (result.ok) {
      const email = String(data.get('email') ?? '').trim();
      form.reset();
      setState({ kind: 'sent', email });
    } else {
      setState({ kind: 'failed', message: errorMessage(result), ...(result.field ? { field: result.field } : {}) });
    }
  };

  return (
    <div className="help-center-home contact-page">
      <main className="contact-main" id="help-center-content" tabIndex={-1}>
        <header className="contact-intro">
          <p className="help-center-eyebrow">Contact Support</p>
          <h1>Send us your feedback</h1>
          <p>Report a problem or share a suggestion about Bread.</p>
        </header>

        {state.kind === 'sent' ? (
          <section className="contact-sent" aria-labelledby="contact-sent-title">
            <h2 id="contact-sent-title" ref={sentHeading} tabIndex={-1}>Sent. Thanks for your feedback.</h2>
            <p>{state.email ? `We'll reply to ${state.email}.` : "You didn't add a contact email, so we can't reply to this one."}</p>
            <button className="help-center-contact-button" type="button" onClick={() => setState({ kind: 'editing' })}>Send another report</button>
          </section>
        ) : (
          <form className="contact-form" onSubmit={submit} aria-describedby="contact-safety">
            <div className="contact-warning" id="contact-safety" role="note">
              <strong>Keep your wallet safe.</strong> Never include a recovery phrase, signing key,
              password, or a screenshot that shows one.
            </div>

            {state.kind === 'failed' ? (
              <div className="contact-error" id="contact-error" role="alert" ref={status} tabIndex={-1}>{state.message}</div>
            ) : null}

            <div className="contact-field">
              <Label htmlFor="contact-type" required>Feedback type</Label>
              <select id="contact-type" {...describe('type')} name="type" required defaultValue="">
                <option value="" disabled>Select feedback type</option>
                {FEEDBACK_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <div className="contact-field">
              <Label htmlFor="contact-title" required>Short title</Label>
              <input id="contact-title" {...describe('title')} name="title" type="text" required maxLength={120} autoComplete="off" />
            </div>

            <div className="contact-field">
              <Label htmlFor="contact-description" required>Description</Label>
              <textarea id="contact-description" {...describe('description')} name="description" required maxLength={5000} rows={5} />
            </div>

            {([['steps', 'Steps to reproduce'], ['expected', 'Expected result'], ['actual', 'Actual result']] as const).map(([name, label]) => (
              <div className="contact-field" key={name}>
                <Label htmlFor={`contact-${name}`}>{label}</Label>
                <textarea id={`contact-${name}`} name={name} maxLength={2000} rows={3} {...describe(name, `contact-${name}-hint`)} />
                <p className="contact-hint" id={`contact-${name}-hint`}>Only needed for bug reports</p>
              </div>
            ))}

            <div className="contact-row">
              <div className="contact-field">
                <Label htmlFor="contact-platform">Platform</Label>
                <select id="contact-platform" {...describe('platform')} name="platform" defaultValue="">
                  <option value="">Select platform</option>
                  {PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="contact-field">
                <Label htmlFor="contact-version">App version</Label>
                <input id="contact-version" {...describe('version')} name="version" type="text" maxLength={40} placeholder="Optional" autoComplete="off" />
              </div>
              <div className="contact-field">
                <Label htmlFor="contact-network">Network</Label>
                <select id="contact-network" {...describe('network')} name="network" defaultValue="">
                  <option value="">Select network</option>
                  {NETWORKS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>

            <div className="contact-field">
              <Label htmlFor="contact-screenshot">Screenshot (optional)</Label>
              <input id="contact-screenshot" name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" {...describe('screenshot', 'contact-screenshot-hint')} />
              <p className="contact-hint" id="contact-screenshot-hint">PNG, JPEG or WebP, up to 10 MB</p>
            </div>

            <div className="contact-field">
              <Label htmlFor="contact-email">Contact email</Label>
              <input id="contact-email" name="email" type="email" maxLength={254} autoComplete="email" {...describe('email', 'contact-email-hint')} />
              <p className="contact-hint" id="contact-email-hint">Only if you'd like us to follow up.</p>
            </div>

            {/* Hidden from people and from assistive technology; bots fill it in. */}
            <div className="contact-trap" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <button className="help-center-contact-button contact-submit" type="submit" disabled={state.kind === 'sending'}>
              {state.kind === 'sending' ? 'Sending…' : 'Submit feedback'}
            </button>
          </form>
        )}
      </main>
      <HelpCenterFooter mainCategories={helpCenterMainCategories} firstCategoryId="setup-and-basic-use" />
    </div>
  );
}
