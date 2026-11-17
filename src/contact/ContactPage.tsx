import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { HelpCenterFooter } from '../help-center/HelpCenterFooter';
import { helpCenterMainCategories } from '../help-center/categories';
import { errorMessage, sendContactReport } from './api';
import type { ContactResult } from './api';
import './contact.css';

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_DESCRIPTION = 2000;
const ATTACHMENT_TYPES = 'image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm';

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
      <span>{children}{required ? <span className="contact-required" aria-hidden="true"> *</span> : null}</span>
    </label>
  );
}

/** The Help Center contact form. Reports go to the support inbox through worker/contact. */
export function ContactPage() {
  const [state, setState] = useState<State>({ kind: 'editing' });
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [fileName, setFileName] = useState('');
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

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => setFileName(event.target.files?.[0]?.name ?? '');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const attachment = data.get('screenshot');
    if (attachment instanceof File && attachment.size > MAX_ATTACHMENT_BYTES) {
      setState({ kind: 'failed', message: errorMessage({ ok: false, error: 'too_large' }), field: 'screenshot' });
      return;
    }
    if (attachment instanceof File && attachment.size === 0) data.delete('screenshot');

    setState({ kind: 'sending' });
    const result: ContactResult = await sendContactReport(data);
    if (result.ok) {
      const email = String(data.get('email') ?? '').trim();
      form.reset();
      setDescriptionLength(0);
      setFileName('');
      setState({ kind: 'sent', email });
    } else {
      setState({ kind: 'failed', message: errorMessage(result), ...(result.field ? { field: result.field } : {}) });
    }
  };

  return (
    <div className="help-center-home contact-page">
      <main className="contact-main" id="help-center-content" tabIndex={-1}>
        <header className="contact-intro">
          <h1>Send us your concerns or feedback</h1>
          <p>Report a problem or share a suggestion about Bread.</p>
        </header>

        {state.kind === 'sent' ? (
          <section className="contact-sent" aria-labelledby="contact-sent-title">
            <h2 id="contact-sent-title" ref={sentHeading} tabIndex={-1}>Sent. Thanks for your feedback.</h2>
            <p>{`We'll reply to ${state.email}.`}</p>
            <button className="help-center-contact-button" type="button" onClick={() => setState({ kind: 'editing' })}>Send another report</button>
          </section>
        ) : (
          <form className="contact-form" onSubmit={submit} aria-describedby="contact-safety">
            <div className="contact-warning" id="contact-safety" role="note">
              <p><strong>Keep your wallet safe.</strong> Never include a recovery phrase, signing key,
                password, or a screenshot that shows one.</p>
            </div>

            <div className="contact-card">
              {state.kind === 'failed' ? (
                <div className="contact-error" id="contact-error" role="alert" ref={status} tabIndex={-1}>{state.message}</div>
              ) : null}

              <div className="contact-field">
                <Label htmlFor="contact-title" required>Title</Label>
                <input id="contact-title" {...describe('title')} name="title" type="text" required maxLength={120} autoComplete="off" placeholder="Briefly describe your issue (e.g., can't access my wallet)" />
              </div>

              <div className="contact-row contact-row-3">
                <div className="contact-field">
                  <Label htmlFor="contact-type" required>Feedback type</Label>
                  <select id="contact-type" {...describe('type')} name="type" required defaultValue="">
                    <option value="" disabled>Select feedback type</option>
                    {FEEDBACK_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="contact-field">
                  <Label htmlFor="contact-platform" required>Platform</Label>
                  <select id="contact-platform" {...describe('platform')} name="platform" required defaultValue="">
                    <option value="" disabled>Select platform</option>
                    {PLATFORMS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="contact-field">
                  <Label htmlFor="contact-network" required>Network</Label>
                  <select id="contact-network" {...describe('network')} name="network" required defaultValue="">
                    <option value="" disabled>Select network</option>
                    {NETWORKS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>

              <div className="contact-field">
                <Label htmlFor="contact-description" required>Description</Label>
                <textarea
                  id="contact-description" {...describe('description', 'contact-description-count')} name="description" required
                  maxLength={MAX_DESCRIPTION} rows={4} onChange={event => setDescriptionLength(event.target.value.length)}
                  placeholder="Please provide details about your issue, including any relevant context, error messages, or what you were trying to do."
                />
                <p className="contact-count" id="contact-description-count">{descriptionLength.toLocaleString('en-US')} / {MAX_DESCRIPTION.toLocaleString('en-US')}</p>
              </div>

              <div className="contact-row contact-row-3">
                <div className="contact-field">
                  <Label htmlFor="contact-email" required>Email</Label>
                  <input id="contact-email" {...describe('email')} name="email" type="email" required maxLength={254} autoComplete="email" placeholder="Your email address" />
                </div>
                <div className="contact-field">
                  <Label htmlFor="contact-version">App version</Label>
                  <input id="contact-version" {...describe('version')} name="version" type="text" maxLength={40} placeholder="Optional" autoComplete="off" />
                </div>
                <div className="contact-field">
                  <Label htmlFor="contact-screenshot">Screenshot or video (optional)</Label>
                  <div className="contact-drop">
                    <input id="contact-screenshot" {...describe('screenshot', 'contact-screenshot-hint')} name="screenshot" type="file" accept={ATTACHMENT_TYPES} onChange={chooseFile} />
                    <span className="contact-drop-text" aria-hidden="true">{fileName || <>Drag &amp; drop or <span className="contact-drop-choose">Choose File</span></>}</span>
                  </div>
                  <p className="contact-hint" id="contact-screenshot-hint">PNG, JPEG, WebP, MP4, MOV or WebM, up to 15 MB</p>
                </div>
              </div>

              <fieldset className="contact-bug" aria-describedby="contact-bug-hint">
                <legend>Bug details</legend>
                <p className="contact-hint contact-bug-hint" id="contact-bug-hint">Only needed for bug reports</p>
                <div className="contact-field">
                  <Label htmlFor="contact-steps">Steps to reproduce</Label>
                  <textarea id="contact-steps" {...describe('steps')} name="steps" maxLength={2000} rows={3} placeholder="Provide clear, numbered steps so we can reproduce the issue (e.g., 1. Open the app, 2. Tap Bridge, 3. Select USDC, 4. Tap Confirm)." />
                </div>
                <div className="contact-row contact-row-2">
                  <div className="contact-field">
                    <Label htmlFor="contact-expected">Expected result</Label>
                    <textarea id="contact-expected" {...describe('expected')} name="expected" maxLength={2000} rows={2} placeholder="What should have happened?" />
                  </div>
                  <div className="contact-field">
                    <Label htmlFor="contact-actual">Actual result</Label>
                    <textarea id="contact-actual" {...describe('actual')} name="actual" maxLength={2000} rows={2} placeholder="What actually happened?" />
                  </div>
                </div>
              </fieldset>

              {/* Hidden from people and from assistive technology; bots fill it in. */}
              <div className="contact-trap" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <button className="help-center-contact-button contact-submit" type="submit" disabled={state.kind === 'sending'}>
                {state.kind === 'sending' ? 'Sending…' : 'Submit feedback'}
              </button>
            </div>
          </form>
        )}
      </main>
      <HelpCenterFooter mainCategories={helpCenterMainCategories} firstCategoryId="setup-and-basic-use" />
    </div>
  );
}
