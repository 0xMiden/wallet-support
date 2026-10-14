import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';

/** Radix owns focus trapping, Escape, outside dismissal, and scroll locking. */
export function ResponsiveNavigation({ open, onOpenChange, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode;
}) {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const change = () => { setMobile(media.matches); if (!media.matches) onOpenChange(false); };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, [onOpenChange]);

  if (!mobile) return <aside className="help-center-sidebar" id="help-center-sidebar" aria-label="Help Center navigation">{children}</aside>;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <div className="help-center-mobile-header">
        <Dialog.Trigger asChild><button className="help-center-menu-button" aria-label="Open navigation" type="button"><Menu aria-hidden="true" /><span>Browse help</span></button></Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="help-center-backdrop is-visible" />
        <Dialog.Content className="help-center-sidebar is-open" id="help-center-sidebar" aria-describedby={undefined}>
          <div className="help-drawer-heading"><Dialog.Title>Browse help</Dialog.Title><Dialog.Close asChild><button type="button" className="help-drawer-close" aria-label="Close navigation"><X aria-hidden="true" /></button></Dialog.Close></div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
