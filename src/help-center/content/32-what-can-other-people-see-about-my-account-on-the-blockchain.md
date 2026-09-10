---
id: what-can-other-people-see-about-my-account-on-the-blockchain
title: What can other people see about my account on the blockchain?
mainCategory: privacy
subcategory: public-and-private-transactions
platforms: [extension-desktop, mobile]
---

On most chains, an account's balance and full history live on a public ledger that anyone can read. Miden works differently: a private account keeps its state (its balances and its history) on your device, and the only things that ever reach the publicly readable chain are the account's address and a commitment to that state. A commitment is a hash of the state, a short cryptographic fingerprint that gives nothing away about its contents.

From outside, the chain shows only that an account exists and that its state changed. What was done and how much moved stay private. When you look up an account on a block explorer, you'll see that it exists and that its state has changed, but you won't see what changed or how.

![Private from other users](private-from-other-users.png)

This is what private from other users means: the people you transact with can see their own transaction, but they cannot inspect the rest of your balance or history. Neither can anyone else watching the chain.

Related: [*What is a private account?*](#public-and-private-transactions/what-is-a-private-account), [*What is a private note?*](#public-and-private-transactions/what-is-a-private-note)
