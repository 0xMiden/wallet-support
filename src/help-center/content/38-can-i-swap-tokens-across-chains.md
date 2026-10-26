---
id: can-i-swap-tokens-across-chains
title: Can I swap tokens across chains?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

Partner Mainnet does not currently enable Epoch or NEAR Intents fast crosschain swaps. The Circle and Agglayer bridge routes move their supported assets; do not treat them as a general token-swap service. A Swap within Miden is a different operation.

Use a crosschain swap only if your installed version and selected network explicitly offer that source token, destination token and route.

Check the quote, expected received amount, fees and recipient before signing. If the quote expires or changes, review the updated quote. Do not assume a route is available because another token or network works.

Use test assets on Testnet. Use Mainnet routes only when your installed released version supports them. See [*What is the difference between the Fast and Slow routes?*](#moving-across-chains/what-is-the-difference-between-a-solver-route-and-a-canonical-bridge)
