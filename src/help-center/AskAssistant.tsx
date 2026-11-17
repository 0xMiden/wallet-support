import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { AskError, MAX_FOLLOW_UPS, MAX_QUESTION_CHARS, answerBlocks, askQuestion } from './ask';
import type { AskSource, AskTurn } from './ask';
import logo from './assets/bread-logo.svg';
import { ArrowIcon } from './HelpCenterHome';
import { CONTACT_SUPPORT_URL } from './links';
import type { HelpCenterPlatform } from './types';
import './ask.css';

export const ASSISTANT_NAME = 'Bread Assistant';

interface QuestionEntry { readonly kind: 'question'; readonly text: string }
interface AnswerEntry {
  readonly kind: 'answer';
  readonly answered: boolean;
  readonly text: string;
  readonly sources: readonly AskSource[];
  readonly offerSupport: boolean;
  readonly signature: string;
}
type Entry = QuestionEntry | AnswerEntry;

type Notice = 'blocked' | 'rate-limited' | 'unavailable' | 'invalid' | null;

const NOTICES: Readonly<Record<Exclude<Notice, null>, string>> = {
  blocked:
    "That looks like a recovery phrase or key, so it wasn't sent. Never share it with anyone, including Bread support.",
  'rate-limited': "You've asked a lot of questions in the last hour. Try again later, or contact support.",
  unavailable: `${ASSISTANT_NAME} isn't available right now. Search the Help Center, or contact support.`,
  invalid: "That question couldn't be sent. Shorten it and try again."
};

/** The width at which the panel fills the screen (the 620 breakpoint in ask.css). */
const FULL_SCREEN = '(max-width: 620px)';

/** What the server is sent: the conversation so far, never a blocked question. */
function history(entries: readonly Entry[]): AskTurn[] {
  return entries.map(entry =>
    entry.kind === 'question'
      ? { role: 'user', content: entry.text }
      : { role: 'assistant', content: entry.text, signature: entry.signature }
  );
}

function Avatar() {
  return (
    <span className="help-ask-avatar" aria-hidden="true">
      <img src={logo} alt="" />
    </span>
  );
}

function ChatIcon() {
  return (
    <svg className="help-ask-icon" aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" />
    </svg>
  );
}

function CloseIcon() {
  return <svg className="help-ask-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>;
}

function MinimiseIcon() {
  return <svg className="help-ask-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 12h12" /></svg>;
}

/** React 18 does not know `inert` yet; passed as an empty string it is set as a plain attribute. */
const inertWhile = (on: boolean) => (on ? ({ inert: '' } as Record<string, string>) : {});

function Answer({ entry, onFollowLink }: { readonly entry: AnswerEntry; readonly onFollowLink: () => void }) {
  return (
    <li className="help-ask-answer">
      <span className="help-center-visually-hidden">{ASSISTANT_NAME}: </span>
      {answerBlocks(entry.text).map((block, index) =>
        block.kind === 'paragraph'
          ? <p key={index}>{block.text}</p>
          : <ol key={index} start={block.start}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol>
      )}
      {entry.answered && entry.sources.length > 0 ? (
        <div className="help-ask-sources">
          <p className="help-ask-sources-label">From the Help Center</p>
          <ul>
            {entry.sources.map(source => (
              <li key={source.id}><a href={`/${source.href}`} onClick={onFollowLink}>{source.title}</a></li>
            ))}
          </ul>
        </div>
      ) : entry.offerSupport ? (
        <a className="help-ask-contact" href={CONTACT_SUPPORT_URL} target="_blank" rel="noopener noreferrer">
          Contact Support<ArrowIcon />
        </a>
      ) : null}
    </li>
  );
}

export interface AskAssistantProps {
  readonly platform: HelpCenterPlatform;
}

