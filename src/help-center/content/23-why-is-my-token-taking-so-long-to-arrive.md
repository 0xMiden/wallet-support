---
id: why-is-my-token-taking-so-long-to-arrive
title: Why is my token taking so long to arrive?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

Incoming tokens usually show up within a few moments. If they're taking longer, check these first:

1. **Open and unlock your wallet.** Bread checks for incoming tokens every few seconds while it's open. On mobile it only checks while the app is open; on the browser extension it also checks in the background about once a minute.
2. **Check the Pending tab.** Incoming tokens wait in **Activity**, on the **Pending** tab, until you select **Accept Transfer**. Only MIDEN token is accepted automatically, when **Auto Consume** in the settings is on. See [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)
3. **Look for a connection message.** If the wallet shows **You appear to be offline** or **Cannot reach the Miden node**, it can't check for new tokens. Check your internet connection, then select **Try again** or **Retry sync**. If the Miden network is down or busy, your tokens appear once it's reachable again.

If there is still nothing after an hour, report it to our [**SUPPORT**](/feedback).
