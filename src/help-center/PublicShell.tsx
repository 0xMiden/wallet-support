import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { BookOpen, Menu, Search, ArrowUpRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem
} from '@/components/ui/command';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from '@/components/ui/sheet';
import { Container } from '@/components/support/layout';
import breadLockup from './assets/bread-lockup.png';
import { helpCenterArticles } from './content';
import { helpCenterMainCategories } from './categories';
import { searchHelpCenter } from './search';
import { articleHref } from './routing';
import type { PublicRoute } from './publicRoute';

const navigation = [
  { href: '/', label: 'Help Center', route: 'help' },
  { href: '/topics', label: 'All topics', route: 'topics' },
  { href: '/feedback', label: 'Send feedback', route: 'feedback' }
];
export function PublicShell({ active, children }: { active: PublicRoute; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const opener = useRef<HTMLElement | null>(null);
  const openSearch = () => {
    opener.current = document.activeElement as HTMLElement;
    setOpen(true);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => {
          if (!value) opener.current = document.activeElement as HTMLElement;
          return !value;
        });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const results = searchHelpCenter(
    helpCenterArticles,
    helpCenterMainCategories,
    query,
    'extension-desktop'
  );
  const navigate = (href: string) => {
    setOpen(false);
    window.location.assign(href);
  };
  return (
    <div className="public-shell min-h-dvh bg-background text-foreground">
      <a
        href="#help-center-content"
        className="sr-only fixed left-4 top-4 z-[100] rounded-full bg-foreground px-5 py-3 text-white focus:not-sr-only"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('help-center-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="public-header sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md">
        <Container className="flex h-20 items-center justify-between gap-4">
          <a
            className="public-brand flex shrink-0 items-center gap-3"
            href="/"
            aria-label="Bread Wallet Help Center home"
          >
            <img src={breadLockup} className="h-auto w-24" alt="Bread Wallet" />
            <span className="type-caption hidden border-l pl-3 text-muted-foreground sm:block">
              Help Center
            </span>
          </a>
          <nav
            className="public-nav hidden items-center gap-1 lg:flex"
            aria-label="Primary navigation"
          >
            {navigation.map((item) => (
              <Button key={item.href} variant="ghost" asChild>
                <a
                  className="support-nav-link"
                  href={item.href}
                  aria-current={active === item.route ? 'page' : undefined}
                >
                  {item.label}
                </a>
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              onClick={openSearch}
              aria-label="Search help articles"
              className="gap-3"
            >
              <Search aria-hidden="true" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded-md border bg-background px-1.5 py-0.5 font-sans text-xs text-muted-foreground md:inline">
                ⌘ K
              </kbd>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open site navigation"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader className="px-6 pt-8">
                  <SheetTitle className="type-section">Bread Help Center</SheetTitle>
                  <SheetDescription>Answers, guides, and a little help.</SheetDescription>
                </SheetHeader>
                <nav className="grid gap-2 px-4" aria-label="Mobile navigation">
                  {navigation.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Button
                        asChild
                        variant={active === item.route ? 'secondary' : 'ghost'}
                        className="justify-between"
                      >
                        <a
                          href={item.href}
                          aria-current={active === item.route ? 'page' : undefined}
                        >
                          {item.label}
                          <ArrowUpRight aria-hidden="true" />
                        </a>
                      </Button>
                    </SheetClose>
                  ))}
                </nav>
                <div className="mx-6 mt-6 border-t pt-6">
                  <p className="type-label mb-3 text-muted-foreground">Explore topics</p>
                  {helpCenterMainCategories.map((category) => (
                    <SheetClose asChild key={category.id}>
                      <a
                        className="block rounded-xl px-3 py-3 text-sm hover:bg-secondary"
                        href={`/#${category.subcategories[0]?.id}`}
                      >
                        {category.title}
                      </a>
                    </SheetClose>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </Container>
      </header>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Search the Help Center</DialogTitle>
          <DialogDescription className="sr-only">
            Type at least two characters. Use the arrow keys to choose an article and Enter to open
            it.
          </DialogDescription>
          <Command shouldFilter={false}>
            <CommandInput
              autoFocus
              placeholder="What do you need help with?"
              value={query}
              onValueChange={setQuery}
              className="h-16 text-base"
            />
            <CommandList className="max-h-[55dvh] p-2">
              {query.trim().length < 2 ? (
                <CommandGroup heading="Start exploring">
                  {helpCenterMainCategories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.id}
                      onSelect={() => navigate(`/#${category.subcategories[0]?.id}`)}
                      className="min-h-12 rounded-xl"
                    >
                      <BookOpen aria-hidden="true" />
                      {category.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : results.length ? (
                <CommandGroup heading={`${results.length} articles`}>
                  {results.map((result) => (
                    <CommandItem
                      key={result.article.id}
                      value={result.article.id}
                      onSelect={() =>
                        navigate(`/${articleHref(result.article.subcategory, result.article.id)}`)
                      }
                      className="min-h-16 rounded-xl"
                    >
                      <BookOpen aria-hidden="true" />
                      <span>
                        {result.article.title}
                        <span className="type-caption block text-muted-foreground">
                          {result.mainCategoryTitle} · {result.subcategoryTitle}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <div className="px-6 py-10 text-center" role="status">
                  <Search
                    className="mx-auto mb-4 size-6 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="type-title">No articles found</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try “recovery”, “Guardian”, or a shorter phrase.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-5"
                    onClick={() => navigate('/feedback')}
                  >
                    <MessageSquare aria-hidden="true" />
                    Send feedback
                  </Button>
                </div>
              )}
            </CommandList>
            <div className="type-caption flex items-center justify-between border-t bg-secondary/40 px-4 py-3 text-muted-foreground">
              <span>↑ ↓ to explore · ↵ to open</span>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Close <kbd className="text-xs">Esc</kbd>
              </Button>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
