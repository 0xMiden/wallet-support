---
id: what-do-i-need-before-i-can-use-earn
title: What do I need before I can use Earn?
mainCategory: earning
subcategory: earn
platforms: [extension-desktop, mobile]
---

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See [*Can I earn yield in Bread?*](#earn/can-i-earn-yield-in-bread)

**Before depositing:** Do not start new deposits into Ethereum or Arbitrum Earn markets while their withdrawal path is unavailable. Deposits there were reported working on 26 October 2026, but withdrawals were reported working only from Base to Miden. Check the current status in [*Can I earn yield in Bread?*](#earn/can-i-earn-yield-in-bread) and confirm an available withdrawal path for the exact market before starting a new deposit.

You need spendable **USDCx** in your Miden wallet to fund an Earn deposit. The external lending market uses native USDC; the deposit route handles that change of asset.

- Check **Activity** for incoming transfers that still need acceptance. Eligible USDCx transfers can be accepted automatically when **Auto-accept USDCX transfers** is on in **General** settings. Other transfers may need **Accept Transfer**. See [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)
- Keep a reserve for the network fee shown by Bread. On Mainnet, your USDCx balance must cover both the deposit and the displayed network fee; do not enter your entire balance without checking the fee reserve.
- Check the exact account, network and supported market before requesting a quote. Testnet assets cannot fund a Mainnet position.

To make a deposit, see [*How do I deposit into Earn?*](#earn/how-do-i-deposit-into-earn)
