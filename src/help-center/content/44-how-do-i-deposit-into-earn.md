---
id: how-do-i-deposit-into-earn
title: How do I deposit into Earn?
mainCategory: earning
subcategory: earn
platforms: [extension-desktop, mobile]
---

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See [*Can I earn yield in Bread?*](#earn/can-i-earn-yield-in-bread)

**Before depositing:** Do not start new deposits into Ethereum or Arbitrum Earn markets while their withdrawal path is unavailable. Deposits there were reported working on 26 October 2026, but withdrawals were reported working only from Base to Miden. A later report described positions-loading failures and a deposit still pending after the success screen, so do not infer settlement or a reliable exit from those earlier tests. Check the current status in [*Can I earn yield in Bread?*](#earn/can-i-earn-yield-in-bread) and confirm an available withdrawal path for the exact market before starting a new deposit.

Depositing spends USDCx from your Miden balance. The supported route supplies native USDC to the external lending market and opens a position there.

**Steps:**

1. Open Bread and select **Earn**.

   ![Bread Wallet's Earn page, with Available Vaults and no active positions](E35-earn-tab.png)

2. Select a supported vault, check its market and network, then select **Deposit** if it is available.

   ![Bread Wallet's vault page, with the Deposit button](E36-earn-vault.png)

3. Enter the amount of USDCx to deposit, leaving enough for the displayed network fee, then select **Confirm**.

   ![Bread Wallet's Deposit Amount page, with an amount entered](E37-earn-deposit-amount.png)

4. Check the **Deposit Amount**, market, **Route**, **Estimated time** and **Max network fee**. Select **Open position** only when the details are correct and the action is available.

   ![Bread Wallet's deposit review, with the Open position button](E38-earn-deposit-review.png)

5. Bread shows **Generating Transaction** while it processes the deposit. You can select **Hide** and follow its status in **Activity**. Do not start another deposit because this screen takes longer than expected.

   ![Bread Wallet's Generating Transaction page for an Earn deposit](E39-earn-deposit-generating.png)

6. Bread may show **You're Earning!** while **Activity** still shows **Pending**. This screen does not confirm settlement. Select **Done**, let the wallet sync, then check the existing transaction status, spendable balance and position. If they do not reconcile or positions cannot load, contact [support](/feedback) before submitting again.

   ![Bread Wallet's success page for an Earn deposit, showing You're Earning!](E40-earn-deposit-success.png)

Your position appears under **Current Positions** in **Earn** after it loads. See [*How do I check my Earn position?*](#earn/how-do-i-check-my-earn-position)

Before you deposit, see [*What do I need before I can use Earn?*](#earn/what-do-i-need-before-i-can-use-earn)
