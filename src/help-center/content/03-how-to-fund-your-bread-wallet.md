---
id: how-to-fund-your-bread-wallet
title: How to add funds into Bread?
mainCategory: getting-started
subcategory: setup-and-basic-use
platforms: [extension-desktop, mobile]
---

<!-- platform: extension-desktop -->

Use only the deposit networks, assets and routes shown by the wallet. Check the source network, destination network, address, amount and fees before confirming. Do not transfer from an unsupported chain or assume tokens with the same name are interchangeable.

The Partner Mainnet cap is $1,232.462 for the total wallet balance after a deposit. See [*What is the Partner Mainnet deposit limit?*](#moving-across-chains/what-is-the-partner-mainnet-deposit-limit)

See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network) If a transfer is missing, check **Activity** before starting another deposit.

<!-- platform: mobile -->

You add funds to Bread by bridging them from your MetaMask wallet. MetaMask needs the tokens you want to bring in, plus a little ETH on the same network for the network fee.

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
