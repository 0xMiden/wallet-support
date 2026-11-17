/**
 * The Help Center articles the Ask assistant answers from.
 *
 * The site build writes them to ask-corpus.json (src/help-center/askCorpus.ts
 * in the site), and this Worker serves that build, so the file is read through
 * the same assets binding as every page. Deploying new articles therefore
 * updates the assistant in the same step: there is no second copy to forget.
 *
 * The shape is checked on load rather than trusted. A malformed file is a build
 * bug, and answering from a half-read article set would be worse than not
 * answering at all, so a bad file makes the assistant unavailable instead.
 */

export const ASK_CORPUS_PATH = '/ask-corpus.json';

export interface CorpusArticle {
  readonly id: string;
  readonly title: string;
  readonly section: string;
  readonly href: string;
  readonly platforms: readonly string[];
  readonly bodies: Readonly<Record<string, string>>;
}

export interface Corpus {
  readonly articles: readonly CorpusArticle[];
  readonly byId: ReadonlyMap<string, CorpusArticle>;
  /** The articles as the model reads them. Identical bytes every call, so the prompt cache holds. */
  readonly text: string;
}

export class CorpusError extends Error {}

const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function checkArticle(raw: unknown, index: number): CorpusArticle {
  const a = raw as Record<string, unknown> | null;
  if (!a || typeof a !== 'object') throw new CorpusError(`article ${index} is not an object`);
  for (const key of ['id', 'title', 'section', 'href'] as const) {
    if (!isString(a[key])) throw new CorpusError(`article ${index} has no ${key}`);
  }
  if (!(a.href as string).startsWith('#')) throw new CorpusError(`article ${index} href is not a Help Center address`);
  const platforms = a.platforms;
  if (!Array.isArray(platforms) || platforms.length === 0 || !platforms.every(isString)) {
    throw new CorpusError(`article ${index} has no platforms`);
  }
  const bodies = a.bodies as Record<string, unknown> | null;
  if (!bodies || typeof bodies !== 'object') throw new CorpusError(`article ${index} has no bodies`);
  for (const platform of platforms) {
    if (!isString(bodies[platform])) throw new CorpusError(`article ${index} has no ${platform} body`);
  }
  return a as unknown as CorpusArticle;
}

const PLATFORM_NAMES: Readonly<Record<string, string>> = {
  'extension-desktop': 'Extension',
  mobile: 'Mobile app',
};

export const platformName = (platform: string) => PLATFORM_NAMES[platform] ?? platform;

/** Titles may contain quotation marks, which would otherwise end the attribute early. */
const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** One article as the model reads it. A body shared by every platform is written once. */
function renderArticle(article: CorpusArticle): string {
  const bodies = article.platforms.map((p) => article.bodies[p] as string);
  const shared = bodies.every((body) => body === bodies[0]);
  const header =
    `<article id="${attribute(article.id)}" title="${attribute(article.title)}" section="${attribute(article.section)}" ` +
    `platforms="${article.platforms.map(platformName).join(', ')}">`;
  const parts = shared
    ? [`<body platform="all">\n${bodies[0]}\n</body>`]
    : article.platforms.map((p) => `<body platform="${platformName(p)}">\n${article.bodies[p]}\n</body>`);
  return [header, ...parts, '</article>'].join('\n');
}

export function parseCorpus(raw: unknown): Corpus {
  const list = (raw as { articles?: unknown } | null)?.articles;
  if (!Array.isArray(list) || list.length === 0) throw new CorpusError('no articles');
  const articles = list.map(checkArticle);
  const byId = new Map(articles.map((a) => [a.id, a]));
  if (byId.size !== articles.length) throw new CorpusError('two articles share an id');
  return { articles, byId, text: articles.map(renderArticle).join('\n\n') };
}

/**
 * Read once per isolate. The file only changes with a deploy, and a deploy
 * starts new isolates, so the cache can never serve an older article set than
 * the pages beside it. A failed read is not cached: the next question retries.
 */
let cached: Promise<Corpus> | null = null;

export function loadCorpus(assets: Fetcher | undefined): Promise<Corpus> {
  if (!assets) return Promise.reject(new CorpusError('no assets binding'));
  if (!cached) {
    cached = (async () => {
      const res = await assets.fetch(new Request(`https://assets.local${ASK_CORPUS_PATH}`));
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) {
        throw new CorpusError(`corpus not served (${res.status})`);
      }
      return parseCorpus(await res.json());
    })();
    cached.catch(() => { cached = null; });
  }
  return cached;
}

/** Tests only: forget the cached article set. */
export function resetCorpusCache(): void {
  cached = null;
}
