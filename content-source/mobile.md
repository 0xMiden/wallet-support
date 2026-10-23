<!--
Source: Notion › Miden Workspace › COMMUNITY › "Bread Wallet Help Center: Mobile" (page 39f99411-cf90-80d3-b616-dc949e39b2fc), read 3 Sep 2026.
Owner-approved corrections applied (per tasks/content-proposal.md): install title unified; store link labels read **Bread Wallet**.
Images removed; each removed image is marked with a line "[image removed]".
Format: "## " = Notion section, "### " = article title (verbatim), "> " = callout.
-->

## Setup and basic use

### How to install Bread

Store availability and wallet features can differ by platform and app version. A store listing does not mean a new Mainnet flow is available in your installed app. Update through the official store and check the network before funding. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)

> ⚠️ Caution: Only download Bread Wallet from official links.
> - iOS — [App Store](https://apps.apple.com/ch/app/bread-wallet-by-miden/id6789341854?l=en-GB)
> - Android — [Google Play](https://play.google.com/store/apps/details?id=com.miden.wallet)
> - Chrome — [Chrome Web Store](https://chromewebstore.google.com/detail/bread-wallet-by-miden/coajhopfooegmaifelglfboehacldcbo)

**Steps to install**

1. Open the App Store on iOS, or Google Play on Android, and search for *Bread Wallet*.
2. Tap **Get** or **Install** and confirm the download as you normally would.

   ![The Bread Wallet listing on the App Store, with the Get button highlighted](M01-install-app-store.png)

3. Once it's installed, open the app and follow the prompts to set up your wallet.
4. Don't forget to back up your recovery phrase somewhere safe and offline. This is very important.

To set up your wallet next, see [*How do I create a new account with Bread?*](#setup-and-basic-use/how-do-i-create-a-bread-wallet)

### How do I create a new account with Bread?

Use the official app and follow the setup shown in your installed version. If the welcome screen asks for an access code, follow your invitation; do not change Developer Settings to bypass it.

1. Tap **Get started** when that option is available.
2. Check the network. If Bread shows a Testnet notice, read it and tap **I understand**. Testnet tokens have no real-world value.
3. Follow the prompts to set up a passcode or supported biometric unlock. Keep a secure way to unlock the device.
4. Read the Guardian explanation and confirm the provider shown. Standard Bread setup creates a Guardian-backed account. The operator can see the account state but cannot move funds alone.
5. Complete any usage-data choice and open the wallet when setup finishes.
6. Back up your recovery phrase on paper and keep it offline before you fund the wallet. Biometrics do not replace this backup.

The screens and their order can differ between releases. App Store availability does not establish that the latest Mainnet flow has shipped. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network) and [*How do I keep my wallet secure?*](#security-and-recovery/how-do-i-keep-my-wallet-secure)

### How to add funds into Bread?

Check the network before adding funds. Testnet assets and Mainnet assets are separate; a Testnet faucet does not fund a Mainnet account.

**On Testnet:**

Tap **Fund your wallet** if your version shows a test faucet. Keep the app open while it syncs, then check **Activity**. Test tokens have no real-world value. Do not send real assets to a test address.

**On Mainnet, when supported by your installed version:**

Use only the deposit networks, assets and routes shown by the wallet. Check the source network, destination network, address, amount and fees before confirming. Do not transfer from an unsupported chain or assume tokens with the same name are interchangeable.

The Partner Mainnet cap is $1,232.462 for the total wallet balance after a deposit. See [*What is the Partner Mainnet deposit limit?*](#moving-across-chains/what-is-the-partner-mainnet-deposit-limit)

Mainnet availability can differ between store versions. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network) If a transfer is missing, check **Activity** before starting another deposit.

### How to find a token contract address in Bread?

**Steps:**

1. From the Bread Wallet homepage, select the token you want to view.
2. Scroll down to the Token Information section.
3. Tap the copy icon beside the contract address to copy it.

### Is Bread available on mobile?

Store availability and wallet features can differ by platform and app version. A store listing does not mean a new Mainnet flow is available in your installed app. Update through the official store and check the network before funding. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)

> ⚠️ Caution: These are the only official Bread Wallet downloads for Android and iOS.

- Yes, mobile wallets are available on both Android and iOS. You can download it here:
  - Android — [Google Play](https://play.google.com/store/apps/details?id=com.miden.wallet)
  - iOS — [App Store](https://apps.apple.com/ch/app/bread-wallet-by-miden/id6789341854?l=en-GB)

For the install steps, see [*How to install Bread*](#setup-and-basic-use/how-to-install-bread-wallet).

### What are the supported browsers for Bread?

Bread Wallet is supported as a browser extension for **Chrome** and as a mobile app for **iOS** and **Android**.

Other browsers and platforms are not currently supported. For the install steps, see [*How to install Bread*](#setup-and-basic-use/how-to-install-bread-wallet).

## Backup, restore, and security

### Can I recover stolen assets?

Once a transaction is confirmed on the blockchain, it can't be reversed or refunded. If someone has gained access to your recovery phrase or backup, they can control your wallet, and funds they move are generally not recoverable.

The most important step if you've been compromised: move your remaining assets to a brand-new wallet, one with a brand-new recovery phrase the attacker has never seen, as quickly as you safely can. To protect it, see [*How do I keep my wallet secure?*](#security-and-recovery/how-do-i-keep-my-wallet-secure)

**Important note:**

Never share your recovery phrase or backup password with anyone offering to *recover* or *restore* hacked funds. This is one of the most common scams, and it only makes things worse. Bread Wallet support will never ask for your recovery phrase, and neither will a Guardian operator.

### How do I restore my wallet with a recovery phrase?

Have your recovery phrase (sometimes called a seed phrase) ready and use the official app on the same network as the account you want to recover. A Testnet account does not become a Mainnet account through recovery.

1. Open Bread and tap **Recover your account** when the welcome screen offers it.
2. Read any network notice. Select recovery with your recovery phrase if Bread asks for an import method.
3. Enter the words in their original order, in the official app only.
4. Follow the device-protection and Guardian recovery prompts. Bread can look for the operator; if it cannot find your account, check the network and the Guardian you used.
5. Open the wallet when recovery finishes. Wait for any everyday-key rotation and sync before making a transaction.

Some screens differ between store releases. Recovery needs your phrase and a supported account-state backup; support cannot reset your phrase. Biometrics are an unlock method, not a recovery backup. See [*How do I prepare for Mainnet and check my network?*](#setup-and-basic-use/how-do-i-prepare-for-mainnet-and-check-my-network)

Never enter your recovery phrase on a website, in feedback, or in a chat. Keep screen sharing and recording off while entering it.

### How do I keep my wallet secure?

Protect your recovery phrase and the device that holds your wallet.

**Everyday protection:**

- Write your recovery phrase on paper and store it safely offline.
- Use a strong, unique wallet password or passcode, and supported biometric unlock on mobile.
- Download and update Bread only through official sources.
- Keep your operating system secure and be cautious of fake apps, sites and support messages.
- Never share your recovery phrase, signing keys or password, including in screenshots or feedback.

**Guardian and recovery:**

Standard Bread accounts use Guardian to back up private account state. Your recovery phrase restores the keys; Guardian provides the supported account-state recovery path. Guardian does not keep your phrase and cannot move funds alone. See [*How do I restore my wallet with a recovery phrase?*](#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase)

**Before a reset:**

Do not reset or reinstall until you know you can restore the account. Removing the phrase from a device does not remove copies from earlier backups.

Developer-created accounts and older account types can have different recovery requirements. These are outside the standard setup described here; see [*Do I need Developer Settings to use Bread?*](#setup-and-basic-use/do-i-need-developer-settings-to-use-bread)

### What should I do if I lose my recovery phrase?

If you can still unlock Bread, keep that device secure. If the recovery phrase is still stored there, open **Settings**, then **Recovery Phrase** under **Security**, and follow the reveal and authentication prompts. Back it up offline.

If you previously removed the phrase, Bread cannot display it again. Do not reset, sign out, uninstall, or erase app data while this is your only working access.

Guardian backs up account state, not your recovery phrase. Losing the phrase and every device that holds your keys leaves no supported way for support or Guardian to restore your wallet.

If the wallet remains usable but the phrase is lost, contact [support](/feedback) for guidance before taking a destructive action. Never send your phrase, keys or password. Anyone claiming to reconstruct your lost recovery phrase is a scammer.

### What is the difference between a recovery phrase and an encrypted wallet file?

This article is held back while encrypted-file recovery is reviewed for released wallet versions. Do not rely on an encrypted file as a verified recovery method for your installation.

Keep your recovery phrase offline and confirm a supported recovery path before resetting or reinstalling. See [*How do I restore my wallet with a recovery phrase?*](#security-and-recovery/how-do-i-restore-my-wallet-with-a-recovery-phrase)

## Key concepts

### What is delegate proof generation?

Delegated proof generation lets Bread Wallet use a remote prover to handle heavy computation. Your device still signs transactions with your key. The prover only helps generate the cryptographic proof, so the wallet can work faster.

### What is Guardian?

Guardian is a recovery and backup layer for private accounts. Because Miden keeps some account data private and local to you, losing a device can also mean losing access to that account data. Guardian helps back up and recover that data on a new device.

Guardian does not hold your recovery phrase and cannot move funds by itself.

To learn what information Guardian stores, see [*What does Guardian back up?*](#security-and-recovery/what-does-guardian-back-up) For what it can and can't do, see [*Can Guardian move my funds or lock me out?*](#guardian-protection/can-guardian-move-my-funds-or-lock-me-out)

### What is a private account?

A private Miden account keeps its full state off-chain. The public blockchain records a cryptographic commitment, a fingerprint of the state, rather than publishing the balance and account data. Public Miden accounts record their full state on-chain.

Standard Bread setup creates a private Guardian-backed account. Guardian can see the account state it backs up; other users cannot inspect that state merely by looking up the account.

A recovery phrase restores keys, but private account recovery also needs account state. Guardian supplies the supported backup for standard Bread accounts. Developer-created accounts without Guardian need a separate recovery plan and are outside this consumer guide.

Public notes and external-chain transactions can still reveal transfer details. See [*What can other people see about my account on the blockchain?*](#public-and-private-transactions/what-can-other-people-see-about-my-account-on-the-blockchain)

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

Recall height is the block height after which the sender can reclaim a note, if the note supports recall and the recipient has not already accepted it. Reaching that height makes recall possible; it does not automatically add the funds back to the sender's spendable balance.

Check the expiration information shown in **Activity**. The sender may need to accept the reclaimable transfer to bring it back into their balance.

To accept a transfer, see [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)

## Troubleshooting

### My transfer shows as confirmed, but the token never arrived.

When a send shows as **Confirmed** in **Activity**, the transaction is on the blockchain and the tokens have left your wallet. It does not mean the recipient has them yet: tokens arrive as a note that the recipient has to accept.

**1. Ask the recipient to check their Pending tab**

Incoming tokens wait in **Activity**, on the **Pending** tab, until the recipient selects **Accept Transfer**. Eligible USDCX transfers can be accepted automatically when **Auto-accept USDCX transfers** is on. Other transfers may need manual acceptance. If the recipient selected **Decline**, the transfer is only hidden on their device, and they can restore it in **Activity**. For the steps, see [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)

**2. If the recipient never accepts it**

A recallable send has an expiration shown as **Expiration Date** before you send. If the recipient has not accepted it by then, it becomes eligible for you to reclaim. Check your **Pending** tab in **Activity** and select **Accept Transfer** when the reclaimable transfer appears. Expiration alone does not add it to your spendable balance.

**Still missing after an hour?**

If the recipient can't find it, they can check [*Why is my token taking so long to arrive?*](#common-issues-and-support/why-is-my-token-taking-so-long-to-arrive) If it's still missing, report it to our [**SUPPORT**](/feedback).

Never include your recovery phrase or password.

### My transfer is stuck on Accepting stage

If a transaction appears stuck on the **Accepting…** stage, the wallet is still working in the background and will often resolve it on its own within a few minutes. No action is needed in most cases.

If it stays stuck, the wallet may mark it as failed or **Interrupted**. An interrupted screen does not prove the transaction stopped before reaching the network. Let the wallet sync and check **Activity** and your balance before selecting **Retry**. Do not start another acceptance while the first may still be processing.

**If it keeps getting stuck:**

Retry your stuck transfers one at a time instead of all together.

1. Select **Settings** (the gear icon), then select **General**.

   ![Bread Wallet's Settings page, with General under Preferences](E28-consume-settings-general.png)

2. Turn off **Auto-accept USDCX transfers**.

3. Wait until nothing shows **Accepting…**. Turning the setting off does not stop a transfer that is already being claimed.
4. Open **Activity** and select the **Pending** tab. Choose one transfer that failed to consume and select its **Retry** button. Wait for it to finish before you retry the next one.
5. When all your stuck transfers have gone through, turn **Auto-accept USDCX transfers** back on.

Each transfer you retry is a separate transaction with its own network fee, so retrying them one at a time costs more than claiming them together.

For how to retry a single transfer, see [*What should I do if accepting a transfer fails?*](#common-issues-and-support/what-should-i-do-if-accepting-a-transfer-fails)

### Send stuck in the Sending phase

While a send is in progress, it shows as **Sending** in **Activity**. On the browser extension it keeps going in the background even if you close the wallet, and you'll get a notification if it fails.

If a send cannot finish, it may show **Transaction failed**. After an app or browser interruption, it may show **Interrupted — check your activity after it syncs**. Timeouts depend on the platform and transaction stage; keep the wallet connected and let it sync before deciding what to do next.

**Before you try again:**

Occasionally a failed send has already reached the network just before it stopped. Let your wallet sync, then check your balance and **Activity**.

To try again, open the failed send in **Activity** and select its **Retry** button. The wallet checks whether the send already went through. If the outcome is uncertain, wait for sync and check your balance and the recipient before retrying; do not start a second send while the first may still be processing.

If the send shows as **Confirmed** but the recipient doesn't have it, see [*My transfer shows as confirmed, but the token never arrived.*](#common-issues-and-support/my-transfer-shows-as-completed-but-the-token-never-arrived)

### Why is my token taking so long to arrive?

Incoming tokens usually show up within a few moments. If they're taking longer, check these first:

1. **Open and unlock your wallet.** Bread checks for incoming tokens every few seconds while it's open. On mobile it only checks while the app is open; on the browser extension it also checks in the background about once a minute.
2. **Check the Pending tab.** Incoming tokens wait in **Activity**, on the **Pending** tab, until you select **Accept Transfer**. Eligible USDCX transfers can be accepted automatically when **Auto-accept USDCX transfers** is on. See [*How do I accept a pending transfer?*](#activity-and-transaction-status/how-do-i-accept-a-pending-transfer)
3. **Check for a connection banner.** If a banner at the top of the wallet says **You appear to be offline** or **Cannot reach the Miden node**, the wallet can't check for new tokens. Check your internet connection, then select **Try again** or **Retry sync**. If the Miden network is down or busy, your tokens appear once it's reachable again.

If there is still nothing after an hour, report it to our [**SUPPORT**](/feedback).
