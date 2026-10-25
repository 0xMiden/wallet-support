---
id: how-do-i-reveal-my-keys-in-bread-wallet
title: How do I reveal my keys in Bread?
mainCategory: manage-wallet
subcategory: security-and-recovery
platforms: [extension-desktop]
---

Bread can show the keys your account signs with: your Miden everyday key and your EVM key. Most people never need them. Do not reveal them for ordinary wallet setup, a dApp connection, troubleshooting or feedback. Requests to paste signing keys into a site or send them to support are unsafe.

**Steps:**

1. Select **Profile** (the person icon), then select **Keys** under **Security**.
2. Select **Reveal Private Key**.
3. Read the **Before you reveal your private keys** warning, enter your wallet password and select **Continue**.

   ![Bread Wallet's page for revealing the keys, with the warning and the password field](E52-reveal-keys-warning.png)

4. The wallet shows a QR code that holds both keys. Select **Show keys as text** to see the **Miden everyday private key** and the **EVM private key** written out, or **Show QR code** to go back.

The page hides the keys again after a short time. Enter your password again if you need more time.

> ⚠️ **Important note:** Keep both keys secret. Anyone with them can control your Miden and EVM assets. Rotating your everyday key does not change or protect a leaked EVM key.

If you think your everyday key has leaked, see [*How do I rotate my everyday key?*](#guardian-protection/how-do-i-rotate-my-everyday-key)
