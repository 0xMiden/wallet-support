---
id: why-does-my-usdc-bridge-to-bread-show-failed
title: Why does my USDC bridge to Bread show Failed?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

When you add USDC to Bread from **Ethereum**, **Base**, **Arbitrum One** or **Arc**, Circle's xReserve route turns it into USDCX on Miden. A **Failed** transfer doesn't always mean nothing was sent, so check before you try again.

1. Check your external wallet, such as MetaMask, for a USDC deposit at that time.
   - **No USDC left your wallet:** nothing was sent, and your USDC is still there. You can try again.
   - **USDC left your wallet:** don't send it again. See [*My USDC or USDCX bridge transfer hasn't arrived. Who can help?*](#common-issues-and-support/my-usdc-or-usdcx-bridge-transfer-has-not-arrived)
2. To see why it failed, open **Activity** in Bread and tap the failed transfer.
3. Keep Bread open until you've approved every request in your wallet. If the deposit screen closes early, the transfer fails.
4. If the same error appears again, stop retrying. Each attempt adds another failed transfer. On a computer, you can add USDC through [Miden Bridge](https://bridge.miden.xyz/) instead. See [*How to add funds into Bread?*](#setup-and-basic-use/how-to-fund-your-bread-wallet)
5. If you entered your whole USDC balance, lower the amount. On Arc, the network fee is paid in USDC, and from **Base** or **Arbitrum One**, Circle's fee is added on top of the amount. See [*Why do I need USDCX for network fees?*](#common-issues-and-support/why-do-i-need-usdcx-for-network-fees)

If it keeps failing, report the error text, your Bread version and the network. See [*How do I send feedback or report a problem?*](#common-issues-and-support/how-do-i-send-feedback-or-report-a-problem)
