---
id: what-should-i-do-before-resetting-or-reinstalling-bread
title: What should I do before resetting or reinstalling Bread?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

A reset can erase this installation's wallet keys, local history, contacts and settings. Signing out to recover a forgotten password and resetting developer endpoints can also replace local wallet data.

Before you continue:

1. Confirm that you have the recovery phrase written correctly and stored offline. A passcode, password or biometric unlock alone cannot restore a wallet on a new installation.
2. Check which network and Guardian the account uses. Standard Guardian recovery needs your phrase and its account-state backup.
3. Check **Activity**, balances and any in-flight bridge or Earn transfers. Record non-secret references you may need to follow up.
4. Keep any working installation until you have confirmed a supported recovery path. Do not assume an encrypted-file guide applies to your released version.

If you forgot the wallet password, use the wallet's recovery flow to reimport the account and choose new protection. Support cannot reset your recovery phrase. If the phrase is missing, do not sign out or reset; contact [support](/feedback).

If your installed version offers **Settings** → **Security** → **Encrypted Wallet File**, treat that file as a sensitive backup. It is a snapshot, not a continuously updated copy; save a new snapshot after account changes. Keep it protected and never attach it to a support report. Availability depends on your wallet version and account type.

Restoring Guardian account state from a file does not by itself complete recovery. Replacing the everyday key can still need the Guardian operator; a compatible, previously saved everyday key pair can be another supported path in versions that offer it. Do not assume a file alone or an older snapshot guarantees recovery. If the operator is unavailable or you are unsure which backups you have, keep the working installation and contact [support](/feedback) before resetting.

Resetting does not cancel a transaction already submitted to a network and does not move Testnet assets to Mainnet. See [*How do I restore my wallet with a recovery phrase?*](#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase)
