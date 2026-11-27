---
id: how-do-i-restore-my-wallet-with-a-recovery-phrase
title: How do I restore my wallet with a recovery phrase?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

<!-- platform: extension-desktop -->

Have your recovery phrase (sometimes called a seed phrase) ready and use the official extension on the same network as the account you want to recover.

If your old device was lost or stolen, choose **Make this device the main one** when you recover, so that device can no longer sign for your account. When you recover with your recovery phrase on another device, Bread asks how this device should join your wallet. **Add this device** keeps your other devices working, so you can use the account on both. **Make this device the main one** removes every other device. Either way, this device gets its own everyday key, and a small network fee is paid from the account. See [*How do I use my wallet on more than one device?*](#security-and-recovery/how-do-i-use-my-wallet-on-more-than-one-device)

1. Open Bread and select **Recover your account** when the welcome screen offers it.
2. Select recovery with your recovery phrase if Bread asks for an import method.
3. Enter the words in their original order, in the official wallet only.
4. Create a new wallet password and follow the Guardian recovery prompts. Bread can look for the operator; if it cannot find your account, check the network and the Guardian you used. If Bread says nothing was restored, read why. If Guardian's data doesn't match your recovery phrase, contact [support](/feedback) and don't try other phrases. If Guardian's copy doesn't match the network yet, try again in a few minutes. If Bread can't reach the Miden network, your recovery phrase is fine: check your connection and try again.
5. If you already use the wallet on another device, Bread asks **How should this device join your wallet?** Choose **Add this device** or **Make this device the main one**.
6. If Bread asks **Keep the recovery phrase on this device?**, choose **Keep it on this device** or **Remove recovery phrase**. Daily transactions work without it, but Guardian changes and everyday key replacement will ask you to enter it. Write it down before you remove it.
7. Open the wallet when recovery finishes. Wait for any everyday-key rotation and sync before making a transaction.

Some screens differ between releases. Recovery needs your phrase and a supported account-state backup; support cannot reset your phrase. Do not erase a working installation just to troubleshoot. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)

Never enter your recovery phrase on a website, in feedback, or in a chat. Keep screen sharing and recording off while entering it.

<!-- platform: mobile -->

Have your recovery phrase (sometimes called a seed phrase) ready and use the official app on the same network as the account you want to recover.

If your old device was lost or stolen, choose **Make this device the main one** when you recover, so that device can no longer sign for your account. When you recover with your recovery phrase on another device, Bread asks how this device should join your wallet. **Add this device** keeps your other devices working, so you can use the account on both. **Make this device the main one** removes every other device. Either way, this device gets its own everyday key, and a small network fee is paid from the account. See [*How do I use my wallet on more than one device?*](#security-and-recovery/how-do-i-use-my-wallet-on-more-than-one-device)

1. Open Bread and tap **Recover your account** when the welcome screen offers it.
2. Select recovery with your recovery phrase if Bread asks for an import method.
3. Enter the words in their original order, in the official app only.
4. Follow the device-protection and Guardian recovery prompts. Bread can look for the operator; if it cannot find your account, check the network and the Guardian you used.
5. If you already use the wallet on another device, Bread asks **How should this device join your wallet?** Choose **Add this device** or **Make this device the main one**.
6. If Bread asks **Keep the recovery phrase on this device?**, choose **Keep it on this device** or **Remove recovery phrase**. Daily transactions work without it, but Guardian changes and everyday key replacement will ask you to enter it. Write it down before you remove it.
7. Open the wallet when recovery finishes. Wait for any everyday-key rotation and sync before making a transaction.

Some screens differ between store releases. Recovery needs your phrase and a supported account-state backup; support cannot reset your phrase. Biometrics are an unlock method, not a recovery backup. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)

Never enter your recovery phrase on a website, in feedback, or in a chat. Keep screen sharing and recording off while entering it.
