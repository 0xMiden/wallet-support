---
id: which-bridge-networks-and-tokens-can-i-use
title: Which bridge networks and tokens can I use?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

Bread moves funds between Miden and four networks: Ethereum, Base, Arbitrum and Arc. What you can move depends on the network.

**USDC: Ethereum, Base, Arbitrum and Arc**

USDC sent from any of these four networks arrives in Bread as USDCX. Sending USDCX out works the same way in reverse: it arrives on the other network as USDC. Circle runs this route through [xReserve](https://www.circle.com/xreserve).

**Other tokens: Ethereum only**

These tokens move between Ethereum and Bread in both directions. Bread shows this route as **Slow · Agglayer**, and a transfer usually takes about 30 minutes.

- ETH
- WBTC
- USDT
- PYUSD
- PAXG
- Wrapped SOL (WSOL)
- Wrapped BNB (WBNB)
- NEAR

WSOL, WBNB and NEAR here are the versions of those tokens that live on Ethereum. You can't send to or from the Solana, BNB Chain or NEAR networks themselves. Learn more about [Agglayer](https://docs.polygon.technology/interoperability/agglayer).

**Coming soon**

- **Fast · Epoch:** a quicker route for USDC through [Epoch](https://epochprotocol.xyz/). It isn't available yet.
- **NEAR Intents:** transfers through [NEAR Intents](https://docs.near-intents.org/). They aren't available yet either.

**Before you move funds**

1. Pick the token and both networks in Bread. If a route doesn't appear, Bread doesn't support it yet.
2. On the review screen, check the receiving address, the fee and the amount you'll receive.
3. Each Bread account can hold up to $1,232.462 USD after a deposit. If a deposit would take you over, Bread tells you and asks for a smaller amount.

Only move funds through Bread or [bridge.miden.xyz](https://bridge.miden.xyz/), and never send tokens straight to a bridge contract address.

If a transfer is taking longer than expected, see [*What should I check if a bridge deposit or withdrawal is delayed?*](#common-issues-and-support/what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed)
