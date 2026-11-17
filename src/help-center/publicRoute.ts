export type PublicRoute = 'help' | 'topics' | 'contact' | 'not-found';

export function parsePublicRoute(pathname: string): PublicRoute {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/') return 'help';
  if (path === '/topics') return 'topics';
  // /feedback is the old address of the support form; shared links keep working.
  if (path === '/contact' || path === '/feedback') return 'contact';
  return 'not-found';
}
