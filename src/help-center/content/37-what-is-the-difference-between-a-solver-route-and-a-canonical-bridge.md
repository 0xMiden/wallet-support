---
id: what-is-the-difference-between-a-solver-route-and-a-canonical-bridge
title: What is the difference between a solver route and a canonical bridge?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

Bread can use several routes across chains, and the real difference is how funds are handled along the way.

The fast route uses a solver, as is typical of intent-based protocols like Epoch or NEAR Intents. The solver briefly holds the funds and delivers the equivalent on the other side. This route is quick and can swap the token in transit. The trade-off is trusting the solver for those few seconds, and availability being limited to a fixed list of tokens.

For direct transfers, Bread uses canonical bridges: CCTP for USDCx, and Agglayer for other assets. These routes transfer the specified asset without using a solver: funds are claimed on arrival, with no swap in transit.

![Across chains, two routes](across-chains-two-routes.png)
