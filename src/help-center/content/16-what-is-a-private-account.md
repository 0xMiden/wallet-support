---
id: what-is-a-private-account
title: What is a private account?
mainCategory: privacy
subcategory: public-and-private-transactions
platforms: [extension-desktop, mobile]
---

A private Miden account keeps its full state off-chain. The public blockchain records a cryptographic commitment, a fingerprint of the state, rather than publishing the balance and account data. Public Miden accounts record their full state on-chain.

Standard Bread setup creates a private Guardian-backed account. Guardian can see the account state it backs up; other users cannot inspect that state merely by looking up the account.

A recovery phrase restores keys, but private account recovery also needs account state. Guardian supplies the supported backup for standard Bread accounts. Developer-created accounts without Guardian need a separate recovery plan and are outside this consumer guide.

Public notes and external-chain transactions can still reveal transfer details. See [*What can other people see about my account on the blockchain?*](#public-and-private-transactions/what-can-other-people-see-about-my-account-on-the-blockchain)
