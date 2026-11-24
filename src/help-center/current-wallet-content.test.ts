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

  it('describes paused vaults and withdrawal networks without dated test reports', () => {
    const earnIds = [
      'can-i-earn-yield-in-bread', 'what-do-i-need-before-i-can-use-earn', 'how-do-i-deposit-into-earn',
      'how-do-i-withdraw-from-earn', 'can-i-withdraw-part-of-my-position',
      'what-should-i-do-if-an-earn-deposit-or-withdrawal-fails'
    ];
    for (const id of earnIds) {
      expect(body(id)).not.toMatch(/JST|reported|26 October 2026|implemented controls/);
    }
    const overview = body('can-i-earn-yield-in-bread');
    expect(overview).toContain('**Deposits are closed**');
    expect(overview).toContain('Aave V3 USDC on Base and Aave V3 USDC on Ethereum');
    expect(overview).not.toMatch(/Compound III|Morpho/);
    for (const id of ['what-do-i-need-before-i-can-use-earn', 'how-do-i-deposit-into-earn']) {
      expect(body(id)).toContain('**Deposits are closed**');
    }
    for (const id of ['can-i-earn-yield-in-bread', 'how-do-i-withdraw-from-earn']) {
      expect(body(id)).toContain('withdraw positions on Base and Ethereum');
      expect(body(id)).toMatch(/Withdrawals from Arbitrum aren't available|Epoch can't currently route withdrawals from Arbitrum/);
    }
    expect(body('how-do-i-withdraw-from-earn')).toContain('one-time setup');
  });

  it('allows partial withdrawals and distinguishes a covered network fee from costs', () => {
    const partial = body('can-i-withdraw-part-of-my-position');
    expect(partial).toContain('**Max**');
    expect(partial).toContain('**Stays invested**');
    expect(partial).not.toContain('No. A withdrawal returns your whole position');
    expect(body('what-does-it-cost-to-use-earn')).toContain('has its network fee covered for you.');
    expect(body('what-does-it-cost-to-use-earn')).toContain('That does not mean the withdrawal has no costs');
    expect(body('how-do-i-withdraw-from-earn')).toContain('accepted automatically');
  });

  it('says the success screen does not mean the deposit has finished', () => {
    expect(body('can-i-earn-yield-in-bread')).toContain("doesn't mean your deposit has finished");
    const deposit = body('how-do-i-deposit-into-earn');
    expect(deposit).toContain('does not confirm settlement');
    expect(deposit).not.toContain('If the deposit completes, Bread shows');
    const failure = body('what-should-i-do-if-an-earn-deposit-or-withdrawal-fails');
    expect(failure).toContain('**Pending**');
    expect(failure).toContain('balance');
    expect(failure).toContain('position');
  });

  it('does not advertise weekly claims or a universal game posting fee', () => {
    const text = body('how-do-gamecoins-and-arcade-work');
    expect(text).toContain('Each game sets its own rules');
    expect(text).toContain('does not provide a weekly');
    expect(text).toContain('On Mainnet you can buy GC in the wallet');
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
    expect(body('what-should-i-do-if-accepting-a-transfer-fails')).toContain('**Auto-accept USDCX transfers** on');
  });

  it('labels retained Earn screenshots as historical illustrations', () => {
    for (const id of ['how-do-i-check-my-earn-position', 'what-should-i-do-if-an-earn-deposit-or-withdrawal-fails']) {
      expect(body(id)).toContain('captured on Bread 1.16.2 Testnet');
      expect(body(id)).toContain('older flow');
    }
  });

  it('does not call the retaken Mainnet 1.17.7 deposit screenshots historical', () => {
    expect(body('how-do-i-deposit-into-earn')).not.toContain('1.16.2 Testnet');
  });

  it('gives the withdrawal steps without screenshots until Mainnet withdrawals can be captured', () => {
    expect(body('how-do-i-withdraw-from-earn')).not.toContain('](E');
    expect(body('how-do-i-withdraw-from-earn')).not.toContain('1.16.2 Testnet');
  });

  it('keeps Slow withdrawal claims conditional on the current activity state', () => {
    const text = body('what-is-the-difference-between-a-solver-route-and-a-canonical-bridge');
    expect(text).toContain('may need a manual claim');
    expect(text).toContain('claimed automatically');
    expect(text).toContain('matching destination address');
    expect(text).not.toContain('needs one more step');
  });

  // Mainnet config v18 (2026-11-13): Epoch deposits and withdrawals are on for these networks; NEAR Intents is off.
  it('lists the Fast route as available on its Mainnet networks and NEAR Intents as disabled', () => {
    const networks = 'Ethereum, Base, Arbitrum, Polygon and Robinhood Chain';
    expect(body('what-is-the-difference-between-a-solver-route-and-a-canonical-bridge')).toContain(
      `The Fast route works on ${networks}.`
    );
    const bridge = helpCenterArticles.find(article => article.id === 'which-bridge-networks-and-tokens-can-i-use');
    for (const text of Object.values(bridge?.bodies ?? {})) {
      expect(text).toContain(`**Fast route: ${networks}**`);
      const unavailable = text.slice(text.indexOf('**Not available on Partner Mainnet**'));
      expect(unavailable).not.toContain('Fast · Epoch');
      expect(unavailable.split('\n').find(line => line.startsWith('- **NEAR Intents**:'))).toMatch(/\bdisabled\b/);
    }
    expect(Object.keys(bridge?.bodies ?? {}).length).toBeGreaterThan(0);
    for (const id of [
      'what-is-the-difference-between-a-solver-route-and-a-canonical-bridge',
      'can-i-send-funds-to-another-blockchain',
      'can-i-swap-tokens-across-chains'
    ]) {
      expect(body(id), id).not.toMatch(/Epoch[^.]*not (currently )?enabled|fast transfers are disabled/i);
    }
  });
});
