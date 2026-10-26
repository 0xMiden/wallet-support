import { describe, expect, it } from 'vitest';
import { helpCenterArticles } from './content';

function body(id: string) {
  const article = helpCenterArticles.find(article => article.id === id);
  if (!article) throw new Error(`Missing public article ${id}`);
  return Object.values(article.bodies).join('\n');
}

describe('verified wallet behavior', () => {
  it('keeps Mainnet configuration separate from Earn provider readiness', () => {
    const text = body('can-i-earn-yield-in-bread');
    expect(text).toContain('enabled for eligible Mainnet users');
    expect(text).toContain('does not guarantee');
    expect(text).toContain('provider liquidity');
    expect(text).toContain('United Kingdom or New York');
    expect(text).not.toContain('Mainnet Earn is not currently available');
  });

  it('distinguishes USDCx collateral, auto-accept and external USDC', () => {
    const text = body('what-do-i-need-before-i-can-use-earn');
    expect(text).toContain('USDCx');
    expect(text).toContain('native USDC');
    expect(text).toContain('Auto-accept USDCX transfers');
    expect(text).toContain('network fee');
    expect(text).not.toContain('not accepted automatically');
  });

  it('keeps reported deposit success separate from the non-Base withdrawal limitation', () => {
    const status = body('can-i-earn-yield-in-bread');
    expect(status).toContain('26 October 2026, 12:32 JST');
    expect(status).toContain('deposits into Ethereum, Arbitrum and Base Earn markets were reported working');
    expect(status).toContain('withdrawals worked only from Base back to Miden');
    expect(status).toContain('Ethereum and Arbitrum withdrawals were not working');
    expect(status).toContain('Do not start new deposits into Ethereum or Arbitrum Earn markets');
    expect(status).toContain('do not guarantee');
    expect(status).not.toContain('provider liquidity setup is still in progress');
    for (const id of ['what-do-i-need-before-i-can-use-earn', 'how-do-i-deposit-into-earn']) {
      expect(body(id)).toContain('Do not start new deposits into Ethereum or Arbitrum Earn markets');
      expect(body(id)).toContain('withdrawal');
    }
    for (const id of ['how-do-i-withdraw-from-earn', 'can-i-withdraw-part-of-my-position']) {
      expect(body(id)).toContain('Ethereum and Arbitrum withdrawals were not working');
      expect(body(id)).toContain('implemented controls');
    }
  });

  it('allows partial withdrawals and distinguishes sponsored gas from costs', () => {
    const partial = body('can-i-withdraw-part-of-my-position');
    expect(partial).toContain('**Max**');
    expect(partial).toContain('**Stays invested**');
    expect(partial).not.toContain('No. A withdrawal returns your whole position');
    expect(body('what-does-it-cost-to-use-earn')).toContain('Sponsored gas does not mean');
    expect(body('how-do-i-withdraw-from-earn')).toContain('accepted automatically');
  });

  it('qualifies the success screen and earlier Base results with the later pending report', () => {
    const status = body('can-i-earn-yield-in-bread');
    expect(status).toContain('26 October 2026, 14:31 JST');
    expect(status).toContain('45 minutes');
    expect(status).toContain('positions-loading');
    expect(status).toContain('does not confirm settlement');
    expect(status).toContain('does not guarantee Base withdrawal availability');
    expect(status).not.toMatch(/every account|no Mainnet user|reclaimable/);
    const deposit = body('how-do-i-deposit-into-earn');
    expect(deposit).toContain('does not confirm settlement');
    expect(deposit).not.toContain('If the deposit completes, Bread shows');
    for (const id of ['how-do-i-withdraw-from-earn', 'can-i-withdraw-part-of-my-position']) {
      expect(body(id)).toContain('does not guarantee Base withdrawal availability');
    }
    const failure = body('what-should-i-do-if-an-earn-deposit-or-withdrawal-fails');
    expect(failure).toContain('**Pending**');
    expect(failure).toContain('balance');
    expect(failure).toContain('position');
  });

  it('does not advertise weekly claims or a universal game posting fee', () => {
    const text = body('how-do-gamecoins-and-arcade-work');
    expect(text).toContain('Each game sets its own rules');
    expect(text).toContain('does not provide a weekly');
    expect(text).toContain('**Buy more GC** is disabled');
    expect(text).not.toMatch(/10 GC|costs 1 GC|per week/);
  });

  it.each([
    'how-do-i-create-a-bread-wallet', 'how-do-i-restore-my-wallet-with-a-recovery-phrase',
    'can-i-get-my-wallet-back-if-i-lose-my-device', 'how-does-recovery-work-with-guardian',
    'how-do-i-prepare-for-mainnet-and-check-my-network',
    'what-should-i-do-before-resetting-or-reinstalling-bread', 'what-should-i-do-if-guardian-cannot-connect'
  ])('preserves the active-device recovery warning in %s', id => {
    expect(body(id)).toMatch(/one (active )?device at a time/);
    expect(body(id)).toMatch(/only one with access|replaces the former/);
  });

  it('retains both acceptance labels and reconciliation before retry', () => {
    for (const id of ['my-token-is-stuck-on-consuming-receiver-address', 'what-should-i-do-if-accepting-a-transfer-fails']) {
      expect(body(id)).toContain('**Retry**');
      expect(body(id)).toContain('**Accept Transfer**');
      expect(body(id)).toMatch(/sync/);
      expect(body(id)).toMatch(/balance/);
    }
    expect(body('what-should-i-do-if-accepting-a-transfer-fails')).toContain('does not automatically return');
  });

  it('labels retained Earn screenshots as historical illustrations', () => {
    for (const id of ['how-do-i-deposit-into-earn', 'how-do-i-check-my-earn-position', 'how-do-i-withdraw-from-earn', 'what-should-i-do-if-an-earn-deposit-or-withdrawal-fails']) {
      expect(body(id)).toContain('captured on Bread 1.16.2 Testnet');
      expect(body(id)).toContain('older flow');
    }
  });

  it('does not infer fast transfers from Earn being enabled', () => {
    expect(body('what-is-the-difference-between-a-solver-route-and-a-canonical-bridge')).toContain('fast transfers are disabled');
    expect(body('which-bridge-networks-and-tokens-can-i-use')).toContain('is disabled in the current Partner Mainnet configuration');
  });
});
