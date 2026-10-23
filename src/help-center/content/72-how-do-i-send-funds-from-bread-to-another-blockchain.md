---
id: how-do-i-send-funds-from-bread-to-another-blockchain
title: How do I send funds from Bread to another blockchain?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

<!-- platform: extension-desktop -->

These steps send USDCx from Bread to your MetaMask wallet on the bridge website, https://bridge.miden.xyz/. It arrives in MetaMask as USDC.

1. Go to https://bridge.miden.xyz/, connect MetaMask and Bread as in steps 2 to 5 of [*How to fund your Bread Wallet?*](#setup-and-basic-use/how-to-fund-your-bread-wallet), and select **Withdraw**.
2. Next to **To**, choose where you want to receive the funds: **Arc**, **Ethereum**, **Base** or **Arbitrum**. Enter the amount and select **Review transfer**.

   ![The bridge website's Withdraw tab, with the Select network list next to To](E69-send-out-withdraw.png)

3. Check **Estimated received** and the fees, then select **Confirm in wallet**. Burning USDCx can't be reversed, and the final Circle fee can change after the burn. Keep some USDCx for the Miden network fee.

   ![The bridge website's Review transfer window for a withdrawal, with Estimated received and the Confirm in wallet button](E69a-send-out-review.png)

4. Bread opens **Confirm Transaction**. Check the asset change and **Network Fee**, then select **Confirm**.

   ![Bread's Confirm Transaction window for bridge.miden.xyz, with the asset change and the Confirm button](E69b-send-out-confirm.png)

5. The bridge shows **Withdrawal submitted**. It doesn't track the payout yet, so check MetaMask for the USDC.

   ![The bridge website's transfer card, marked Withdrawal submitted](E70-send-out-submitted.png)

<!-- platform: mobile -->

These steps send USDCX from Bread to your MetaMask wallet. It arrives in MetaMask as USDC.

1. Tap **Send**. Under **Send to**, paste your MetaMask address, or pick it from **Recent** or **Address Book**.

   ![Bread's Send to page, with Paste, Address Book, Scan QR code and the Recent list](M15-send-out-send-to.png)

2. Under **Network**, tap the network and choose where you want to receive the funds: **Ethereum**, **Base**, **Arbitrum One** or **Arc**. Then tap **Confirm**.

   ![Bread's Send to page, with a MetaMask address and Network set to Ethereum](M15a-send-out-network.png)

   ![Bread's Select network list, with Ethereum, Base, Arbitrum One and Arc](M15b-send-out-select-network.png)

3. Tap the token and choose **USDCX**.

   ![Bread's Select a token list, with ETH and USDCX](M15c-send-out-select-token.png)

4. Enter the amount and tap **Confirm**.

   ![Bread's Enter amount page, with 5 USDCX going to MetaMask on Ethereum](M15d-send-out-enter-amount.png)

5. Under **Choose a route**, check the **Circle fee** and **You Receive**, then tap **Confirm**. Circle's fee comes out of the amount you send, so you receive less than you send.

   ![Bread's Choose a route page, with the Circle xReserve route, the Circle fee and You Receive](M16-send-out-choose-route.png)

6. On **Review Details**, check the address, **Network**, **Route** and **You Receive**, then tap **Send Payment**. Once it is sent, the transfer can't be reclaimed, so check the address carefully.

   ![Bread's Review Details page, with the address, network, route, fees and the Send Payment button](M16a-send-out-review.png)

7. While Bread shows **Generating Transaction**, you can tap **Hide**. Bread notifies you when it's done.

   ![Bread's Generating Transaction page, with its progress steps and the Hide button](M16b-send-out-generating.png)

8. When **Burn submitted** appears, tap **View in Activities** to follow the transfer.

   ![Bread's Burn submitted page, with the Done and View in Activities buttons](M17-send-out-burn-submitted.png)

9. In **Activity**, tap the transfer to open it. The transfer is complete when its **Status** reads **Confirmed**. The USDC is then in your MetaMask wallet.

   ![Bread's Transaction page for the transfer, with the status Confirmed](M17a-send-out-confirmed.png)
