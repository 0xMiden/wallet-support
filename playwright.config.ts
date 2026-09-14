import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests, run against the production build rather than the dev
 * server: the unit suite already covers the pure modules in node, and what
 * these are for is the behaviour that only exists once the page is assembled
 * and a real browser is following real links.
 *
 * The build runs first because a stale dist/ would let a passing run describe
 * a page that is no longer the one in the tree.
 */
const PORT = 4318;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  // One worker. This host has been bitten by unbounded pools, and six short
  // navigation tests do not need more.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `yarn build && yarn vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    /*
     * Always start a fresh server. Reusing one already on the port would let a
     * preview left running from an earlier build serve the tests a page that
     * is not the one in the tree — the exact failure the build step above is
     * here to prevent.
     */
    reuseExistingServer: false,
    timeout: 120000
  }
});
