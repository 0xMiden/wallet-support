import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Search, MessageSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Container,
  Reveal,
  SectionHeader,
  CategoryIcon,
  ArticleRow
} from '@/components/support/layout';
import { articlesInMainCategory, helpCenterArticles } from './content';
import { HelpCenterFooter } from './HelpCenterFooter';
import { categoryHref, articleHref } from './routing';
import type { HelpCenterMainCategory } from './types';

export const POPULAR_SEARCHES: readonly string[] = [
  'Install Bread Wallet',
  'Recovery phrase',
  'Private account',
  'Guardian',
  'Token is stuck'
];
export interface HelpCenterHomeProps {
  readonly mainCategories: readonly HelpCenterMainCategory[];
  readonly firstCategoryId: string;
  readonly onSearch: (term: string) => void;
}
export function HelpCenterHome({ mainCategories, firstCategoryId, onSearch }: HelpCenterHomeProps) {
  const [term, setTerm] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (term.trim()) onSearch(term.trim());
  };
  const startingArticles = articlesInMainCategory(helpCenterArticles, 'getting-started').slice(
    0,
    3
  );
  return (
    <div className="help-center-home">
      <main id="help-center-content" tabIndex={-1} className="outline-none">
        <Container>
          <Reveal className="grid items-center gap-10 py-12 md:py-20 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
            <section aria-labelledby="help-home-title">
              <p className="type-label mb-5 flex items-center gap-2 text-accent-foreground">
                <span className="size-1.5 rounded-full bg-primary" />A little help. A lot of
                possibility.
              </p>
              <h1 className="type-display max-w-lg" id="help-home-title">
                How can we help?
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
                Find your way around Bread Wallet. Clear answers for your next step, from getting
                started to feeling at home.
              </p>
              <form
                role="search"
                onSubmit={submit}
                className="help-home-search-form mt-8 flex items-center gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30"
              >
                <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  aria-label="Search the Help Center"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Search for help articles…"
                  className="border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                />
                <Button size="icon" type="submit" aria-label="Search">
                  <ArrowRight aria-hidden="true" />
                </Button>
              </form>
              <div className="help-home-popular mt-4 flex flex-wrap items-center gap-x-1 gap-y-0">
                <span className="type-caption mr-1 text-muted-foreground">Popular:</span>
                {POPULAR_SEARCHES.map((term) => (
                  <Button
                    key={term}
                    size="sm"
                    variant="ghost"
                    className="px-2 text-xs text-muted-foreground"
                    onClick={() => onSearch(term)}
                  >
                    {term}
                    <ChevronRight className="size-3" aria-hidden="true" />
                  </Button>
                ))}
              </div>
            </section>
            <Card className="gap-0 border-0 bg-secondary/65">
              <CardContent>
                <span className="type-label text-muted-foreground">YOUR FIRST STEPS</span>
                <h2 className="type-section mb-2 mt-4">Make yourself at home.</h2>
                <p className="mb-5 text-sm leading-6 text-muted-foreground">
                  A few useful places to begin.
                </p>
                <div className="-mx-3 divide-y divide-border">
                  {startingArticles.map((article) => (
                    <ArticleRow
                      key={article.id}
                      title={article.title}
                      href={articleHref(article.subcategory, article.id)}
                    />
                  ))}
                </div>
                <Button asChild variant="outline" className="mt-5 w-full bg-background">
                  <a href={categoryHref(firstCategoryId)}>
                    Getting started
                    <ArrowRight aria-hidden="true" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
          <section
            className="border-t pb-12 pt-10 md:pb-20"
            aria-labelledby="help-home-categories-title"
          >
            <SectionHeader
              id="help-home-categories-title"
              title="Find your answer"
              description={`${helpCenterArticles.length} guides. ${mainCategories.length} topics. One place to feel more confident.`}
            >
              <Button variant="ghost" asChild>
                <a href="/topics">
                  View all topics
                  <ArrowRight aria-hidden="true" />
                </a>
              </Button>
            </SectionHeader>
            <ul className="help-home-card-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {mainCategories.map((category) => {
                const count = articlesInMainCategory(helpCenterArticles, category.id).length;
                return (
                  <li key={category.id}>
                    <Card className="h-full gap-0 p-0 transition-colors hover:border-input hover:bg-secondary/40">
                      <a
                        className="help-home-card group hover:bg-secondary/50 transition-colors flex h-full flex-col rounded-2xl p-6"
                        href={categoryHref(category.subcategories[0]?.id ?? firstCategoryId)}
                      >
                        <div className="mb-6 flex items-center justify-between">
                          <CategoryIcon id={category.id} />
                          <ArrowRight
                            className="size-4 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </div>
                        <h3 className="type-title">{category.title}</h3>
                        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                          {category.description}
                        </p>
                        <span className="type-caption mt-5 text-muted-foreground">
                          {count} {count === 1 ? 'article' : 'articles'}
                        </span>
                      </a>
                    </Card>
                  </li>
                );
              })}
              <li>
                <Card className="h-full justify-between border-0 bg-foreground text-background">
                  <CardContent>
                    <MessageSquare className="mb-6 size-7" strokeWidth={1.6} aria-hidden="true" />
                    <h3 className="type-title">A human touch.</h3>
                    <p className="mt-2 text-sm leading-6 text-white/75">
                      Can’t find your answer? Tell us what’s on your mind.
                    </p>
                    <Button asChild variant="secondary" className="mt-6 w-full">
                      <a href="/feedback">
                        Contact Support
                        <ArrowRight aria-hidden="true" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            </ul>
          </section>
        </Container>
      </main>
      <HelpCenterFooter mainCategories={mainCategories} firstCategoryId={firstCategoryId} />
    </div>
  );
}
