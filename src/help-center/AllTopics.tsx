import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Container,
  PageHeader,
  CategoryIcon,
  ArticleRow,
  Reveal
} from '@/components/support/layout';
import { helpCenterMainCategories } from './categories';
import { articlesInSubcategory, helpCenterArticles } from './content';
import { HelpCenterFooter } from './HelpCenterFooter';
import { articleHref } from './routing';

export function AllTopics() {
  const [query, setQuery] = useState('');
  const term = query.trim().toLocaleLowerCase();
  const groups = helpCenterMainCategories
    .map((group) => ({
      ...group,
      subcategories: group.subcategories
        .map((category) => ({
          ...category,
          articles: articlesInSubcategory(helpCenterArticles, category.id).filter((article) =>
            `${group.title} ${category.title} ${article.title}`.toLocaleLowerCase().includes(term)
          )
        }))
        .filter((category) => category.articles.length)
    }))
    .filter((group) => group.subcategories.length);
  return (
    <div className="help-center-home">
      <main id="help-center-content" tabIndex={-1} className="outline-none">
        <Container>
          <Reveal>
            <PageHeader
              eyebrow="The whole library"
              title="All topics"
              description="A guide for every next step. Explore the essentials or go a little deeper."
            />
          </Reveal>
          <div className="mb-16 grid items-start gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-28">
              <label className="relative block">
                <span className="sr-only">Filter topics</span>
                <Search
                  className="absolute left-4 top-4 size-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder="Filter topics…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-11"
                />
              </label>
              <nav aria-label="Topics index" className="mt-5 hidden space-y-1 lg:block">
                {groups.map((group) => (
                  <a
                    key={group.id}
                    href={`#topic-${group.id}`}
                    className="type-action flex min-h-11 items-center justify-between rounded-xl px-3 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {group.title}
                    <span className="type-caption">
                      {group.subcategories.reduce(
                        (sum, category) => sum + category.articles.length,
                        0
                      )}
                    </span>
                  </a>
                ))}
              </nav>
            </aside>
            <div className="space-y-10">
              <p className="sr-only" role="status">
                {groups.length} topics shown
              </p>
              {groups.map((group) => (
                <section key={group.id} id={`topic-${group.id}`} className="scroll-mt-28">
                  <div className="mb-5 flex items-start gap-4">
                    <CategoryIcon id={group.id} />
                    <div>
                      <h2 className="type-section">{group.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                  </div>
                  <Card className="gap-5 py-3">
                    <CardContent className="px-3">
                      {group.subcategories.map((category) => (
                        <div
                          key={category.id}
                          className="all-topics-subcategory border-b py-2 last:border-0"
                        >
                          {group.subcategories.length > 1 && (
                            <h3 className="type-label px-3 pb-1 pt-4 text-muted-foreground">
                              {category.title}
                            </h3>
                          )}
                          <ul>
                            {category.articles.map((article) => (
                              <li key={article.id}>
                                <ArticleRow
                                  href={`/${articleHref(category.id, article.id)}`}
                                  title={article.title}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </section>
              ))}
              {!groups.length && (
                <Card className="items-center px-6 py-16 text-center">
                  <Search className="size-8 text-muted-foreground" aria-hidden="true" />
                  <h2 className="type-section">No matching topics</h2>
                  <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                    Try a different word, or explore the full library.
                  </p>
                  <Button variant="secondary" onClick={() => setQuery('')}>
                    Clear filter
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </Container>
      </main>
      <HelpCenterFooter
        mainCategories={helpCenterMainCategories}
        firstCategoryId={helpCenterMainCategories[0]?.subcategories[0]?.id ?? ''}
      />
    </div>
  );
}
