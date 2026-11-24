---
id: my-transfer-shows-as-completed-but-the-token-never-arrived
title: My transfer shows as confirmed, but the token never arrived.
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

When a send shows as **Confirmed** in **Activity**, the transaction is on the blockchain and the tokens have left your wallet. It does not mean the recipient has them yet: tokens arrive as a note that the recipient has to accept.

**1. Ask the recipient to check their Pending tab**

Incoming tokens wait in **Activity**, on the **Pending** tab, until the recipient selects **Accept Transfer**. Eligible USDCX transfers can be accepted automatically when **Auto-accept USDCX transfers** is on. Other transfers may need manual acceptance. If the recipient selected **Decline**, the transfer is only hidden on their device, and they can restore it in **Activity**. For the steps, see [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)

**2. If the recipient never accepts it**

A recallable send has an expiration shown as **Expiration Date** before you send. If the recipient has not accepted it by then, it becomes eligible for you to reclaim. Check your **Pending** tab in **Activity** and select **Accept Transfer** when the reclaimable transfer appears. Expiration alone does not add it to your spendable balance.

**3. If the send's details show a delivery warning**

For a private send, open it in **Activity**. If its details show **Recipient not notified** or **Delivery unconfirmed**, the transaction is on chain, but the private transfer could not be handed to the delivery service, or the wallet could not confirm that it reached it. Until it does, the recipient cannot see or spend it.

Keep the wallet open and connected. Delivery is retried automatically for up to three days, and the warning clears once it goes through. Do not send again. If the recipient still has nothing after a day, or the details say automatic delivery has stopped, save the transaction ID shown there and contact [support](/feedback). The transfer can still be recovered from it.

**Still missing after an hour?**

If the recipient can't find it, they can check [*Why is my token taking so long to arrive?*](#common-issues-and-support/why-is-my-token-taking-so-long-to-arrive) If it's still missing, report it to our [**SUPPORT**](/feedback).

Never include your recovery phrase or password.
