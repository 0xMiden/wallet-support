# Bread FAQ: final content for implementation

Thirty-five articles. Platform: both Extension and Mobile, one body each, except articles 29 to 35, which are Extension only until they are checked on a phone. Text is verbatim and approved; do not edit.

## Placement

| # | Title | Main category | Subcategory |
|---|---|---|---|
| 1 | What is Bread Wallet? | Getting started | Setup and basic use |
| 2 | Why should I pick a Guardian-backed account over a more private one? | Guardian | Guardian protection |
| 3 | What are the three keys in a Guardian-backed account? | Guardian | Guardian protection |
| 4 | What is the emergency key? | Guardian | Guardian protection |
| 5 | What is the everyday key? | Guardian | Guardian protection |
| 6 | What is the Guardian key? | Guardian | Guardian protection |
| 7 | Can Guardian move my funds or lock me out? | Guardian | Guardian protection |
| 8 | How do I switch Guardian operators? | Guardian | Guardian protection |
| 9 | What can other people see about my account on the blockchain? | Privacy | Public and private transactions |
| 10 | Can I get my wallet back if I lose my device? | Manage wallet | Security and recovery |
| 11 | What does Guardian back up? | Manage wallet | Security and recovery |
| 12 | How does recovery work with Guardian? | Manage wallet | Security and recovery |
| 13 | Can I send funds to another blockchain? | Cross-chain | Moving across chains |
| 14 | What is the difference between a solver route and a canonical bridge? | Cross-chain | Moving across chains |
| 15 | Can I swap tokens across chains? | Cross-chain | Moving across chains |
| 16 | Can I earn yield in Bread? | Earn | Earning yield |
| 17 | Are my funds private while they earn? | Earn | Earning yield |
| 18 | How do I accept a pending transfer? | Manage wallet | Activity and transaction status |
| 19 | What should I do if accepting a transfer fails? | Troubleshooting | Common issues |
| 20 | What do I need before I can use Earn? | Earn | Earning yield |
| 21 | How do I deposit into Earn? | Earn | Earning yield |
| 22 | How do I check my Earn position? | Earn | Earning yield |
| 23 | How do I withdraw from Earn? | Earn | Earning yield |
| 24 | Can I withdraw part of my position? | Earn | Earning yield |
| 25 | What does it cost to use Earn? | Earn | Earning yield |
| 26 | What should I do if an Earn deposit or withdrawal fails? | Earn | Earning yield |
| 27 | Do I keep my Earn position if I restore my wallet? | Earn | Earning yield |
| 28 | Do spending limits apply to Earn deposits? | Earn | Earning yield |
| 29 | How do I remove my recovery phrase from my device? | Manage wallet | Security and recovery |
| 30 | How do I view my recovery phrase? | Manage wallet | Security and recovery |
| 31 | How do I reveal my keys in Bread Wallet? | Manage wallet | Security and recovery |
| 32 | How do I rotate my everyday key? | Guardian | Guardian protection |
| 33 | How do I set a spending limit? | Manage wallet | Security and recovery |
| 34 | How do I manage the dApps connected to my wallet? | Manage wallet | Security and recovery |
| 35 | How do I save a contact in Bread Wallet? | Manage wallet | Sending, receiving, and claiming |

New main categories, last in category order: Cross-chain, with the subcategory Moving across chains (articles 13–15), then Earn, with the subcategory Earning yield (16–17). Within every subcategory, new articles go after the existing ones, in the order above. Articles 18 and 19 were added on 2026-09-23 (Ivan): 18 is the first article in Activity and transaction status, and 19 goes after the existing Common issues articles. Articles 20 to 28 were added on 2026-10-06 (Ivan): they go after 16 and 17 in Earning yield, in the order above. Articles 29 to 35 were added on 2026-10-09 (Ivan), written against wallet 1.17.1: they go after the existing articles in their subcategories, in the order above, and 35 is the first FAQ article in Sending, receiving, and claiming.

## Images

Five files in `faq-images/`, referenced below by filename: guardian-backed-or-more-private.png, three-keys-always-in-control.png, private-from-other-users.png, across-chains-two-routes.png, earn-across-the-privacy-line.png

