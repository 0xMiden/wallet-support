---
id: send-stuck-in-the-sending-phase
title: Send stuck in the Sending phase
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

While a send is in progress, it shows as **Sending** in **Activity**. On the browser extension it keeps going in the background even if you close the wallet, and you'll get a notification if it fails.

If a send can't finish, the wallet marks it as **Transaction failed**:

- after 30 minutes on the browser extension, or after 2 minutes on mobile (time with the app in the background doesn't count)
- straight away when you reopen the app, if it was closed in the middle of the send. It then shows **Interrupted — check your activity after it syncs**.

**Before you try again:**

Occasionally a failed send has already reached the network just before it stopped. Let your wallet sync, then check your balance and **Activity**.

To try again, open the failed send in **Activity** and select its **Retry** button. The wallet first checks whether the send already went through, so it won't send it twice. If it can't tell, it asks you to check your balance before retrying.
