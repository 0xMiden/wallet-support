---
id: how-to-fund-your-bread-wallet
title: How to add funds into Bread?
mainCategory: getting-started
subcategory: setup-and-basic-use
platforms: [extension-desktop, mobile]
---

<!-- platform: extension-desktop -->

You add funds to Bread from your computer on the bridge website, https://bridge.miden.xyz/. You need the MetaMask extension in Chrome, holding the tokens you want to bring in, plus enough to pay that network's fee: ETH on Ethereum, Base or Arbitrum, or USDC on Arc.

1. Go to https://bridge.miden.xyz/. On the **Bridge** tab, select **Deposit**.

   ![The bridge website's Bridge tab, with Deposit selected and a Connect wallet button next to From and To](E66-fund-bridge-deposit.png)

2. Next to **From**, select **Connect wallet**, then choose **MetaMask**.

   ![The bridge website's Connect Wallet list, with MetaMask](E66a-fund-connect-metamask.png)

3. In MetaMask, check the account and select **Connect**.

   ![MetaMask asking to connect bridge.miden.xyz, with the account and the Connect button](E66b-fund-metamask-connect.png)

4. Next to **To**, select **Connect wallet**, then select **Connect wallet** again in the menu that opens.

   ![The bridge website's wallet menu next to To, with Bread ready to connect and the Connect wallet option](E66c-fund-connect-bread.png)

5. Bread opens a window for https://bridge.miden.xyz. Check the account, tick **I understand the risk and wish to proceed.**, then select **Connect**. This gives the site ongoing access to your account data until you revoke it in **Authorized DApps**.

   ![Bread's window asking to connect bridge.miden.xyz, with the risk checkbox ticked and the Connect button](E66d-fund-bread-connect.png)

6. Choose the token, and next to **From**, the network your funds are on. Enter the amount, check **Your route**, then select **Review transfer**.

   ![The bridge website's Select network list next to From, with Arc, Ethereum, Base and Arbitrum, and Your route below](E67-fund-amount-network.png)

7. Check **You receive**, the fees and **Total USDC**, then select **Confirm in wallet**.

   ![The bridge website's Review transfer window, with You receive, the fees and the Confirm in wallet button](E67a-fund-review-transfer.png)

8. MetaMask opens a **Spending cap request**. Check it and select **Confirm**.

   ![MetaMask's Spending cap request for USDC from bridge.miden.xyz, with the Confirm button](E67b-fund-spending-cap.png)

9. MetaMask then opens a **Transaction request**. Check it and select **Confirm**.

   ![MetaMask's Transaction request for the USDC deposit, with the Confirm button](E67c-fund-transaction-request.png)

10. The bridge shows each stage of the transfer. When it reads **Delivered**, the USDCx is on Miden. If it's waiting in **Activity** in Bread, accept it. See [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)

    ![The bridge website's transfer card, marked Delivered, with each stage ticked](E68-fund-delivered.png)

USDC arrives in Bread as USDCx.

The Partner Mainnet cap is $1,232.462 for the total wallet balance after a deposit. See [*What is the Partner Mainnet deposit limit?*](#moving-across-chains/what-is-the-partner-mainnet-deposit-limit)

<!-- platform: mobile -->

You add funds to Bread by bridging them from your MetaMask wallet. MetaMask needs the tokens you want to bring in, plus enough to pay that network's fee: ETH on Ethereum, Base or Arbitrum One, or USDC on Arc.

1. Tap **Receive**, then **Cross-chain**.

   ![Bread's Receive page, with the Share and Cross-chain options](M05-fund-receive.png)

2. On **Connect your wallet**, tap **Connect wallet**, then choose **MetaMask**.

   ![Bread's Bridge in page, with Connect your wallet and the Connect wallet button](M05a-fund-connect-your-wallet.png)

   ![Bread's Bridge in page, with the Connect wallet list open and MetaMask in it](M05b-fund-wallet-list.png)

3. MetaMask opens and asks to connect. Check the account and tap **Connect**.

   ![MetaMask asking to connect, with the account and the Connect button](M05c-fund-metamask-connect.png)

4. Back in Bread, tap the token to choose what to bring in, such as **USDC**. Then tap **From** and choose the network your funds are on.

   ![Bread's Bridge in page, with USDC as the token, From Ethereum and To Miden](M05d-fund-enter-amount.png)

   ![Bread's Select network list, with Arc, Ethereum, Base and Arbitrum One](M05e-fund-select-network.png)

5. Enter the amount and tap **Continue**.
6. Under **Choose a route**, check the **Bridge fee** and **Estimated arrival**, then tap **Continue**.

   ![Bread's Choose a route page, with the bridge fee and estimated arrival](M06-fund-choose-route.png)

7. Under **You are depositing**, check the amount, **From**, **Route**, the fee and **You Receive**, then tap **Confirm Deposit**.

   ![Bread's deposit review, with the amount, route, fee and the Confirm Deposit button](M06a-fund-review.png)

8. MetaMask opens with a **Spending cap request**. Check it and tap **Confirm**. Keep Bread open while it shows **Confirming bridge deposit**.

   ![MetaMask's Spending cap request for USDC, with the Confirm button](M06b-fund-spending-cap.png)

9. When Bread shows **Waiting for the next wallet confirmation**, MetaMask opens a **Transaction request**. Check it and tap **Confirm**.

   ![MetaMask's Transaction request for the USDC deposit, with the Confirm button](M07-fund-transaction-request.png)

10. When **Bridge initiated!** appears, tap **Done**. **Status** shows **Delivering** until the funds arrive in Bread.

    ![Bread's Bridge initiated! page, with the status Delivering and the Done button](M07a-fund-bridge-initiated.png)

USDC arrives in Bread as USDCx.

If you connected a wallet before, Bread uses it again. To use a different one, tap the wallet address next to **Enter amount** and choose **Connect another wallet**.

The Partner Mainnet cap is $1,232.462 for the total wallet balance after a deposit. See [*What is the Partner Mainnet deposit limit?*](#moving-across-chains/what-is-the-partner-mainnet-deposit-limit)
