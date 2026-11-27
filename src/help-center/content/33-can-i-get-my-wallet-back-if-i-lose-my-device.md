---
id: can-i-get-my-wallet-back-if-i-lose-my-device
title: Can I get my wallet back if I lose my device?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

For a standard Guardian-backed Bread account, recovery on a new device uses your recovery phrase and Guardian's account-state backup. See [*How do I restore my wallet with a recovery phrase?*](#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase)

If your old device was lost or stolen, choose **Make this device the main one** when you recover, so that device can no longer sign for your account. When you recover with your recovery phrase on another device, Bread asks how this device should join your wallet. **Add this device** keeps your other devices working, so you can use the account on both. **Make this device the main one** removes every other device. Either way, this device gets its own everyday key, and a small network fee is paid from the account. A removed device shows **Another device holds this account**. If it still holds the recovery phrase, it can take the account back with **Make this device the main one**, which removes the other devices in turn. See [*How do I use my wallet on more than one device?*](#security-and-recovery/how-do-i-use-my-wallet-on-more-than-one-device)

You still need the recovery phrase. Guardian cannot replace it or recover funds for you if the phrase and every device holding your keys are lost.

If an older installation or a developer-created account does not use Guardian, do not assume this recovery path applies. Preserve any working device and seek [support](/feedback) before resetting it.
