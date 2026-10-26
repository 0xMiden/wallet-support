---
id: my-usdc-or-usdcx-bridge-transfer-has-not-arrived
title: My USDC or USDCX bridge transfer hasn't arrived. Who can help?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

Transfers between USDC on **Ethereum**, **Base**, **Arbitrum One** or **Arc** and USDCX on Miden use Circle's xReserve route. Bread handles the Miden side of the transfer and Circle completes the other side. Many delays can be resolved in Bread, so start there.

**Check Bread first**

1. Open **Activity** and tap the transfer. If it's still in progress, keep Bread open and let it sync.
2. If you're sending USDCX out of Bread, check the wallet you sent it to. The USDC may have arrived even if Bread still shows **Burn confirmed**.
3. If you're adding USDC to Bread and Bread asks you to **Execute on Arc**, do it. This step needs a small amount of gas on Arc.
4. If you're adding USDC to Bread, check whether the USDCX is waiting to be accepted. See [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer) and [*My transfer is stuck on Accepting stage*](#common-issues-and-support/my-token-is-stuck-on-consuming-receiver-address).
5. Don't send the transfer again. Check your balances on both networks first: a second transfer doesn't speed up the first.

If you're unsure what happened, work through [*What should I check if a bridge deposit or withdrawal is delayed?*](#common-issues-and-support/what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed) or report it to our [support](/feedback).

**When to contact Circle**

Contact Circle when one side of the transfer is done and the other never arrived:

- **Sending out of Bread:** Bread shows **Burn confirmed**, or the bridge website shows **Withdrawal submitted**, but the USDC still hasn't reached the address on the other network.
- **Adding funds to Bread:** your external wallet shows the USDC deposit as successful, but Bread is still waiting for Circle to attest it, long after the arrival time Bread estimated.

Circle Customer Care:

- Email: [customer-support@arc.io](mailto:customer-support@arc.io)
- Help Center: [Contact Us](https://help.arc.io/support_arc?id=support_arc_form)

Tell them the networks, the direction, the amount, the time, the receiving address and the transaction hash from the other network. You can find the hash in your external wallet's history or on a block explorer.

Never share your recovery phrase, keys or wallet backup file. Bread support will never ask for them. Use only the contacts on this page; anyone who messages you first offering to recover your funds is a scam.
