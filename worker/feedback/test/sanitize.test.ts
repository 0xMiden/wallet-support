/**
 * Plan §10 test 15 — nothing in submitter text may act on GitHub.
 * Pure functions, no Worker needed.
 */
import { describe, expect, it } from 'vitest';
import {
  sanitize, neutralizeMentions, neutralizeIssueRefs, defangIssueUrls, stripHtml, truncate,
} from '../src/lib/sanitize';

const ZWSP = '​';

describe('sanitize', () => {
  it('neutralises @mentions so they render but do not notify', () => {
    const out = neutralizeMentions('cc @octocat and @some-org/team');
    expect(out).toContain(`@${ZWSP}octocat`);
    expect(out).toContain(`@${ZWSP}some-org/team`);
  });

  it('neutralises #123 so it creates no cross-reference', () => {
    expect(neutralizeIssueRefs('same as #123 maybe')).toContain(`#${ZWSP}123`);
  });

  it('defangs full issue URLs to other repos', () => {
    const out = defangIssueUrls('see https://github.com/foo/bar/issues/7 please');
    expect(out).toContain('`https://github.com/foo/bar/issues/7`');
  });

  it('strips HTML tags', () => {
    expect(stripHtml('<img src=x onerror=alert(1)>hello</img>')).toBe('hello');
  });

  it('caps length before anything reaches a model or an issue', () => {
    const out = truncate('x'.repeat(9000));
    expect(out.length).toBeLessThan(9000);
    expect(out).toContain('[truncated]');
  });

  it('applies every rule in one pass', () => {
    const out = sanitize('<b>bug</b> cc @octocat re #99 https://github.com/a/b/issues/3');
    expect(out).not.toContain('<b>');
    expect(out).toContain(`@${ZWSP}octocat`);
    expect(out).toContain(`#${ZWSP}99`);
    expect(out).toContain('`https://github.com/a/b/issues/3`');
  });
});
