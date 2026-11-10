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

The screenshots show the Bread extension with MetaMask on a phone. Your wallet address, network, token and amount may differ.

1. In Bread, open **Profile** (the person icon), then **Advanced Settings** › **Recover locked bridge funds**.

   ![Advanced Settings with Recover locked bridge funds highlighted](E71-recover-advanced-settings.png)

2. Tap **Connect an EVM wallet** and connect the external wallet that made the deposit. In the extension, scan the WalletConnect QR code with your wallet app on your phone. In MetaMask, select the account that made the deposit and tap **Connect**. If a different wallet is connected, tap **Connect another wallet**.
3. Wait while Bread shows **Checking…**. It can take about 10 seconds. Your locked funds then appear, with the token, network and amount.

   ![Connected external wallet with a locked USDC balance on Polygon](E72-recover-locked-balance.png)

4. Tap the locked amount to open **Locked funds**. Check the wallet address, network and locked amount, then tap **Withdraw deposit**. Confirm the transaction in your external wallet. This requests the withdrawal and starts the waiting period.

   ![Locked funds with Withdrawal shown as Not requested and the Withdraw deposit button](E73-recover-request-withdrawal.png)

5. Wait for the timer to finish, about **1 hour and 5 minutes**. **Withdraw deposit** stays disabled during the countdown. You can close Bread in the meantime.

   ![Withdrawal countdown with Withdraw deposit disabled until the waiting period ends](E74-recover-withdrawal-countdown.png)

6. Come back to the same page. When it shows **The withdrawal is available**, tap **Withdraw deposit** again.

   ![Locked funds with The withdrawal is available and Withdraw deposit enabled](E75-recover-withdrawal-available.png)

7. In the final MetaMask pop-up, review **You receive**, the network and the network fee, then tap **Confirm**. Once the transaction confirms, the whole locked balance of that token is automatically returned to the same external wallet on the network you sent from.

   ![Final MetaMask transaction request showing USDC to receive on Polygon and the Confirm button](E76-recover-metamask-withdraw.png)

With a new wallet connection, this is the third MetaMask prompt: connect the wallet, confirm the withdrawal request, then confirm the final withdrawal. If your wallet is already connected, the connection prompt may be skipped. If you connected by scanning a QR code, look for the requests on your phone.

**Good to know**

- The funds go back to your external wallet on the network you sent from, not to Bread. To bring them into Bread, bridge again.
- **Nothing is locked for this wallet**: check that you connected the wallet that made the deposit.
- **Could not check**: wait a few minutes and open the page again.

**Bridge out: get back a failed transfer**

When you bridge out through Epoch, Bread puts your tokens in a reclaimable note on Miden. If the bridge fails while the funds are still in that note, you can reclaim them once the block shown in Bread is reached. The transfer may show **Bridge failed - funds reclaimable**.

On Mainnet, this is currently about **5 hours and 10 minutes** from when Bread creates the note. This is an estimate: the block shown under **Funds reclaimable after block** determines when you can reclaim the funds.

Usually you don't need to do anything. Once the network passes the block shown under **Funds reclaimable after block**, Bread takes the funds back on its own while the wallet is open, and **Activity** shows **Reclaimed**.

If a transfer out no longer shows as reclaimable but nothing arrived in your external wallet, contact [support](/feedback) with the transfer details.

Never share your recovery phrase, keys or wallet backup file. Bread support will never ask for them.
