---
id: what-is-the-difference-between-a-solver-route-and-a-canonical-bridge
title: What is the difference between a solver route and a canonical bridge?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

Bread Beta runs on Miden testnet and Ethereum Sepolia. Use test funds only; never connect a wallet holding real assets for a bridge transfer.

Bread may offer several routes across those test networks, and the difference is how funds are handled along the way. The wallet shows a route only when it is configured for the selected asset and destination.

When available, the fast route uses a solver, as is typical of intent-based protocols like Epoch or NEAR Intents. The solver briefly holds the test funds and delivers the equivalent on the other side. This route can swap the token in transit, but it may be unavailable and supports only configured tokens.

For a configured direct transfer, a canonical bridge transfers the specified test asset without a solver: funds are claimed on arrival, with no swap in transit.

![Across chains, two routes](across-chains-two-routes.png)
