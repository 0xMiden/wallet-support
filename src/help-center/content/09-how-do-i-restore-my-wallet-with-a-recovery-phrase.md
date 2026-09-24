---
id: how-do-i-restore-my-wallet-with-a-recovery-phrase
title: How do I restore my wallet with a recovery key?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

<!-- platform: extension-desktop -->

Before you start, make sure you have:

- Your recovery key (sometimes called a seed phrase), written down and ready to enter.
- A fresh install of Bread Wallet in your Chrome browser.

**Steps:**

1. Open Bread Wallet. On the **Welcome to Bread!** screen, select **Recover your account**.

   ![Bread Wallet's Welcome to Bread! page, with the Recover your account link](E13-restore-welcome.png)

2. Read the Miden testnet notice, then select **I understand**.

   ![Bread Wallet's Miden Testnet notice, with the I understand button](E14-restore-testnet-notice.png)

3. Enter your recovery key in the exact order you wrote it down, then select **Continue**.

   ![Bread Wallet's Import Wallet page, with the numbered recovery key boxes](E15-restore-phrase-boxes.png)

4. Create a new password with at least 8 characters and 1 number, then select **Continue**.

   ![Bread Wallet's Create password page, with the Continue button](E15a-restore-password.png)

5. Follow the account-recovery prompts shown for your wallet setup.

   ![Bread Wallet's account recovery page, with the Guardian operators and the Continue button](E16-restore-recovery-choice.png)

6. Select **Open wallet** when recovery is complete.

   ![Bread Wallet's Your Wallet is ready screen, with the Open wallet button](E16a-restore-wallet-ready.png)

   Bread Wallet then rotates your everyday key, which a recovered account needs before it can sync and make transactions. The sidebar opens when it's done.

   ![Bread Wallet rotating your everyday key after recovery, before the wallet opens](E16b-restore-everyday-key.png)

> ⚠️ **Before you type your recovery key:** it's the master key to your wallet, and anyone who gets it can take everything.
> - Only enter it in the official Bread Wallet extension — never on a website, pop-up, or form.
> - No support team or admin will ever ask for it. Anyone who does is a scammer.
> - Type it somewhere private, with no screen recording or sharing turned on.

If you've lost your recovery key, see [*What should I do if I lose my recovery key?*](#security-and-recovery/what-should-i-do-if-i-lose-my-recovery-phrase) To learn how Guardian brings back your account data, see [*How does recovery work with Guardian?*](#security-and-recovery/how-does-recovery-work-with-guardian)

<!-- platform: mobile -->

Before you start, make sure you have:

- Your recovery key (sometimes called a seed phrase), written down and ready to enter.
- A fresh install of Bread Wallet on your new device or browser.

Steps:

1. Open the Bread app. On the **Welcome to Bread!** screen, tap **Recover your account**.
2. Read the Miden testnet notice, then tap **I understand**.
3. Enter your recovery key in the exact order you wrote it down, then tap **Continue**.
4. If prompted, choose your Guardian operator. Pick one from the list:
   - OpenZeppelin (US-EAST, the default)
   - Gateway Operator (EU-NORTH)
   - Lambda Class (EU-WEST)
5. Your wallet is ready! You'll see the **Your Wallet is ready!** screen. Tap **Open wallet**.
6. One final check: Bread asks you to unlock with your fingerprint to open your wallet. Scan it, and you're back in!

> ⚠️ **Before you type your recovery key:** it's the master key to your wallet, and anyone who gets it can take everything.
> - Only enter it in the official Bread Wallet app — never on a website, pop-up, or form.
> - No support team or admin will ever ask for it. Anyone who does is a scammer.
> - Type it somewhere private, with no screen recording or sharing turned on.

If you've lost your recovery key, see [*What should I do if I lose my recovery key?*](#security-and-recovery/what-should-i-do-if-i-lose-my-recovery-phrase) To learn how Guardian brings back your account data, see [*How does recovery work with Guardian?*](#security-and-recovery/how-does-recovery-work-with-guardian)
