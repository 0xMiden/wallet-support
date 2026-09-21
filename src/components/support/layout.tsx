import type { ComponentProps, ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import {
  ArrowUpRight,
  BookOpen,
  Flag,
  Wallet,
  EyeOff,
  ShieldCheck,
  Wrench,
  ArrowLeftRight,
  Sprout
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('support-container', className)} {...props} />;
}
export function PageHeader({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b pb-10 pt-12 md:pt-16">
      <div className="max-w-2xl">
        <p className="type-label mb-4 text-accent-foreground">{eyebrow}</p>
        <h1 className="type-page">{title}</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{description}</p>
      </div>
      {children}
    </header>
  );
}
export function SectionHeader({
  title,
  description,
  children,
  id
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="type-section" id={id}>
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
const categoryVisuals = {
  'getting-started': { icon: Flag, tone: 'orange' },
  'manage-wallet': { icon: Wallet, tone: 'slate' },
  privacy: { icon: EyeOff, tone: 'blue' },
  guardian: { icon: ShieldCheck, tone: 'green' },
  troubleshooting: { icon: Wrench, tone: 'orange' },
  'cross-chain': { icon: ArrowLeftRight, tone: 'purple' },
  earning: { icon: Sprout, tone: 'green' }
};
export function CategoryIcon({ id, className }: { id: string; className?: string }) {
  const { icon: Icon, tone } = categoryVisuals[id as keyof typeof categoryVisuals] ?? {
    icon: BookOpen,
    tone: 'slate'
  };
  return (
    <span className={cn('category-icon shrink-0', className)} data-tone={tone}>
      <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}
export function ArticleRow({
  href,
  title,
  detail
}: {
  href: string;
  title: string;
  detail?: string;
}) {
  const location = useLocation();
  const to = href.startsWith('#')
    ? { pathname: location.pathname, search: location.search, hash: href }
    : href;
  return (
    <Link
      to={to}
      className="group flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 text-sm leading-6 transition-colors hover:bg-secondary focus-visible:bg-secondary"
    >
      <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1">
        {title}
        {detail && <span className="type-caption block text-muted-foreground">{detail}</span>}
      </span>
      <ArrowUpRight
        className="size-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
