import { describe, expect, it } from 'vitest';

const articles = import.meta.glob<string>('./content/*.md', {
  query: '?raw', import: 'default', eager: true
});

// Raw frontmatter is bundled too: hiding an article is not a privacy boundary.
const privateContent = /https?:\/\/[^\s)"<>]*(?:slack\.com|notion\.(?:so|com)|docs\.google\.com|\.internal\b)|(?:held back|publish again).*(?:Ivan|asks)|\(Ivan,\s*\d{4}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]+/i;

describe('the public article boundary', () => {
  it('keeps private links, editorial provenance and credential markers out of raw shipped articles', () => {
    for (const [path, source] of Object.entries(articles)) {
      expect(privateContent.test(source), `${path}: private content must not ship`).toBe(false);
    }
  });

  it('does not bundle the removed recovery-phrase screenshot', () => {
    const images = import.meta.glob('./assets/screenshots/*.png', { eager: true });
    expect(Object.keys(images).some(path => path.endsWith('/M12-restore-phrase.png'))).toBe(false);
  });
});
