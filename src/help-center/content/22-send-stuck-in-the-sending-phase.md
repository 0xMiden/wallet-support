---
id: send-stuck-in-the-sending-phase
title: Send stuck in the Sending phase
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

While a send is in progress, it shows as **Sending** in **Activity**. On the browser extension it keeps going in the background even if you close the wallet, and you'll get a notification if it fails.

If a send cannot finish, it may show **Transaction failed**. After an app or browser interruption, it may show **Interrupted — check your activity after it syncs**. Timeouts depend on the platform and transaction stage; keep the wallet connected and let it sync before deciding what to do next.

**Before you try again:**

Occasionally a failed send has already reached the network just before it stopped. Let your wallet sync, then check your balance and **Activity**.

To try again, open the failed send in **Activity** and select its **Retry** button. The wallet checks whether the send already went through. If the outcome is uncertain, wait for sync and check your balance and the recipient before retrying; do not start a second send while the first may still be processing.

If the send shows as **Confirmed** but the recipient doesn't have it, see [*My transfer shows as confirmed, but the token never arrived.*](#common-issues-and-support/my-transfer-shows-as-completed-but-the-token-never-arrived)
