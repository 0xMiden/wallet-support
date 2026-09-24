---
id: my-token-is-stuck-on-consuming-receiver-address
title: My token is stuck on Consuming (receiver address)
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

If a transaction appears stuck on the **Consuming** stage, the wallet is still working in the background and will often resolve it on its own within a few minutes. No action is needed in most cases.

If it stays stuck, the wallet marks it as failed: after 30 minutes on the browser extension, or after 2 minutes on mobile. Closing and reopening the app also ends it, marked as **Interrupted**. Either way, the transfer returns to the **Pending** tab in **Activity** with a **Retry** button, so you can try it again.

**If it keeps getting stuck:**

Retry your stuck transfers one at a time instead of all together.

1. Select the **Settings** tab, then select **General**.

   ![Bread Wallet's Settings page, with General highlighted](E28-consume-settings-general.png)

2. Turn off **Auto Consume MIDEN notes**.

   ![Bread Wallet's General page, with Auto Consume MIDEN notes highlighted](E29-consume-auto-consume.png)

3. Wait until nothing is on **Consuming**. Turning the setting off does not stop a transfer that is already being claimed.
4. Open **Activity** and select the **Pending** tab. Choose one transfer that failed to consume and select its **Retry** button. Wait for it to finish before you retry the next one.
5. When all your stuck transfers have gone through, turn **Auto Consume MIDEN notes** back on.

Each transfer you retry is a separate transaction with its own network fee, so retrying them one at a time costs more than claiming them together.
