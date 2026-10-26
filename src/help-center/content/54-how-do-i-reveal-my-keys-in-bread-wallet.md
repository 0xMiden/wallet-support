---
id: how-do-i-reveal-my-keys-in-bread-wallet
title: How do I reveal my keys in Bread?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop]
---

Bread can show the two keys your account signs with: your Miden everyday key and your EVM key. Most people never need them. Never paste them into a website or send them to anyone, support included.

**Steps:**

1. Select **Profile** (the person icon), then select **Keys** under **Security**.
2. Select **Reveal Private Key**.
3. Read the **Before you reveal your private keys** warning, enter your wallet password and select **Continue**.

   ![Bread Wallet's page for revealing the keys, with the warning and the password field](E52-reveal-keys-warning.png)

4. The wallet shows a QR code that holds both keys. Select **Show keys as text** to see the **Miden everyday private key** and the **EVM private key**, or **Show QR code** to go back.

The keys hide again after a short time. Enter your password again if you need more time.

> ⚠️ Anyone with these keys can control your Miden and EVM assets. Rotating your everyday key does not protect a leaked EVM key.

If you think your everyday key has leaked, see [*How do I rotate my everyday key?*](#guardian-protection/how-do-i-rotate-my-everyday-key)
