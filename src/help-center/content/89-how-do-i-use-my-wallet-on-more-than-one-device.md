---
id: how-do-i-use-my-wallet-on-more-than-one-device
title: How do I use my wallet on more than one device?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

On a Guardian-backed account, you can use Bread on more than one device. Each device has its own everyday key. You can see and remove devices in **Profile** › **Security** › **Devices**.

**Add a device**

1. On the new device, choose **Recover your account** and enter your recovery phrase. See [*How do I restore my wallet with a recovery phrase?*](#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase)
2. When Bread asks **How should this device join your wallet?**, choose **Add this device**. Your other devices keep working.
3. If Bread asks **Keep the recovery phrase on this device?**, choose **Keep it on this device** or **Remove recovery phrase**. Daily transactions work without it. Guardian changes and everyday key replacement will ask you to enter it, so write it down before you remove it.

If your old device was lost or stolen, choose **Make this device the main one** in step 2 instead. Every other device is removed from the wallet. Each choice is a transaction, and a small network fee is paid from the account.

**Remove a device**

1. Open **Profile** › **Security** › **Devices**. The list shows each device that can sign for your account. **This device** marks the one you're using.
2. Choose the device, then **Revoke device**.
3. Confirm with your password or biometrics. If your recovery phrase isn't stored on this device, enter it to approve. It will not be saved on this device.

A revoked device can no longer sign transactions. It can regain access with the recovery phrase.

**If a device shows a notice**

- **This device was revoked**: it was removed from the devices that can sign. Use the recovery phrase to make it the main device again, or remove the wallet from this device.
- **Another device holds this account**: another device was made the main one. Choose **Make this device the main one** to take the account back, or **Remove wallet from this device**.
