---
id: how-do-i-get-my-funds-back-from-a-stuck-bridge-in-transfer
title: How do I get my funds back from a stuck bridge-in transfer?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

Most Fast transfers through Epoch finish within a few minutes. If one gets stuck, your funds are not lost, and you can get them back yourself. What to do depends on the direction:

- **Bridge in**, from an external wallet such as MetaMask into Bread: the deposit can stay locked on the network you sent from.
- **Bridge out**, from Bread to another blockchain: the funds come back to Bread.

This page covers the Fast route through Epoch. For USDC through Circle, see [*Why does my USDC bridge to Bread show Failed?*](#common-issues-and-support/why-does-my-usdc-bridge-to-bread-show-failed)

**Bridge in: why the deposit is locked**

When you bridge in with Epoch, your tokens first go into a deposit contract called The Compact on the network you send from, such as Polygon. Epoch then delivers the same amount to Bread. If Epoch doesn't start the bridge, your tokens stay in The Compact, and they don't show in Bread or in your external wallet.

Only the external wallet that made the deposit can take the funds out. Bread, Epoch and Miden can't move them.

In **Activity**, the transfer shows **Deposit locked**. A transfer made with an older version of Bread may show **Failed** instead.

**Get your deposit back**

1. In Bread, go to **Settings** › **Advanced** › **Recover locked bridge funds**.
2. Connect the external wallet that made the deposit. If a different wallet is connected, tap **Connect another wallet**.
3. Wait while Bread shows **Checking…**. It can take about 10 seconds. Your locked funds then appear, with the token, network and amount.
4. Tap a locked amount to open it.
5. Tap **Withdraw deposit** and approve the request in your external wallet. This starts the withdrawal, and a timer shows when the funds become available, about 1 hour and 5 minutes later.
6. Wait for the timer to finish. You can close Bread in the meantime.
7. Come back to the same page. When it shows **The withdrawal is available**, tap **Withdraw deposit** again and approve. The whole locked balance of that token goes back to your external wallet.

Every step asks for approval in your external wallet. If you connected it by scanning a QR code, look for the request on your phone.

**Good to know**

- The funds go back to your external wallet on the network you sent from, not to Bread. To bring them into Bread, bridge again.
- **Nothing is locked for this wallet**: check that you connected the wallet that made the deposit.
- **Could not check**: wait a few minutes and open the page again.

**Bridge out: get back a failed transfer**

When you bridge out with Epoch, your tokens go into a note on Miden. Epoch accepts that note only after it has paid you on the other network. If Epoch doesn't pay, the note stays yours, and the transfer shows **Bridge failed - funds reclaimable**.

Usually you don't need to do anything. Once the network passes the block shown under **Funds reclaimable after block**, Bread takes the funds back on its own while the wallet is open, and **Activity** shows **Reclaimed**.

If a transfer out no longer shows as reclaimable but nothing arrived in your external wallet, contact [support](/feedback) with the transfer details.

Never share your recovery phrase, keys or wallet backup file. Bread support will never ask for them.
