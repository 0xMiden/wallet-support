---
id: what-is-a-private-account
title: What is a private account?
mainCategory: privacy
subcategory: public-and-private-transactions
platforms: [extension-desktop, mobile]
---

On Miden, an account can be public or private, and the difference is about where your account's data is stored.

- With a private account, only a small cryptographic *commitment* (the fingerprint of your data) is stored on the public blockchain, while the full account data stays with you, off-chain. This gives you strong privacy; the network can confirm your account is valid without seeing its contents, like your balances.
- With a public account, the full account data is stored on-chain and is visible to everyone.

Because a private account's data lives off-chain, a recovery key alone does not restore its latest state. Guardian provides the supported account-state recovery path in the current wallet.

**If Guardian is enabled:**

Guardian backs up and syncs your private account data, so a lost or broken device doesn't have to mean losing your account state; you can recover it on a new device.

**If Guardian is not enabled:**

You are solely responsible for the account state stored on your device. If you lose the device and have no Guardian backup, the private account may be unrecoverable.
