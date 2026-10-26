---
id: what-should-i-check-before-a-swap
title: What should I check before a Swap?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

Swap trades one token for another inside Miden. On Partner Mainnet you can swap these pairs, in either direction:

- ETH and USDT
- WBTC and USDT
- Wrapped SOL and USDT
- USDCX and USDT
- ETH and USDCX
- WBTC and USDCX
- Wrapped SOL and USDCX

Wrapped SOL can appear as **SOL** in the token picker. NEAR, PAXG, WBNB and PYUSD can't be swapped yet. Swap prices come from [Forkchoice](https://forkchoice.xyz/).

Swap only works within Miden. To move tokens to or from another blockchain, see [*Which bridge networks and tokens can I use?*](#moving-across-chains/which-bridge-networks-and-tokens-can-i-use)

**Before you confirm**

On **Review Swap**, check **You Send**, **You Receive**, **Rate**, **Slippage** and **Max network fee**. Slippage is how far below the current rate your order may fill. The network fee is paid in USDCX, so keep some in your wallet.

**How a swap fills**

A swap is an order. If there isn't enough liquidity at the current price, Bread warns you that only part of it may fill right away. The rest waits until the time you set in **Cancel if not filled within**. Anything still unfilled then comes back to you, and until then that amount stays reserved for the order.

You can follow the order in **Activity** and stop it there with **Cancel swap**.

**If something goes wrong**

If Bread says **Price unavailable. Try again shortly.**, wait a moment and get a new quote. If it says **No swap tokens are configured for this network yet.**, Swap isn't available on the network you're using. Don't change network settings to get around it. If the problem continues, contact [support](/feedback).

If a swap is interrupted, let the wallet sync, then check **Activity** and both token balances before you try again. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)
