import { describe, expect, it } from 'vitest';
import { answerBlocks } from './ask';
import { buildAskCorpus } from './askCorpus';
import { helpCenterArticles } from './content';
import { articleHref } from './routing';
import { scanForSecrets } from '../../worker/feedback/src/lib/secret-scan';

const sources = import.meta.glob<string>('./content/*.md', { query: '?raw', import: 'default', eager: true });

describe('Ask assistant article set', () => {
  const corpus = buildAskCorpus(sources);

  it('holds exactly the published articles, so it cannot answer from a hidden one', () => {
    expect(corpus.articles.map(article => article.id)).toEqual(helpCenterArticles.map(article => article.id));
  });

  it('links each article to the address the Help Center opens it at', () => {
    for (const article of corpus.articles) {
      const page = helpCenterArticles.find(entry => entry.id === article.id);
      expect(article.href).toBe(articleHref(page?.subcategory ?? '', article.id));
    }
  });

  it('keeps the article text, with images reduced to their descriptions', () => {
    for (const article of corpus.articles) {
      const page = helpCenterArticles.find(entry => entry.id === article.id);
      expect(article.platforms).toEqual(page?.platforms);
      for (const platform of article.platforms) {
        const body = article.bodies[platform] ?? '';
        expect(body, `${article.id} (${platform})`).not.toMatch(/!\[[^\]]*\]\(/);
        const original = (page?.bodies[platform] ?? '').replace(/!\[([^\]]*)\]\([^)]*\)/g, (_m, alt: string) => (alt.trim() ? `[Image: ${alt.trim()}]` : ''));
        expect(body, `${article.id} (${platform})`).toBe(original);
      }
    }
  });
});

describe('the recovery phrase check that guards the Ask box and the feedback form', () => {
  // Readers quote the Help Center back in their questions and reports, so its
  // own text is the fairest sample of ordinary wallet English. A match here is
  // a false positive: a question the reader cannot send, or a report the relay
  // would redact.
  it('passes every published article, paragraph by paragraph and whole', () => {
    const corpus = buildAskCorpus(sources);
    const flagged: string[] = [];
    for (const article of corpus.articles) {
      for (const platform of article.platforms) {
        const body = article.bodies[platform] ?? '';
        for (const text of [body, ...body.split(/\n\s*\n/)]) {
          const hits = scanForSecrets(text);
          if (hits.length) flagged.push(`${article.id} (${platform}): ${hits.map(hit => hit.note).join(', ')}: ${text.slice(0, 80)}`);
        }
      }
    }
    expect(flagged).toEqual([]);
  });
});

describe('Ask answers', () => {
  it('keep markup as plain text and group numbered lines into steps', () => {
    expect(answerBlocks('1. Open the app.\n\n2. Tap <b>Restore</b>.\n')).toEqual([
      { kind: 'steps', start: 1, items: ['Open the app.', 'Tap <b>Restore</b>.'] }
    ]);
  });

  it('split steps the model ran together into one paragraph', () => {
    expect(answerBlocks('Have your phrase ready. 1. Open Bread. 2. Select Recover. 3. Enter the words. Then wait for sync.')).toEqual([
      { kind: 'paragraph', text: 'Have your phrase ready.' },
      { kind: 'steps', start: 1, items: ['Open Bread.', 'Select Recover.', 'Enter the words. Then wait for sync.'] }
    ]);
  });

  it('leave a lone number inside a sentence alone', () => {
    expect(answerBlocks('Wait about 2. Then check again.')).toEqual([
      { kind: 'paragraph', text: 'Wait about 2. Then check again.' }
    ]);
  });
});
