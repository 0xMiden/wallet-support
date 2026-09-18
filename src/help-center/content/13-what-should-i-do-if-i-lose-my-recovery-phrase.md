---
id: what-should-i-do-if-i-lose-my-recovery-phrase
title: What should I do if I lose my recovery phrase?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

If your wallet is still unlocked and working, keep that device secure and check whether Bread lets you display or back up your recovery phrase again. Do not reset the wallet or remove the app until you have confirmed a supported recovery path.

Your recovery phrase restores your keys. A private account also needs its latest off-chain account state, which Guardian can back up. The current Bread Wallet UI can export an encrypted wallet file but cannot import one, so that file is not currently a supported restoration path.

Whether you can recover depends on your wallet setup, whether Guardian is on, and which backups you still have.

**If Guardian is enabled:**

Guardian keeps a backup of your account data, but it does not keep your recovery phrase or control your keys. If you lose the recovery phrase and every device that still holds your keys, Guardian alone cannot restore the wallet.

**If Guardian is not enabled:**

Your recovery phrase restores your keys, but a more-private account also needs its locally stored account state.

- Bread Wallet does not currently offer encrypted-file import.
- If you lose your recovery phrase and access to every device holding the wallet, there is generally no supported way to restore it.

**Important note:**

No one from Bread Wallet or your Guardian operator can reset or recover your recovery phrase for you. Anyone claiming they can recover a lost phrase is running a scam.
