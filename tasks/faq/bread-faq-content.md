# Bread FAQ: content for implementation

Revised for Brian's 2026-10-14 support audit. Forty-three articles. Existing IDs are preserved. Articles 29–35 remain Extension only until their phone flows are checked. Seven new consumer topics use both platforms. Release-dependent behavior is conditional; these guides do not announce a Mainnet or App Store release. See the local review inventory for implementation evidence and unresolved release checks.

## Placement

| # | Title | Main category | Subcategory |
|---|---|---|---|
| 1 | What is Bread? | Getting started | Setup and basic use |
| 2 | Does Bread use Guardian-backed accounts? | Guardian | Guardian protection |
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
| 13 | Can I send funds to another blockchain? | Crosschain | Moving across chains |
| 14 | What is the difference between a solver route and a canonical bridge? | Crosschain | Moving across chains |
| 15 | Can I swap tokens across chains? | Crosschain | Moving across chains |
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
| 31 | How do I reveal my keys in Bread? | Manage wallet | Security and recovery |
| 32 | How do I rotate my everyday key? | Guardian | Guardian protection |
| 33 | How do I set a spending limit? | Manage wallet | Security and recovery |
| 34 | How do I manage the dApps connected to my wallet? | Manage wallet | Security and recovery |
| 35 | How do I save a contact in Bread? | Manage wallet | Sending, receiving, and claiming |
| 36 | What is the Partner Mainnet deposit limit? | Crosschain | Moving across chains |
| 37 | How do I prepare for Mainnet and check my network? | Getting started | Setup and basic use |
| 38 | Do I need Developer Settings to use Bread? | Getting started | Setup and basic use |
| 39 | What should I do before resetting or reinstalling Bread? | Manage wallet | Security and recovery |
| 40 | What should I check if a bridge deposit or withdrawal is delayed? | Troubleshooting | Common issues |
| 41 | How do I send feedback or report a problem? | Troubleshooting | Common issues |
| 42 | How do I send or receive tokens on Miden? | Manage wallet | Sending, receiving, and claiming |
| 43 | What should I check before a Swap? | Crosschain | Moving across chains |

## Articles

### 1. What is Bread?
Category: Getting started › Setup and basic use

Bread is a private wallet on Miden, built for sending, receiving, swapping, and earning yield.

Standard Bread accounts are private and Guardian-backed, with recovery through your recovery phrase and the Guardian backup. Privacy is built in, and the complexity is handled for you so the experience stays simple.

- **Private from other users.** The people you transact with can see their own transaction, but not the rest of your balance or history. Neither can anyone else watching the chain.
- **Recoverable and still yours.** With a Guardian-backed account, a lost or stolen device isn't the end of the story, and no single key can move funds alone.
Feature availability depends on your installed version and network. Mainnet access, Swap, crosschain routes and Earn are available only when your released wallet supports them. See *How do I prepare for Mainnet and check my network?*

Related: *What is a private account?*, *What is Guardian?*, *How to install Bread*

### 2. Does Bread use Guardian-backed accounts?
Category: Guardian › Guardian protection

Standard Bread setup uses a private Guardian-backed account. You choose a Guardian provider; you are not asked to choose between Guardian and an unsupported recovery setup.

Guardian keeps the account-state backup needed for recovery. The operator can see that state, but it cannot move funds on its own and never holds your recovery phrase.

Keep the recovery phrase offline. It restores your keys and, with Guardian's backup, lets you recover on a new device. See *How do I restore my wallet with a recovery phrase?*

Developer Settings can expose other account types for testing. Those accounts have different recovery requirements and are outside the standard consumer setup. See *Do I need Developer Settings to use Bread?*

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

