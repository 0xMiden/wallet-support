---
id: how-do-i-withdraw-from-earn
title: How do I withdraw from Earn?
mainCategory: earning
subcategory: earn
platforms: [extension-desktop, mobile]
---

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See [*Can I earn yield in Bread?*](#earn/can-i-earn-yield-in-bread)

You can withdraw positions on Base and Ethereum, including one in a vault that's closed to new deposits. Epoch can't currently route withdrawals from Arbitrum. If you have a position on Arbitrum, contact [support](/feedback).

Your first withdrawal on a network can take a little longer while Bread waits for a one-time setup. If that setup outlasts your review, Bread gets a new quote that's never lower than the minimum you reviewed.

A supported withdrawal redeems the selected amount from the external native-USDC position and routes the receipt back to Miden as USDCx. A partial withdrawal leaves the remaining amount invested.

**Steps:**

1. Open **Earn** and select your position under **Current Positions** or **My positions**.
2. Select **Withdraw**. Enter an amount within the displayed available balance, or select **Max**, then select **Review**.
3. Check **You withdraw**, **Stays invested**, the destination network, expected receipt and minimum receipt. Expand the withdrawal details to check the route and fees. Select **Withdraw** only when a valid quote is available and you accept the details.

4. Bread shows **Processing Withdrawal**, then **Withdrawal Started!** when it has started. Select **View in Activities** to follow delivery; starting the withdrawal does not mean the receipt has arrived.

5. Follow **Withdraw from Earn** in **Activity**, including **Redeeming** and **Delivering** where shown. Wait for the existing withdrawal to finish before starting another from the same position.

6. After delivery, check your Miden USDCx balance and **Activity**. Eligible USDCx transfers can be accepted automatically when **Auto-accept USDCX transfers** is on. If the receipt remains pending and shows **Accept Transfer**, accept it there.

Partial amounts still depend on the available balance, supported route and a valid quote. See [*Can I withdraw part of my position?*](#earn/can-i-withdraw-part-of-my-position)

To learn how accepting works, see [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)