/**
 * Bread Assistant: a floating "Ask a Question" button that opens a chat panel,
 * answered from the Help Center articles.
 *
 * The panel is not modal on a wide screen, so the article behind it stays
 * readable and usable; on a phone it fills the screen. It is mounted once by the
 * Help Center shell, so the conversation survives opening a cited article.
 *
 * Answers are plain text, rendered as text, and their links come from the
 * server's own article list. A conversation allows MAX_FOLLOW_UPS questions
 * after the first; the server enforces the same limit.
 */
export function AskAssistant({ platform }: AskAssistantProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [limitReached, setLimitReached] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  // Bumped when a chat ends, so an answer still on its way to the old chat is dropped.
  const conversation = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLButtonElement>(null);
  const confirmTitleId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();

  const asked = entries.filter(entry => entry.kind === 'question').length;
  const followUpsLeft = Math.max(0, MAX_FOLLOW_UPS - Math.max(0, asked - 1));
  const closed = limitReached || (asked > 0 && followUpsLeft === 0);

  // Opening puts the reader in the question field.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // The newest message stays in view.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [entries, pending, notice, open]);

  /** Minimise: the panel goes, the conversation stays for when the reader comes back. */
  const close = () => {
    setOpen(false);
    // Focus goes back to the control that opened the panel, not to the top of the page.
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  /**
   * Ending a chat clears it, which cannot be undone, so it is confirmed first,
   * but only when there is something to lose: an empty chat just closes.
   */
  const askToEnd = () => {
    if (entries.length === 0 && !limitReached && !draft.trim()) {
      close();
      return;
    }
    setConfirmingEnd(true);
  };

  const endChat = () => {
    conversation.current += 1;
    setEntries([]);
    setLimitReached(false);
    setDraft('');
    setNotice(null);
    setPending(false);
    setConfirmingEnd(false);
    close();
  };

  const keepChatting = () => {
    setConfirmingEnd(false);
    requestAnimationFrame(() => endRef.current?.focus());
  };

  // The safe answer has focus when the question appears.
  useEffect(() => {
    if (confirmingEnd) keepRef.current?.focus();
  }, [confirmingEnd]);

  // On a phone the panel covers the article a source link opens, so it steps aside.
  const followLink = () => {
    if (window.matchMedia?.(FULL_SCREEN).matches) setOpen(false);
  };

  const send = async () => {
    const question = draft.trim();
    if (!question || pending || closed) return;

    const before = entries;
    const thisConversation = conversation.current;
    setNotice(null);
    setPending(true);
    setEntries([...before, { kind: 'question', text: question }]);
    setDraft('');

    try {
      const result = await askQuestion(platform, [...history(before), { role: 'user', content: question }]);
      if (conversation.current !== thisConversation) return;
      if (result.status === 'blocked') {
        // The question is taken off the screen as well as out of the
        // conversation: a recovery phrase should not stay on display.
        setEntries(before);
        setNotice('blocked');
      } else {
        setEntries([...before, { kind: 'question', text: question }, { kind: 'answer', answered: result.answered, text: result.answer, sources: result.sources, offerSupport: result.offerSupport, signature: result.signature }]);
      }
    } catch (error) {
      if (conversation.current !== thisConversation) return;
      setEntries(before);
      if (error instanceof AskError && error.kind === 'limit') {
        setLimitReached(true);
      } else {
        setDraft(question);
        setNotice(error instanceof AskError && error.kind !== 'limit' ? error.kind : 'unavailable');
      }
    } finally {
      if (conversation.current === thisConversation) {
        setPending(false);
        inputRef.current?.focus();
      }
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  // Enter sends, Shift+Enter starts a new line, as in most chat boxes.
  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  // Esc minimises; while "End chat?" is showing, it answers No.
  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (confirmingEnd) keepChatting();
      else close();
    }
  };

  // Counted down only near the end; a running count from 30 is noise.
  const status = asked === 0 || (!closed && followUpsLeft > 5)
    ? null
    : closed
      ? 'That is the limit for this conversation. End the chat to start a new one'
      : `${followUpsLeft} follow-up ${followUpsLeft === 1 ? 'question' : 'questions'} left`;

  return (
    <>
      <button
        ref={launcherRef}
        className="help-ask-launcher"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        hidden={open}
        onClick={() => setOpen(true)}
      >
        <ChatIcon /><span className="help-ask-launcher-label">Ask a Question</span>
      </button>

      <div
        id={panelId}
        className={`help-ask${confirmingEnd ? ' is-confirming' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        hidden={!open}
        onKeyDown={onPanelKeyDown}
      >
        <div className="help-ask-header" {...inertWhile(confirmingEnd)}>
          <h2 id={titleId}>Ask a Question</h2>
          <button className="help-ask-tool" type="button" onClick={close} title="Minimise">
            <MinimiseIcon /><span className="help-center-visually-hidden">Minimise, and keep the chat</span>
          </button>
          <button ref={endRef} className="help-ask-tool" type="button" onClick={askToEnd} title="End chat">
            <CloseIcon /><span className="help-center-visually-hidden">End chat</span>
          </button>
        </div>

        <div className="help-ask-body" ref={logRef} {...inertWhile(confirmingEnd)}>
          <div className="help-ask-intro">
            <Avatar />
            <p className="help-ask-intro-name">{ASSISTANT_NAME}</p>
            <p className="help-ask-safety" role="note">
              <strong>Never share your recovery phrase.</strong> Bread will never ask for it, or for your password or keys.
            </p>
          </div>

          <ol className="help-ask-log" aria-live="polite" aria-busy={pending}>
            <li className="help-ask-answer">
              <span className="help-center-visually-hidden">{ASSISTANT_NAME}: </span>
              <p>Hi! How can I help you with Bread Wallet today?</p>
            </li>
            {entries.map((entry, index) =>
              entry.kind === 'question' ? (
                <li className="help-ask-question" key={index}>
                  <span className="help-center-visually-hidden">You asked: </span>{entry.text}
                </li>
              ) : (
                <Answer key={index} entry={entry} onFollowLink={followLink} />
              )
            )}
            {pending ? <li className="help-ask-pending">Finding an answer…</li> : null}
          </ol>

          {notice ? <p className="help-ask-notice" role="alert">{NOTICES[notice]}</p> : null}
        </div>

        <div className="help-ask-footer" {...inertWhile(confirmingEnd)}>
          <form className="help-ask-form" onSubmit={submit}>
            <label className="help-center-visually-hidden" htmlFor={`${panelId}-input`}>Your question</label>
            <textarea
              id={`${panelId}-input`}
              ref={inputRef}
              rows={1}
              maxLength={MAX_QUESTION_CHARS}
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={asked === 0 ? `Ask ${ASSISTANT_NAME} anything` : 'Ask a follow-up question'}
              disabled={closed}
              autoComplete="off"
            />
            <button className="help-ask-submit" type="submit" disabled={pending || closed || !draft.trim()}>
              <span className="help-center-visually-hidden">Send question</span><ArrowIcon />
            </button>
          </form>
          <p className="help-ask-meta">
            {status ? <span>{status}. </span> : null}
            {ASSISTANT_NAME} is AI and can make mistakes. Check the linked articles.
          </p>
        </div>

        {confirmingEnd ? (
          <div className="help-ask-confirm-scrim">
            <div className="help-ask-confirm" role="alertdialog" aria-labelledby={confirmTitleId} aria-describedby={`${confirmTitleId}-note`}>
              <p className="help-ask-confirm-title" id={confirmTitleId}>End chat?</p>
              <p className="help-ask-confirm-note" id={`${confirmTitleId}-note`}>This clears the conversation.</p>
              <div className="help-ask-confirm-actions">
                <button type="button" onClick={endChat}>Yes</button>
                <button ref={keepRef} type="button" onClick={keepChatting}>No</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
