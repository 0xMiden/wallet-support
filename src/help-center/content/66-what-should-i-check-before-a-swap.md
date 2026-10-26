---
id: what-should-i-check-before-a-swap
title: What should I check before a Swap?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

Swap trades one token for another inside Miden. Prices come from [Forkchoice](https://forkchoice.xyz/). Swapping to another blockchain isn't available yet.

**Which pairs can I swap?**

As of 26 October 2026, you can swap these seven pairs, in either direction:

- ETH ↔ USDT.
- WBTC ↔ USDT.
- Wrapped SOL ↔ USDT.
- USDCX ↔ USDT.
- ETH ↔ USDCX.
- WBTC ↔ USDCX.
- Wrapped SOL ↔ USDCX.

Wrapped SOL can appear as **SOL** in the token list. Other tokens you hold, such as NEAR, PAXG, WBNB and PYUSD, can't be swapped yet. For moving tokens between networks, see [*Which bridge networks and tokens can I use?*](#moving-across-chains/which-bridge-networks-and-tokens-can-i-use)

**Before you confirm**

On the review screen, check **You Send**, **You Receive**, **Rate**, **Slippage** and **Max network fee**. Network fees are paid in USDCX, so keep a little in your account.

A swap is an order. It may fill all at once, in parts, or not at all if the price moves. **Cancel if not filled within** sets how long it waits. Whatever hasn't filled by then comes back to you, and you can stop it sooner with **Cancel swap** in **Activity**.

**If something goes wrong**

- **Price unavailable. Try again shortly.** Wait a moment and get a fresh price. Don't rely on a price you saw earlier.
- **No swap tokens are configured for this network yet.** Swap isn't available on the network you're using. Don't change endpoints to get around it.
- If a swap was interrupted, let Bread sync, then check **Activity** and both token balances before trying again. Contact [support](/feedback) if the problem continues.

See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)
