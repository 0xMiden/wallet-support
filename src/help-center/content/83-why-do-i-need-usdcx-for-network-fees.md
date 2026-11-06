---
id: why-do-i-need-usdcx-for-network-fees
title: Why do I need USDCX for network fees?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

Every transaction on Miden pays a small network fee. On Mainnet, the fee is always paid in USDCX, whatever token the transaction moves. Bread takes it from the USDCX in your own balance, so keep some USDCX in your wallet, even if you mostly hold other tokens.

**What pays the network fee**

- **Send**, within Miden and to another blockchain
- Accepting a pending transfer, by hand or through **Auto-accept USDCX transfers**
- **Swap**, and **Cancel swap**
- Depositing into **Earn**
- Activating or rotating your everyday key
- Switching Guardian operators
- Transactions you approve for [Miden Bridge](https://bridge.miden.xyz/), an app in **Explore** or an Arcade game

Withdrawing from **Earn** is the exception: its network fee is covered for you, and the route costs are reflected in the quoted amount you receive. See [*What does it cost to use Earn?*](#earn/what-does-it-cost-to-use-earn)

**If you hold no USDCX**

Without USDCX, you can't send, swap or deposit any token, including ETH, WBTC, Wrapped SOL, USDT, USDG, PYUSD, PAXG, Wrapped BNB, NEAR and POL. Accepting a transfer of one of these tokens needs USDCX too.

Accepting a USDCX transfer pays its fee out of the transfer itself, so a new wallet can accept its first USDCX. To get USDCX, see [*How to add funds into Bread?*](#setup-and-basic-use/how-to-fund-your-bread-wallet)

**Moving funds from another blockchain**

On the other network, your external wallet, such as MetaMask, pays that network's own fee:

- **Ethereum, Base and Arbitrum One:** the fee is paid in ETH. If you bridge ETH, don't send your whole ETH balance.
- **Arc:** the fee is paid in USDC. If you send USDC from Arc, don't send your whole USDC balance. The **Execute on Arc** step also needs a little USDC on Arc.

From **Base** or **Arbitrum One**, Circle adds its fee on top of the USDC you deposit. If the amount and the fee come to more than your wallet holds, Bread asks you to lower the amount.

**Claim Asset** on a **Slow · Agglayer** withdrawal is a transaction on Ethereum, so the wallet you connect needs ETH for the fee on Ethereum.

If a transaction fails, check **Activity** and your balances before you try again. If the problem continues, contact [support](/feedback).
