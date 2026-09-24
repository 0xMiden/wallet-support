import { describe, expect, it } from 'vitest';

import { helpCenterAllArticles, helpCenterArticleImages } from './content';
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

  it('routes the retired feedback worker URL through the integrated support form', () => {
    const html = render('[Support](https://miden-feedback-v2.miden-feedback-relay.workers.dev/?cb=4)');
    expect(html).toContain('<a href="/feedback">Support</a>');
    expect(html).not.toContain('workers.dev');
  });

  it('refuses a link scheme outside http, https and mailto', () => {
    expect(() => render('[x](javascript:alert(1))')).toThrow(/link scheme is not supported/);
  });

  it('links to another article by its hash route, in the same tab', () => {
    // No target: the reader stays in the Help Center, and a hash link keeps the
    // query string, so the platform they are reading on comes with them.
    expect(render('See [*What is Guardian?*](#guardian-protection/what-is-guardian)')).toBe(
      '<p>See <a href="#guardian-protection/what-is-guardian"><em>What is Guardian?</em></a></p>'
    );
  });

  it('refuses a hash link that is not the shape of a route', () => {
    for (const href of ['#Guardian', '#guardian_protection', '#a/b/c', '#', '/guardian-protection']) {
      expect(() => render(`[x](${href})`), href).toThrow(/link scheme is not supported/);
    }
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

describe('images', () => {
  const images = { 'keys.png': { src: '/assets/keys-abc.png', width: 1024, height: 396 } };

  it('renders an image line as a figure, with its alt text and size', () => {
    expect(renderMarkdown('![Three keys, always in control](keys.png)', 'test.md', images)).toContain(
      '<img src="/assets/keys-abc.png" alt="Three keys, always in control" width="1024" height="396" loading="lazy" decoding="async">'
    );
  });

  it('makes the figure a link to the image at full size, in a new tab, named after the diagram', () => {
    const html = renderMarkdown('![Three keys, "always" in control](keys.png)', 'test.md', images);
    expect(html.startsWith(
      '<figure><a href="/assets/keys-abc.png" target="_blank" rel="noopener noreferrer" ' +
        'aria-label="Open diagram full size: Three keys, &quot;always&quot; in control"><img '
    )).toBe(true);
    // The visible label is the start of the accessible name, and the icon beside it is decoration.
    expect(html).toMatch(/<span>Open diagram full size<svg aria-hidden="true"[^>]*>.*<\/svg><\/span><\/a><\/figure>$/);
  });

  it('refuses an image with no alt text', () => {
    expect(() => renderMarkdown('![](keys.png)', 'test.md', images)).toThrow(/needs alt text/);
  });

  it('refuses an image it was not given, external addresses included', () => {
    expect(() => renderMarkdown('![Keys](other.png)', 'test.md', images)).toThrow(/no image named "other\.png"/);
    expect(() => renderMarkdown('![Keys](https://example.com/keys.png)', 'test.md', images)).toThrow(
      /no image named/
    );
  });

  it("refuses an image inside a sentence, as a list item's own text, or in a callout", () => {
    for (const source of ['see ![Keys](keys.png) here', '- ![Keys](keys.png)', '> ![Keys](keys.png)']) {
      expect(() => renderMarkdown(source, 'test.md', images), source).toThrow(/images are not supported/);
    }
  });

  // Where a step screenshot goes: its own line in the block under the step, not
  // the step's text. §7 of tasks/content-proposal.md places every one at a step.
  it("shows an image in a step's own block, inside the step it illustrates", () => {
    const html = renderMarkdown(
      ['1. Open **Settings**.', '', '   ![Settings, open at Security](keys.png)', '', '2. Pick the file.'].join('\n'),
      'test.md',
      images
    );
    expect(html).toContain('<figure>');
    expect(html.indexOf('<figure>')).toBeGreaterThan(html.indexOf('<li>'));
    expect(html.indexOf('</li>')).toBeGreaterThan(html.indexOf('</figure>'));
    // The step numbering survives the figure sitting between the two items.
    expect(html.match(/<li>/g)).toHaveLength(2);
  });

  // A callout is prose. Nesting a list in one must not smuggle a figure inside.
  it('refuses an image in a list nested inside a callout', () => {
    const source = ['> Caution:', '>', '> 1. Open it.', '>', '>    ![Keys](keys.png)'].join('\n');
    expect(() => renderMarkdown(source, 'test.md', images)).toThrow(/images are not supported/);
  });

  it('calls a screenshot a screenshot, and leaves the shipped diagram label alone', () => {
    const shots = { 'step.png': { src: '/assets/step-abc.png', width: 1280, height: 800, kind: 'screenshot' as const } };
    const html = renderMarkdown('![Settings, open at Security](step.png)', 'test.md', shots);
    expect(html).toContain('aria-label="Open screenshot full size: Settings, open at Security"');
    expect(html).toContain('<span>Open screenshot full size');
    expect(html).not.toContain('diagram');
    // An untagged image is a diagram, which is what the five FAQ images are.
    expect(renderMarkdown('![Keys](keys.png)', 'test.md', images)).toContain('Open diagram full size');
  });

  // Captured at 2x, so half the file is life size. The link still opens the
  // file itself, at full size.
  it('shows a narrow capture at half its size, and anything else at its own', () => {
    const shots = {
      'dialog.png': { src: '/assets/dialog.png', width: 870, height: 486, kind: 'screenshot' as const, narrow: true as const },
      'odd.png': { src: '/assets/odd.png', width: 621, height: 381, kind: 'screenshot' as const, narrow: true as const },
      'page.png': { src: '/assets/page.png', width: 1360, height: 900, kind: 'screenshot' as const }
    };
    const dialog = renderMarkdown('![Add extension](dialog.png)', 'test.md', shots);
    expect(dialog).toContain('width="435" height="243"');
    expect(dialog).toContain('href="/assets/dialog.png"');
    expect(renderMarkdown('![Pin](odd.png)', 'test.md', shots)).toContain('width="311" height="191"');
    expect(renderMarkdown('![Listing](page.png)', 'test.md', shots)).toContain('width="1360" height="900"');
  });
});

describe('the migrated articles', () => {
  it('renders all 82 platform bodies without throwing', () => {
    let rendered = 0;
    for (const article of helpCenterAllArticles) {
      for (const platform of article.platforms) {
        const html = renderMarkdown(
          article.bodies[platform] as string,
          `${article.id} (${platform})`,
          helpCenterArticleImages
        );
        expect(html.length, `${article.id} (${platform}) rendered empty`).toBeGreaterThan(0);
        rendered += 1;
      }
    }
    expect(rendered).toBe(82);
  });

  it('shows every supplied image, each exactly once', () => {
    // Each distinct body once: a body shared by both platforms is one page, and
    // a Mobile body carries its own phone captures.
    const shown = helpCenterAllArticles.flatMap(article =>
      [...new Set(article.platforms.map(platform => article.bodies[platform] ?? ''))].flatMap(body =>
        [...renderMarkdown(body, article.id, helpCenterArticleImages).matchAll(/<img src="([^"]+)"/g)].map(
          match => match[1]
        )
      )
    );
    expect(shown.sort()).toEqual(Object.values(helpCenterArticleImages).map(image => image.src).sort());
  });

  it('leaves no unrendered markdown markers in the output', () => {
    for (const article of helpCenterAllArticles) {
      for (const platform of article.platforms) {
        const html = renderMarkdown(article.bodies[platform] as string, article.id, helpCenterArticleImages);
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
        [...renderMarkdown(article.bodies[platform] as string, article.id, helpCenterArticleImages).matchAll(/<h2>/g)]
      )
    );
    expect(headings.length).toBeGreaterThan(20);
  });
});
