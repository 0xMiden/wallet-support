---
id: how-does-recovery-work-with-guardian
title: How does recovery work with Guardian?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

On a new device, the recovery phrase rebuilds the emergency key. Together, the emergency key and Guardian unlock the backed-up state and establish a fresh everyday key tied to the new device.

Use your Bread account on one device at a time. Recovering it with your recovery phrase on another device makes that device the only one with access; the previous device shows **Another device holds this account** and can use the account again only by taking it back with **Make this device the main one**, which removes access from the other device. Recovery does not set up synced access across both devices.

The full round trip across your device, Guardian, and Miden:

1. Your new device requests the state, signed by the emergency key.
2. Guardian returns the state snapshot.
3. Your device generates a new everyday key and proposes the key update, signed by the emergency key.
4. Guardian validates the key update, then acknowledges it.
5. Your device submits the proof for the new state to Miden. The key update is a transaction and pays a network fee. If the recovered account has nothing to pay it with, the wallet shows **Add USDCX to activate your everyday key** and finishes once USDCX arrives.
The device drives recovery, Guardian acknowledges the recovery update, and only a commitment lands on-chain. Guardian keeps the backup, and the emergency key keeps control.

For the in-app steps, see [*How do I restore my wallet with a recovery phrase?*](#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase)
