---
id: my-token-is-stuck-on-consuming-receiver-address
title: My transfer is stuck on Accepting stage
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

If a transaction appears stuck on the **Accepting…** stage, the wallet is still working in the background and will often resolve it on its own within a few minutes. No action is needed in most cases.

If it stays stuck, the wallet marks it as failed: after 30 minutes on the browser extension, or after 2 minutes on mobile. Closing and reopening the app also ends it, marked as **Interrupted**. Either way, the transfer returns to the **Pending** tab in **Activity** with a **Retry** button, so you can try it again.

**If it keeps getting stuck:**

Retry your stuck transfers one at a time instead of all together.

1. Select **Settings** (the gear icon), then select **General**.

   ![Bread Wallet's Settings page, with General under Preferences](E28-consume-settings-general.png)

2. Turn off **Auto-accept MIDEN transfers**.

   ![Bread Wallet's General page, with the Auto-accept MIDEN transfers switch](E29-consume-auto-consume.png)

3. Wait until nothing shows **Accepting…**. Turning the setting off does not stop a transfer that is already being claimed.
4. Open **Activity** and select the **Pending** tab. Choose one transfer that failed to consume and select its **Retry** button. Wait for it to finish before you retry the next one.
5. When all your stuck transfers have gone through, turn **Auto-accept MIDEN transfers** back on.

Each transfer you retry is a separate transaction with its own network fee, so retrying them one at a time costs more than claiming them together.

For how to retry a single transfer, see [*What should I do if accepting a transfer fails?*](#common-issues-and-support/what-should-i-do-if-accepting-a-transfer-fails)
