export type PublicRoute = 'help' | 'topics' | 'feedback' | 'not-found';

export function parsePublicRoute(pathname: string): PublicRoute {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/') return 'help';
  if (path === '/topics') return 'topics';
  if (path === '/feedback') return 'feedback';
  return 'not-found';
}
