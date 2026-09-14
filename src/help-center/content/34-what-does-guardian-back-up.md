---
id: what-does-guardian-back-up
title: What does Guardian back up?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

Guardian keeps a backup of the account's state, meaning its balances and history.

It works like the backup process on a phone, except it automatically refreshes with every transaction so the saved copy stays up to date. On Miden, because accounts are private by default, recovery is harder than it sounds. There is no public history to rebuild from: recovering the account requires both its latest state and the keys needed to regain control.

Guardian keeps the backup, and the emergency key keeps control. Guardian never holds funds. See [*Can Guardian move my funds or lock me out?*](#guardian-protection/can-guardian-move-my-funds-or-lock-me-out)
