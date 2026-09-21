import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { helpCenterMainCategories } from '../help-center/categories';
import { HelpCenterFooter } from '../help-center/HelpCenterFooter';
import { getFeedbackStatus, submitFeedback } from './api';
import type { PublicFeedbackStatus } from './api';
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  LoaderCircle,
  Paperclip
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Container, PageHeader, Reveal } from '@/components/support/layout';
import { Verification } from './Verification';

const HISTORY_KEY = 'bread.feedback.reports.v2';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface LocalReport {
  id: string;
  title: string;
  created: number;
  status: PublicFeedbackStatus;
  issue?: number | null;
  repo?: string;
}

function issueHref(report: LocalReport): string {
  return 'https://github.com/' + report.repo + '/issues/' + report.issue;
}

function loadReports(): LocalReport[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as LocalReport[];
  } catch {
    return [];
  }
}

function installId() {
  let value = localStorage.getItem('bread.install');
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem('bread.install', value);
  }
  return value;
}

export function FeedbackPage() {
  const [reports, setReports] = useState<LocalReport[]>(loadReports);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [receipt, setReceipt] = useState('');
  const [formVersion, setFormVersion] = useState(0);
  const [verificationVersion, setVerificationVersion] = useState(0);
  const firstCategoryId = helpCenterMainCategories[0]?.subcategories[0]?.id ?? '';
  const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '';

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(reports.slice(0, 25)));
  }, [reports]);
  useEffect(() => {
    if (!reports.length) return;
    const refresh = async () => {
      const next = await Promise.all(
        reports.map(async (report) => {
          try {
            const { repo, result } = await getFeedbackStatus(report.id);
            return result
              ? { ...report, status: result.status, issue: result.issue, repo }
              : report;
          } catch {
            return report;
          }
        })
      );
      setReports((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [reports.length]);

  const statusLabel = useMemo(
    () => ({
      received: 'Received',
      reviewing: 'Reviewing',
      queued: 'Queued for GitHub',
      attached: 'Added to an issue',
      filed: 'Filed'
    }),
    []
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setFileError('');
    setReceipt('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const description = String(data.get('description') ?? '').trim();
    const title = String(data.get('title') ?? '').trim();
    const file = data.get('attachment');
    const challenge = String(data.get('bread-verification-token') ?? '');
    if (description.length < 10)
      return setError('Add at least 10 characters so the team can understand the issue.');
    if (file instanceof File && file.size > MAX_FILE_BYTES)
      return setFileError('Attachments must be 10 MB or smaller.');
    if (turnstileSiteKey && !challenge)
      return setError('Complete the verification check before sending.');
    const id = crypto.randomUUID();
    const body = [
      `[${String(data.get('feedback_type') ?? 'Feedback')}] ${title}`,
      '',
      description
    ].join('\n');
    const payload = new FormData();
    payload.set('submission_id', id);
    payload.set('body', body);
    payload.set('platform', String(data.get('platform') ?? ''));
    payload.set('turnstile_token', challenge || 'development-token');
    payload.set(
      'meta',
      JSON.stringify({
        install_id: installId(),
        wallet_version: data.get('wallet_version') || null,
        route: window.location.pathname
      })
    );
    if (file instanceof File && file.size > 0) payload.set('attachment', file, file.name);
    setBusy(true);
    try {
      await submitFeedback(payload);
      setReports((current) => [{ id, title, created: Date.now(), status: 'received' }, ...current]);
      form.reset();
      setFormVersion((value) => value + 1);
      setReceipt(title);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Feedback could not be sent.');
    } finally {
      setBusy(false);
      setVerificationVersion((value) => value + 1);
    }
  };

  return (
    <div className="help-center-home">
      <main id="help-center-content" tabIndex={-1} className="outline-none">
        <Container>
          <Reveal>
            <PageHeader
              eyebrow="We’re listening"
              title="Help us improve Bread Wallet"
              description="Report a problem or share an idea. Your submission is reviewed before anything is published."
            />
          </Reveal>
          <div className="mb-16 grid items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
            <Card className="py-6 sm:py-8">
              <CardContent className="px-5 sm:px-8">
                <div
                  className="mb-8 flex gap-3 rounded-xl bg-accent p-4 text-accent-foreground"
                  role="note"
                >
                  <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                  <p className="text-sm leading-6">
                    <strong>Keep your wallet safe.</strong>
                    <br />
                    Never include a recovery phrase, password, private key, or a screenshot that
                    shows one.
                  </p>
                </div>
                {receipt && (
                  <div
                    role="status"
                    className="mb-6 flex gap-3 rounded-xl bg-success-tint p-4 text-success"
                  >
                    <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="type-title">Thanks. We’ve received your feedback.</p>
                      <p className="mt-1 text-sm">
                        “{receipt}” is now in Your reports. You can check its review status here.
                      </p>
                    </div>
                  </div>
                )}
                <form
                  onSubmit={submit}
                  key={formVersion}
                  className="space-y-6"
                  aria-label="Send feedback"
                >
                  <fieldset disabled={busy} className="space-y-6 disabled:opacity-60">
                    <legend className="sr-only">Feedback details</legend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="feedback-type">Feedback type</Label>
                        <Select name="feedback_type" defaultValue="bug">
                          <SelectTrigger id="feedback-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bug">Bug report</SelectItem>
                            <SelectItem value="idea">Product idea</SelectItem>
                            <SelectItem value="content">Help Center feedback</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="feedback-platform">Platform</Label>
                        <Select name="platform" required>
                          <SelectTrigger id="feedback-platform">
                            <SelectValue placeholder="Select your platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="extension">Extension</SelectItem>
                            <SelectItem value="ios">iOS</SelectItem>
                            <SelectItem value="android">Android</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedback-title">Title</Label>
                      <Input
                        id="feedback-title"
                        name="title"
                        required
                        maxLength={120}
                        placeholder="A short summary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedback-description">Description</Label>
                      <Textarea
                        id="feedback-description"
                        name="description"
                        required
                        minLength={10}
                        maxLength={8000}
                        rows={6}
                        placeholder="What did you do, what did you expect, and what happened instead?"
                        aria-describedby="description-hint"
                      />
                      <p id="description-hint" className="type-caption text-muted-foreground">
                        A few specific details help us understand and reproduce the problem.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedback-version">
                        Wallet version{' '}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="feedback-version"
                        name="wallet_version"
                        placeholder="For example, 0.8.1"
                        className="sm:max-w-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedback-attachment">
                        <Paperclip className="size-4" aria-hidden="true" />
                        Screenshot or video{' '}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="feedback-attachment"
                        name="attachment"
                        type="file"
                        accept="image/png,image/jpeg,video/mp4"
                        className="h-auto rounded-xl border-dashed bg-secondary/40 py-4 file:mr-3 file:rounded-full file:bg-background file:px-3"
                        aria-describedby="attachment-hint"
                        aria-invalid={!!fileError}
                      />
                      <p id="attachment-hint" className="type-caption text-muted-foreground">
                        PNG, JPEG, or MP4. Maximum 10 MB. Remove any personal information first.
                      </p>
                    </div>
                  </fieldset>
                  {fileError && (
                    <p role="alert" className="text-sm text-destructive">
                      {fileError}
                    </p>
                  )}
                  <Verification key={verificationVersion} siteKey={turnstileSiteKey} />
                  {error && (
                    <p role="alert" className="rounded-xl bg-accent p-4 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6">
                    <p className="type-caption max-w-52 text-muted-foreground">
                      Your feedback helps shape what comes next.
                    </p>
                    <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                      {busy ? (
                        <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
                      ) : (
                        <ArrowRight aria-hidden="true" />
                      )}
                      {busy ? 'Sending…' : 'Send feedback'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            <aside className="lg:sticky lg:top-28" aria-labelledby="feedback-history-title">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="type-section" id="feedback-history-title">
                  Your reports
                </h2>
                <Badge variant="secondary">This browser</Badge>
              </div>
              {reports.length ? (
                <ol className="space-y-3">
                  {reports.map((report) => (
                    <li key={report.id}>
                      <Card className="gap-2 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <strong className="type-title break-words">{report.title}</strong>
                          <Badge variant="secondary" className="shrink-0">
                            {statusLabel[report.status]}
                          </Badge>
                        </div>
                        <p className="type-caption text-muted-foreground">
                          Submitted {new Date(report.created).toLocaleDateString()}
                        </p>
                        {report.issue && report.repo && (
                          <Button asChild variant="link" className="h-auto justify-start px-0">
                            <a href={issueHref(report)} target="_blank" rel="noopener noreferrer">
                              View issue #{report.issue}
                              <ArrowRight aria-hidden="true" />
                            </a>
                          </Button>
                        )}
                      </Card>
                    </li>
                  ))}
                </ol>
              ) : (
                <Card className="items-center border-dashed bg-secondary/30 px-6 py-10 text-center">
                  <Inbox
                    className="size-8 text-muted-foreground"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="type-title">Your ideas start here.</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Reports sent from this browser will appear here with their review status.
                    </p>
                  </div>
                </Card>
              )}
              <p className="type-caption mt-4 text-muted-foreground">
                Report history is saved on this device. Clearing browser data removes this list.
              </p>
            </aside>
          </div>
        </Container>
      </main>
      <HelpCenterFooter
        mainCategories={helpCenterMainCategories}
        firstCategoryId={firstCategoryId}
      />
    </div>
  );
}
