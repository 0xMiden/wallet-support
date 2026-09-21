/**
 * Phase 3 — the console read surface: filters, search, sorting, paging, and
 * the per-review detail page.
 *
 * This authenticated page renders a stranger's text from a public listing and
 * accepts nine parameters from the query string. Nothing from the URL may
 * become SQL, and nothing may become markup.
 *
 * The second theme is quieter and just as damaging: a filter that silently
 * does not apply, or a pager that shows one row twice and another never. Both
 * look like working software.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { callWorker, seedStoreReview, seedAdmin, adminHeaders } from './helpers';
import {
  parseQuery, buildWhere, buildQuery, escapeLike, withParam, hasFilters, SORTS, PAGE_SIZE,
} from '../src/store/query';

const BASE = 'https://mfv2.test';
const get = async (path: string) => callWorker(new Request(`${BASE}${path}`, {
  method: 'GET', headers: await adminHeaders(),
}));
const text = async (path: string) => (await get(path)).text();
const q = (s: string) => parseQuery(new URLSearchParams(s));

beforeEach(async () => {
  await seedAdmin();
  await env.DB.prepare('DELETE FROM store_review_events').run();
  await env.DB.prepare('DELETE FROM store_review_versions').run();
  await env.DB.prepare('DELETE FROM store_reviews').run();
  await env.DB.prepare('DELETE FROM store_sync_state').run();
});

describe('the query layer — nothing from the URL reaches SQL', () => {
  it('Q1. an unrecognised filter value is dropped, never passed through', async () => {
    // The danger is not the value reaching SQL — it is bound. It is a filter
    // that silently becomes "match everything" while the page claims it applied.
    const parsed = q('platform=android&state=not_a_state&reply=nonsense&label=made_up&eligibility=x');
    expect(parsed.state).toBeNull();
    expect(parsed.reply).toBeNull();
    expect(parsed.label).toBeNull();
    expect(parsed.eligibility).toBeNull();
    expect(hasFilters(parsed)).toBe(false);

    const { where, binds } = buildWhere(parsed);
    expect(where).toBe('platform = ?');
    expect(binds).toEqual(['android']);
  });

  it('Q2. sort is a key lookup, so it cannot carry SQL', async () => {
    // ORDER BY cannot be a bind parameter, which makes it the one place a
    // caller's string could otherwise be concatenated into a statement.
    const evil = q('sort=review_created_at DESC; DROP TABLE store_reviews--');
    expect(evil.sort).toBe('newest');
    expect(buildQuery(evil).orderBy).toBe(SORTS.newest.clause);
    // Whatever is chosen, it is one of ours verbatim.
    expect(Object.values(SORTS).map((s) => s.clause)).toContain(buildQuery(q('sort=oldest')).orderBy);
  });

  it('Q3. LIKE metacharacters are escaped, so search means what it says', async () => {
    expect(escapeLike('100_')).toBe('100\\_');
    expect(escapeLike('50%')).toBe('50\\%');
    // The backslash must be escaped FIRST or it would escape the escapes.
    expect(escapeLike('a\\b')).toBe('a\\\\b');

    const { binds } = buildWhere(q('platform=android&q=100%25'));
    expect(binds).toContain('%100\\%%');
  });

  it('Q4. every sort has a unique tiebreaker, or paging silently lies', async () => {
    // Without one, two rows sharing a timestamp can swap between page 1 and
    // page 2: one row appears twice and another is never shown at all.
    for (const [name, { clause }] of Object.entries(SORTS)) {
      expect(clause, name).toContain('store_review_id');
    }
  });

  it('Q5. changing a filter returns you to page 1', async () => {
    const parsed = q('platform=android&page=7&state=actionable');
    // Staying on page 7 of a result set that just became three rows long shows
    // an empty page and reads as a bug.
    expect(withParam(parsed, 'rating', '1')).not.toContain('page=');
    // Paging itself must obviously keep the page.
    expect(withParam(parsed, 'page', '8')).toContain('page=8');
  });

  it('Q6. rating and page reject anything that is not a sane number', async () => {
    expect(q('rating=0').rating).toBeNull();
    expect(q('rating=6').rating).toBeNull();
    expect(q('rating=2.5').rating).toBeNull();
    expect(q('rating=1 OR 1=1').rating).toBeNull();
    expect(q('rating=3').rating).toBe(3);
    expect(q('page=0').page).toBe(1);
    expect(q('page=-4').page).toBe(1);
    expect(q('page=99999').page).toBe(400);   // capped, not unbounded OFFSET
  });

  it('Q7. an unscanned row is not treated as a flagged one', async () => {
    // NULL means never scanned. Rows that predate the scanner must not vanish
    // from an "exclude redacted" filter as though they had failed it.
    const { where } = buildWhere(q('platform=android&flagged=no'));
    expect(where).toContain("COALESCE(secret_scan_status, 'clean') <> 'flagged'");
  });
});

describe('filters actually filter', () => {
  it('C1. each filter narrows the list to what it says', async () => {
    await seedStoreReview({ platform: 'android', review_state: 'actionable', review_body: 'ALPHA' });
    await seedStoreReview({ platform: 'android', review_state: 'not_actionable', review_body: 'BETA' });
    await seedStoreReview({ platform: 'android', review_state: 'actionable', reply_state: 'published', review_body: 'GAMMA' });

    const actionable = await text('/admin/store?platform=android&state=actionable');
    expect(actionable).toContain('ALPHA');
    expect(actionable).toContain('GAMMA');
    expect(actionable).not.toContain('BETA');

    const replied = await text('/admin/store?platform=android&reply=published');
    expect(replied).toContain('GAMMA');
    expect(replied).not.toContain('ALPHA');
  });

  it('C2. the label filter matches a whole label, not a substring of one', async () => {
    await seedStoreReview({ platform: 'android', human_labels: '["bug"]', review_body: 'REAL-BUG' });
    await seedStoreReview({ platform: 'android', human_labels: '["ux_issue"]', review_body: 'UX-ONE' });

    const bugs = await text('/admin/store?platform=android&label=bug');
    expect(bugs).toContain('REAL-BUG');
    expect(bugs).not.toContain('UX-ONE');

    // `ui_issue` must not sweep up `ux_issue`, which differs by one letter.
    const ui = await text('/admin/store?platform=android&label=ui_issue');
    expect(ui).not.toContain('UX-ONE');
    expect(ui).not.toContain('REAL-BUG');
  });

  it('C3. the label filter matches a person\'s labels only, never the AI\'s', async () => {
    // The AI's labels are not shown anywhere, so a filter matching them would list
    // reviews under a label nobody on the page can see.
    await seedStoreReview({
      platform: 'android', ai_labels: '["bug"]', human_labels: '["praise"]',
      review_body: 'OVERRULED',
    });
    await seedStoreReview({ platform: 'android', ai_labels: '["bug"]', review_body: 'AI-ONLY' });

    expect(await text('/admin/store?platform=android&label=praise')).toContain('OVERRULED');
    const bug = await text('/admin/store?platform=android&label=bug');
    expect(bug).not.toContain('OVERRULED');
    expect(bug).not.toContain('AI-ONLY');
  });

  it('C4. search looks in the title and the body', async () => {
    await seedStoreReview({ platform: 'android', review_title: 'Proving hangs', review_body: 'nothing else' });
    await seedStoreReview({ platform: 'android', review_title: 'Other', review_body: 'the balance is wrong' });

    expect(await text('/admin/store?platform=android&q=Proving')).toContain('Proving hangs');
    const balance = await text('/admin/store?platform=android&q=balance');
    expect(balance).toContain('the balance is wrong');
    expect(balance).not.toContain('Proving hangs');
  });

  it('C5. a search full of SQL renders inert and matches nothing', async () => {
    await seedStoreReview({ platform: 'android', review_body: 'STILL-HERE' });

    const res = await get("/admin/store?platform=android&q=%27%20OR%201%3D1--");
    expect(res.status).toBe(200);
    const html = await res.text();
    // The table is intact and the injection matched nothing.
    expect(html).not.toContain('STILL-HERE');
    expect(html).toContain('No review matches these filters');
    // And it is echoed back into the filter box as text, never as markup.
    expect(html).not.toContain("' OR 1=1--<");
    expect(html).toContain('&#39; OR 1=1--');

    const { results } = await env.DB.prepare('SELECT store_review_id FROM store_reviews').all<any>();
    expect(results).toHaveLength(1);
  });

  it('C6. an empty result from filters does not claim collection has not started', async () => {
    await seedStoreReview({ platform: 'android', review_state: 'actionable' });
    const html = await text('/admin/store?platform=android&state=needs_info');
    // "Not collecting yet" would be a lie to someone who has just filtered.
    expect(html).toContain('No review matches these filters');
    expect(html).not.toContain('Not collecting yet');
  });
});

describe('sorting and paging', () => {
  it('C7. sorting reorders, and the order is one of ours', async () => {
    await seedStoreReview({ platform: 'android', rating: 1, review_body: 'ONE-STAR', review_created_at: 1000 });
    await seedStoreReview({ platform: 'android', rating: 5, review_body: 'FIVE-STAR', review_created_at: 2000 });

    const low = await text('/admin/store?platform=android&sort=rating_low');
    expect(low.indexOf('ONE-STAR')).toBeLessThan(low.indexOf('FIVE-STAR'));

    const high = await text('/admin/store?platform=android&sort=rating_high');
    expect(high.indexOf('FIVE-STAR')).toBeLessThan(high.indexOf('ONE-STAR'));

    const oldest = await text('/admin/store?platform=android&sort=oldest');
    expect(oldest.indexOf('ONE-STAR')).toBeLessThan(oldest.indexOf('FIVE-STAR'));
  });

  it('C8. paging shows every row exactly once, even on identical timestamps', async () => {
    // The tiebreaker earning its place. All 30 share a timestamp, which is the
    // condition under which an unstable sort repeats and skips rows.
    const bodies: string[] = [];
    for (let i = 0; i < PAGE_SIZE + 5; i += 1) {
      const body = `ROW-${String(i).padStart(2, '0')}`;
      bodies.push(body);
      await seedStoreReview({ platform: 'android', review_body: body, review_created_at: 5000 });
    }

    const p1 = await text('/admin/store?platform=android');
    const p2 = await text('/admin/store?platform=android&page=2');

    const seen = bodies.filter((b) => p1.includes(b) || p2.includes(b));
    const twice = bodies.filter((b) => p1.includes(b) && p2.includes(b));
    expect(seen).toHaveLength(bodies.length);   // nothing skipped
    expect(twice).toEqual([]);                  // nothing repeated
    expect(p1).toContain('Page 1 of 2');
  });

  it('C9. paging past the end is an empty page, not an error', async () => {
    await seedStoreReview({ platform: 'android' });
    const res = await get('/admin/store?platform=android&page=9');
    expect(res.status).toBe(200);
  });
});

describe('one review', () => {
  it('C10. the detail page shows the review, its history, and its timeline', async () => {
    const id = await seedStoreReview({
      platform: 'android', review_title: 'Proving hangs', review_body: 'DETAIL-BODY',
      app_version: '1.15.19', reviewer_name: 'M. Reyes',
    });
    await env.DB.prepare(
      `INSERT INTO store_review_versions (store_review_id, raw_hash, raw_json, rating, observed_at)
       VALUES (?,?,?,?,?), (?,?,?,?,?)`
    ).bind(id, 'h1', '{}', 2, 1000, id, 'h2', '{}', 4, 2000).run();
    await env.DB.prepare(
      `INSERT INTO store_review_events (store_review_id, at, kind, detail, actor)
       VALUES (?,?,?,?,?)`
    ).bind(id, 3000, 'sync', 'edited upstream', 'sync').run();

    const html = await text(`/admin/store/${id}`);
    expect(html).toContain('DETAIL-BODY');
    expect(html).toContain('Proving hangs');
    expect(html).toContain('1.15.19');
    // The edit history distinguishes the original, which is never rewritten.
    expect(html).toContain('original');
    expect(html).toContain('edited upstream');
  });

  it('C11. a flagged review is redacted on the detail page too', async () => {
    const secret = 'abandon abandon abandon abandon abandon abandon ability';
    const id = await seedStoreReview({
      platform: 'android', review_title: secret, review_body: `seed ${secret}`,
      secret_scan_status: 'flagged',
    });
    const html = await text(`/admin/store/${id}`);
    // The list page redacts it; a detail page that did not would be a way
    // around that with one extra click.
    expect(html).not.toContain(secret);
    expect(html).not.toContain('abandon abandon');
    expect(html).toContain('[redacted');
  });

  it('C12. a malformed or unknown id is a 404, never a query', async () => {
    expect((await get('/admin/store/not-a-uuid')).status).toBe(404);
    expect((await get("/admin/store/' OR 1=1--")).status).toBe(404);
    // Well-formed but absent is also 404, and says so plainly.
    expect((await get('/admin/store/8bf0c1de-0000-4000-8000-000000000000')).status).toBe(404);
  });
});

describe('the page is still the page', () => {
  it('C15. the list shows the device name, not its codename', async () => {
    // Found by looking at a rendered page: the detail table preferred
    // device_product while the meta line used `device`, so one page disagreed
    // with itself — "SM-A155F" in the table and "a15" three lines above it.
    const id = await seedStoreReview({
      platform: 'android', device: 'panther', device_product: 'Pixel 7',
    });
    const list = await text('/admin/store?platform=android');
    expect(list).toContain('Pixel 7');
    expect(list).not.toContain('panther');

    const detail = await text(`/admin/store/${id}`);
    expect(detail).toContain('Pixel 7');
    expect(detail).not.toContain('panther');
  });

  it('C16. an Android API level is labelled as one, not as a version', async () => {
    // "OS 33" reads as a version number and is not one.
    const id = await seedStoreReview({ platform: 'android', os_version: '33' });
    expect(await text(`/admin/store/${id}`)).toContain('Android API level');
  });

  it('C13. nine query parameters later, the only script is the nonce-bound file and the CSP holds', async () => {
    await seedStoreReview({ platform: 'android' });
    const res = await get('/admin/store?platform=android&state=new&reply=none&handoff=none'
      + '&eligibility=undecided&label=bug&rating=2&flagged=no&q=test&sort=oldest&page=1');
    expect(res.status).toBe(200);

    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'none'");
    expect(csp).toMatch(/script-src 'nonce-[0-9a-f]{32}'(;|$)/);
    const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src')) ?? '';
    expect(scriptSrc).not.toContain('unsafe');
    // The filter bar is still a plain GET form: no inline handler, no inline script.
    const html = await res.text();
    expect(html.match(/<script\b/g)).toHaveLength(1);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).toContain('<form class="filters store-filters" method="GET" action="/admin/store">');
  });

  it('C14. a review full of markup is still inert with filters applied', async () => {
    await seedStoreReview({
      platform: 'android',
      review_title: '<script>alert(1)</script>',
      review_body: '<img src=x onerror=alert(2)> searchable',
    });
    const html = await text('/admin/store?platform=android&q=searchable');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
