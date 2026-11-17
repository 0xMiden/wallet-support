---
id: what-should-i-do-if-a-deposit-on-miden-bridge-fails
title: What should I do if a deposit on Miden Bridge fails?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop]
---

1. Check that nothing was sent. Look in MetaMask's activity and on the **Activity** page in Bread. If a deposit went through, don't send another. See [*What should I check if a bridge deposit or withdrawal is delayed?*](#common-issues-and-support/what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed)
2. Find the message:
   - **User rejected request** or **User denied transaction**: the request was cancelled in your wallet. Start again and approve each request.
   - **Fetch error** with **Internal Server Error**: see [*Why does MetaMask show a 500 error when I bridge to Bread?*](#common-issues-and-support/why-does-metamask-show-a-500-error-when-i-bridge)
   - **Your connected wallet changed** or **Refresh the quote before reviewing**: review the transfer again with a new quote.
   - **Source transaction failed** or **The contract rejected this transfer**: the transaction was refused on the source network. Check the amount and try again.
3. Reload the page, reconnect both wallets, and try again.

If tokens left your external wallet but never reached Bread, see [*How do I get my funds back from a stuck bridge-in transfer?*](#common-issues-and-support/how-do-i-get-my-funds-back-from-a-stuck-bridge-in-transfer)

If it still fails, contact [support](/feedback) with the message, the networks, the token and the time.
