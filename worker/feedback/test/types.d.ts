/// <reference types="@cloudflare/vitest-pool-workers/types" />
import type { Env as WorkerEnv } from '../src/index';

/**
 * Pool v0.22 types `env` as `Cloudflare.Env`, so the Worker's own Env is
 * grafted on there. (The older `ProvidedEnv` augmentation point is gone —
 * it compiled to `{}` and every `env.DB` was an error.)
 */
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {}
  }
}

export {};
