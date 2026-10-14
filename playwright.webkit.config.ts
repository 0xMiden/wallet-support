import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/** Optional Safari/WebKit verification; install with `yarn playwright install webkit`. */
export default defineConfig({
  ...base,
  testMatch: ['bread-design.spec.ts', 'content-audit.spec.ts', 'unified-shell.spec.ts'],
  projects: [{ name: 'webkit', use: {
    ...devices['Desktop Safari'],
    // A task-local installation can be used without changing the default cache.
    launchOptions: process.env.BREAD_WEBKIT_EXECUTABLE ? { executablePath: process.env.BREAD_WEBKIT_EXECUTABLE } : {}
  } }]
});
