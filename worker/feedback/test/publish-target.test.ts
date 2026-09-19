import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addLabels, createComment, createIssue, updateComment, uploadAttachment,
} from '../src/lib/publish';
import { callsTo, installFetchStub, restoreFetch, PNG_BYTES } from './helpers';

describe('GitHub write target', () => {
  beforeEach(() => installFetchStub());
  afterEach(() => restoreFetch());

  it('rejects a foreign repository before every write helper performs a request', async () => {
    const repo = 'attacker/other-repo';
    const attempts = [
      () => createIssue(repo, 'token', { title: 'title', body: 'body', labels: [] }),
      () => createComment(repo, 'token', 1, 'comment'),
      () => updateComment(repo, 'token', 1, 'comment'),
      () => addLabels(repo, 'token', 1, ['feedback-form']),
      () => uploadAttachment(PNG_BYTES, repo, 'token'),
    ];

    for (const attempt of attempts) {
      await expect(attempt()).rejects.toThrow(/outside 0xMiden\/wallet/);
    }
    expect(callsTo('api.github.com')).toHaveLength(0);
    expect(callsTo('uploads.github.com')).toHaveLength(0);
  });
});
