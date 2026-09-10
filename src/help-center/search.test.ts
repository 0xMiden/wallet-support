import { describe, expect, it } from 'vitest';

import { helpCenterMainCategories } from './categories';
import { helpCenterArticles } from './content';
import { searchHelpCenter } from './search';

const find = (q: string, platform: 'extension-desktop' | 'mobile' = 'extension-desktop') =>
  searchHelpCenter(helpCenterArticles, helpCenterMainCategories, q, platform);

describe('searching the Help Center', () => {
  it('finds articles by title', () => {
    expect(find('recall height').map(r => r.article.id)).toContain('what-is-recall-height');
  });

  it('finds the phrases that used to return nothing', () => {
    // Each of these matched no category title, so the old search found nothing
    // while several articles covered the subject.
    for (const query of ['recovery phrase', 'seed phrase', 'stuck', 'chrome', 'faucet', 'biometric']) {
      expect(find(query).length, `"${query}" found nothing`).toBeGreaterThan(0);
    }
  });

  it('ranks a title match above a body-only match', () => {
    const results = find('guardian');
    expect(results[0]?.matchedTitle).toBe(true);
    expect(results.some(r => !r.matchedTitle)).toBe(true);
  });

  it('reads past image markup rather than searching or quoting it', () => {
    // An image line's alt text describes a picture; it is not a sentence in
    // the article. Read as a link, it used to reach snippets as "!Three keys".
    expect(find('always in control')).toEqual([]);
    for (const result of find('keys')) expect(result.snippet).not.toMatch(/!|\]\(|\.png/);
  });

  it('returns a snippet showing why the result matched', () => {
    const [first] = find('jigsaw');
    expect(first?.snippet.toLocaleLowerCase()).toContain('jigsaw');
    expect(first?.snippet).not.toMatch(/\*\*|\]\(|<!--/);
  });

  it('carries the category a result belongs to', () => {
    const [first] = find('recall height');
    expect(first?.mainCategoryTitle).toBe('Manage wallet');
    expect(first?.subcategoryTitle).toBe('Sending, receiving, and claiming');
  });

  it('still finds an extension-only article while Mobile is selected', () => {
    expect(find('encrypted file', 'mobile').map(r => r.article.id)).toContain(
      'how-to-download-the-encrypted-file'
    );
  });

  it('ignores a query shorter than two characters', () => {
    expect(find('a')).toEqual([]);
    expect(find(' ')).toEqual([]);
  });

  it('returns nothing for a phrase that genuinely is not there', () => {
    expect(find('quantum tunnelling')).toEqual([]);
  });

  it('matches case-insensitively', () => {
    expect(find('GUARDIAN').length).toBe(find('guardian').length);
  });
});
