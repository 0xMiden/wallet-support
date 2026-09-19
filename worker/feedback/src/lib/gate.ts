/**
 * PublishGate — rolling volume caps on issue creation.
 *
 * ONE class, TWO scopes, told apart by the Durable Object's name:
 *
 *   global            — every issue the service creates, from anyone. The
 *                       circuit breaker. GitHub's secondary limits are ~80
 *                       content-creating requests/min and ~500/hr, and the
 *                       account behind the token is accountable for all of
 *                       it — cross those and GitHub throttles that account,
 *                       and then nothing files for anyone. Per-reporter caps
 *                       alone cannot bound this: 100 reporters at 20/hour is
 *                       2,000/hour, four times what GitHub allows.
 *   <reporter_key>    — one reporter's share. Fairness between honest
 *                       reporters, NOT an abuse control: install_id is a
 *                       UUID the browser generates and keeps in local
 *                       storage, so anyone determined to flood simply clears
 *                       it. The global scope is the limit that actually
 *                       holds.
 *
 * Both windows ROLL. A slot frees exactly 1h (or 24h) after the write that
 * used it, not at the top of the hour.
 *
 * Exceeding either cap does NOT drop the report. The submission stays in D1
 * in state 'capped' and the drain retries it — backpressure, not data loss.
 * `resetAt` tells the caller when the window actually clears so it can come
 * back then rather than on a fixed interval.
 */

export interface GateDecision {
  allowed: boolean;
  reason?: 'hourly' | 'daily' | 'killswitch';
  resetAt?: number;
}

export class PublishGate {
  constructor(private state: DurableObjectState, private env: {
    PUBLISH_ENABLED: string;
    CAP_PER_HOUR: string; CAP_PER_DAY: string;
    REPORTER_CAP_PER_HOUR?: string; REPORTER_CAP_PER_DAY?: string;
  }) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const now = Date.now();

    // Clears the rolling write log. Needed at cutover: the counters carry
    // testing writes into the production window, so day-one caps would refuse
    // real reports for reasons that have nothing to do with production.
    if (url.pathname === '/reset') {
      const before = ((await this.state.storage.get<number[]>('writes')) ?? []).length;
      await this.state.storage.put('writes', []);
      return Response.json({ ok: true, cleared: before });
    }

    if (url.pathname === '/status') {
      const writes = (await this.state.storage.get<number[]>('writes')) ?? [];
      return Response.json({
        lastHour: writes.filter((t) => now - t < 3_600_000).length,
        lastDay: writes.filter((t) => now - t < 86_400_000).length,
        enabled: this.env.PUBLISH_ENABLED === 'true',
      });
    }

    // Kill switch. One env var flip stops every write in the service.
    if (this.env.PUBLISH_ENABLED !== 'true') {
      return Response.json({ allowed: false, reason: 'killswitch' } satisfies GateDecision);
    }

    // Which caps apply is the caller's declared scope. The DO name decides
    // WHICH counter is being read; this decides what it is measured against.
    const reporterScope = url.searchParams.get('scope') === 'reporter';

    // Every fallback is deliberately far BELOW its configured value. These
    // fire only if a var goes missing, and a config loss must fail tight —
    // a missing cap must never read as "no cap".
    const perHour = Number(
      (reporterScope ? this.env.REPORTER_CAP_PER_HOUR : this.env.CAP_PER_HOUR) ?? 5
    );
    const perDay = Number(
      (reporterScope ? this.env.REPORTER_CAP_PER_DAY : this.env.CAP_PER_DAY) ?? 25
    );

    const writes = ((await this.state.storage.get<number[]>('writes')) ?? [])
      .filter((t) => now - t < 86_400_000);

    const hourly = writes.filter((t) => now - t < 3_600_000);
    if (hourly.length >= perHour) {
      return Response.json({
        allowed: false, reason: 'hourly',
        resetAt: Math.min(...hourly) + 3_600_000,
      } satisfies GateDecision);
    }
    if (writes.length >= perDay) {
      return Response.json({
        allowed: false, reason: 'daily',
        resetAt: Math.min(...writes) + 86_400_000,
      } satisfies GateDecision);
    }

    writes.push(now);
    await this.state.storage.put('writes', writes);
    return Response.json({ allowed: true } satisfies GateDecision);
  }
}
