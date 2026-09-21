---
id: what-is-the-difference-between-a-recovery-phrase-and-an-encrypted-wallet-file
title: What is the difference between a recovery phrase and an encrypted wallet file?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop, mobile]
---

They contain different wallet information, and only recovery-phrase import is available in the current Bread Wallet UI.

- A **recovery phrase** is a list of ordinary words that represents your wallet. It's easy to write on paper, but it's only as safe as where you keep it. Anyone who reads those words can restore your wallet.
- An **encrypted wallet file** is a password-protected export of wallet data. The current app can export this file but cannot import it, so do not rely on it as a working restoration method.

**A simple way to picture it:** a recovery phrase is like your key written in plain handwriting, while an encrypted wallet file is like that key locked in a box that needs a password to open.

**If Guardian is enabled:**

Guardian backs up account state so supported recovery can restore it on a new device. Guardian does not replace your recovery phrase; you still need your own keys to control the wallet.

**If Guardian is not enabled:**

Without Guardian, a private account's state remains on the device. Because encrypted-file import is unavailable, losing that device can make the private account unrecoverable even if you still have the recovery phrase.

**What this means for you:**

- If you only use a public account, your recovery phrase is your key backup. Keep it safe.
- If you use a private account, keep the device and recovery phrase secure. Enable Guardian if you want the currently supported account-state recovery path.
