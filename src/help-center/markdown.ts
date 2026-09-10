/**
 * A deliberately small Markdown renderer for the exact subset the migrated
 * articles use: paragraphs, bold, italic, links, ordered and unordered lists
 * including nesting, and blockquote callouts.
 *
 * The FAQ articles added two constructs, and only in the shape they use them:
 * an image on a line of its own, named by a file the caller supplies, and a
 * link to another article, written as its hash route.
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
/* A paragraph that is nothing but one bold span is a section label, not a
   sentence — "**Steps:**", "**If Guardian is enabled:**". The articles use 21
   of them. Promoting them to headings gives every article a real outline
   without touching a word of approved content. Only at the top level: a bold
   lead inside a callout or a list item is emphasis, not document structure. */
const SECTION_LABEL = /^\*\*([^*]+)\*\*$/;

/*
 * A link to another article is its hash route: #subcategory/article, or
 * #subcategory. Held to that shape so a typo fails here instead of shipping as
 * a link that goes nowhere. It stays in the tab: the reader is still inside
 * the Help Center, and the query string, which carries the platform, is kept.
 */
const INTERNAL_HREF = /^#[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

/*
 * An image is a line of its own: ![alt](file.png). Alt text is required, and
 * the file must be one the caller supplied, so an unknown name throws rather
 * than rendering a broken image. Width and height go on the tag, so the page
 * keeps its layout while a lazy image loads and an anchor below it still lands
 * where it points.
 */
const IMAGE_BLOCK = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

/*
 * Every image is a diagram, and at phone width a diagram renders at a third of
 * its size, too small to read its labels. So the figure is a plain link to the
 * file itself, opened in a new tab where it can be seen and zoomed at full
 * size. No lightbox: the browser already is one. The visible label repeats the
 * start of the accessible name, so what is read out matches what is on screen.
 */
const OPEN_FULL_SIZE = 'Open diagram full size';
const OPEN_ICON =
  '<svg aria-hidden="true" class="help-center-icon" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>';

/** An image an article may show, looked up by the filename its Markdown names. */
export interface ArticleImage {
  readonly src: string;
  readonly width: number;
  readonly height: number;
}

export type ArticleImages = Readonly<Record<string, ArticleImage>>;

function escapeText(text: string) {
  return text.replace(/[&<>"']/g, character => ESCAPES[character] as string);
}

function fail(origin: string, reason: string, line: string): never {
  throw new Error(`${origin}: ${reason} — ${line.trim().slice(0, 80)}`);
}

function renderLink(label: string, href: string, origin: string, line: string) {
  const external = /^https?:\/\//.test(href);
  if (!external && !href.startsWith('mailto:') && !INTERNAL_HREF.test(href)) {
    fail(origin, `link scheme is not supported ("${href}")`, line);
  }
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

function renderList(lines: readonly string[], origin: string, depth: number): string {
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
      const nested =
        rest.length > 0 ? renderBlocks(dedent(rest, indentOf(rest[0] as string)), origin, depth + 1) : '';
      return `<li>${renderInline(item.text, origin)}${nested}</li>`;
    })
    .join('');

  const start = ordered && first[2] !== '1' ? ` start="${Number(first[2])}"` : '';
  return ordered ? `<ol${start}>${rendered}</ol>` : `<ul>${rendered}</ul>`;
}

export interface ArticleHeading {
  readonly id: string;
  readonly text: string;
}

function headingId(text: string, taken: Set<string>) {
  const base =
    text
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'section';

  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

export function renderBlocks(
  lines: readonly string[],
  origin: string,
  depth = 0,
  headings?: ArticleHeading[],
  images: ArticleImages = {}
): string {
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
      output.push(`<blockquote>${renderBlocks(quoted, origin, depth + 1)}</blockquote>`);
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
      output.push(renderList(block, origin, depth));
      continue;
    }

    // Top level only. Inside a list item or a callout an image line falls
    // through to inline rendering, which refuses it.
    const image = depth === 0 ? IMAGE_BLOCK.exec(line.trim()) : null;
    if (image) {
      const alt = (image[1] as string).trim();
      const name = image[2] as string;
      if (!alt) fail(origin, 'an image needs alt text', line);
      const file = images[name];
      if (!file) fail(origin, `no image named "${name}"`, line);
      const src = escapeText(file.src);
      const label = escapeText(alt);
      output.push(
        `<figure><a href="${src}" target="_blank" rel="noopener noreferrer" aria-label="${OPEN_FULL_SIZE}: ${label}">` +
          `<img src="${src}" alt="${label}" width="${file.width}" height="${file.height}" loading="lazy" decoding="async">` +
          `<span>${OPEN_FULL_SIZE}${OPEN_ICON}</span></a></figure>`
      );
      index += 1;
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
    const text = paragraph.join(' ');
    const label = depth === 0 ? SECTION_LABEL.exec(text) : null;

    if (label && headings) {
      const plain = (label[1] as string).replace(/\*\*|\*/g, '').trim();
      const id = headingId(plain, new Set(headings.map(heading => heading.id)));
      headings.push({ id, text: plain });
      output.push(`<h2 id="${id}" tabindex="-1">${renderInline(label[1] as string, origin)}</h2>`);
    } else {
      output.push(
        label
          ? `<h2>${renderInline(label[1] as string, origin)}</h2>`
          : `<p>${renderInline(text, origin)}</p>`
      );
    }
  }

  return output.join('');
}

export function renderMarkdown(source: string, origin: string, images?: ArticleImages): string {
  return renderBlocks(source.split('\n'), origin, 0, undefined, images);
}

/**
 * Renders and reports the article's section headings, so the contents list is
 * generated from the article rather than maintained beside it — an authored
 * list is one more thing that can fall out of step with the body.
 */
export function renderArticle(
  source: string,
  origin: string,
  images?: ArticleImages
): { html: string; headings: readonly ArticleHeading[] } {
  const headings: ArticleHeading[] = [];
  const html = renderBlocks(source.split('\n'), origin, 0, headings, images);
  return { html, headings };
}
