---
id: what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed
title: What should I check if a bridge deposit or withdrawal is delayed?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

A bridge transfer can include a source-chain transaction, route processing and a destination-chain claim or arrival. Confirmation on the source chain alone does not mean the destination balance has updated.

1. Check the source and destination networks, token and recipient in the original transfer.
2. Open **Activity** and read the existing transfer's status and any claim or recovery action. Keep the wallet connected and let it sync.
3. Check whether an incoming Miden transfer is waiting to be accepted. See [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)
4. If the outcome is uncertain, check the source and destination balances before retrying. Do not submit a second deposit or withdrawal just because the screen was interrupted.
5. If it remains delayed, report the route, networks, wallet version and a non-secret transaction reference. Hide sensitive information in screenshots. See [*How do I send feedback or report a problem?*](#common-issues-and-support/how-do-i-send-feedback-or-report-a-problem)

A disabled route can stop new transfers without cancelling a transfer already in progress. Follow recovery actions shown for that transfer. Do not change Developer Settings to force a route.

If Bread shows **Bridge deposit failed**, see [*What should I do if a bridge deposit fails?*](#common-issues-and-support/what-should-i-do-if-a-bridge-deposit-fails)
