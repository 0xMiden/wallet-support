---
id: why-does-metamask-show-a-500-error-when-i-bridge
title: Why does MetaMask show a 500 error when I bridge to Bread?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

If you see **Fetch error** with **Internal Server Error** a few seconds after you confirm a bridge deposit, MetaMask's **Smart Transactions** setting refused to send it. In Bread, the message says Smart Transactions could not send the transaction and asks you to turn it off in MetaMask. The error comes from MetaMask, not from Bread or the bridge. The deposit was not sent, so no funds moved. If you started the deposit in Bread, **Activity** shows it as **Failed**, but nothing left your wallet.

1. Check MetaMask's activity to confirm that the deposit was not sent.
2. Turn off **Smart Transactions** in MetaMask:
   - **MetaMask mobile app:** open **Settings**, then **Advanced**.
   - **MetaMask extension:** open **Settings**, then **Transactions**.
3. Try the deposit again.

If it still fails, report it to our [support](/feedback). See [*How do I send feedback or report a problem?*](#common-issues-and-support/how-do-i-send-feedback-or-report-a-problem)
