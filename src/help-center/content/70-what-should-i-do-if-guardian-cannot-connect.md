---
id: what-should-i-do-if-guardian-cannot-connect
title: What should I do if Guardian cannot connect?
mainCategory: troubleshooting
subcategory: common-issues-and-support
platforms: [extension-desktop, mobile]
---

If Bread reports a Guardian connection or authentication error, such as 401, keep the wallet installed. An error does not mean your recovery phrase is wrong, and resetting the wallet is not a connection fix.

If your old device was lost or stolen, choose **Make this device the main one** when you recover, so that device can no longer sign for your account. When you recover with your recovery phrase on another device, Bread asks how this device should join your wallet. **Add this device** keeps your other devices working, so you can use the account on both. **Make this device the main one** removes every other device. Either way, this device gets its own everyday key, and a small network fee is paid from the account. A removed device shows **Another device holds this account**. If it still holds the recovery phrase, it can take the account back with **Make this device the main one**, which removes the other devices in turn. If you have already recovered elsewhere, continue on the device where recovery completed instead of repeatedly recovering back and forth.

1. Check your internet connection and update through the official store. If the wallet is still syncing or rotating an everyday key after recovery, let that operation finish before starting another one.
2. Confirm that the wallet is on the network used by the original account. Mainnet and Testnet have different account state. Do not replace RPC or Guardian endpoints with addresses supplied by strangers.
3. If the error continues, record the exact message, the time it occurred, your platform, wallet version, network and the Guardian name shown by the wallet. Keep recovery information and signing keys out of the report.
4. Contact [support](/feedback) before resetting, reinstalling or trying repeated recovery attempts. Keep any working installation while the issue is investigated.

Guardian backs up account state; it does not replace your recovery phrase. Support cannot recover a missing phrase. See [*What should I do before resetting or reinstalling Bread?*](#security-and-recovery/what-should-i-do-before-resetting-or-reinstalling-bread)
