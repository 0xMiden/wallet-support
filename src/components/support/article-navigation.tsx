import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
const media = () => window.matchMedia('(max-width: 900px)');
const subscribe = (callback: () => void) => {
  const query = media();
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
export function ArticleNavigation({
  children,
  open,
  onOpenChange
}: {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mobile = useSyncExternalStore(
    subscribe,
    () => media().matches,
    () => false
  );
  if (!mobile)
    return (
      <aside className="help-center-sidebar" aria-label="Help Center navigation">
        {children}
      </aside>
    );
  return (
    <div className="border-b px-4 py-2">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Open article navigation">
            <PanelLeft aria-hidden="true" />
            Browse topics
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="overflow-y-auto">
          <SheetHeader className="px-6 pt-8">
            <SheetTitle className="type-section">Explore the guides</SheetTitle>
            <SheetDescription>Find your next answer.</SheetDescription>
          </SheetHeader>
          <div className="article-drawer-content px-4 pb-6">{children}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
