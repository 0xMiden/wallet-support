---
id: what-is-the-difference-between-a-solver-route-and-a-canonical-bridge
title: What is the difference between a solver route and a canonical bridge?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

They're two ways to move tokens between networks. A solver route is usually faster. A canonical bridge is the network's own built-in path.

On a solver route, a third party called a solver pays you on the other network from its own funds. It then collects what you sent.

On a canonical bridge, your tokens are locked or burned on one network. The same amount is then released or created on the other.

Fees, arrival times and the tokens you can move differ between the two.

In Bread today, every transfer uses a bridge:

- USDC on Ethereum, Base, Arbitrum or Arc moves to and from USDCX on Miden through Circle's xReserve.
- ETH and other tokens move between Ethereum and Miden through **Slow · Agglayer**, in about 30 minutes.

The solver routes, **Fast · Epoch** and NEAR Intents, aren't available yet: fast transfers are disabled on Mainnet for now. Earn uses Epoch separately, which doesn't make **Fast · Epoch** available.

Bread only shows the routes available for the token and network you pick. Check the route, amount and fee before you confirm.

If a transfer is still pending, don't start it again. Follow its status in Bread. See [*What should I check if a bridge deposit or withdrawal is delayed?*](#common-issues-and-support/what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed)
