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

Because a private account's data lives only with you, your recovery phrase alone won't bring it back; you recover a private account from your encrypted wallet file or Guardian, not from the recovery phrase alone.

**If Guardian is enabled:**

Guardian backs up and syncs your private account data, so a lost or broken device doesn't have to mean losing your account state; you can recover it on a new device.

**If Guardian is not enabled:**

You are solely responsible for backing up your private account data; your encrypted wallet file is that backup. If you lose it and have no Guardian backup, you can lose access to that account's funds. So keep secure backups of both your recovery phrase and encrypted wallet file.
