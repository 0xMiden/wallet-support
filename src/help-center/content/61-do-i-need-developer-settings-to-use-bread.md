---
id: do-i-need-developer-settings-to-use-bread
title: Do I need Developer Settings to use Bread?
mainCategory: getting-started
subcategory: setup-and-basic-use
platforms: [extension-desktop, mobile]
---

No. Bread works with its default settings, and most people never need Developer Settings.

Developer Settings are for developers who test integrations, use test faucets or run their own networks. The wallet itself warns that wrong values will break your wallet: a changed endpoint can stop syncing or point Bread at a different network.

If you changed an endpoint, **Network endpoints** appears in your settings. Going back to the defaults can need **Reset to defaults & re-onboard**, which erases this wallet from the device, including your keys and history. Make sure you have your recovery phrase first. Don't reset a working wallet just to fix a problem.

Developers can also create accounts without a Guardian. Those accounts don't get a Guardian backup, so keep them separate from your everyday accounts.

For SDK, API and custom-network guides, see the [Miden developer documentation](https://docs.miden.xyz/). See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)
