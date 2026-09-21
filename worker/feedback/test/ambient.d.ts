/**
 * Ambient only — this file must NOT import anything. A .d.ts with a top-level
 * import is a module, and `declare module` inside one is read as an
 * augmentation of an existing module rather than a new ambient declaration.
 */
declare module '*.sql?raw' {
  const contents: string;
  export default contents;
}

declare module '*.jsonc?raw' {
  const contents: string;
  export default contents;
}
