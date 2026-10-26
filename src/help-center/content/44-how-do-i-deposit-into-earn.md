---
id: how-do-i-deposit-into-earn
title: How do I deposit into Earn?
mainCategory: earning
subcategory: earn
platforms: [extension-desktop, mobile]
---

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See [*Can I earn yield in Bread?*](#earn/can-i-earn-yield-in-bread)

**Before depositing:** Do not start new deposits into Ethereum or Arbitrum Earn markets while their withdrawal path is unavailable. Deposits there were reported working on 26 October 2026, but withdrawals were reported working only from Base to Miden. Check the current status in [*Can I earn yield in Bread?*](#earn/can-i-earn-yield-in-bread) and confirm an available withdrawal path for the exact market before starting a new deposit.

The screenshots below were captured on Bread 1.16.2 Testnet. They illustrate an older flow; token names, balances and layouts can differ from your installed version.

Depositing spends USDCx from your Miden balance. The supported route supplies native USDC to the external lending market and opens a position there.

**Steps:**

1. Open Bread and select **Earn**.

   ![Bread 1.16.2 Testnet Earn page, with Featured Vaults and no active positions](E35-earn-tab.png)

2. Select a supported vault, check its market and network, then select **Deposit** if it is available.

   ![Bread 1.16.2 Testnet vault page, with the Deposit button](E36-earn-vault.png)

3. Enter the amount of USDCx to deposit, leaving enough for the displayed network fee, then select **Confirm**.

   ![Bread 1.16.2 Testnet Deposit Amount page, showing the older USDC label](E37-earn-deposit-amount.png)

4. Check the **Deposit Amount**, market, **Route**, **Estimated time** and **Max network fee**. Select **Open position** only when the details are correct and the action is available.

   ![Bread 1.16.2 Testnet deposit review, with the Open position button](E38-earn-deposit-review.png)

5. Bread shows **Generating Transaction** while it processes the deposit. You can select **Hide** and follow its status in **Activity**. Do not start another deposit because this screen takes longer than expected.

   ![Bread 1.16.2 Testnet Generating Transaction page for an Earn deposit](E39-earn-deposit-generating.png)

6. If the deposit completes, Bread shows **You're Earning!** Select **Done**, then check the position and transaction status.

   ![Bread 1.16.2 Testnet success page for an Earn deposit](E40-earn-deposit-success.png)

Your position appears under **Current Positions** in **Earn** after it loads. See [*How do I check my Earn position?*](#earn/how-do-i-check-my-earn-position)

Before you deposit, see [*What do I need before I can use Earn?*](#earn/what-do-i-need-before-i-can-use-earn)
