---
id: how-do-i-prepare-for-mainnet-and-check-my-network
title: How do I prepare for Mainnet and check my network?
mainCategory: getting-started
subcategory: setup-and-basic-use
platforms: [extension-desktop, mobile]
---

Partner Mainnet is a limited, invitation-only phase. It is separate from Testnet and the future public Mainnet launch. Use small testing balances and follow official migration notices. Do not assume that balances will move automatically to a future network.

Mainnet and Testnet are separate networks. Testnet tokens have no real-world value and do not turn into Mainnet funds.

**Get the right build and your invitation**

Use the invitation-enabled Bread version named in your official invitation. A GitHub release, including 1.17.7, does not mean that version is available in every store or installed on your device. Store releases can differ by platform; installing a store update or a test build does not prove that your device has the supported Mainnet flow. Check your version and network before funding. If the expected options are missing, contact [support](/feedback).

Your personal access code is in your invitation email. A code registers one new account. Keep it private: do not post it, include it in screenshots or send it in a support report. If you have not received an invitation, contact [support](/feedback) about access. Downloading Bread does not itself grant an invitation.

**Register a new Partner Mainnet account**

1. Start from the fresh **Welcome** screen in the supported invitation-enabled build. Do not erase a working wallet just to reach this screen; first follow [*What should I do before resetting or reinstalling Bread?*](#security-and-recovery/what-should-i-do-before-resetting-or-reinstalling-bread)
2. If **I have a code** is already visible, select it. If your invitation-enabled build instead shows the general welcome options, tap the **Bread logo** seven times, with less than two seconds between taps, to reveal invitation access. The gesture does not replace a valid code. If it opens Developer Settings, go back; do not change endpoints.
3. Choose **I have a code**, enter your code exactly as supplied in **Access code**, preserving uppercase and lowercase letters, then select **Unlock mainnet**.
4. Complete security and Guardian setup, save the new recovery phrase safely offline, and finish registration. An accepted code alone does not mean registration is finished. Keep Bread connected until registration and sync complete.
5. Check the network, account and usable fee balance before sending or bridging funds. Use only routes enabled for your installed version. See [*What is the Partner Mainnet deposit limit?*](#moving-across-chains/what-is-the-partner-mainnet-deposit-limit)

**Recover an existing account**

If you already registered a Mainnet account, recover that account instead of registering another one. On the Mainnet welcome screen choose **I don't have a code**, then **Recover your account**. Recovery of an existing registered account does not require a new invitation code. It needs the correct recovery phrase and the account's Guardian backup. A Testnet account cannot gain Mainnet access through recovery.

A standard Bread account supports one active device at a time. Recovery replaces the former device's access; it does not synchronize use across devices. In 1.17.7, **Another device holds this account** and **Make this device the main one** identify the device-replacement flow. Earlier installed versions may show different controls.

Follow [*How do I restore my wallet with a recovery phrase?*](#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase). Wait for recovery, any everyday-key rotation and sync to finish before transacting. Do not reset again if the result is unclear.

**Recovery phrase verification in 1.17.7**

For an account created in Bread with its recovery phrase still stored and not yet verified, 1.17.7 requires backup verification when the combined priced Mainnet balance across your accounts reaches $150. Follow the official wallet prompt to confirm your offline backup before continuing. Already verified, recovered or removed phrases are handled differently. Never enter the phrase into a support form or website.

**If the code or registration fails**

Check that you used the invitation's supported build and entered the code exactly. If Bread cannot check the code or registration times out, check your connection and the account's current status before retrying. Do not create another account or repeatedly reinstall to resolve an uncertain registration. Report the error text, platform, version and network through [support](/feedback), without the code, recovery phrase or signing keys.

If Bread shows a Testnet or developer-network indicator, use test assets only. Do not change endpoints to make an account appear to be on Mainnet. See [*Do I need Developer Settings to use Bread?*](#setup-and-basic-use/do-i-need-developer-settings-to-use-bread)
