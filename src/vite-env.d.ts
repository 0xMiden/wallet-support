/// <reference types="vite/client" />

/*
 * Just enough of the Node builtins for the token test in content.test.ts to
 * read the stylesheets off disk.
 *
 * It has to read them off disk: Vite's CSS pipeline intercepts a .css import
 * in the node test environment and returns an empty string for ?raw, ?inline
 * and import.meta.glob alike, so there is no way to see the source through
 * the bundler. Declared here rather than by adding @types/node, which would
 * be a dependency carried by the whole project for one test.
 */
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string): readonly string[];
}

declare module 'node:path' {
  export function join(...parts: readonly string[]): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: URL): string;
}
