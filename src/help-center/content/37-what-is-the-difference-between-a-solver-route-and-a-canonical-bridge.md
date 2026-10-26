---
id: what-is-the-difference-between-a-solver-route-and-a-canonical-bridge
title: What is the difference between a solver route and a canonical bridge?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

A solver route fulfills a request to deliver assets on another chain. A canonical bridge uses the bridge's deposit and claim process. Their supported assets, fees, arrival times and recovery steps can differ.

On Partner Mainnet, Circle routes move native USDC on Ethereum, Base, Arbitrum or Arc to and from USDCx on Miden. The Agglayer bridge connects Ethereum and Miden for its configured assets, with native ETH handled separately. Epoch and NEAR Intents fast transfers are disabled. Epoch support for Earn does not enable those transfer routes.

Bread shows only the routes configured for the selected network and asset. A bridge transfer does not necessarily swap the token in transit. Check the exact route, amount and fees before signing.

Use test assets only on Testnet routes. Mainnet routes require a released wallet that supports them; seeing a test route is not evidence that its Mainnet equivalent is available.

If a transfer is pending, follow its existing status and claim or recovery instructions rather than starting it again. See [*What should I check if a bridge deposit or withdrawal is delayed?*](#common-issues-and-support/what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed)
