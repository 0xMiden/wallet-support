/**
 * Plan §10 tests 17-20 — flood detection at ingest (Phase 2).
 *
 * Two properties matter more than the flagging itself, and both are easy to
 * lose silently:
 *
 *   - The CLEAN path must write normalized_hash and reporter_kind. If it does
 *     not, the COUNT matches nothing and flood detection never fires: no
 *     error, no log, just a control that does not exist (test 20b).
 *   - With SPAM_GATE_ENABLED off, nothing may be flagged, while the columns
 *     and the shadow log still happen (test 17c). That is the whole basis of
 *     the claim that Phase 2 is inert in production.
 */
import { env } from 'cloudflare:test';
import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import {
  callWorker, installFetchStub, restoreFetch, mockTurnstile, submitRequest,
  getSubmission, getStateLog, withEnv, pngFile,
} from './helpers';
import { normalizeForFlood, floodHash, floodConfig, reporterKind } from '../src/lib/spam-signals';

beforeAll(() => installFetchStub());
afterEach(() => { restoreFetch(); installFetchStub(); });

const BODY = 'The wallet keeps freezing when I open the QR scanner.';

/** Submit `n` identical bodies as one install, returning each row afterwards. */
async function submitTimes(n: number, opts: { install_id?: string | null; body?: string } = {}) {
  const install = opts.install_id === null ? null : (opts.install_id ?? crypto.randomUUID());
  const rows = [];
  for (let i = 0; i < n; i++) {
    const id = crypto.randomUUID();
    const res = await callWorker(submitRequest({
      submission_id: id, body: opts.body ?? BODY, install_id: install,
    }));
    // Every reporter is told the same thing, flagged or not.
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ status: 'received' });
    rows.push(await getSubmission(id));
  }
  return rows;
}

