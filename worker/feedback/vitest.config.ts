import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

/**
 * Phase 0 harness — see ~/tasks/mfv2-spam-layer-plan-2026-08-24.md.
 *
 * The suite runs against the REAL wrangler.jsonc so bindings, DO classes and
 * the compatibility date are the deployed ones, not a parallel description of
 * them that can drift.
 *
 * Secrets and the two abuse-control limits are overridden here on purpose.
 * Secrets have no value in wrangler.jsonc at all (they are Cloudflare secrets),
 * and pinning the limits keeps the regression suite from failing the day
 * someone tunes CAP_PER_HOUR in production — these tests assert BEHAVIOUR, not
 * the current numbers.
 *
 * Pool v0.22 / vitest 4: configuration is a Vite PLUGIN. The older
 * `defineWorkersConfig` + `test.poolOptions.workers` form no longer resolves.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      /**
       * HERMETIC. wrangler.jsonc declares an `ai` binding, and Workers AI is
       * remote even in local dev — left on, every `npm test` opens an
       * authenticated connection to dash.cloudflare.com, which makes the suite
       * need a logged-in wrangler and a network, and puts a paid binding one
       * mistake away from a test. setup.ts additionally replaces env.AI with a
       * thrower so the degraded-retrieval path is what gets exercised.
       */
      remoteBindings: false,
      miniflare: {
        bindings: {
          TURNSTILE_SECRET: 'test-turnstile-secret',
          INGEST_HMAC_KEY: 'test-hmac-key',
          BACKFILL_TOKEN: 'test-backfill-token',
          ADMIN_SESSION_SECRET: 'test-admin-session-secret',
          GOOGLE_OAUTH_CLIENT_ID: 'test-google-client',
          GOOGLE_OAUTH_CLIENT_SECRET: 'test-google-secret',
          GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: 'test-google-play-key',
          GITHUB_WRITE_TOKEN: 'test-gh-token',
          PUBLISH_ENABLED: 'true',
          LLM_API_KEY_PRIMARY: 'test-llm-primary',
          LLM_API_KEY_FALLBACK: 'test-llm-fallback',
          // Room for the flood tests to submit four or five times as one
          // install. Test 4 reads this value rather than hardcoding it, so
          // raising it makes that test do more work, not less.
          RATE_LIMIT_PER_HOUR: '10',
          // Read by tests rather than hardcoded, so tuning it makes them do
          // more work rather than less.
          ADMIN_AUTH_PER_WINDOW: '30',
          // Off by default, exactly as in production. Tests that exercise
          // enforcement opt in with withEnv.
          REVIEW_TOKEN: 'test-review-token',
          SPAM_GATE_ENABLED: 'false',
          // Off, as it ships -- and pinned here as well, so the suite stays
          // isolated even if the shipped value changes: a stray store tick
          // would write sync state the console's empty-state tests read, and
          // CI runs this suite shuffled. The sync tests opt in with withEnv.
          STORE_SYNC_ENABLED: 'false',
          APP_STORE_SYNC_ENABLED: 'false',
          STORE_REPLY_ENABLED: 'false',
          STORE_HANDOFF_ENABLED: 'false',
          FLOOD_THRESHOLD: '4',
          FLOOD_WINDOW_MS: '3600000',
          // High enough that the publish gate never closes by accident;
          // the cap test lowers it deliberately.
          CAP_PER_HOUR: '100',
          CAP_PER_DAY: '400',
          REPORTER_CAP_PER_HOUR: '50',
          REPORTER_CAP_PER_DAY: '100',
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./test/setup.ts'],
  },
});
