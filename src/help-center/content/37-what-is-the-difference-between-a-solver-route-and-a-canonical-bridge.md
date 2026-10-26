---
id: what-is-the-difference-between-a-solver-route-and-a-canonical-bridge
title: What is the difference between the Fast and Slow routes?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

When you move funds between Miden and another chain, the route screen shows how they'll travel:

- **Fast · Epoch**: a third party delivers the funds on the other chain for you. It takes about 30 seconds.
- **Slow · Agglayer**: the funds go through the bridge itself. It takes about 30 minutes and has no bridge fee.
- **USDCx (Circle xReserve)**: for USDCX. Circle turns your USDCX into USDC on the other chain, and USDC back into USDCX. How long it takes depends on that chain.

On Mainnet, fast transfers are disabled for now. Epoch also runs Earn, but that doesn't switch fast transfers on. USDC moves through Circle on Ethereum, Base, Arbitrum and Arc. ETH and a few Ethereum tokens (WBTC, wrapped SOL, NEAR, PAXG, USDT, WBNB and PYUSD) use the Slow route. For the full list, see [*Which bridge networks and tokens can I use?*](#moving-across-chains/which-bridge-networks-and-tokens-can-i-use)

Before you confirm, check the route, the amount and the fees on the review screen.

On Testnet, use test tokens only. A route that works on Testnet may not be on Mainnet yet.

If a transfer is still pending, don't start it again. Open it in **Activity** to check its status. A Fast transfer finishes on its own. A Slow transfer out of Miden needs one more step: when the funds are ready, select **Claim Asset** in its details to receive them on the other chain. See [*What should I check if a bridge deposit or withdrawal is delayed?*](#common-issues-and-support/what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed)
