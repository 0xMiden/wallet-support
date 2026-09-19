/**
 * The Store Reviews cron — one phase per tick.
 *
 * It has its own trigger (STORE_CRON in src/crons.ts), so a store phase gets a
 * whole invocation's budget — 50 D1 queries and 10 ms of CPU on the free plan —
 * rather than sharing one with the drain or the mirror sync.
 *
 * ROTATION IS BY CLOCK, NOT BY A STORED CURSOR. A tick runs the phase at
 * (five-minute slot of its scheduled time) mod (number of phases). That costs
 * no query and keeps no state that can go wrong; a missed tick only means one
 * phase waits for its next turn. There are two phases: Google Play on even
 * slots and the App Store on odd ones, so each store syncs every ten minutes.
 * Each later phase is one more entry in STORE_PHASES.
 */
import { syncGooglePlay, type GooglePlaySyncEnv, type PhaseResult } from './sync/google';
import { syncAppStore, type AppStoreSyncEnv } from './sync/apple';
import { runReplySender, type ReplySenderEnv } from './reply-flow';

export const STORE_TICK_MS = 5 * 60 * 1000;

export type StoreCronEnv = GooglePlaySyncEnv & AppStoreSyncEnv & ReplySenderEnv;

export interface StorePhase {
  name: string;
  run: (env: StoreCronEnv, nowMs: number) => Promise<{ skipped: string | null; report: unknown }>;
}

export const STORE_PHASES: readonly StorePhase[] = [
  { name: 'sync:google_play', run: (env, nowMs) => syncGooglePlay(env, nowMs) },
  { name: 'sync:app_store', run: (env, nowMs) => syncAppStore(env, nowMs) },
];

/**
 * The reply sender joins the rotation ONLY while sending is switched on.
 *
 * Switched off, the rotor is exactly the two sync phases, so turning replies
 * off can never slow the sync down — and while it is off, no reply phase exists
 * to call a store at all. Switched on, the three phases take a slot each.
 */
export const REPLY_PHASE: StorePhase = { name: 'replies', run: (env, nowMs) => runReplySender(env, nowMs) };

export function storePhases(env: { STORE_REPLY_ENABLED?: string }): readonly StorePhase[] {
  return env.STORE_REPLY_ENABLED === 'true' ? [...STORE_PHASES, REPLY_PHASE] : STORE_PHASES;
}

export function phaseFor(scheduledTime: number, phases: readonly StorePhase[] = STORE_PHASES): StorePhase {
  const slot = Math.floor(scheduledTime / STORE_TICK_MS);
  return phases[((slot % phases.length) + phases.length) % phases.length];
}

export async function runStoreTick(
  env: StoreCronEnv, scheduledTime: number, nowMs: number = Date.now()
): Promise<{ skipped: string | null; report: unknown; phase: string }> {
  const phase = phaseFor(scheduledTime, storePhases(env));
  const result = await phase.run(env, nowMs);
  // Counts, a skip reason or a status line. Never a token, never review text.
  console.log('store tick', phase.name, JSON.stringify(result));
  return { phase: phase.name, ...result };
}
