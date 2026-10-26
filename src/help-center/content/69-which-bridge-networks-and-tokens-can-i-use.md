---
id: which-bridge-networks-and-tokens-can-i-use
title: Which bridge networks and tokens can I use?
mainCategory: cross-chain
subcategory: moving-across-chains
platforms: [extension-desktop, mobile]
---

Use only the source network, destination network, token and transfer direction currently enabled in your installed Bread version. Support for a chain does not mean support for every token or every direction. A token ticker alone does not identify an asset.

**Partner Mainnet route list — checked 26 October 2026**

The current Partner Mainnet configuration lists these routes in both directions: deposits into Miden and withdrawals from Miden. This describes configured options; it does not guarantee that each route is available in your installed release or for your transfer. Continue only when the wallet offers the exact route and its review information.

- **Circle USDC route:** native USDC on Ethereum, Arbitrum, Base or Arc ↔ USDCX on Miden. This route uses Circle's [xReserve](https://www.circle.com/xreserve) infrastructure; routes from Ethereum, Arbitrum and Base also use Circle's [Cross-Chain Transfer Protocol (CCTP)](https://developers.circle.com/cctp/concepts/supported-chains-and-domains). USDCX on Miden and native USDC on another network are distinct assets.
- **Agglayer route:** Ethereum ↔ Miden for WBTC, wrapped SOL, Ethereum's NEAR token, PAXG, USDT, WBNB and PYUSD. These are the ERC-20 assets listed in the configuration. Native ETH is handled separately through the bridge registry; use it only when the wallet offers the ETH route. Wrapped SOL and WBNB do not establish support for the native Solana or BNB Chain networks. Learn about [Agglayer](https://docs.polygon.technology/interoperability/agglayer).

A separate bridge website may offer different assets or directions; its options do not establish support inside Bread. [Epoch](https://epochprotocol.xyz/)'s fast-bridge route is not currently enabled on Partner Mainnet. Do not infer that other networks or every token supported by a provider are supported in Bread.

**NEAR Intents**

[NEAR Intents](https://docs.near-intents.org/) is disabled in the current Partner Mainnet configuration. There is no announced availability date. Native NEAR-network transfers and NEAR Intents are separate from the Ethereum NEAR-token route listed above. Do not send native NEAR to an Ethereum or Miden address on the assumption that Intents will handle the transfer.

**Before depositing or withdrawing**

1. Check whether Bread is using Partner Mainnet or Testnet. Testnet route availability does not establish Mainnet support.
2. Open the bridge flow and choose the source and destination networks. Check deposits and withdrawals separately; an available route in one direction does not establish the reverse route.
3. Select the exact token offered for that route. Review its source asset and destination asset, the recipient, limits, fees and estimated amount before confirming. USDC and USDCX are not interchangeable token identifiers.
4. Continue only if the wallet enables the route and provides the required review information. If the route is missing, disabled or cannot provide a quote, stop and contact [support](/feedback). Never send directly to a bridge contract or substitute a token with a similar name.

A list of networks in an announcement, website or earlier wallet version does not guarantee that a route is currently available. The available choices can change by network, app version, token, amount, direction or service status.

Do not assume native NEAR-network transfers or NEAR intents are available because you see an Ethereum token named NEAR. Use only the actual networks and route shown by your supported wallet version.

Check the Partner Mainnet balance cap before depositing. If a submitted transfer is delayed, follow [*What should I check if a bridge deposit or withdrawal is delayed?*](#common-issues-and-support/what-should-i-check-if-a-bridge-deposit-or-withdrawal-is-delayed)
