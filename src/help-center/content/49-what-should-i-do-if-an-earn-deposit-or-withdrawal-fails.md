---
id: what-should-i-do-if-an-earn-deposit-or-withdrawal-fails
title: What should I do if an Earn deposit or withdrawal fails?
mainCategory: earning
subcategory: earn
platforms: [extension-desktop, mobile]
---

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See [*Can I earn yield in Bread?*](#earn/can-i-earn-yield-in-bread)

The screenshots below were captured on Bread 1.16.2 Testnet. They illustrate an older flow; token names, balances and layouts can differ from your installed version.

If a deposit shows **Transaction Failed**, check its status and your balance after sync before starting another deposit. A failed or interrupted screen does not by itself prove that nothing was submitted.

**Steps:**

1. On **Transaction Failed**, select **View in Activities**.

   ![Bread 1.16.2 Testnet Transaction Failed page for an Earn deposit](E47-earn-deposit-failed.png)

2. Wait for the wallet to sync. Check **Activity**, your spendable balance, the displayed fee reserve and any existing Earn position.
3. Retry only after those checks confirm that the original deposit failed and no transfer is still pending. If the outcome is uncertain, contact [support](/feedback) before submitting again. An unavailable quote or provider route is not fixed by repeatedly signing deposits. See [*How do I deposit into Earn?*](#earn/how-do-i-deposit-into-earn)

Ethereum and Arbitrum Earn withdrawals were reported not working on 26 October 2026, while withdrawals from Base to Miden were reported working. Check the current status in [*Can I earn yield in Bread?*](#earn/can-i-earn-yield-in-bread). Do not repeatedly submit withdrawals on an affected route; contact [support](/feedback).

For a withdrawal, check the existing **Withdraw from Earn** activity and position before starting another one. Let an in-progress withdrawal finish. If the wallet offers a recovery action, follow that existing activity rather than creating a duplicate withdrawal. If the outcome is uncertain or the position and balance disagree, contact [support](/feedback).

After a withdrawal is delivered, eligible incoming USDCx may be accepted automatically. If its acceptance fails and **Activity** shows **Retry**, see [*What should I do if accepting a transfer fails?*](#common-issues-and-support/what-should-i-do-if-accepting-a-transfer-fails)

Report the wallet version, network, market and error text without recovery information. See [*How do I send feedback or report a problem?*](#common-issues-and-support/how-do-i-send-feedback-or-report-a-problem)
