---
id: what-is-the-difference-between-a-solver-route-and-a-canonical-bridge
title: What is the difference between the Fast and Slow routes?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

When you move funds between Miden and another chain, the route screen shows how they'll travel:

- **Fast · Epoch**: a third party delivers the funds on the other chain for you. The wallet estimates about 30 seconds.
- **Slow · Agglayer**: the funds go through the bridge itself. The wallet estimates about 30 minutes and shows no bridge fee. Check any network fee separately.
- **USDCx (Circle xReserve)**: for USDCX. Circle turns your USDCX into USDC on the other chain, and USDC back into USDCX. How long it takes depends on that chain.

The Fast route works on Ethereum, Base, Arbitrum, Polygon and Robinhood Chain. USDC also moves through Circle on Ethereum, Base, Arbitrum and Arc. On Ethereum, the Slow route carries native ETH and these tokens: WBTC, USDT, PYUSD, PAXG, wrapped SOL, wrapped BNB, NEAR, USDG and POL. ETH can also use the Fast route. For the full list, see [*Which bridge networks and tokens can I use?*](#moving-across-chains/which-bridge-networks-and-tokens-can-i-use)

Before you confirm, check the route, the amount and the fees on the review screen.

On Testnet, use test tokens only. A route that works on Testnet may not be on Mainnet yet.

If a transfer is still pending, don't start it again. Open it in **Activity** to check its status. A Fast transfer usually finishes on its own. If a transfer into Bread gets stuck, **Activity** shows **Deposit locked**: your deposit is safe, and you can select **Retry bridge** or **Withdraw deposit**. If a transfer out of Bread fails, your funds stay on Miden. **Activity** shows **Awaiting Return** until the block after which you can claim them, then **Ready to Claim**. See [*How do I get my funds back from a locked or failed transfer in Bread?*](#common-issues-and-support/how-do-i-get-my-funds-back-from-a-stuck-bridge-in-transfer) A Slow transfer out of Miden may need a manual claim; some withdrawals are claimed automatically. Select **Claim Asset** only if the transfer details in **Activity** still show funds ready to claim, and connect the wallet for the matching destination address. See [*What should I check if a bridge deposit or withdrawal is delayed?*](#common-issues-and-support/what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed)
