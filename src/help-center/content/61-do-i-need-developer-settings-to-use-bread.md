---
id: do-i-need-developer-settings-to-use-bread
title: Do I need Developer Settings to use Bread?
mainCategory: getting-started
subcategory: setup-and-basic-use
platforms: [extension-desktop, mobile]
---

No. Standard wallet use does not require custom RPC, prover, faucet or Guardian endpoints. Use the defaults supplied by your official wallet version.

Developer Settings are for developers testing integrations and separate networks. Changing them can break sync or point the wallet at a different network. A reachable endpoint does not prove that it is the right or trusted service.

After setup, **Network endpoints** may show an active override. Returning to defaults can require **Reset to defaults & re-onboard**, which erases local keys and history. Have a supported recovery path before using it. Do not reset a working wallet as a first troubleshooting step.

Developer-created accounts without Guardian do not have the standard Guardian recovery backup. Keep their data and backups separate from normal consumer accounts.

For SDK, API and custom-network integration instructions, use the [Miden developer documentation](https://docs.miden.xyz/). This Help Center covers consumer wallet use. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)
