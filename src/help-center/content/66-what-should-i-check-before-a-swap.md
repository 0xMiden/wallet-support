---
id: what-should-i-check-before-a-swap
title: What should I check before a Swap?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

Swap exchanges one supported token for another. Swapping within Miden and swapping as part of a cross-chain route are different flows; use only the options shown by your installed wallet.

**Which tokens and pairs are listed?**

As checked on 23 October 2026, the Swap quote service lists these seven pairs:

- ETH ↔ USDT.
- WBTC ↔ USDT.
- Wrapped SOL ↔ USDT.
- USDCX ↔ USDT.
- ETH ↔ USDCX.
- WBTC ↔ USDCX.
- Wrapped SOL ↔ USDCX.

Each listed pair allows either direction when the wallet offers a valid quote. Wrapped SOL can appear as **SOL** in the token picker. This is a dated quote-service listing, not a guarantee that every pair is available on your selected network or in your installed release. Bread also checks the listed assets on that network before offering them. Token registration alone does not make an asset swappable; NEAR, PAXG, WBNB and PYUSD are not in this dated service listing.

Miden Swap uses solver quotes supplied through [Forkchoice](https://forkchoice.xyz/). The provider and route for a cross-chain exchange can differ from a Swap within Miden. Check the current choices in the wallet rather than treating this list as a list of supported cross-chain destinations. See [*Which bridge networks and tokens can I use?*](#moving-across-chains/which-bridge-networks-and-tokens-can-i-use) for bridge routes.

Check the network, tokens, amount you will receive and maximum network fee on the review screen. Keep enough of the displayed fee asset. If a quote expires, changes or fails to load, obtain and review a new quote before signing.

If Bread says **No swap tokens are configured for this network yet.**, the selected network has no usable Swap choices in that version. Do not change endpoints to force another network's token list. If it says **Price unavailable. Try again shortly.**, wait and request a fresh quote; do not sign using a remembered price. Contact [support](/feedback) if the problem continues.

A quote is an estimate for that route at that time. Do not assume it guarantees a future price or that a test token has real value. A disabled Swap control can mean the selected network or token pair is unavailable.

If a Swap is interrupted, let the wallet sync and check **Activity** and both token balances before trying again. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)
