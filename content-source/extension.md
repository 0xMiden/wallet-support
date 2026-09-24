<!--
Source: Notion › Miden Workspace › COMMUNITY › "Bread Wallet Help Center" (page 28d99411-cf90-80b2-b4ac-cb1107193585), read 3 Sep 2026.
Owner-approved corrections applied (per tasks/content-proposal.md): install title unified; "How do I restore my wallet with a recovery key?" body replaced with the extension flow (§6); store link labels read **Bread Wallet**.
Images removed; each removed image is marked with a line "[image removed]".
Format: "## " = Notion section, "### " = article title (verbatim), "> " = callout.
-->

## Setup and basic use

### How to install Bread Wallet

> ⚠️ Caution: Only download Bread Wallet from official links.
> - iOS — [App Store](https://apps.apple.com/ch/app/bread-wallet-by-miden/id6789341854?l=en-GB)
> - Android — [Google Play](https://play.google.com/store/apps/details?id=com.miden.wallet)
> - Chrome — [Chrome Web Store](https://chromewebstore.google.com/detail/bread-wallet-by-miden/coajhopfooegmaifelglfboehacldcbo)

**Steps to install: Chrome browser**

1. Visit the [Bread Wallet listing on the Chrome Web Store](https://chromewebstore.google.com/detail/bread-wallet-by-miden/coajhopfooegmaifelglfboehacldcbo).
2. Click the **Add to Chrome** button.

   ![The Bread Wallet by Miden listing on the Chrome Web Store, with the Add to Chrome button highlighted](E01-install-web-store.png)

3. On the confirmation dialog, click **Add extension**.

   ![Chrome's confirmation dialog for Bread Wallet by Miden, with the Add extension button highlighted](E01a-install-add-extension.png)

After adding the Bread Wallet extension, Bread Wallet will open automatically. To keep it easy to access, click the **puzzle icon** in the top-right corner of your browser, then click the **pin icon** to add it to your toolbar.

To set up your wallet next, see [*How do I create a Bread Wallet?*](#setup-and-basic-use/how-do-i-create-a-bread-wallet)

![Chrome's Extensions menu, opened from the puzzle icon, with the pin icon beside Bread Wallet highlighted](E02-install-pin.png)

### How do I create a Bread Wallet?

When you install Bread Wallet, there are two options to choose between: **Get started** or **Recover your account**.

**Steps:**

1. To create a new wallet, select **Get started**.

   ![Bread Wallet's Welcome to Bread! page, with the Get started button](E03-create-get-started.png)

2. You will be directed to the Acknowledgment Screen page. Click **I understand**.

   ![Bread Wallet's Miden Testnet notice, with the I understand button](E04-create-testnet-notice.png)

3. On the create password page, create a strong password with a minimum of 8 characters and at least 1 number, and then click **Continue**.

   ![Bread Wallet's Create password page, with the Continue button](E05-create-password.png)

4. On the **Choose your Guardian** page, you can select a Guardian operator and then click **Continue**.

   ![Bread Wallet's Choose your Guardian page, with the Continue button](E06-create-guardian.png)

5. Congrats, your wallet is ready! Click the **Open wallet** button; it will close the tab automatically and open the sidebar for you.

For help choosing a Guardian, see [*Why should I pick a Guardian-backed account over a more private one?*](#guardian-protection/why-should-i-pick-a-guardian-backed-account-over-a-more-private-one)

   ![Bread Wallet's Your Wallet is ready screen, with the Open wallet button](E06a-create-wallet-ready.png)

### How to fund your Bread Wallet?

Use the faucet to receive test MIDEN tokens in your wallet.

1. Open the wallet **Home** page.
2. Find the **Fund your wallet** section.

   ![Bread Wallet's Home page, with the Fund your wallet section highlighted](E07-fund-homepage.png)

3. Select **Fund now**.
4. The faucet will automatically send test tokens to your wallet address.
5. Open the **Activity** page to track the request. The tokens are ready to use once the status changes to **Confirmed**.

   ![Bread Wallet's Activity page, with a confirmed Faucet Request for 100 MIDEN](E08-fund-activity.png)

If the tokens don't show up, see [*Why is my token taking so long to arrive?*](#common-issues-and-support/why-is-my-token-taking-so-long-to-arrive)

### How to find a token contract address in Bread Wallet?

**Steps:**

1. From the Bread Wallet homepage, select the token you want to view.
2. Scroll down to the Token Information section.
3. Click the **Copy icon** beside the contract address to copy the token contract address.

### Is Bread Wallet available on mobile?

> ⚠️ Caution: This is the only official Bread Wallet for both Android and iOS.

- Yes, mobile wallets are available on both Android and iOS. You can download it here:
  - Android — [Google Play](https://play.google.com/store/apps/details?id=com.miden.wallet)
  - iOS — [App Store](https://apps.apple.com/ch/app/bread-wallet-by-miden/id6789341854?l=en-GB)

For the install steps, see [*How to install Bread Wallet*](#setup-and-basic-use/how-to-install-bread-wallet).

### What are the supported browsers for Bread Wallet?

Bread Wallet is supported as a browser extension for **Chrome** and as a mobile app for **iOS** and **Android**.

Other browsers and platforms are not currently supported. For the install steps, see [*How to install Bread Wallet*](#setup-and-basic-use/how-to-install-bread-wallet).

## Backup, restore, and security

### Can I recover stolen assets?

Once a transaction is confirmed on the blockchain, it can't be reversed or refunded. If someone has gained access to your recovery key or backup, they can control your wallet, and funds they move are generally not recoverable.

The most important step if you've been compromised: move your remaining assets to a brand-new wallet, one with a brand-new recovery key the attacker has never seen, as quickly as you safely can. To protect it, see [*How do I keep my wallet secure?*](#security-and-recovery/how-do-i-keep-my-wallet-secure)

**Important note:**

Never share your recovery key or backup password with anyone offering to *recover* or *restore* hacked funds. This is one of the most common scams, and it only makes things worse. Bread Wallet support will never ask for your recovery key, and neither will a Guardian operator.

### How do I restore my wallet with a recovery key?

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

### How to restore the wallet using an encrypted file?

Things you need first before restoring the wallet account

- Make sure you have your encrypted wallet file downloaded and ready to use.
- You have a ready, fresh install of Bread Wallet on your new device or browser.

**Steps:**

1. On the Bread Wallet creation page, you choose between **Create a new wallet** and **I already have a wallet**. Select **I already have a wallet**.
2. On the choose your import type page, select **Import with encrypted wallet file**, then click **Continue**.
3. On the import wallet page, drag and drop the file or choose from a device (enter the password you set when exporting your wallet). This will decrypt the file and restore access, then click **Continue**.
4. Create a new password. A minimum of 8 characters with at least 1 number, then click **Continue**.
5. Choose how you want to recover your account if you lose access, between **Guardian** and **Public account**, and then click **Continue** and then click **Get started**; you should be able to access the homepage of the wallet and your assets.

### How to download the encrypted file?

This exports a password-protected copy of your wallet data. **The current Bread Wallet UI cannot import this file**, so do not rely on it as a working recovery method. Keep your recovery key secure and use Guardian if you want supported account-state recovery.

1. From the wallet homepage, open **Settings** (top-right corner).
2. Go to the **Security** section.
3. Select **Encrypted Wallet File**.
4. Enter your wallet password, tick the **Confirmation checkbox**, then click **Continue**.
5. Fill in all required fields, then click **Continue**.
6. The encrypted file downloads automatically — click **Done** to finish.
7. Locate the file in your Downloads folder and move it somewhere safe and private.

Security tip: store the file offline or in an encrypted location (e.g., an encrypted drive or a reputable password manager's secure file storage), not in a synced/shared folder, and keep the password separate from the file. The backup is only as protected as where you keep it.

### How do I keep my wallet secure?

Keeping your wallet secure is mostly about protecting your recovery information and your devices.

Here are some best practices:

- Store your recovery key offline in a safe place.
- Turn on biometric unlock on mobile.
- Use a strong, unique password for your wallet.
- Never type your recovery key into a website, email, chat, or pop-up.
- Only download Bread Wallet from official sources.
- Be cautious of phishing websites, fake wallet apps, and scam messages.
- Never share your recovery key.

**If Guardian is enabled:**

Guardian adds a recovery layer; it keeps a backup of your private account data so you can get back into your wallet on a new device if your current one is lost or broken. Guardian's design protects an account with three keys: an everyday key on your device, an emergency key rebuilt from your recovery key, and the Guardian key, which acknowledges state updates. Moving funds takes two of the three, so a single stolen key is not enough for someone to move your funds on its own. Guardian never holds your keys and can never move your funds by itself. For more on each key, see [*What are the three keys in a Guardian-backed account?*](#guardian-protection/what-are-the-three-keys-in-a-guardian-backed-account)

**If Guardian is not enabled:**

Your security rests entirely on your password or biometrics plus your own backup: your recovery key. There's no separate backup of your account data and no second-key safety net, so protecting your recovery key and keeping a safe backup matters even more.

**What this means for you:**

Think of your recovery key as the master key to a safe; whoever holds it owns everything inside. Set a strong password; enable a biometric lock where you can; and keep your recovery key private and offline. Guardian is a helpful safety net for recovery, an extra layer on top of protecting your own keys.

> ⚠️ **Important note:** No one from Bread Wallet, or anyone else, will ever need your recovery key or password. If someone asks for it, it's a scam. Never share it, and never store it in a screenshot, a plain notes app, or unprotected cloud storage.

### What should I do if I lose my recovery key?

If your wallet is still unlocked and working, keep that device secure and check whether Bread lets you display or back up your recovery key again. Do not reset the wallet or remove the app until you have confirmed a supported recovery path.

Your recovery key restores your keys. A private account also needs its latest off-chain account state, which Guardian can back up.

Whether you can recover depends on your wallet setup, whether Guardian is on, and which backups you still have.

**If Guardian is enabled:**

Guardian keeps a backup of your account data, but it does not keep your recovery key or control your keys. If you lose the recovery key and every device that still holds your keys, Guardian alone cannot restore the wallet. To learn what information Guardian stores, see [*What does Guardian back up?*](#security-and-recovery/what-does-guardian-back-up)

**If Guardian is not enabled:**

Your recovery key restores your keys, but a more-private account also needs its locally stored account state.

- If you lose your recovery key and access to every device holding the wallet, there is generally no supported way to restore it.

**Important note:**

No one from Bread Wallet or your Guardian operator can reset or recover your recovery key for you. Anyone claiming they can recover a lost recovery key is running a scam.

### What is the difference between a recovery key and an encrypted wallet file?

They contain different wallet information, and only recovery-key import is available in the current Bread Wallet UI.

- A **recovery key** is a list of ordinary words that represents your wallet. It's easy to write on paper, but it's only as safe as where you keep it. Anyone who reads those words can restore your wallet.
- An **encrypted wallet file** is a password-protected export of wallet data. The current app can export this file but cannot import it, so do not rely on it as a working restoration method.

**A simple way to picture it:** a recovery key is like your key written in plain handwriting, while an encrypted wallet file is like that key locked in a box that needs a password to open.

**If Guardian is enabled:**

Guardian backs up account state so supported recovery can restore it on a new device. Guardian does not replace your recovery key; you still need your own keys to control the wallet.

**If Guardian is not enabled:**

Without Guardian, a private account's state remains on the device. Because encrypted-file import is unavailable, losing that device can make the private account unrecoverable even if you still have the recovery key.

**What this means for you:**

- If you only use a public account, your recovery key is your key backup. Keep it safe.
- If you use a private account, keep the device and recovery key secure. Enable Guardian if you want the currently supported account-state recovery path.

## Key concepts

### What is delegate proof generation?

Delegated proof generation lets Bread Wallet use a remote prover to handle heavy computation. Your device still signs transactions with your key. The prover only helps generate the cryptographic proof, so the wallet can work faster.

### What is Guardian?

Guardian is a recovery and backup layer for private accounts. Because Miden keeps some account data private and local to you, losing a device can also mean losing access to that account data. Guardian helps back up and recover that data on a new device.

Guardian does not hold your recovery key and cannot move funds by itself.

To learn what information Guardian stores, see [*What does Guardian back up?*](#security-and-recovery/what-does-guardian-back-up) For what it can and can't do, see [*Can Guardian move my funds or lock me out?*](#guardian-protection/can-guardian-move-my-funds-or-lock-me-out)

### What is a private account?

On Miden, an account can be public or private, and the difference is about where your account's data is stored.

- With a private account, only a small cryptographic *commitment* (the fingerprint of your data) is stored on the public blockchain, while the full account data stays with you, off-chain. This gives you strong privacy; the network can confirm your account is valid without seeing its contents, like your balances.
- With a public account, the full account data is stored on-chain and is visible to everyone.

Because a private account's data lives off-chain, a recovery key alone does not restore its latest state. Guardian provides the supported account-state recovery path in the current wallet.

**If Guardian is enabled:**

Guardian backs up and syncs your private account data, so a lost or broken device doesn't have to mean losing your account state; you can recover it on a new device.

**If Guardian is not enabled:**

You are solely responsible for the account state stored on your device. If you lose the device and have no Guardian backup, the private account may be unrecoverable.

To see what stays hidden, see [*What can other people see about my account on the blockchain?*](#public-and-private-transactions/what-can-other-people-see-about-my-account-on-the-blockchain)

### What is a public note?

On Miden, a note is how value or a message moves between accounts; think of it as a transferable envelope that can carry assets along with the rules for how it can be claimed.

A public note is one whose full contents are stored on the blockchain, so its details are visible on-chain. This makes public notes easy for anyone to see and work with.

**What this means for you:**

A public note is fine when visibility isn't a concern, for example, when the details don't need to be kept private. Just remember that the contents are recorded openly on-chain.

For the private version, see [*What is a private note?*](#public-and-private-transactions/what-is-a-private-note)

### What is a private note?

A private note is the privacy-preserving version of a note. Instead of publishing the full contents on-chain, only the note's commitment is stored publicly, and the actual details stay off-chain. That means only the people who have the note's details can see and use it.

**Important note:** Keep your wallet backed up with Guardian. Since private notes rely on off-chain data, keep your wallet and its data safe.

For the public version, see [*What is a public note?*](#public-and-private-transactions/what-is-a-public-note)

### What is recall height?

Recall height is the block height after which a sender can reclaim an unclaimed note. If the recipient does not claim the note before that height, the sender can take it back.

To accept a transfer before it can be taken back, see [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)

## Troubleshooting

### My transfer shows as confirmed, but the token never arrived.

When a send shows as **Confirmed** in **Activity**, the transaction is on the blockchain and the tokens have left your wallet. It does not mean the recipient has them yet: tokens arrive as a note that the recipient has to accept.

**1. Ask the recipient to check their Pending tab**

Incoming tokens wait in **Activity**, on the **Pending** tab, until the recipient selects **Accept Transfer**. Only MIDEN token is accepted automatically, when **Auto Consume** in the settings is on. Every other token must be accepted manually. If the recipient selected **Decline**, the transfer is only hidden on their device, and they can restore it in **Activity**. For the steps, see [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)

**2. If the recipient never accepts it**

A send expires after 7 days by default. You can see or change this as the **Expiration Date** before you send. If the recipient hasn't accepted it by then, the tokens come back to you: they appear on your **Pending** tab in **Activity**, like a newly arrived transfer. Select **Accept Transfer** to add them back to your balance.

**Still missing after an hour?**

If the recipient can't find it, they can check [*Why is my token taking so long to arrive?*](#common-issues-and-support/why-is-my-token-taking-so-long-to-arrive) If it's still missing, report it to our [**SUPPORT**](/feedback).

Never include your recovery key or password.

### My token is stuck on Consuming (receiver address)

If a transaction appears stuck on the **Consuming** stage, the wallet is still working in the background and will often resolve it on its own within a few minutes. No action is needed in most cases.

If it stays stuck, the wallet marks it as failed: after 30 minutes on the browser extension, or after 2 minutes on mobile. Closing and reopening the app also ends it, marked as **Interrupted**. Either way, the transfer returns to the **Pending** tab in **Activity** with a **Retry** button, so you can try it again.

**If it keeps getting stuck:**

Retry your stuck transfers one at a time instead of all together.

1. Select the **Settings** tab, then select **General**.

   ![Bread Wallet's Settings page, with General highlighted](E28-consume-settings-general.png)

2. Turn off **Auto Consume MIDEN notes**.

   ![Bread Wallet's General page, with Auto Consume MIDEN notes highlighted](E29-consume-auto-consume.png)

3. Wait until nothing is on **Consuming**. Turning the setting off does not stop a transfer that is already being claimed.
4. Open **Activity** and select the **Pending** tab. Choose one transfer that failed to consume and select its **Retry** button. Wait for it to finish before you retry the next one.
5. When all your stuck transfers have gone through, turn **Auto Consume MIDEN notes** back on.

Each transfer you retry is a separate transaction with its own network fee, so retrying them one at a time costs more than claiming them together.

For how to retry a single transfer, see [*What should I do if accepting a transfer fails?*](#common-issues-and-support/what-should-i-do-if-accepting-a-transfer-fails)

### Send stuck in the Sending phase

While a send is in progress, it shows as **Sending** in **Activity**. On the browser extension it keeps going in the background even if you close the wallet, and you'll get a notification if it fails.

If a send can't finish, the wallet marks it as **Transaction failed**:

- after 30 minutes on the browser extension, or after 2 minutes on mobile (time with the app in the background doesn't count)
- straight away when you reopen the app, if it was closed in the middle of the send. It then shows **Interrupted — check your activity after it syncs**.

**Before you try again:**

Occasionally a failed send has already reached the network just before it stopped. Let your wallet sync, then check your balance and **Activity**.

To try again, open the failed send in **Activity** and select its **Retry** button. The wallet first checks whether the send already went through, so it won't send it twice. If it can't tell, it asks you to check your balance before retrying.

If the send shows as **Confirmed** but the recipient doesn't have it, see [*My transfer shows as confirmed, but the token never arrived.*](#common-issues-and-support/my-transfer-shows-as-completed-but-the-token-never-arrived)

### Why is my token taking so long to arrive?

Incoming tokens usually show up within a few moments. If they're taking longer, check these first:

1. **Open and unlock your wallet.** Bread checks for incoming tokens every few seconds while it's open. On mobile it only checks while the app is open; on the browser extension it also checks in the background about once a minute.
2. **Check the Pending tab.** Incoming tokens wait in **Activity**, on the **Pending** tab, until you select **Accept Transfer**. Only MIDEN token is accepted automatically, when **Auto Consume** in the settings is on. See [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)
3. **Check for a connection banner.** If a banner at the top of the wallet says **You appear to be offline** or **Cannot reach the Miden node**, the wallet can't check for new tokens. Check your internet connection, then select **Try again** or **Retry sync**. If the Miden network is down or busy, your tokens appear once it's reachable again.

If there is still nothing after an hour, report it to our [**SUPPORT**](/feedback).
