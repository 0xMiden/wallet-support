<!--
Source: Notion › Miden Workspace › COMMUNITY › "Bread Wallet Help Center" (page 28d99411-cf90-80b2-b4ac-cb1107193585), read 3 Sep 2026.
Owner-approved corrections applied (per tasks/content-proposal.md): install title unified; "How do I restore my wallet with a recovery phrase?" body replaced with the extension flow (§6); store link labels read **Bread Wallet**.
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

![Chrome's Extensions menu, opened from the puzzle icon, with the pin icon beside Bread Wallet highlighted](E02-install-pin.png)

### How do I create a Bread Wallet?

When you install Bread Wallet, there are two options to choose between: **Get started** or **Recover your account**.

**Steps:**

1. To create a new wallet, select **Get started**.

   ![Bread Wallet's Welcome to Bread! page, with the Get started button highlighted](E03-create-get-started.png)

2. You will be directed to the Acknowledgment Screen page. Click **I understand**.

   ![Bread Wallet's Miden Testnet notice, with the I understand button highlighted](E04-create-testnet-notice.png)

3. On the create password page, create a strong password with a minimum of 8 characters and at least 1 number, and then click **Continue**.

   ![Bread Wallet's Create password page, with the Continue button highlighted](E05-create-password.png)

4. On the **Choose your Guardian** page, you can select a Guardian operator and then click **Continue**.

   ![Bread Wallet's Choose your Guardian page, with the Continue button highlighted](E06-create-guardian.png)

5. Congrats, your wallet is ready! Click the **Open wallet** button; it will close the tab automatically and open the sidebar for you.

   ![Bread Wallet's Your Wallet is ready screen, with the Open wallet button highlighted](E06a-create-wallet-ready.png)

### How to fund your Bread Wallet?

Use the faucet to send test tokens to a wallet address.

1. From the wallet homepage, click **Faucet**.
2. Click **Go to faucet**.
3. On the faucet page, enter the wallet address and the amount you want to request.
4. Select the note type for your request — **Private** or **Public**.

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

### What are the supported browsers for Bread Wallet?

Currently, we only support the Chrome browser. Other browsers, such as Brave, Edge, and Firefox, are not on the roadmap yet.

## Backup, restore, and security

### Can I recover stolen assets?

Once a transaction is confirmed on the blockchain, it can't be reversed or refunded. If someone has gained access to your recovery phrase or backup, they can control your wallet, and funds they move are generally not recoverable.

The most important step if you've been compromised: move your remaining assets to a brand-new wallet, one with a brand-new recovery phrase the attacker has never seen, as quickly as you safely can.

**Important note:**

Never share your recovery phrase or backup password with anyone offering to *recover* or *restore* hacked funds. This is one of the most common scams, and it only makes things worse. Bread Wallet support will never ask for your recovery phrase, and neither will a Guardian operator.

### How do I restore my wallet with a recovery phrase?

Before you start, make sure you have:

- Your recovery phrase, written down and ready to enter.
- A fresh install of Bread Wallet in your Chrome browser.

**Steps:**

1. Open Bread Wallet. On the wallet creation page, choose between **Create a new wallet** and **I already have a wallet**. Select **I already have a wallet**.
2. On the choose your import type page, select **Import with Seed Phrase**, then click **Continue**.
3. Enter your recovery phrase. Type it into the numbered boxes, word by word, in the exact order you wrote it down. When all the words are in, click **Continue**.
4. Create a new password. A minimum of 8 characters with at least 1 number, then click **Continue**.
5. Choose how you want to recover your account if you lose access — Guardian or Fully private — then click **Continue**.
6. Click **Open Wallet**. The tab closes automatically and the wallet opens in the sidebar.

> ⚠️ **Before you type your recovery phrase:** it's the master key to your wallet, and anyone who gets it can take everything.
> - Only enter it in the official Bread Wallet extension — never on a website, pop-up, or form.
> - No support team or admin will ever ask for it. Anyone who does is a scammer.
> - Type it somewhere private, with no screen recording or sharing turned on.

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

This creates an encrypted backup of your wallet that you can store safely and later use to restore access.

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

- Store your recovery phrase, private key, and encrypted wallet file offline in a safe place.
- Turn on biometric unlock on mobile.
- Use a strong, unique password for your wallet.
- Never type your recovery phrase into a website, email, chat, or pop-up.
- Only download Bread Wallet from official sources.
- Be cautious of phishing websites, fake wallet apps, and scam messages.
- Never share your recovery phrase, private key, or encrypted wallet file.

**If Guardian is enabled:**

Guardian adds a recovery layer; it keeps a backup of your private account data so you can get back into your wallet on a new device if your current one is lost or broken. Guardian's design protects an account with three keys: an everyday key on your device, an emergency key rebuilt from your recovery phrase, and the Guardian key, which acknowledges state updates. Moving funds takes two of the three, so a single stolen key is not enough for someone to move your funds on its own. Guardian never holds your keys and can never move your funds by itself.

**If Guardian is not enabled:**

Your security rests entirely on your password or biometrics plus your own backups: your recovery phrase and/or encrypted wallet file. There's no separate backup of your account data and no second-key safety net, so protecting your recovery phrase and keeping a safe backup matters even more.

**What this means for you:**

Think of your recovery phrase as the master key to a safe; whoever holds it owns everything inside. Set a strong password; enable a biometric lock where you can; and keep your recovery phrase private and offline. Guardian is a helpful safety net for recovery, an extra layer on top of protecting your own keys.

> ⚠️ **Important note:** No one from Bread Wallet, or anyone else, will ever need your recovery phrase, private key, encrypted wallet file, or password. If someone asks for it, it's a scam. Never share it, and never store it in a screenshot, a plain notes app, or unprotected cloud storage.

### What should I do if I lose my recovery phrase?

The most important thing to know: if your wallet is still unlocked and working on your device, you haven't truly lost access yet, so back up your recovery phrase again right away and export an encrypted wallet file too, while you still can.

**There's an important detail here:** your recovery phrase restores your public account, but a private account also needs its own backup, your encrypted wallet file (or Guardian). So *losing your recovery phrase* and *losing your private account backup* are two different problems, and it's worth protecting against both.

Whether you can recover depends on your wallet setup, whether Guardian is on, and which backups you still have.

**If Guardian is enabled:**

Guardian keeps a backup of your account data and is designed so you can recover on another device using your keys. So if you've lost your recovery phrase but still have your encrypted wallet file, you may be able to regain access, and your account data can come back through Guardian. But Guardian cannot restore your wallet on its own; it never holds your keys and can't act without the required signatures, so if you've lost *all* your keys and backups, Guardian alone won't bring your wallet back.

**If Guardian is not enabled:**

Your recovery phrase and encrypted wallet file are your only backups.

- If you still have your encrypted wallet file (and its password), you can use it to restore; this also brings back your private account.
- If you've lost your recovery phrase, your encrypted wallet file, *and* access to your device, there is generally no way to restore that wallet. Bread Wallet does not keep a copy of your keys or your private account data for you.

**Important note:**

No one from Bread Wallet or your Guardian operator can reset or recover your recovery phrase for you. And remember: your recovery phrase alone does not bring back a private account; keep your encrypted wallet file (and/or Guardian) for that. Anyone claiming they can *recover* your lost phrase is running a scam.

### What is the difference between a recovery phrase and an encrypted wallet file?

Both are ways to back up and restore your wallet. Bread Wallet lets you import or export your wallet using either a recovery phrase or an encrypted wallet file.

- A **recovery phrase** is a list of ordinary words that represents your wallet. It's easy to write on paper, but it's only as safe as where you keep it. Anyone who reads those words can restore your wallet.
- An **encrypted wallet file** is a backup saved as a password-protected file. Because it's scrambled, it's unreadable to anyone without the password and safer to store digitally. But if you forget the password, the file can't be opened.

**A simple way to picture it:** a recovery phrase is like your key written in plain handwriting, while an encrypted wallet file is like that key locked in a box that needs a password to open.

**If Guardian is enabled:**

Guardian is a different kind of backup. Your recovery phrase and encrypted wallet file back up your keys and wallet access; Guardian backs up your account data so you can recover it on a new device. Guardian does not replace your recovery phrase or encrypted wallet file; you still need one of those to control your wallet.

**If Guardian is not enabled:**

Your encrypted wallet file is the only backup of your private account data. If you lose it — and you have no Guardian backup — a private account generally cannot be recovered, even if you still have your recovery phrase.

**What this means for you:**

- If you only use a public account, your recovery phrase is your key backup. Keep it safe.
- If you use a private account, back up both: your recovery phrase and your encrypted wallet file. Guardian adds another recovery layer.

## Key concepts

### What is delegate proof generation?

Delegated proof generation lets Bread Wallet use a remote prover to handle heavy computation. Your device still signs transactions with your key. The prover only helps generate the cryptographic proof, so the wallet can work faster on mobile devices.

### What is Guardian?

Guardian is a recovery and backup layer for private accounts. Because Miden keeps some account data private and local to you, losing a device can also mean losing access to that account data. Guardian helps back up and recover that data on a new device.

Guardian does not hold your recovery phrase, does not hold your private key, and cannot move funds by itself.

### What is a private account?

On Miden, an account can be public or private, and the difference is about where your account's data is stored.

- With a private account, only a small cryptographic *commitment* (the fingerprint of your data) is stored on the public blockchain, while the full account data stays with you, off-chain. This gives you strong privacy; the network can confirm your account is valid without seeing its contents, like your balances.
- With a public account, the full account data is stored on-chain and is visible to everyone.

Because a private account's data lives only with you, your recovery phrase alone won't bring it back; you recover a private account from your encrypted wallet file or Guardian, not from the recovery phrase alone.

**If Guardian is enabled:**

Guardian backs up and syncs your private account data, so a lost or broken device doesn't have to mean losing your account state; you can recover it on a new device.

**If Guardian is not enabled:**

You are solely responsible for backing up your private account data; your encrypted wallet file is that backup. If you lose it and have no Guardian backup, you can lose access to that account's funds. So keep secure backups of both your recovery phrase and encrypted wallet file.

### What is a public note?

On Miden, a note is how value or a message moves between accounts; think of it as a transferable envelope that can carry assets along with the rules for how it can be claimed.

A public note is one whose full contents are stored on the blockchain, so its details are visible on-chain. This makes public notes easy for anyone to see and work with.

**What this means for you:**

A public note is fine when visibility isn't a concern, for example, when the details don't need to be kept private. Just remember that the contents are recorded openly on-chain.

### What is a private note?

A private note is the privacy-preserving version of a note. Instead of publishing the full contents on-chain, only the note's commitment is stored publicly, and the actual details stay off-chain. That means only the people who have the note's details can see and use it.

**Important note:** Keep your wallet backed up with Guardian. Since private notes rely on off-chain data, keep your wallet and its data safe.

### What is recall height?

Recall height is the block height after which a sender can reclaim an unclaimed note. If the recipient does not claim the note before that height, the sender can take it back.

## Troubleshooting

### My transfer shows as completed, but the token never arrived.

Please report this directly to our [**SUPPORT**](https://miden-feedback-v2.miden-feedback-relay.workers.dev/?cb=4).

### My token is stuck on Consuming (receiver address)

If a transaction appears stuck on the **Consuming** stage, the wallet is still working in the background and will often resolve it on its own within a few minutes. No action is needed in most cases. If it remains stuck, closing and reopening the app may prompt the wallet to resume the transaction. The wallet will cancel, mark it as failed if it cannot be completed within 30 minutes, and attempt to resume note consumption.

### Send stuck in the Sending phase

If the app closes while a send is in progress, the transaction may stay in the **Sending** state for up to 30 minutes. No funds leave the wallet. If the transaction cannot complete, it will be marked as failed and your token balance will remain the same.

### Why is my token taking so long to arrive?

We may have an issue with our infrastructure at the moment — please wait a little longer until it arrives. If there is no progress after 20 minutes, please report it directly to our [**SUPPORT**](https://miden-feedback-v2.miden-feedback-relay.workers.dev/?cb=4).