7. If the recovery phrase was removed from this device, enter it when the official wallet asks. Do not send it to support.
8. A processing page will appear. You can hide it or wait until the process is complete, then click **Done** once the switch succeeds.

   ![Bread Wallet's Processing page, with the Hide button](E33-guardian-processing.png)

   ![Bread Wallet's Success page after the Guardian switch, with the Done button](E34-guardian-rotated.png)

### 9. What can other people see about my account on the blockchain?
Category: Privacy › Public and private transactions

On most chains, an account's balance and full history live on a public ledger that anyone can read. Miden works differently: a private account keeps its state (its balances and its history) on your device, and the only things that ever reach the publicly readable chain are the account's address and a commitment to that state. A commitment is a hash of the state, a short cryptographic fingerprint that gives nothing away about its contents.

From outside, the chain shows only that an account exists and that its state changed. The private account state is hidden, but public notes and transactions on other chains may reveal transfer details. When you look up an account on a block explorer, you'll see that it exists and that its state has changed, but you won't see what changed or how.

![](private-from-other-users.png)

This is what private from other users means: the people you transact with can see their own transaction, but they cannot inspect the rest of your balance or history. Guardian can see the state it backs up, and anyone can read the contents of a public note. Privacy depends on the transfer as well as the account.

Related: *What is a private account?*, *What is a private note?*

### 10. Can I get my wallet back if I lose my device?
Category: Manage wallet › Security and recovery

For a standard Guardian-backed Bread account, recovery on a new device uses your recovery phrase and Guardian's account-state backup. See *How do I restore my wallet with a recovery phrase?*

You still need the recovery phrase. Guardian cannot replace it or recover funds for you if the phrase and every device holding your keys are lost.

If an older installation or a developer-created account does not use Guardian, do not assume this recovery path applies. Preserve any working device and seek [support](/feedback) before resetting it.

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
Category: Crosschain › Moving across chains

Only use a crosschain route when your installed Bread version offers it for the selected network and asset.

On Testnet, use only the displayed test networks and test assets. Never send real funds to a test address. A Sepolia route is not an Ethereum Mainnet route.

On Mainnet, use real assets only after your installed version supports Mainnet and shows the exact route. Check the source chain, destination chain, token, recipient and fees before you confirm. Store updates and route availability can differ by platform.

Keep the resulting total wallet balance within the Partner Mainnet cap. See *What is the Partner Mainnet deposit limit?* For route differences, see *What is the difference between a solver route and a canonical bridge?*

### 14. What is the difference between a solver route and a canonical bridge?
Category: Crosschain › Moving across chains

A solver route fulfills a request to deliver assets on another chain. A canonical bridge uses the bridge's deposit and claim process. Their supported assets, fees, arrival times and recovery steps can differ.

Bread shows only the routes configured for the selected network and asset. A fast route can be unavailable, and a bridge transfer does not necessarily swap the token in transit. Check the route and quote before signing.

Use test assets only on Testnet routes. Mainnet routes require a released wallet that supports them; seeing a test route is not evidence that its Mainnet equivalent is available.

If a transfer is pending, follow its existing status and claim or recovery instructions rather than starting it again. See *What should I check if a bridge deposit or withdrawal is delayed?*

### 15. Can I swap tokens across chains?
Category: Crosschain › Moving across chains

A crosschain swap is available only when Bread shows a route that supports the selected source token, destination token and networks. Not every bridge route swaps tokens. A Swap within Miden is a different operation.

Check the quote, expected received amount, fees and recipient before signing. If the quote expires or changes, review the updated quote. Do not assume a route is available because another token or network works.

Use test assets on Testnet. Use Mainnet routes only when your installed released version supports them. See *What is the difference between a solver route and a canonical bridge?*

### 16. Can I earn yield in Bread?
Category: Earn › Earning yield

Earn is available only when your installed version and selected network enable it. A missing or disabled deposit control means you should not start a new deposit.

Testnet Earn uses test assets and a test lending market. Estimated rewards there do not represent real returns. Mainnet Earn must be supported by your released wallet and the route it shows; do not infer availability from these Testnet guides.

When a supported route is available, review the market, fees and expected amount before confirming. The lending-market portion can be publicly visible. See *Are my funds private while they earn?*

### 17. Are my funds private while they earn?
Category: Earn › Earning yield

Earn does not provide the same privacy as holding assets in your private Miden account.

- **On Miden:** the private account state is hidden from the public chain; Guardian can see its backup.
- **In an external lending market:** the amount, activity and rewards may be publicly visible.
- **On return:** the assets go back to your Miden account after the route completes and the transfer is accepted.

Testnet Earn uses test assets. This explanation does not announce Mainnet availability. Review the route your installed wallet offers. See *Can I earn yield in Bread?*

![](earn-across-the-privacy-line.png)

### 18. How do I accept a pending transfer?
Category: Manage wallet › Activity and transaction status

When someone sends you tokens, they show up as a pending transfer on the **Activity** page. The tokens are added to your balance after you accept the transfer.

**Steps:**

1. Open Bread and select the **Activity** tab.

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

**Important note:** If the expanded card shows an expiration date, accept the transfer before then. After that date, a recallable transfer can be reclaimed by the sender; it does not automatically become spendable in the sender's wallet.

**Decline** only hides a transfer from **Activity** on this device. It does not return the tokens to the sender or delete the transfer. To bring hidden transfers back, select the **Pending** tab, then select the **Restore** button next to **Hidden transfers**.

Eligible USDCX transfers can be accepted automatically in versions where **Auto-accept USDCX transfers** is on in **General** settings, so it may not appear as a pending transfer.

### 19. What should I do if accepting a transfer fails?
Category: Troubleshooting › Common issues

If accepting a transfer fails, the transfer stays in your **Activity** list and its **Accept Transfer** button changes to a **Retry** button.

**Steps:**

1. Open Bread and select the **Activity** tab.

   ![Bread Wallet's Activity page, with a transfer showing the Retry button](E30-accept-fails-activity.png)

2. Select the **Pending** tab and find the transfer card that shows a **Retry** button.

   ![Bread Wallet's Activity page, with the Pending tab selected and the Retry button](E31-accept-fails-pending-tab.png)

3. Select the **Retry** button to try again.

If the expanded card shows a date when the transfer returns to the sender, try again before then.

If it keeps failing, see *My transfer is stuck on Accepting stage*, or report it to our [**SUPPORT**](/feedback).

To learn how accepting works, see *How do I accept a pending transfer?*.

### 20. What do I need before I can use Earn?
Category: Earn › Earning yield

These steps describe the Testnet Earn flow when it is enabled in your installed version. Test balances and estimated rewards are for testing, not real investment returns. They do not establish that Mainnet Earn is available. Use only the networks and assets shown by your wallet.

Earn works with USDC on Miden Testnet. You need two things in your wallet:

- **USDC** to deposit. An incoming USDC transfer is not accepted automatically, so accept it on the **Activity** page first. See *How do I accept a pending transfer?*
- The fee asset and amount shown by the wallet. Keep enough for the network fee; do not assume the deposit token can pay it.

Use only the test networks and test assets shown in the wallet. To make a deposit, see *How do I deposit into Earn?*

### 21. How do I deposit into Earn?
Category: Earn › Earning yield

These steps describe the Testnet Earn flow when it is enabled in your installed version. Test balances and estimated rewards are for testing, not real investment returns. They do not establish that Mainnet Earn is available. Use only the networks and assets shown by your wallet.

Depositing opens a position in a vault. Your USDC leaves your Miden balance and starts earning in the lending market.

**Steps:**

1. Open Bread and select the **Earn** tab.

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

These steps describe the Testnet Earn flow when it is enabled in your installed version. Test balances and estimated rewards are for testing, not real investment returns. They do not establish that Mainnet Earn is available. Use only the networks and assets shown by your wallet.

Your positions are on the **Earn** tab, with what you deposited and what it has earned.

**Steps:**

1. Open Bread and select the **Earn** tab. **Your Earnings** shows **Total Deposited** and **Estimated Rewards** across all your positions.

   ![Bread Wallet's Earn page, with a position under Current Positions](E41-earn-tab-position.png)

2. Under **Current Positions**, select a position to open it.

   ![Bread Wallet's position page, with the Deposit more and Withdraw buttons](E42-earn-position.png)

The position page shows **Deposited**, **Total Earned**, **APY**, **Daily Avg**, **Time Active** and **Started**. A value shows a dash until the wallet has data for it.

To add to the position, select the **Deposit more** button and follow the steps in *How do I deposit into Earn?*

### 23. How do I withdraw from Earn?
Category: Earn › Earning yield

These steps describe the Testnet Earn flow when it is enabled in your installed version. Test balances and estimated rewards are for testing, not real investment returns. They do not establish that Mainnet Earn is available. Use only the networks and assets shown by your wallet.

Withdrawing closes your position and returns the USDC to your Miden balance.

**Steps:**

1. Open Bread, select the **Earn** tab, and select your position under **Current Positions**.
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

These steps describe the Testnet Earn flow when it is enabled in your installed version. Test balances and estimated rewards are for testing, not real investment returns. They do not establish that Mainnet Earn is available. Use only the networks and assets shown by your wallet.

No. A withdrawal returns your whole position. The review page shows **Withdrawal** as **Full position (gasless)**.

To keep some funds earning, withdraw and then deposit the amount you want to keep. See *How do I withdraw from Earn?*

### 25. What does it cost to use Earn?
Category: Earn › Earning yield

These steps describe the Testnet Earn flow when it is enabled in your installed version. Test balances and estimated rewards are for testing, not real investment returns. They do not establish that Mainnet Earn is available. Use only the networks and assets shown by your wallet.

- **Depositing** costs a network fee, paid in the fee asset shown by the wallet. The review page shows the **Max network fee** before you confirm, and the success page shows the **Network Fee** you paid.
- **Withdrawing** is gasless: you pay no network fee.

Check the displayed fee asset and maximum fee before confirming. See *What do I need before I can use Earn?*

### 26. What should I do if an Earn deposit or withdrawal fails?
Category: Earn › Earning yield

These steps describe the Testnet Earn flow when it is enabled in your installed version. Test balances and estimated rewards are for testing, not real investment returns. They do not establish that Mainnet Earn is available. Use only the networks and assets shown by your wallet.

If a deposit shows **Transaction Failed**, check its status and your balance after sync before starting another deposit. A failed or interrupted screen does not by itself prove that nothing was submitted.

**Steps:**

1. On the **Transaction Failed** page, select **View in Activities**.

   ![Bread Wallet's Transaction Failed page for an Earn deposit](E47-earn-deposit-failed.png)

2. Wait for the wallet to sync, and check that you have the displayed fee asset for the network fee.
3. Make the deposit again. See *How do I deposit into Earn?*

When you withdraw, the returning funds arrive as a **Received** transfer on the **Activity** page. If it shows a **Retry** button, see *What should I do if accepting a transfer fails?*

If it keeps failing, report it to our [**SUPPORT**](/feedback).

### 27. Do I keep my Earn position if I restore my wallet?
Category: Earn › Earning yield

These steps describe the Testnet Earn flow when it is enabled in your installed version. Test balances and estimated rewards are for testing, not real investment returns. They do not establish that Mainnet Earn is available. Use only the networks and assets shown by your wallet.

For a supported position on the same network, recovery uses your recovery phrase and the Guardian backup of your standard Bread account. Restore the wallet and your position appears again under **Current Positions** on the **Earn** tab.

Recovery does not move a Testnet position to Mainnet. Developer-created accounts without Guardian require a separate recovery plan.

To restore, see *How do I restore my wallet with a recovery phrase?*

### 28. Do spending limits apply to Earn deposits?
Category: Earn › Earning yield

These steps describe the Testnet Earn flow when it is enabled in your installed version. Test balances and estimated rewards are for testing, not real investment returns. They do not establish that Mainnet Earn is available. Use only the networks and assets shown by your wallet.

Yes. An Earn deposit counts towards your daily spending limit, based on its value in USD. Withdrawals bring funds back to your wallet and do not count.

This daily spending check is separate from the Partner Mainnet total wallet-balance cap. Do not assume future releases use the same spending rules.

### 29. How do I remove my recovery phrase from my device?
Category: Manage wallet › Security and recovery

Removing your recovery phrase deletes the stored copy from this installation, so someone who gets into your wallet cannot read it. Your wallet keeps working for everyday transactions. You will need to type the recovery phrase when you switch Guardian or rotate your everyday key, so write it down first.

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

Earlier backups may still contain the phrase. Keep them secure. If the phrase is removed, account creation and some security actions may require it again; keep your offline copy available.

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

### 31. How do I reveal my keys in Bread?
Category: Manage wallet › Security and recovery

Bread can show the keys your account signs with: your Miden everyday key and your EVM key. Most people never need them. Do not reveal them for ordinary wallet setup, a dApp connection, troubleshooting or feedback. Requests to paste signing keys into a site or send them to support are unsafe.

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

A rotation is a transaction, so it pays the **Network Fee** shown by your wallet. If you removed your recovery phrase from this device, the wallet asks you to type it before it rotates.

Related: *What is the everyday key?*, *How do I reveal my keys in Bread?*

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

Your daily spending limit does not raise or replace the Partner Mainnet total wallet-balance cap. See *What is the Partner Mainnet deposit limit?*

Related: *Do spending limits apply to Earn deposits?*

### 34. How do I manage the dApps connected to my wallet?
Category: Manage wallet › Security and recovery

This page manages your consumer wallet permissions; it is not an integration setup guide. Never provide a recovery phrase or signing key to connect a dApp.

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

### 35. How do I save a contact in Bread?
Category: Manage wallet › Sending, receiving, and claiming

The **Address Book** saves addresses under a name, so you can send to a person without pasting their address each time.

**To add a contact:**

1. Select **Settings** (the gear icon), then select **Address Book** under **Preferences**.

   ![Bread Wallet's Address Book page, with the New contact button](E61-address-book.png)

2. Select **New contact**.
3. Enter the **Address**, then a **Name**. Use the full Miden address supplied for the correct network. Do not substitute an Ethereum address or reuse a Testnet address for Mainnet.

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

### 36. What is the Partner Mainnet deposit limit?
Category: Crosschain › Moving across chains

The Partner Mainnet cap is $1,232.462 for the total wallet balance after a deposit. It is not a per-transfer allowance or a daily deposit limit.

Add the value of the proposed deposit to the existing total wallet balance. The result must be at or below $1,232.462. For example, a wallet balance of $1,000 leaves $232.462 of room. Splitting a larger amount into smaller deposits does not increase that room.

This balance cap is separate from a daily spending limit. A bridge provider may also show a smaller route limit or a minimum amount; follow the displayed route requirements as well.

Use only Mainnet routes supported by your installed version. Do not rely on a missing warning as permission to exceed the cap. See *How do I prepare for Mainnet and check my network?*

### 37. How do I prepare for Mainnet and check my network?
Category: Getting started › Setup and basic use

Mainnet and Testnet are separate networks. Testnet tokens have no real-world value and do not turn into Mainnet funds.

Before funding, update Bread through the official store, check the network shown in the wallet, and confirm that your installed version supports the route you plan to use. Store releases can differ by platform. A reviewed or announced feature is not proof that it is installed on your device.

If Bread shows a Testnet or developer-network indicator, use test assets only. Do not send real funds to a test address, and do not change endpoints to make an account appear to be on Mainnet.

If your released version offers a Mainnet upgrade, follow the wallet's instructions. Keep your recovery phrase backed up before any reset. Testnet balances and positions do not transfer to Mainnet through a wallet reset or phrase import.

If the welcome screen requires an access code, follow your invitation. Do not treat Developer Settings as an access-code workaround. If Mainnet is not offered by your installed version, wait for the supported update or contact [support](/feedback).

See *What is the Partner Mainnet deposit limit?* and *Do I need Developer Settings to use Bread?*

### 38. Do I need Developer Settings to use Bread?
Category: Getting started › Setup and basic use

No. Standard wallet use does not require custom RPC, prover, faucet or Guardian endpoints. Use the defaults supplied by your official wallet version.

Developer Settings are for developers testing integrations and separate networks. Changing them can break sync or point the wallet at a different network. A reachable endpoint does not prove that it is the right or trusted service.

After setup, **Network endpoints** may show an active override. Returning to defaults can require **Reset to defaults & re-onboard**, which erases local keys and history. Have a supported recovery path before using it. Do not reset a working wallet as a first troubleshooting step.

Developer-created accounts without Guardian do not have the standard Guardian recovery backup. Keep their data and backups separate from normal consumer accounts.

For SDK, API and custom-network integration instructions, use the [Miden developer documentation](https://docs.miden.xyz/). This Help Center covers consumer wallet use. See *How do I prepare for Mainnet and check my network?*

### 39. What should I do before resetting or reinstalling Bread?
Category: Manage wallet › Security and recovery

A reset can erase this installation's wallet keys, local history, contacts and settings. Signing out to recover a forgotten password and resetting developer endpoints can also replace local wallet data.

Before you continue:

1. Confirm that you have the recovery phrase written correctly and stored offline. A passcode, password or biometric unlock alone cannot restore a wallet on a new installation.
2. Check which network and Guardian the account uses. Standard Guardian recovery needs your phrase and its account-state backup.
3. Check **Activity**, balances and any in-flight bridge or Earn transfers. Record non-secret references you may need to follow up.
4. Keep any working installation until you have confirmed a supported recovery path. Do not assume an encrypted-file guide applies to your released version.

If you forgot the wallet password, use the wallet's recovery flow to reimport the account and choose new protection. Support cannot reset your recovery phrase. If the phrase is missing, do not sign out or reset; contact [support](/feedback).

Resetting does not cancel a transaction already submitted to a network and does not move Testnet assets to Mainnet. See *How do I restore my wallet with a recovery phrase?*

### 40. What should I check if a bridge deposit or withdrawal is delayed?
Category: Troubleshooting › Common issues

A bridge transfer can include a source-chain transaction, route processing and a destination-chain claim or arrival. Confirmation on the source chain alone does not mean the destination balance has updated.

1. Check the source and destination networks, token and recipient in the original transfer.
2. Open **Activity** and read the existing transfer's status and any claim or recovery action. Keep the wallet connected and let it sync.
3. Check whether an incoming Miden transfer is waiting to be accepted. See *How do I accept a pending transfer?*
4. If the outcome is uncertain, check the source and destination balances before retrying. Do not submit a second deposit or withdrawal just because the screen was interrupted.
5. If it remains delayed, report the route, networks, wallet version and a non-secret transaction reference. Hide sensitive information in screenshots. See *How do I send feedback or report a problem?*

A disabled route can stop new transfers without cancelling a transfer already in progress. Follow recovery actions shown for that transfer. Do not change Developer Settings to force a route.

### 41. How do I send feedback or report a problem?
Category: Troubleshooting › Common issues

Open [the Bread feedback form](/feedback), or choose **Send feedback** from the wallet's **Settings** and **About** section.

Use **Short title** for one clear summary and **Description** for the details. Choose the feedback type. For a bug, include what you did, what you expected, what happened, your platform, app version and network. Describe one problem per report where possible.

Before adding a screenshot, hide recovery information, signing keys, passwords and any other sensitive information. Never enter a recovery phrase in the form. Support will never ask for it.

Choose **Submit feedback** when your report is ready. If the form cannot open, check your connection and try the link again. Do not reset the wallet to fix a feedback-page problem.

### 42. How do I send or receive tokens on Miden?
Category: Manage wallet › Sending, receiving, and claiming

For a transfer within Miden, both wallets must use the same network. A transfer to another chain needs a supported crosschain route.

**To receive:**

Open **Receive** and share the account address or QR code for the intended network. Share the address, never your recovery phrase or signing keys. Ask the sender to check the network and token. Incoming transfers may need to be accepted in **Activity** before they become spendable.

**To send:**

Open **Send**, enter or select the recipient, choose the token and amount, then review the network, address, amount, fee and any expiration before confirming. Keep enough of the displayed fee asset for the transaction. If the address or network is unexpected, stop and check with the recipient.

Track the send in **Activity**. A confirmed send can still require the recipient to accept the transfer. See *My transfer shows as confirmed, but the token never arrived.*

### 43. What should I check before a Swap?
Category: Crosschain › Moving across chains

Swap exchanges one supported token for another. Swapping within Miden and swapping as part of a crosschain route are different flows; use only the options shown by your installed wallet.

Check the network, tokens, amount you will receive and maximum network fee on the review screen. Keep enough of the displayed fee asset. If a quote expires, changes or fails to load, obtain and review a new quote before signing.

A quote is an estimate for that route at that time. Do not assume it guarantees a future price or that a test token has real value. A disabled Swap control can mean the selected network or token pair is unavailable.

If a Swap is interrupted, let the wallet sync and check **Activity** and both token balances before trying again. See *How do I prepare for Mainnet and check my network?*
