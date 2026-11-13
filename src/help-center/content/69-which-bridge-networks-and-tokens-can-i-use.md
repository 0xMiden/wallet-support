---
id: which-bridge-networks-and-tokens-can-i-use
title: Which bridge networks and tokens can I use?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

Bread's current Partner Mainnet routes connect Miden with Ethereum, Base, Arbitrum, Arc, Polygon and Robinhood Chain. The choices depend on your installed version and the route checks in the wallet.

**USDC: Ethereum, Base, Arbitrum and Arc**

USDC sent through these routes arrives in Bread as USDCX. Sending USDCX out works in reverse: it arrives on the other network as USDC. Circle runs this route through [xReserve](https://www.circle.com/xreserve).

**Other tokens: Ethereum only**

The current Mainnet configuration lists these tokens for deposits from Ethereum through Agglayer:

- WBTC
- USDT
- PYUSD
- PAXG
- Wrapped SOL (WSOL)
- Wrapped BNB (WBNB)
- NEAR
- USDG
- POL

Native ETH is handled separately; use its route only when Bread offers it. Bread checks the bridge registry before offering each token. Check deposits and withdrawals separately: a listed deposit token does not guarantee an available withdrawal route.

Bread labels the route **Slow · Agglayer** and shows an arrival estimate of about 30 minutes. This is an estimate, not a guaranteed arrival time; check the estimate shown when you review your transfer.

WSOL, WBNB and NEAR here are the versions of those tokens that live on Ethereum. You can't send to or from the Solana, BNB Chain or NEAR networks themselves. Learn more about [Agglayer](https://docs.polygon.technology/interoperability/agglayer).

**Fast route: Ethereum, Base, Arbitrum, Polygon and Robinhood Chain**

Bread labels this route **Fast · Epoch**. A third party delivers your funds on the other network for you, and Bread shows an arrival estimate of about 30 seconds. The current Mainnet configuration lists these tokens for deposits and withdrawals:

- Ethereum, Base and Arbitrum: USDC and ETH
- Polygon: USDC and POL
- Robinhood Chain: ETH and USDG

USDC sent through this route arrives in Bread as USDCX. If a Fast transfer gets stuck, see [*How do I get my funds back from a stuck bridge-in transfer?*](#common-issues-and-support/how-do-i-get-my-funds-back-from-a-stuck-bridge-in-transfer)

**Not available on Partner Mainnet**

- **NEAR Intents**: transfers through [NEAR Intents](https://docs.near-intents.org/) are disabled in the current Partner Mainnet configuration. There is no announced availability date.

**Before you move funds**

1. Check your network, then pick the exact token and both networks in Bread. If a route is missing, disabled or cannot be checked, don't send: it may be unsupported or temporarily unavailable. If the problem continues, contact [support](/feedback).
2. On the review screen, check the receiving address, the fees, the amount you'll receive and the arrival estimate.
3. On Partner Mainnet, the current deposit cap is $1,232.462 USD for your total wallet balance after a deposit. If a deposit would take you over, Bread asks for a smaller amount. This is not a per-transfer allowance or a daily deposit limit. See [*What is the Partner Mainnet deposit limit?*](#moving-across-chains/what-is-the-partner-mainnet-deposit-limit)
4. Keep enough for the network fee on the network you send from: ETH on Ethereum, Base, Arbitrum and Robinhood Chain, POL on Polygon, or USDC on Arc. See [*Why do I need USDCX for network fees?*](#common-issues-and-support/why-do-i-need-usdcx-for-network-fees)

Only move funds through Bread or [Miden Bridge](https://bridge.miden.xyz/), and never send tokens straight to a bridge contract address. Miden Bridge can offer different choices from your installed wallet; check its route separately.

If a transfer is taking longer than expected, see [*What should I check if a bridge deposit or withdrawal is delayed?*](#common-issues-and-support/what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed)
