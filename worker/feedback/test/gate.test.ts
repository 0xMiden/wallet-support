/**
 * PublishGate unit tests. Exercised directly with a fake DurableObjectState
 * because the caps and kill switch are read from the DO's OWN env, which
 * miniflare fixes at startup and a test cannot mutate.
 */
import { describe, expect, it } from 'vitest';
import { PublishGate } from '../src/lib/gate';

function fakeState() {
  const store = new Map<string, unknown>();
  return {
    storage: {
      get: async (k: string) => store.get(k),
      put: async (k: string, v: unknown) => { store.set(k, v); },
    },
  } as any;
}

const BASE = {
  PUBLISH_ENABLED: 'true',
  CAP_PER_HOUR: '100', CAP_PER_DAY: '400',
  REPORTER_CAP_PER_HOUR: '20', REPORTER_CAP_PER_DAY: '50',
};

const check = (g: PublishGate, scope = 'global') =>
  g.fetch(new Request(`https://gate/check?scope=${scope}`)).then((r) => r.json<any>());

describe('PublishGate', () => {
  it('refuses everything when the kill switch is off', async () => {
    const g = new PublishGate(fakeState(), { ...BASE, PUBLISH_ENABLED: 'false' } as any);
    expect(await check(g)).toMatchObject({ allowed: false, reason: 'killswitch' });
  });

  it('closes on the hourly cap and reports when the window clears', async () => {
    const g = new PublishGate(fakeState(), { ...BASE, CAP_PER_HOUR: '2' } as any);
    const before = Date.now();
    expect((await check(g)).allowed).toBe(true);
    expect((await check(g)).allowed).toBe(true);

    const third = await check(g);
    expect(third).toMatchObject({ allowed: false, reason: 'hourly' });
    // Rolling, not top-of-hour: a slot frees 1h after the write that used it.
    expect(third.resetAt).toBeGreaterThanOrEqual(before + 3_600_000);
    expect(third.resetAt).toBeLessThanOrEqual(Date.now() + 3_600_000);
  });

  it('closes on the daily cap once the hourly one is generous', async () => {
    const g = new PublishGate(fakeState(), { ...BASE, CAP_PER_HOUR: '100', CAP_PER_DAY: '2' } as any);
    await check(g); await check(g);
    expect(await check(g)).toMatchObject({ allowed: false, reason: 'daily' });
  });

  it('measures the reporter scope against the REPORTER_ vars', async () => {
    const g = new PublishGate(fakeState(), { ...BASE, REPORTER_CAP_PER_HOUR: '1' } as any);
    expect((await check(g, 'reporter')).allowed).toBe(true);
    expect(await check(g, 'reporter')).toMatchObject({ allowed: false, reason: 'hourly' });
  });

  it('fails TIGHT when a cap var goes missing', async () => {
    // A missing cap must never read as "no cap". The fallback is 5, far below
    // the configured 200.
    const g = new PublishGate(fakeState(), { PUBLISH_ENABLED: 'true', CAP_PER_DAY: '400' } as any);
    for (let i = 0; i < 5; i++) expect((await check(g)).allowed).toBe(true);
    expect(await check(g)).toMatchObject({ allowed: false, reason: 'hourly' });
  });

  it('reports consumption and clears on reset', async () => {
    const g = new PublishGate(fakeState(), BASE as any);
    await check(g); await check(g);

    const status = await g.fetch(new Request('https://gate/status')).then((r) => r.json<any>());
    expect(status).toMatchObject({ lastHour: 2, lastDay: 2, enabled: true });

    const reset = await g.fetch(new Request('https://gate/reset', { method: 'POST' })).then((r) => r.json<any>());
    expect(reset).toMatchObject({ ok: true, cleared: 2 });

    const after = await g.fetch(new Request('https://gate/status')).then((r) => r.json<any>());
    expect(after).toMatchObject({ lastHour: 0, lastDay: 0 });
  });
});
