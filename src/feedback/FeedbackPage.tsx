import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { helpCenterMainCategories } from '../help-center/categories';
import { HelpCenterFooter } from '../help-center/HelpCenterFooter';
import { getFeedbackStatus, submitFeedback } from './api';
import type { PublicFeedbackStatus } from './api';
import './feedback.css';

const HISTORY_KEY = 'bread.feedback.reports.v2';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface LocalReport { id: string; title: string; created: number; status: PublicFeedbackStatus; issue?: number | null; repo?: string; }

function issueHref(report: LocalReport): string {
  return 'https://github.com/' + report.repo + '/issues/' + report.issue;
}

function loadReports(): LocalReport[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as LocalReport[]; } catch { return []; }
}

function installId() {
  let value = localStorage.getItem('bread.install');
  if (!value) { value = crypto.randomUUID(); localStorage.setItem('bread.install', value); }
  return value;
}

export function FeedbackPage() {
  const [reports, setReports] = useState<LocalReport[]>(loadReports);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const firstCategoryId = helpCenterMainCategories[0]?.subcategories[0]?.id ?? '';
  const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '';

  useEffect(() => {
    if (!turnstileSiteKey || document.querySelector('script[data-bread-turnstile]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.dataset.breadTurnstile = 'true';
    document.head.append(script);
    return () => script.remove();
  }, [turnstileSiteKey]);

  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(reports.slice(0, 25))); }, [reports]);
  useEffect(() => {
    if (!reports.length) return;
    const refresh = async () => {
      const next = await Promise.all(reports.map(async report => {
        try {
          const { repo, result } = await getFeedbackStatus(report.id);
          return result ? { ...report, status: result.status, issue: result.issue, repo } : report;
        } catch { return report; }
      }));
      setReports(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [reports.length]);

  const statusLabel = useMemo(() => ({ received: 'Received', reviewing: 'Reviewing', queued: 'Queued for GitHub', attached: 'Added to an issue', filed: 'Filed' }), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setFileError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const description = String(data.get('description') ?? '').trim();
    const title = String(data.get('title') ?? '').trim();
    const file = data.get('attachment');
    const challenge = String(data.get('cf-turnstile-response') ?? '');
    if (description.length < 10) return setError('Add at least 10 characters so the team can understand the issue.');
    if (file instanceof File && file.size > MAX_FILE_BYTES) return setFileError('Attachments must be 10 MB or smaller.');
    if (turnstileSiteKey && !challenge) return setError('Complete the verification check before sending.');
    const id = crypto.randomUUID();
    const body = [`[${String(data.get('feedback_type') ?? 'Feedback')}] ${title}`, '', description].join('\n');
    const payload = new FormData();
    payload.set('submission_id', id);
    payload.set('body', body);
    payload.set('platform', String(data.get('platform') ?? ''));
    payload.set('turnstile_token', challenge || 'development-token');
    payload.set('meta', JSON.stringify({ install_id: installId(), wallet_version: data.get('wallet_version') || null, route: window.location.pathname }));
    if (file instanceof File && file.size > 0) payload.set('attachment', file, file.name);
    setBusy(true);
    try {
      await submitFeedback(payload);
      setReports(current => [{ id, title, created: Date.now(), status: 'received' }, ...current]);
      form.reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Feedback could not be sent.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="help-center-home feedback-page">
      <main className="feedback-main" id="help-center-content" tabIndex={-1}>
        <header className="feedback-intro">
          <p className="help-center-eyebrow">Send feedback</p>
          <h1>Help us improve Bread Wallet</h1>
          <p>Report a problem or share an idea. Your submission is reviewed before anything is published.</p>
        </header>
        <div className="feedback-layout">
          <form className="feedback-form" onSubmit={submit}>
            <div className="feedback-warning" role="note"><strong>Keep your wallet safe.</strong> Never include a recovery phrase, password, private key, or a screenshot that shows one.</div>
            <div className="feedback-two-column">
              <label>Feedback type<select name="feedback_type" defaultValue="bug"><option value="bug">Bug report</option><option value="idea">Product idea</option><option value="content">Help Center feedback</option></select></label>
              <label>Platform<select name="platform" required defaultValue=""><option value="" disabled>Select platform</option><option value="extension">Extension</option><option value="ios">iOS</option><option value="android">Android</option></select></label>
            </div>
            <div className="feedback-two-column">
              <label className="feedback-field-wide">Title<input name="title" required maxLength={120} placeholder="A short summary" /></label>
              <label>Wallet version <span>(optional)</span><input name="wallet_version" placeholder="For example, 0.8.1" /></label>
            </div>
            <label>Description<textarea name="description" required minLength={10} maxLength={8000} placeholder="What did you do, what did you expect, and what happened instead?" /></label>
            <label>Screenshot or video <span>(optional)</span><input name="attachment" type="file" accept="image/png,image/jpeg,video/mp4" /><small>PNG, JPEG, or MP4. Maximum 10 MB.</small></label>
            {fileError ? <p className="feedback-error" role="alert">{fileError}</p> : null}
            <div className="feedback-turnstile" data-sitekey={turnstileSiteKey} aria-label="Human verification">
              {turnstileSiteKey ? <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-appearance="interaction-only" /> : <p>Verification loads on the deployed support site.</p>}
            </div>
            {error ? <p className="feedback-error" role="alert">{error}</p> : null}
            <button className="feedback-submit" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
          </form>
          <aside className="feedback-history" aria-labelledby="feedback-history-title">
            <p className="help-center-eyebrow">This browser</p><h2 id="feedback-history-title">Your reports</h2>
            {reports.length ? <ol>{reports.map(report => <li key={report.id}><div><strong>{report.title}</strong><span>{statusLabel[report.status]}</span></div>{report.issue && report.repo ? <a href={issueHref(report)} target="_blank" rel="noopener noreferrer">View issue #{report.issue}</a> : <small>Submitted {new Date(report.created).toLocaleDateString()}</small>}</li>)}</ol> : <p>Reports sent from this browser will appear here with their review status.</p>}
          </aside>
        </div>
      </main>
      <HelpCenterFooter mainCategories={helpCenterMainCategories} firstCategoryId={firstCategoryId} />
    </div>
  );
}
