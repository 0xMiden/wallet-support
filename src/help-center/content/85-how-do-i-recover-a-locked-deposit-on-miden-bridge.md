---
id: how-do-i-recover-a-locked-deposit-on-miden-bridge
title: How do I recover a locked deposit on Miden Bridge?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

This page is only for transfers on the Fast route, which Bread labels **Fast · Epoch**. If a Fast transfer into Bread gets stuck, your deposit can stay locked in The Compact, the deposit contract Epoch uses on the network you sent from. You can send it back to your external wallet on [Miden Bridge](https://bridge.miden.xyz/recovery), without opening Bread.

**Miden Bridge or Bread?**

Both check the same locked deposit. Withdrawing it on either one returns it to the external wallet that made it, on the network you sent from, not to Bread. Use one of them, not both at once.

- **Miden Bridge:** use it in a browser where your external wallet is installed, such as MetaMask in Chrome on a computer. It needs only the wallet that made the deposit, not Bread. It finds every locked deposit for that wallet, whichever app made it.
- **Bread:** use **Recover locked bridge funds** in **Advanced Settings** if you're already in Bread. Bread can also offer **Retry bridge**, which tries to send the deposit on to Bread instead. See [*How do I get my funds back from a locked or failed transfer in Bread?*](#common-issues-and-support/how-do-i-get-my-funds-back-from-a-stuck-bridge-in-transfer)

**Before you start**

- Use the external wallet and account that made the deposit.
- Keep a little of the network's own token for two network fees: ETH on Ethereum, Base, Arbitrum and Robinhood Chain, or POL on Polygon.
- Allow about 1 hour and 5 minutes. You can close the page while you wait.

**Recover your deposit**

1. Go to [Miden Bridge](https://bridge.miden.xyz/) and select **Recovery** in the top bar. Check that the network next to it is **Mainnet**.
2. On **Recover Epoch deposits**, select **Connect wallet** under **Deposit wallet**, and connect the wallet that made the deposit.

   ![Recover Epoch deposits with Connect wallet next to Deposit wallet](E77-bridge-recover-connect.png)

3. Wait while the page shows **Checking deposits…**. Each locked deposit then appears under **Locked deposits**, with its token, amount and network.

   ![Locked deposits listing 250 USDC on Polygon, Withdrawal not started](E78-bridge-recover-locked-deposits.png)

4. Select the deposit, then select **Start withdrawal** and approve the transaction in your wallet. The 65-minute wait starts when it confirms.

   ![A 250 USDC deposit on Polygon with the two steps and the Start withdrawal button](E79-bridge-recover-start-withdrawal.png)

5. Wait until the deposit shows **Ready to withdraw**. Until then it shows **Withdrawal started** and the time left.

   ![Withdrawal started, with the time left before Withdraw to wallet and a Cancel withdrawal button](E80-bridge-recover-countdown.png)

6. Select **Withdraw to wallet** and approve the second transaction. When it confirms, the page shows **Withdrawal complete**, and the whole locked balance of that token is back in your wallet.

   ![Ready to withdraw, with the Withdraw to wallet button](E81-bridge-recover-ready.png)

7. Select **Cancel withdrawal** and approve. Until you do, Fast deposits of that token from this wallet stay paused, even though the funds are already out. Bread calls this button **Disable withdrawal**.

   ![Withdrawal complete, 0 USDC left and Cancel the withdrawal to resume Epoch deposits](E82-bridge-recover-complete.png)

If more than one deposit is locked, repeat steps 4 to 7 for each.

**If something looks wrong**

- **No locked deposits found**: check that you connected the wallet that made the deposit, and that the network is **Mainnet**. If the transfer reached Bread, or the funds are already back in your wallet, nothing is locked.
- **Could not check deposits for** a token: select **Refresh**.
- **Withdrawal active for** a token, on the bridge form: Fast deposits of that token are paused. If you've already withdrawn the funds, select **Cancel withdrawal** to bridge again. If funds are still locked, finish the withdrawal first, since canceling keeps them locked.

If the funds don't come back, contact [support](/feedback) with the network, the token, the amount and the deposit's transaction hash.

Never share your recovery phrase, keys or wallet backup file. Bread support will never ask for them. Anyone who messages you first offering to recover your funds is a scam.
