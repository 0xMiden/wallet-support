import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022'
  },
  test: {
    /*
     * Named explicitly. Vitest's default include also matches *.spec.ts, which
     * would pick up the Playwright specs in e2e/ and run them in the node
     * environment, where `page` does not exist. Relying on a filename to keep
     * the two suites apart would make the next e2e file the one that breaks
     * the unit run.
     */
    include: ['src/**/*.test.ts']
  }
});