## Articles

### 1. What is Bread Wallet?
Category: Getting started › Setup and basic use

Bread is a private wallet on Miden, built for sending, receiving, swapping, and earning yield.

Underneath, your account is private by default and, with Guardian, stays recoverable without ever handing over control. Privacy is built in, and the complexity is handled for you so the experience stays simple.

- **Private from other users.** The people you transact with can see their own transaction, but not the rest of your balance or history. Neither can anyone else watching the chain.
- **Recoverable and still yours.** With a Guardian-backed account, a lost or stolen device isn't the end of the story, and no single key can move funds alone.
Related: *What is a private account?*, *What is Guardian?*, *How to install Bread Wallet*

### 2. Why should I pick a Guardian-backed account over a more private one?
Category: Guardian › Guardian protection

Setting up Bread comes down to one real decision: whether to back your account up with Guardian, a third-party service that makes privacy practical to use.

![](guardian-backed-or-more-private.png)

**Guardian-backed (recommended)**

A Guardian-backed account can be recovered on a new device and is protected by more than one key, so a lost or stolen device isn't the end of the story. The trade-off is that the Guardian operator can see the account state. This allows Guardian to keep the account backup up to date without being able to move funds on its own.

**More private**

A more private account keeps everything on the device and shares nothing with a Guardian operator. In return, there's no recovery: lose the device and the account state is gone, along with the funds.

Both options are private from other users. The choice is about recovery, and about who else can see the state. For most users, Guardian offers the best balance between privacy and practical recovery.

To set up either account type, see *How do I create a Bread Wallet?*

### 3. What are the three keys in a Guardian-backed account?
Category: Guardian › Guardian protection

A Guardian-backed account spreads control across three keys:

- an **everyday key**, stored on your device, for regular wallet actions,
- an **emergency key**, recreated from your recovery phrase, and
- the **Guardian key**, which acknowledges state updates.
The rule tying them together is simple: every action needs two of the three keys, so no single key can move funds alone.

![](three-keys-always-in-control.png)

Switching Guardian takes both the everyday key and the emergency key, and leaves out the Guardian key being replaced.

The result is that Guardian acknowledges state updates but can never act on its own, and you can walk away from it at any time using your own two keys.

Related: *What is the emergency key?*, *What is the everyday key?*, *What is the Guardian key?*

### 4. What is the emergency key?
Category: Guardian › Guardian protection

The emergency key is recreated from your recovery phrase when you need it. Some wallet screens call it your **Guardian recovery key** or your **recovery (cold) key**; it is the same key.

It is used in two situations: replacing a lost device and switching Guardian. On a new device, the recovery phrase rebuilds the emergency key. Together, the emergency key and Guardian unlock the backed-up state and establish a fresh everyday key tied to the new device.

Guardian keeps the backup, and the emergency key keeps control. Keep your recovery phrase offline and never share it.

Related: *What should I do if I lose my recovery phrase?*, *How does recovery work with Guardian?*

### 5. What is the everyday key?
Category: Guardian › Guardian protection

The everyday key lives on your device and is used for regular wallet actions. When you click **Send**, the everyday key signs the transaction locally, protected by your device's biometrics or your wallet password.

Sending, receiving, swapping, and earning take the everyday key plus Guardian. On its own, the everyday key cannot move funds.

If your device is lost or changed, a fresh everyday key is established with the emergency key plus Guardian. See *Can I get my wallet back if I lose my device?*

Related: *What is the emergency key?*, *What is the Guardian key?*

### 6. What is the Guardian key?
Category: Guardian › Guardian protection

The Guardian key is held by Guardian, and it acknowledges state updates.

Guardian acknowledges state updates but can never act on its own. It never holds funds. Because switching Guardian takes the everyday key and the emergency key, you can walk away from it at any time using your own two keys.

Related: *What is Guardian?*, *Can Guardian move my funds or lock me out?*

### 7. Can Guardian move my funds or lock me out?
Category: Guardian › Guardian protection

Guardian cannot move your funds by itself or take permanent control of your account.

Every action needs two of the three keys, so no single key can move funds alone. Guardian holds only one key, which means it acknowledges state updates but can never act on its own.

