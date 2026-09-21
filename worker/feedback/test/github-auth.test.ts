import { describe, expect, it } from 'vitest';
import { assertWalletTarget, getGitHubToken } from '../src/lib/github-auth';

describe('GitHub credential boundary', () => {
  it('accepts only the wallet issue repository', () => {
    expect(() => assertWalletTarget('0xMiden/wallet')).not.toThrow();
    expect(() => assertWalletTarget('Ivanlomoljo26/Bread-feedback')).toThrow(/0xMiden\/wallet/);
    expect(() => assertWalletTarget('0xMiden/wallet-support')).toThrow(/0xMiden\/wallet/);
  });

  it('uses the static token only for injected test environments', async () => {
    await expect(getGitHubToken({ GITHUB_WRITE_TOKEN: 'test-only-token' })).resolves.toBe('test-only-token');
  });

  it('fails closed when GitHub App configuration is incomplete', async () => {
    await expect(getGitHubToken({})).rejects.toThrow(/not configured/);
  });
});
