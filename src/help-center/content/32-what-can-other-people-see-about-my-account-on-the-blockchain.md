---
id: what-can-other-people-see-about-my-account-on-the-blockchain
title: What can other people see about my account on the blockchain?
mainCategory: privacy
subcategory: public-and-private-transactions
platforms: [extension-desktop, mobile]
---

Very little. With a private account, your balances and history stay on your device. The public chain only shows that your account exists and that its state changed, not what changed.

On most blockchains, anyone can read an account's balance and full history. Miden works differently. If someone looks up your account on a block explorer, they won't see your balance or past transactions.

![Private from other users](private-from-other-users.png)

The people you transact with see their own transaction, but not the rest of your balance or history. A few things are visible:

- Your sender address is public on every transfer.
- If you send a **Public** transfer, anyone can see its token, amount and recipient. Transfers are **Private** by default.
- When you bridge, the transaction on the other chain is public there.
- Guardian can see the state it backs up.

Related: [*What is a private account?*](#public-and-private-transactions/what-is-a-private-account), [*What is a private note?*](#public-and-private-transactions/what-is-a-private-note)
