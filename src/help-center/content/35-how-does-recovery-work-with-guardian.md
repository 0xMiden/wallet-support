---
id: how-does-recovery-work-with-guardian
title: How does recovery work with Guardian?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

On a new device, the recovery phrase rebuilds the emergency key. Together, the emergency key and Guardian unlock the backed-up state and give the new device its own everyday key. Your other devices keep their everyday keys unless you choose **Make this device the main one**.

If your old device was lost or stolen, choose **Make this device the main one** when you recover, so that device can no longer sign for your account. When you recover with your recovery phrase on another device, Bread asks how this device should join your wallet. **Add this device** keeps your other devices working, so you can use the account on both. **Make this device the main one** removes every other device. Either way, this device gets its own everyday key, and a small network fee is paid from the account. A removed device shows **Another device holds this account**. If it still holds the recovery phrase, it can take the account back with **Make this device the main one**, which removes the other devices in turn.

The full round trip across your device, Guardian, and Miden:

1. Your new device requests the state, signed by the emergency key.
2. Guardian returns the state snapshot.
3. Your device generates a new everyday key and proposes the key update, signed by the emergency key.
4. Guardian validates the key update, then acknowledges it.
5. Your device submits the proof for the new state to Miden. The key update is a transaction and pays a network fee. If the recovered account has nothing to pay it with, the wallet shows **Add USDCX to activate your everyday key** and finishes once USDCX arrives.
The device drives recovery, Guardian acknowledges the recovery update, and only a commitment lands on-chain. Guardian keeps the backup, and the emergency key keeps control.

For the in-app steps, see [*How do I restore my wallet with a recovery phrase?*](#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase)