You hold the other two: the everyday key and the emergency key. Those keys let you switch Guardian operators. See *How do I switch Guardian operators?*

A Guardian outage, refusal, or sync problem can temporarily interrupt ordinary Guardian-backed transactions while Bread verifies or repairs the connection. If automatic repair cannot finish, the wallet prompts you to switch operators. Keep your recovery phrase safe so you can use the emergency key when a rotation is required.

For the full picture of why and how Guardian coordinates without ever taking custody, see *What is Guardian?*

### 8. How do I switch Guardian operators?
Category: Guardian › Guardian protection

Switching Guardian uses your everyday key and your emergency key, so have your recovery phrase ready before you start. In the wallet, this is called **Rotate Guardian**. For how these keys work, see *What are the three keys in a Guardian-backed account?*

**Steps:**

1. From the wallet homepage, open **Settings** (lower-right corner).

   ![Bread Wallet's Home page, with Settings in the lower-right corner](E19-guardian-home.png)

2. Go to the **Security** section and select **Guardian Settings**.

   ![Bread Wallet's Settings page, with Guardian Settings under Security](E20-guardian-settings-menu.png)

3. Click **Rotate Guardian**.

   ![Bread Wallet's Guardian Settings page, with the Rotate Guardian button](E21-guardian-settings.png)

4. On the **Rotate Guardian** page, select your choice of Guardian, then click **Continue**.

   ![Bread Wallet's Choose your Guardian page, with the Continue button](E22-guardian-choose.png)

5. On the **Review rotation** page, click **Continue**.

   ![Bread Wallet's Review rotation page, with the Continue button](E23-guardian-review.png)

6. A password page will appear to authenticate the switch. Enter your wallet password, then click **Continue**.

   ![Bread Wallet's Enter password page, with the Continue button](E32-guardian-password.png)

7. A processing page will appear. You can hide it or wait until the process is complete, then click **Done** once the switch succeeds.

   ![Bread Wallet's Processing page, with the Hide button](E33-guardian-processing.png)

   ![Bread Wallet's Success page after the Guardian switch, with the Done button](E34-guardian-rotated.png)

### 9. What can other people see about my account on the blockchain?
Category: Privacy › Public and private transactions

On most chains, an account's balance and full history live on a public ledger that anyone can read. Miden works differently: a private account keeps its state (its balances and its history) on your device, and the only things that ever reach the publicly readable chain are the account's address and a commitment to that state. A commitment is a hash of the state, a short cryptographic fingerprint that gives nothing away about its contents.

From outside, the chain shows only that an account exists and that its state changed. What was done and how much moved stay private. When you look up an account on a block explorer, you'll see that it exists and that its state has changed, but you won't see what changed or how.

![](private-from-other-users.png)

This is what private from other users means: the people you transact with can see their own transaction, but they cannot inspect the rest of your balance or history. Neither can anyone else watching the chain.

Related: *What is a private account?*, *What is a private note?*

### 10. Can I get my wallet back if I lose my device?
Category: Manage wallet › Security and recovery

It depends on the account type you chose at setup.

**Guardian-backed account: yes.** Because Guardian keeps a backup of the account, a lost device doesn't have to mean a lost wallet. On a new device, your recovery phrase restores the account from that backup. See *How do I restore my wallet with a recovery phrase?*

**More private account: no.** A more private account keeps everything on the device and shares nothing with a Guardian operator. Lose the device and the account state is gone, along with the funds.

A lost device is not the same as a lost recovery phrase. If you have lost your recovery phrase, see *What should I do if I lose my recovery phrase?*

### 11. What does Guardian back up?
Category: Manage wallet › Security and recovery

Guardian keeps a backup of the account's state, meaning its balances and history.

It works like the backup process on a phone, except it automatically refreshes with every transaction so the saved copy stays up to date. On Miden, because accounts are private by default, recovery is harder than it sounds. There is no public history to rebuild from: recovering the account requires both its latest state and the keys needed to regain control.

Guardian keeps the backup, and the emergency key keeps control. Guardian never holds funds. See *Can Guardian move my funds or lock me out?*

### 12. How does recovery work with Guardian?
Category: Manage wallet › Security and recovery

On a new device, the recovery phrase rebuilds the emergency key. Together, the emergency key and Guardian unlock the backed-up state and establish a fresh everyday key tied to the new device.

The full round trip across your device, Guardian, and Miden:

1. Your new device requests the state, signed by the emergency key.
2. Guardian returns the state snapshot.
3. Your device generates a new everyday key and proposes the key update, signed by the emergency key.
4. Guardian validates the key update, then acknowledges it.
5. Your device submits the proof for the new state to Miden.
The device drives recovery, Guardian acknowledges the recovery update, and only a commitment lands on-chain. Guardian keeps the backup, and the emergency key keeps control.

For the in-app steps, see *How do I restore my wallet with a recovery phrase?*

### 13. Can I send funds to another blockchain?
Category: Cross-chain › Moving across chains

Bread Beta can move supported test assets between Miden testnet and Ethereum Sepolia.

> ⚠️ **Test funds only:** connect an Ethereum Sepolia wallet and use only testnet assets. Never send funds from Ethereum mainnet or any other network with real assets.

The routes and assets available in Bread depend on the current Beta configuration. The wallet shows only the routes it can use for that transfer. See *What is the difference between a solver route and a canonical bridge?*

### 14. What is the difference between a solver route and a canonical bridge?
Category: Cross-chain › Moving across chains

Bread Beta runs on Miden testnet and Ethereum Sepolia. Use test funds only; never connect a wallet holding real assets for a bridge transfer.

Bread may offer several routes across those test networks, and the difference is how funds are handled along the way. The wallet shows a route only when it is configured for the selected asset and destination.

When available, the fast route uses a solver, as is typical of intent-based protocols like Epoch or NEAR Intents. The solver briefly holds the test funds and delivers the equivalent on the other side. This route can swap the token in transit, but it may be unavailable and supports only configured tokens.

For a configured direct transfer, a canonical bridge transfers the specified test asset without a solver: funds are claimed on arrival, with no swap in transit.

To swap tokens, see *Can I swap tokens across chains?*

![](across-chains-two-routes.png)

### 15. Can I swap tokens across chains?
Category: Cross-chain › Moving across chains

Cross-chain swaps are available only when Bread Beta shows a configured fast route for the selected test asset and destination. When available, a solver can swap the token in transit and deliver the equivalent on the other side. Use only Miden testnet and Ethereum Sepolia test funds; never use assets from Ethereum mainnet or another real network.

Swaps within Miden use Miden-native Swap. For how the fast route works, see *What is the difference between a solver route and a canonical bridge?*

### 16. Can I earn yield in Bread?
Category: Earn › Earning yield

Not yet. Earn is unavailable in the current Bread Beta. Do not send real funds to test this feature.

When Earn becomes available, the wallet will show the supported test networks, assets, and lending route. Funds will be routed from Bread to the displayed lending market and returned to Bread on withdrawal.

There's one privacy point worth knowing: the funds are private on Miden, become visible on Ethereum while they earn, and return to your private account on the way back. See *Are my funds private while they earn?*

### 17. Are my funds private while they earn?
Category: Earn › Earning yield

Earn is unavailable in the current Bread Beta. When it becomes available, funds will not be private while they earn:

- **On Miden:** your balance and activity are hidden.
- **While they earn:** the funds sit in the displayed lending market, where the amount and the yield are visible.
- **On the way back:** the funds return to your private account on Miden.
Use only the test networks and test assets shown in the wallet. For how Earn will work, see *Can I earn yield in Bread?*

![](earn-across-the-privacy-line.png)

### 18. How do I accept a pending transfer?
Category: Manage wallet › Activity and transaction status

When someone sends you tokens, they show up as a pending transfer on the **Activity** page. The tokens are added to your balance after you accept the transfer.

**Steps:**

1. Open Bread Wallet and select the **Activity** tab.

   ![Bread Wallet's Activity page, with a pending transfer and the Accept Transfer button](E24-accept-activity.png)

2. Select the **Pending** tab to see only the transfers you haven't accepted yet.

   ![Bread Wallet's Activity page, with the Pending tab selected](E25-accept-pending-tab.png)

3. Select a transfer card to expand it, and check the **From** address and **Amount** before you accept.

   ![Bread Wallet's Activity page, with a transfer card expanded to show From and Amount](E26-accept-transfer-card.png)

4. Select the **Accept Transfer** button. The button changes to **Accepting…** while the wallet adds the tokens to your balance.
5. Once accepted, the transfer leaves the **Pending** tab. Select the **Received** tab to find it as **Received**, marked **Confirmed**. Select it to see the details of the transaction.

   ![Bread Wallet's Activity page, with the Received tab selected and the transfer marked Confirmed](E27-accept-received-tab.png)

To accept everything at once, select **Accept All** in the row above the list on the **Pending** tab, which shows how many transfers are waiting and their total.

If accepting fails, see *What should I do if accepting a transfer fails?*.

**Important note:** If the expanded card shows a date when the transfer returns to the sender, accept it before then. After that date, the tokens return to the sender.

**Decline** only hides a transfer from **Activity** on this device. It does not return the tokens to the sender or delete the transfer. To bring hidden transfers back, select the **Pending** tab, then select the **Restore** button next to **Hidden transfers**.

Only MIDEN token is accepted automatically, when **Auto-accept MIDEN transfers** is on in **General** settings, so it may not appear as a pending transfer.

### 19. What should I do if accepting a transfer fails?
Category: Troubleshooting › Common issues

If accepting a transfer fails, the transfer stays in your **Activity** list and its **Accept Transfer** button changes to a **Retry** button.

**Steps:**

1. Open Bread Wallet and select the **Activity** tab.

   ![Bread Wallet's Activity page, with a transfer showing the Retry button](E30-accept-fails-activity.png)

2. Select the **Pending** tab and find the transfer card that shows a **Retry** button.

   ![Bread Wallet's Activity page, with the Pending tab selected and the Retry button](E31-accept-fails-pending-tab.png)

3. Select the **Retry** button to try again.

If the expanded card shows a date when the transfer returns to the sender, try again before then.

If it keeps failing, see *My transfer is stuck on Accepting stage*, or report it to our [**SUPPORT**](/feedback).

To learn how accepting works, see *How do I accept a pending transfer?*.

### 20. What do I need before I can use Earn?
Category: Earn › Earning yield

Earn works with USDC on Miden Testnet. You need two things in your wallet:

- **USDC** to deposit. An incoming USDC transfer is not accepted automatically, so accept it on the **Activity** page first. See *How do I accept a pending transfer?*
- **MIDEN** to pay the network fee. The network fee is always paid in MIDEN, so it cannot be paid in USDC.

Use only the test networks and test assets shown in the wallet. To make a deposit, see *How do I deposit into Earn?*

### 21. How do I deposit into Earn?
Category: Earn › Earning yield

Depositing opens a position in a vault. Your USDC leaves your Miden balance and starts earning in the lending market.

**Steps:**

1. Open Bread Wallet and select the **Earn** tab.

   ![Bread Wallet's Earn page, with Featured Vaults and no active positions](E35-earn-tab.png)

2. Under **Featured Vaults**, select a vault to see its details, then select the **Deposit** button.

   ![Bread Wallet's vault page, with the Deposit button](E36-earn-vault.png)

3. Enter the amount of USDC and select the **Confirm** button.

   ![Bread Wallet's Deposit Amount page, with an amount entered](E37-earn-deposit-amount.png)

4. Check the **Deposit Amount**, **Route**, **Estimated time** and **Max network fee**, then select the **Open position** button.

   ![Bread Wallet's deposit review page, with the Open position button](E38-earn-deposit-review.png)

5. The wallet shows **Generating Transaction** while it processes the deposit. You can select **Hide** and keep using the wallet.

   ![Bread Wallet's Generating Transaction page for an Earn deposit](E39-earn-deposit-generating.png)

6. When it is done, the wallet shows **You're Earning!** Select the **Done** button.

   ![Bread Wallet's success page for an Earn deposit, showing You're Earning!](E40-earn-deposit-success.png)

Your position appears under **Current Positions** on the **Earn** tab. See *How do I check my Earn position?*

Before you deposit, see *What do I need before I can use Earn?*

### 22. How do I check my Earn position?
Category: Earn › Earning yield

Your positions are on the **Earn** tab, with what you deposited and what it has earned.

**Steps:**

1. Open Bread Wallet and select the **Earn** tab. **Your Earnings** shows **Total Deposited** and **Estimated Rewards** across all your positions.

   ![Bread Wallet's Earn page, with a position under Current Positions](E41-earn-tab-position.png)

2. Under **Current Positions**, select a position to open it.

   ![Bread Wallet's position page, with the Deposit more and Withdraw buttons](E42-earn-position.png)

The position page shows **Deposited**, **Total Earned**, **APY**, **Daily Avg**, **Time Active** and **Started**. A value shows a dash until the wallet has data for it.

To add to the position, select the **Deposit more** button and follow the steps in *How do I deposit into Earn?*

### 23. How do I withdraw from Earn?
Category: Earn › Earning yield

Withdrawing closes your position and returns the USDC to your Miden balance.

**Steps:**

1. Open Bread Wallet, select the **Earn** tab, and select your position under **Current Positions**.
2. Select the **Withdraw** button.
3. Check the **Withdraw Amount**, **Route** and **Estimated time**, then select the **Withdraw** button.

   ![Bread Wallet's withdrawal review page, with the Withdraw button](E43-earn-withdraw-review.png)

4. The wallet shows **Processing Withdrawal**, then **Withdrawal Started!** Select **View in Activities** to follow it.

   ![Bread Wallet's Withdrawal Started! page, with the View in Activities button](E45-earn-withdraw-started.png)

5. On the **Activity** page, **Withdraw from Earn** shows **Redeeming**, then **Delivering**.

   ![Bread Wallet's Activity page, with a Withdraw from Earn transaction](E46-earn-withdraw-activity.png)

6. When the USDC arrives, it appears as a **Received** transfer. Select the **Accept Transfer** button to add it to your balance.

A withdrawal returns your whole position. See *Can I withdraw part of my position?*

To learn how accepting works, see *How do I accept a pending transfer?*

### 24. Can I withdraw part of my position?
Category: Earn › Earning yield

No. A withdrawal returns your whole position. The review page shows **Withdrawal** as **Full position (gasless)**.

To keep some funds earning, withdraw and then deposit the amount you want to keep. See *How do I withdraw from Earn?*

### 25. What does it cost to use Earn?
Category: Earn › Earning yield

- **Depositing** costs a network fee, paid in MIDEN. The review page shows the **Max network fee** before you confirm, and the success page shows the **Network Fee** you paid.
- **Withdrawing** is gasless: you pay no network fee.

The network fee cannot be paid in USDC. See *What do I need before I can use Earn?*

### 26. What should I do if an Earn deposit or withdrawal fails?
Category: Earn › Earning yield

If a deposit fails, the wallet shows **Transaction Failed** and your USDC stays in your balance.

**Steps:**

1. On the **Transaction Failed** page, select **View in Activities**.

   ![Bread Wallet's Transaction Failed page for an Earn deposit](E47-earn-deposit-failed.png)

2. Wait for the wallet to sync, and check that you have MIDEN for the network fee.
3. Make the deposit again. See *How do I deposit into Earn?*

When you withdraw, the returning funds arrive as a **Received** transfer on the **Activity** page. If it shows a **Retry** button, see *What should I do if accepting a transfer fails?*

If it keeps failing, report it to our [**SUPPORT**](/feedback).

### 27. Do I keep my Earn position if I restore my wallet?
Category: Earn › Earning yield

Yes, if your wallet is backed up with Guardian. Restore the wallet and your position appears again under **Current Positions** on the **Earn** tab.

Without Guardian, losing your device means losing the wallet and the position with it.

To restore, see *How do I restore my wallet with a recovery phrase?*

### 28. Do spending limits apply to Earn deposits?
Category: Earn › Earning yield

Yes. An Earn deposit counts towards your daily spending limit, based on its value in USD. Withdrawals bring funds back to your wallet and do not count.

This applies to the current release and will change at public mainnet.

### 29. How do I remove my recovery phrase from my device?
Category: Manage wallet › Security and recovery

Removing your recovery phrase deletes it from this device, so someone who gets into your wallet cannot read it. Your wallet keeps working for everyday transactions. You will need to type the recovery phrase when you switch Guardian or rotate your everyday key, so write it down first.

**Steps:**

1. Select **Settings** (the gear icon), then select **Recovery Phrase** under **Security**.

   ![Bread Wallet's Settings page, with Recovery Phrase under Security](E48-settings-menu.png)

2. Select **Remove recovery phrase**.

   ![Bread Wallet's Recovery Phrase page, with Reveal recovery phrase and Remove recovery phrase](E49-recovery-phrase-menu.png)

3. On the **Verify recovery phrase** page, make sure no one can see your screen, then select **Continue**.

   ![Bread Wallet's Verify recovery phrase page, with the Continue button](E50-remove-phrase-verify.png)

4. Enter your wallet password and select **Continue**.
5. Your 12 words appear, numbered in order. Write all of them on paper in that order, and keep the paper in a safe place outside this device. Select **Continue**.
6. Select the first and last words of your phrase to confirm you saved it, then select **Continue**.
7. Select **Remove from this device**.

The wallet then shows **Recovery phrase removed from this device**, and **Recovery Phrase** no longer appears in **Settings**.

Related: *How do I view my recovery phrase?*, *What should I do if I lose my recovery phrase?*

### 30. How do I view my recovery phrase?
Category: Manage wallet › Security and recovery

You can show your recovery phrase again at any time, as long as it is still stored on this device.

**Steps:**

1. Select **Settings** (the gear icon), then select **Recovery Phrase** under **Security**.
2. Select **Reveal recovery phrase**.
3. Make sure no one can see your screen, then select **View**.

   ![Bread Wallet's Recovery Phrase page with the phrase covered, and the View button](E51-reveal-phrase-notice.png)

4. Enter your wallet password and select **Continue**.
5. Your 12 words appear. Write them down, or select **Copy**. Select **Hide Recovery Phrase** when you are done.

If **Recovery Phrase** is missing from **Settings**, the phrase has been removed from this device and can no longer be shown here.

> ⚠️ **Important note:** Anyone who knows your recovery phrase can access your wallet and funds. Never share it.

Related: *How do I keep my wallet secure?*, *How do I remove my recovery phrase from my device?*

### 31. How do I reveal my keys in Bread Wallet?
Category: Manage wallet › Security and recovery

Bread Wallet can show the keys your account signs with: your Miden everyday key and your EVM key. Most people never need them. Reveal them only when you are setting the account up somewhere that asks for them.

**Steps:**

1. Select **Settings** (the gear icon), then select **Keys** under **Security**.
2. Select **Reveal Private Key**.
3. Read the **Before you reveal your private keys** warning, enter your wallet password and select **Continue**.

   ![Bread Wallet's page for revealing the keys, with the warning and the password field](E52-reveal-keys-warning.png)

4. The wallet shows a QR code that holds both keys. Select **Show keys as text** to see the **Miden everyday private key** and the **EVM private key** written out, or **Show QR code** to go back.

The page hides the keys again after a short time. Enter your password again if you need more time.

> ⚠️ **Important note:** Keep both keys secret. Anyone with them can control your Miden and EVM assets. Rotating your everyday key does not change or protect a leaked EVM key.

If you think your everyday key has leaked, see *How do I rotate my everyday key?*

### 32. How do I rotate my everyday key?
Category: Guardian › Guardian protection

Rotating creates a new everyday key and replaces the current one on-chain. Do this if you suspect your device is compromised. Your account, address and funds stay the same.

**Steps:**

1. Select **Settings** (the gear icon), then select **Keys** under **Security**.
2. Select **Rotate everyday key**.

   ![Bread Wallet's Keys page, with the Rotate everyday key button](E53-keys.png)

3. Read the confirmation message that appears, then select **Confirm rotation**.

   ![Bread Wallet's Keys page, with the Confirm rotation button](E54-rotate-confirm.png)

4. The wallet shows **Generating Transaction** while it works. You can select **Hide** and keep using the wallet.

   ![Bread Wallet's Generating Transaction page for a key rotation](E55-rotate-generating.png)

5. When it shows **Transaction Complete!**, select **Done**, or select **View in Activities** to see the transaction.

   ![Bread Wallet's Transaction Complete! page for a key rotation](E56-rotate-complete.png)

A rotation is a transaction, so it pays a small **Network Fee** in USDCX. If you removed your recovery phrase from this device, the wallet asks you to type it before it rotates.

Related: *What is the everyday key?*, *How do I reveal my keys in Bread Wallet?*

### 33. How do I set a spending limit?
Category: Manage wallet › Security and recovery

A spending limit caps how much your account can send in a day, measured in USD. When a transaction would go over it, the wallet stops and asks you to authenticate before it continues.

**Steps:**

1. Select **Settings** (the gear icon), then select **Spending limits** under **Security**.

   ![Bread Wallet's Spending limits page, showing No limit set](E57-spending-limits.png)

2. Type an amount, or select one of the suggested limits: **$100**, **$500**, **$1,000** or **$5,000**.

   ![Bread Wallet's Spending limits page with $500 selected, and the Save button](E58-spending-limit-preset.png)

3. Select **Save**.
4. Enter your wallet password and select **Continue**.

   ![Bread Wallet's Spending limits page, showing Current limit: $500 a day](E59-spending-limit-saved.png)

The page then shows your limit, for example **Current limit: $500 a day**.

**Changing or removing a limit:**

- Lowering a limit saves straight away.
- Raising a limit asks for your password again.
- To remove the limit, clear the amount and select **Save**, then enter your password. The page shows **No limit set**.

**Good to know:**

- **Stored on this device.** Limits and spending history are kept only on this installation. Resetting app data or reinstalling the wallet removes them.
- **A local safety check.** The limit is not an on-chain restriction. Anyone with direct access to your keys can bypass it.

Related: *Do spending limits apply to Earn deposits?*

### 34. How do I manage the dApps connected to my wallet?
Category: Manage wallet › Security and recovery

**Authorized DApps** controls whether dApps can connect to your wallet, and lists the ones that already have.

**To turn dApp connections on or off:**

1. Select **Settings** (the gear icon), then select **Authorized DApps** under **Developer**.
2. Use the **DApps Interaction** switch. When it is off, dApps cannot connect or see your balance.

   ![Bread Wallet's Authorized DApps page, with the DApps Interaction switch](E60-authorized-dapps.png)

**To disconnect a dApp:**

1. On the **Authorized DApps** page, select **See connected**. This row appears only when a dApp is connected to the current account.
2. Find the dApp. Each one shows its **Origin**, **Network**, **Account** and **Permissions**.
3. Select **Disconnect**, then select **Disconnect** again on the **Confirm the action** message.

The dApp must ask to connect again before it can see your account.

### 35. How do I save a contact in Bread Wallet?
Category: Manage wallet › Sending, receiving, and claiming

The **Address Book** saves addresses under a name, so you can send to a person without pasting their address each time.

**To add a contact:**

1. Select **Settings** (the gear icon), then select **Address Book** under **Preferences**.

   ![Bread Wallet's Address Book page, with the New contact button](E61-address-book.png)

2. Select **New contact**.
3. Enter the **Address**, then a **Name**. Use the full address that starts with mtst1.

   ![Bread Wallet's New contact page, with the Address and Name fields](E62-new-contact.png)

4. Select **Add Contact**.

The wallet shows **Invalid address** if the address is not valid, and **This is one of your accounts** if it is your own. Your own accounts are already listed under **My accounts**.

**To send to, rename or delete a contact:**

1. On the **Address Book** page, select the contact. Its page shows the **Address**, **Network** and the date it was **Added**.

   ![Bread Wallet's Address Book page, with a saved contact](E63-address-book-contact.png)

2. Select **Send** to start a transfer to it.
3. To rename it, select **Edit**, change the **Name**, then select **Save**.

   ![Bread Wallet's Edit contact page, with the Name field and Delete contact](E64-edit-contact.png)

4. To remove it, select **Edit**, select **Delete contact**, then select **Delete**.

   ![Bread Wallet's Delete contact message, with the Delete button](E65-delete-contact-confirm.png)