describe('flood detection', () => {
  it('17. flags the 4th normalized-identical submission from one install, not the 3rd', async () => {
    mockTurnstile();
    await withEnv({ SPAM_GATE_ENABLED: 'true' }, async () => {
      const rows = await submitTimes(4);

      // The first three are ordinary reports. A person resending twice is not
      // a spammer, and the threshold exists so that stays true.
      for (const row of rows.slice(0, 3)) {
        expect(row.state).toBe('received');
        expect(row.spam_status).toBe(null);
      }

      const fourth = rows[3];
      expect(fourth.state).toBe('suspected_spam');
      // state and spam_status are written together, always: a state without a
      // status leaves spam_status NULL, which every later guard reads as clean.
      expect(fourth.spam_status).toBe('suspected');
      // Reason CODES only, never quoted content.
      expect(JSON.parse(fourth.spam_reasons)).toEqual(['flood_repeat']);
      // A flood is grounds for a human to look, never a verdict on its own.
      expect(fourth.state).not.toBe('spam');
      // Body PRESERVED — a reviewer has to be able to read what was sent.
      expect(fourth.body_sanitized).toContain('freezing');

      const log = await getStateLog(fourth.submission_id);
      expect(log[0].to_state).toBe('suspected_spam');
      expect(log[0].detail).toContain('flood_repeat');
    });
  });

  it('17b. every row carries the flood key, so the count has something to match', async () => {
    mockTurnstile();
    await withEnv({ SPAM_GATE_ENABLED: 'true' }, async () => {
      const rows = await submitTimes(4);
      const expected = await floodHash(BODY);
      for (const row of rows) {
        expect(row.normalized_hash).toBe(expected);
        expect(row.reporter_kind).toBe('install');
      }
    });
  });

  it('17c. flags nothing while the gate is off, but still records the evidence', async () => {
    mockTurnstile();
    // The production configuration. Phase 2's "inert in production" claim is
    // this test, not a comment.
    expect(env.SPAM_GATE_ENABLED).toBe('false');

    const rows = await submitTimes(5);

    for (const row of rows) {
      expect(row.state).toBe('received');
      expect(row.spam_status).toBe(null);
      expect(row.spam_reasons).toBe(null);
      // Written regardless, so history exists the day the gate is flipped.
      expect(row.normalized_hash).toHaveLength(64);
      expect(row.reporter_kind).toBe('install');
    }
  });

  it('18. does not flag similar reports from different reporters', async () => {
    mockTurnstile();
    await withEnv({ SPAM_GATE_ENABLED: 'true' }, async () => {
      // The legitimate-signal case: four people hitting one bug is the single
      // most valuable thing this pipeline can receive. Flagging it would make
      // the filter actively harmful.
      const rows = [];
      for (let i = 0; i < 4; i++) rows.push(...(await submitTimes(1)));

      for (const row of rows) {
        expect(row.state).toBe('received');
        expect(row.spam_status).toBe(null);
      }
      // Same content, so the hash matches across all four — the reporter is
      // what separates them, which is exactly what the query keys on.
      const hashes = new Set(rows.map((r) => r.normalized_hash));
      expect(hashes.size).toBe(1);
    });
  });

  it('19. flags an IP-derived flood, and records that it came from an IP', async () => {
    mockTurnstile();
    await withEnv({ SPAM_GATE_ENABLED: 'true' }, async () => {
      // No install_id, so reporter_key falls back to the IP. This still yields
      // suspected_spam — useful — but reporter_kind records the weaker
      // provenance so the classifier can refuse to treat it as evidence for a
      // `spam` confirmation. One NAT egress is not one person.
      const rows = await submitTimes(4, { install_id: null });

      expect(rows[2].state).toBe('received');
      expect(rows[3].state).toBe('suspected_spam');
      for (const row of rows) expect(row.reporter_kind).toBe('ip');
    });
  });

  it('20. collapses case, whitespace, repeated punctuation and zero-width to one hash', async () => {
    const base = 'The wallet is broken';
    const variants = [
      'the wallet is broken',
      'THE   WALLET  IS BROKEN',
      '  The wallet is broken  ',            // leading/trailing whitespace
      'The​ wallet is broken',                // zero-width space
      'The wallet﻿ is broken',                // BOM
      'The\twallet\nis broken',                  // mixed whitespace kinds
    ];
    const target = normalizeForFlood(base);
    for (const v of variants) {
      expect(normalizeForFlood(v), `variant did not collapse: ${JSON.stringify(v)}`).toBe(target);
    }

    // Runs of the SAME punctuation collapse; a single mark is meaningful and
    // must not be erased, or genuinely different reports share a hash.
    expect(normalizeForFlood('broken!!!!!')).toBe('broken!');
    expect(normalizeForFlood('broken!')).toBe('broken!');
    expect(normalizeForFlood('broken')).not.toBe(normalizeForFlood('broken!'));
    // Different reports must NOT collide. A false flood match parks a real
    // report, which is the expensive direction to be wrong in.
    expect(normalizeForFlood('send failed')).not.toBe(normalizeForFlood('sync failed'));
  });

  it('20b. writes the flood columns on the ordinary clean path too', async () => {
    mockTurnstile();
    // The load-bearing half. A single submission is not a flood, but if this
    // row omits the columns then nothing it is later compared against exists.
    const id = crypto.randomUUID();
    await callWorker(submitRequest({ submission_id: id, body: 'A one-off report', install_id: 'install-abc' }));

    const row = await getSubmission(id);
    expect(row.state).toBe('received');
    expect(row.normalized_hash).toBe(await floodHash('A one-off report'));
    expect(row.reporter_kind).toBe('install');
    expect(row.spam_status).toBe(null);
  });

  it('21. skips the redundant attachment on a flagged flood, and says so in the log', async () => {
    mockTurnstile();
    await withEnv({ SPAM_GATE_ENABLED: 'true' }, async () => {
      const install = crypto.randomUUID();
      // Real PNG bytes: an arbitrary payload is now refused with 415 before
      // the flood branch is ever reached.
      const file = () => pngFile();

      let last = '';
      for (let i = 0; i < 4; i++) {
        last = crypto.randomUUID();
        await callWorker(submitRequest({
          submission_id: last, body: BODY, install_id: install, attachment: file(),
        }));
      }

      const flagged = await getSubmission(last);
      expect(flagged.state).toBe('suspected_spam');
      // Submissions 1-3 stored theirs; the 4th is redundant by definition.
      // Evidence is preserved without giving a flooder unbounded R2.
      expect(JSON.parse(flagged.attachment_keys)).toEqual([]);
      const log = await getStateLog(last);
      expect(log[0].detail).toContain('attachment_skipped');
    });
  });

  it('21b. answers a bad attachment identically whether flagged or not', async () => {
    // The response must not become a flood oracle. Skipping the sniff along
    // with the R2 store meant bad bytes got 415 when unflagged and a plain 202
    // when flagged -- enough to binary-search FLOOD_THRESHOLD and calibrate to
    // threshold-1. Validation runs for everyone; only the STORE is skipped.
    //
    // The flood has to be built with ACCEPTED submissions first. A rejected
    // one writes no row, so a test that sends junk every time never reaches
    // the threshold and proves nothing -- it passes because nothing was ever
    // flagged, not because the oracle is closed.
    mockTurnstile();
    await withEnv({ SPAM_GATE_ENABLED: 'true' }, async () => {
      const install = crypto.randomUUID();
      const junk = () => new File([new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9])], 'shot.png', { type: 'image/png' });

      // 1-3: accepted, so the rows exist and the next identical one is the 4th.
      for (let i = 0; i < 3; i++) {
        const ok = await callWorker(submitRequest({
          submission_id: crypto.randomUUID(), body: BODY, install_id: install, attachment: pngFile(),
        }));
        expect(ok.status).toBe(202);
      }

      // Control: a DIFFERENT reporter, same junk — definitely not flagged.
      const control = await callWorker(submitRequest({
        submission_id: crypto.randomUUID(), body: BODY,
        install_id: crypto.randomUUID(), attachment: junk(),
      }));

      // Subject: the 4th identical from this install — definitely flagged.
      const subject = await callWorker(submitRequest({
        submission_id: crypto.randomUUID(), body: BODY, install_id: install, attachment: junk(),
      }));

      // Byte-identical refusals. If the sniff were skipped for a flood, the
      // subject would answer 202 and the control 415.
      expect(control.status).toBe(415);
      expect(subject.status).toBe(415);
      expect(await subject.text()).toBe(await control.text());
    });
  });

  it('21c. still skips the R2 store for a flagged flood, with valid bytes', async () => {
    // The behaviour the skip exists for is unchanged: evidence preserved for
    // the first N-1, nothing unbounded for the flooder.
    mockTurnstile();
    await withEnv({ SPAM_GATE_ENABLED: 'true' }, async () => {
      const install = crypto.randomUUID();
      let last = '';
      for (let i = 0; i < 4; i++) {
        last = crypto.randomUUID();
        await callWorker(submitRequest({
          submission_id: last, body: BODY, install_id: install, attachment: pngFile(),
        }));
      }
      const flagged = await getSubmission(last);
      expect(flagged.state).toBe('suspected_spam');
      expect(JSON.parse(flagged.attachment_keys)).toEqual([]);
    });
  });

  it('22. clamps configuration so it can never flag a first submission', async () => {
    // Fails OPEN, unlike the publish caps. A missing cap must fail tight
    // because that withholds a write; a missing flood threshold failing tight
    // would flag EVERY report, which buries real reports instead.
    expect(floodConfig({ FLOOD_THRESHOLD: '1' }).threshold).toBe(2);
    expect(floodConfig({ FLOOD_THRESHOLD: '0' }).threshold).toBe(2);
    expect(floodConfig({ FLOOD_THRESHOLD: '-5' }).threshold).toBe(2);
    expect(floodConfig({ FLOOD_THRESHOLD: 'banana' }).threshold).toBe(4);
    expect(floodConfig({}).threshold).toBe(4);

    // An accidental extra zero must not turn one hour into eleven days.
    expect(floodConfig({ FLOOD_WINDOW_MS: '999999999999' }).windowMs).toBe(86_400_000);
    expect(floodConfig({ FLOOD_WINDOW_MS: '1' }).windowMs).toBe(60_000);
    expect(floodConfig({}).windowMs).toBe(3_600_000);

    expect(reporterKind('abc')).toBe('install');
    expect(reporterKind('')).toBe('ip');
    expect(reporterKind(undefined)).toBe('ip');
  });
});
