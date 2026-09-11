---
id: what-should-i-do-if-i-lose-my-recovery-phrase
title: What should I do if I lose my recovery phrase?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

The most important thing to know: if your wallet is still unlocked and working on your device, you haven't truly lost access yet, so back up your recovery phrase again right away and export an encrypted wallet file too, while you still can.

**There's an important detail here:** your recovery phrase restores your public account, but a private account also needs its own backup, your encrypted wallet file (or Guardian). So *losing your recovery phrase* and *losing your private account backup* are two different problems, and it's worth protecting against both.

Whether you can recover depends on your wallet setup, whether Guardian is on, and which backups you still have.

**If Guardian is enabled:**

Guardian keeps a backup of your account data and is designed so you can recover on another device using your keys. So if you've lost your recovery phrase but still have your encrypted wallet file, you may be able to regain access, and your account data can come back through Guardian. But Guardian cannot restore your wallet on its own; it never holds your keys and can't act without the required signatures, so if you've lost *all* your keys and backups, Guardian alone won't bring your wallet back.

**If Guardian is not enabled:**

Your recovery phrase and encrypted wallet file are your only backups.

- If you still have your encrypted wallet file (and its password), you can use it to restore; this also brings back your private account.
- If you've lost your recovery phrase, your encrypted wallet file, *and* access to your device, there is generally no way to restore that wallet. Bread Wallet does not keep a copy of your keys or your private account data for you.

**Important note:**

No one from Bread Wallet or your Guardian operator can reset or recover your recovery phrase for you. And remember: your recovery phrase alone does not bring back a private account; keep your encrypted wallet file (and/or Guardian) for that. Anyone claiming they can *recover* your lost phrase is running a scam.
