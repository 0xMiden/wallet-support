import { describe, expect, it } from 'vitest';

import { helpCenterAllArticles } from './content';
import { renderMarkdown } from './markdown';

const render = (source: string) => renderMarkdown(source, 'test.md');

describe('inline markup', () => {
  it('renders bold and italic', () => {
    // Inline bold. A line that is *only* bold is a section label — see below.
    expect(render('the **Steps:** list')).toBe('<p>the <strong>Steps:</strong> list</p>');
    expect(render('you lost *all* your keys')).toBe('<p>you lost <em>all</em> your keys</p>');
  });

  it('escapes every text node', () => {
    // A raw HTML tag is refused rather than escaped; that rule is covered below.
    expect(render(`5 < 6 & "quoted" and it's fine`)).toBe(
      '<p>5 &lt; 6 &amp; &quot;quoted&quot; and it&#39;s fine</p>'
    );
  });

  it('gives external links target and rel', () => {
    expect(render('[App Store](https://apps.apple.com/app)')).toBe(
      '<p><a href="https://apps.apple.com/app" target="_blank" rel="noopener noreferrer">App Store</a></p>'
    );
  });

  it('keeps bold inside a link label', () => {
    expect(render('[**SUPPORT**](https://example.com/)')).toContain('<strong>SUPPORT</strong>');
  });

  it('refuses a link scheme outside http, https and mailto', () => {
    expect(() => render('[x](javascript:alert(1))')).toThrow(/link scheme is not supported/);
  });
});

describe('lists', () => {
  it('renders an ordered list', () => {
    expect(render('1. First\n2. Second')).toBe('<ol><li>First</li><li>Second</li></ol>');
  });

  it('renders bold inside a list item', () => {
    expect(render('- Select **Encrypted Wallet File**.')).toBe(
      '<ul><li>Select <strong>Encrypted Wallet File</strong>.</li></ul>'
    );
  });

  it('nests an ordered list inside an ordered item, as article #2 does', () => {
    const html = render(
      [
        '5. On the account recovery page, you can choose between two options:',
        '   1. Guardian: the recommended path.',
        '   2. Fully private: local only.',
        '   Then click "Continue" as the final stage.'
      ].join('\n')
    );
    expect(html).toContain('<ol start="5">');
    expect(html).toContain('<ol><li>Guardian: the recommended path.</li>');
    expect(html).toContain('Fully private: local only.');
    expect(html).toContain('Then click &quot;Continue&quot; as the final stage.');
  });

  it('nests an unordered list inside an ordered item, as the mobile create flow does', () => {
    const html = render(
      ['2. Choose how to protect your wallet.', '   - Bread asks how you would like to lock it.'].join('\n')
    );
    expect(html).toContain('<ol start="2">');
    expect(html).toContain('<ul><li>Bread asks how you would like to lock it.</li></ul>');
  });

  it('starts a fresh list where the mobile create flow restarts numbering', () => {
    // The source restarts at 1 after a Guardian callout — a Notion artefact the
    // proposal records in §4. A blank line alone would be one loose list, which
    // is why this uses the shape the article actually has.
    const html = render(
      [
        '5. Pick your Guardian, then tap "Continue" to proceed.',
        '',
        '> Think of a Guardian as a secure backup layer.',
        '',
        '1. You will see the ready screen.'
      ].join('\n')
    );
    expect(html).toBe(
      '<ol start="5"><li>Pick your Guardian, then tap &quot;Continue&quot; to proceed.</li></ol>' +
        '<blockquote><p>Think of a Guardian as a secure backup layer.</p></blockquote>' +
        '<ol><li>You will see the ready screen.</li></ol>'
    );
  });

  it('carries a start attribute only when a list does not begin at one', () => {
    expect(render('3. Third')).toBe('<ol start="3"><li>Third</li></ol>');
    expect(render('1. First')).toBe('<ol><li>First</li></ol>');
  });
});

describe('blockquote callouts', () => {
  it('renders a plain callout', () => {
    expect(render('> Caution: only use official links.')).toBe(
      '<blockquote><p>Caution: only use official links.</p></blockquote>'
    );
  });

  it('renders a callout that contains a list, as the recovery-phrase warning does', () => {
    const html = render(
      [
        '> **Before you type your recovery phrase:** it is the master key.',
        '> - Only enter it in the official extension.',
        '> - No support team will ever ask for it.'
      ].join('\n')
    );
    expect(html).toBe(
      '<blockquote><p><strong>Before you type your recovery phrase:</strong> it is the master key.</p>' +
        '<ul><li>Only enter it in the official extension.</li>' +
        '<li>No support team will ever ask for it.</li></ul></blockquote>'
    );
  });

  it('renders a link inside a callout', () => {
    expect(render('> iOS: [App Store](https://apps.apple.com/x)')).toContain('target="_blank"');
  });
});

describe('refusing what it does not understand', () => {
  it.each([
    ['a heading', '## Heading'],
    ['a code fence', '```js\ncode\n```'],
    ['a table', '| a | b |'],
    ['a horizontal rule', '---'],
    ['inline code', 'use `yarn build` here'],
    ['an image', '![alt](https://example.com/a.png)'],
    ['a raw HTML tag', 'text <span>more</span>'],
    ['an unclosed bold marker', 'text ** more']
  ])('throws on %s rather than dropping it', (_label, source) => {
    expect(() => render(source)).toThrow();
  });

  it('names the file and the offending line when it throws', () => {
    expect(() => renderMarkdown('## Heading', 'article.md')).toThrow(/^article\.md: /);
  });
});

describe('the migrated articles', () => {
  it('renders all 44 platform bodies without throwing', () => {
    let rendered = 0;
    for (const article of helpCenterAllArticles) {
      for (const platform of article.platforms) {
        const html = renderMarkdown(article.bodies[platform] as string, `${article.id} (${platform})`);
        expect(html.length, `${article.id} (${platform}) rendered empty`).toBeGreaterThan(0);
        rendered += 1;
      }
    }
    expect(rendered).toBe(44);
  });

  it('leaves no unrendered markdown markers in the output', () => {
    for (const article of helpCenterAllArticles) {
      for (const platform of article.platforms) {
        const html = renderMarkdown(article.bodies[platform] as string, article.id);
        expect(html, `${article.id} (${platform})`).not.toMatch(/\*\*|\]\(/);
      }
    }
  });
});

describe('section labels', () => {
  it('promotes a paragraph that is only a bold span to a heading', () => {
    expect(render('**Steps:**')).toBe('<h2>Steps:</h2>');
    expect(render('**If Guardian is enabled:**')).toBe('<h2>If Guardian is enabled:</h2>');
  });

  it('leaves bold that is part of a sentence alone', () => {
    expect(render('**Important note:** never share it.')).toBe(
      '<p><strong>Important note:</strong> never share it.</p>'
    );
  });

  it('does not promote a bold lead inside a callout or a list item', () => {
    expect(render('> **Reminder:**')).toBe('<blockquote><p><strong>Reminder:</strong></p></blockquote>');
    expect(render('- **Guardian:**')).toBe('<ul><li><strong>Guardian:</strong></li></ul>');
  });

  it('gives the shipped articles a real outline', () => {
    const headings = helpCenterAllArticles.flatMap(article =>
      article.platforms.flatMap(platform =>
        [...renderMarkdown(article.bodies[platform] as string, article.id).matchAll(/<h2>/g)]
      )
    );
    expect(headings.length).toBeGreaterThan(20);
  });
});
