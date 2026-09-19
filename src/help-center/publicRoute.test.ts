import { describe, expect, it } from 'vitest';
import { parsePublicRoute } from './publicRoute';

describe('parsePublicRoute', () => {
  it.each([
    ['/', 'help'],
    ['/topics', 'topics'],
    ['/topics/', 'topics'],
    ['/feedback', 'feedback'],
    ['/api/feedback/submit', 'not-found'],
    ['/admin/review', 'not-found'],
    ['/unknown', 'not-found']
  ] as const)('maps %s to %s', (path, route) => {
    expect(parsePublicRoute(path)).toBe(route);
  });
});
