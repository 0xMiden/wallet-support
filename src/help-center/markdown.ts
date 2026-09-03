/**
 * A deliberately small Markdown renderer for the exact subset the migrated
 * articles use: paragraphs, bold, italic, links, ordered and unordered lists
 * including nesting, and blockquote callouts.
 *
 * The subset was derived by scanning content-source/ rather than declared in
 * advance — italic is in it because two sentences in "What should I do if I
 * lose my recovery phrase?" turn on emphasised words ("*all* your keys").
 *
 * It throws on anything it does not understand instead of dropping it. Silently
 * discarding a construct is how a security instruction quietly loses the word
 * that changed its meaning.
 *
 * Every text node is escaped and every tag is emitted by this file, so the
 * output is safe to inject. No input reaches the DOM unescaped.
 */

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

// Built fresh per call, never shared. renderInline recurses for bold, italic and
// link labels, and a module-level /g regex would have its lastIndex clobbered by
// the inner call — which is an infinite loop, not a wrong result.
const INLINE_SOURCE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/;
const UNSUPPORTED_INLINE = /`|!\[|<[a-zA-Z/]|\*|\]\(|(?<![a-zA-Z0-9])_[^_\s][^_]*_/;
const LIST_ITEM = /^(\s*)(?:(\d+)\.|[-*+])\s+(.*)$/;
const ORDERED_ITEM = /^(\s*)(\d+)\.\s+(.*)$/;
const BLOCK_QUOTE = /^\s*>\s?(.*)$/;
const UNSUPPORTED_BLOCK = /^\s*(#{1,6}\s|```|\||(-{3,}|\*{3,}|_{3,})\s*$)/;

function escapeText(text: string) {
  return text.replace(/[&<>"']/g, character => ESCAPES[character] as string);
}

function fail(origin: string, reason: string, line: string): never {
  throw new Error(`${origin}: ${reason} — ${line.trim().slice(0, 80)}`);
}

function renderLink(label: string, href: string, origin: string, line: string) {
  if (!/^https?:\/\//.test(href) && !href.startsWith('mailto:')) {
    fail(origin, `link scheme is not supported ("${href}")`, line);
  }
  const external = /^https?:\/\//.test(href);
  const attributes = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${escapeText(href)}"${attributes}>${renderInline(label, origin, line)}</a>`;
}

export function renderInline(source: string, origin: string, line = source): string {
  // Checked before tokenising: the link half of "![alt](url)" would otherwise be
  // consumed as a link and leave a stray "!" that looks like ordinary text.
  if (/!\[/.test(source)) fail(origin, 'images are not supported', line);

  let output = '';
  let index = 0;

  const inline = new RegExp(INLINE_SOURCE.source, 'g');
  for (let match = inline.exec(source); match !== null; match = inline.exec(source)) {
    const plain = source.slice(index, match.index);
    if (UNSUPPORTED_INLINE.test(plain)) fail(origin, 'unsupported inline markup', line);
    output += escapeText(plain);

    if (match[1] !== undefined) output += `<strong>${renderInline(match[1], origin, line)}</strong>`;
    else if (match[2] !== undefined) output += `<em>${renderInline(match[2], origin, line)}</em>`;
    else output += renderLink(match[3] as string, match[4] as string, origin, line);

    index = match.index + match[0].length;
  }

  const tail = source.slice(index);
  if (UNSUPPORTED_INLINE.test(tail)) fail(origin, 'unsupported inline markup', line);
  return output + escapeText(tail);
}

function indentOf(line: string) {
  return (/^\s*/.exec(line) as RegExpExecArray)[0].length;
}

function dedent(lines: readonly string[], amount: number) {
  return lines.map(line => (line.trim() === '' ? '' : line.slice(amount)));
}

function renderList(lines: readonly string[], origin: string): string {
  const first = LIST_ITEM.exec(lines[0] as string) as RegExpExecArray;
  const baseIndent = first[1].length;
  const ordered = ORDERED_ITEM.test(lines[0] as string);

  const items: { text: string; rest: string[] }[] = [];
  for (const line of lines) {
    const item = LIST_ITEM.exec(line);
    if (item !== null && item[1].length === baseIndent) items.push({ text: item[3], rest: [] });
    else (items[items.length - 1] as { rest: string[] }).rest.push(line);
  }

  const rendered = items
    .map(item => {
      const rest = item.rest.filter(line => line.trim() !== '' || item.rest.length > 1);
      const nested = rest.length > 0 ? renderBlocks(dedent(rest, indentOf(rest[0] as string)), origin) : '';
      return `<li>${renderInline(item.text, origin)}${nested}</li>`;
    })
    .join('');

  const start = ordered && first[2] !== '1' ? ` start="${Number(first[2])}"` : '';
  return ordered ? `<ol${start}>${rendered}</ol>` : `<ul>${rendered}</ul>`;
}

export function renderBlocks(lines: readonly string[], origin: string): string {
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] as string;

    if (line.trim() === '') {
      index += 1;
      continue;
    }
    if (UNSUPPORTED_BLOCK.test(line)) fail(origin, 'unsupported block construct', line);

    if (BLOCK_QUOTE.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && BLOCK_QUOTE.test(lines[index] as string)) {
        quoted.push((BLOCK_QUOTE.exec(lines[index] as string) as RegExpExecArray)[1]);
        index += 1;
      }
      output.push(`<blockquote>${renderBlocks(quoted, origin)}</blockquote>`);
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const baseIndent = indentOf(line);
      const block: string[] = [];
      while (index < lines.length) {
        const candidate = lines[index] as string;
        if (candidate.trim() === '') {
          const next = lines[index + 1];
          if (next === undefined || (indentOf(next) <= baseIndent && !LIST_ITEM.test(next))) break;
          block.push(candidate);
          index += 1;
          continue;
        }
        const isItem = LIST_ITEM.test(candidate);
        if (!isItem && indentOf(candidate) <= baseIndent) break;
        if (isItem && indentOf(candidate) < baseIndent) break;
        block.push(candidate);
        index += 1;
      }
      output.push(renderList(block, origin));
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const candidate = lines[index] as string;
      if (candidate.trim() === '' || LIST_ITEM.test(candidate) || BLOCK_QUOTE.test(candidate)) break;
      if (UNSUPPORTED_BLOCK.test(candidate)) fail(origin, 'unsupported block construct', candidate);
      paragraph.push(candidate.trim());
      index += 1;
    }
    output.push(`<p>${renderInline(paragraph.join(' '), origin)}</p>`);
  }

  return output.join('');
}

export function renderMarkdown(source: string, origin: string): string {
  return renderBlocks(source.split('\n'), origin);
}
