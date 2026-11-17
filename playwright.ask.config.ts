import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';

/**
 * Bread Assistant's browser tests. The assistant ships switched off, so the
 * main suite never sees it; this config builds the site with it on, into its
 * own folder so the normal build is never replaced, and runs only its spec.
 * The Worker is not running here: each test answers /api/ask itself.
 */
const env = loadEnv('test', '.', 'E2E_');
const PORT = Number(env.E2E_ASK_PORT ?? 4320);

export default defineConfig({
  testDir: './e2e',
  testMatch: ['ask-assistant.spec.ts'],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `yarn vite build --outDir dist-ask --emptyOutDir && yarn vite preview --outDir dist-ask --port ${PORT} --strictPort`,
    env: {
      // Cloudflare's documented always-pass test key, as in the main config.
      VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      VITE_ASK_ENABLED: 'true'
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120000
  }
});
