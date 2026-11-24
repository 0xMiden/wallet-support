# Bread FAQ: content for implementation

Revised for Brian's 2026-10-23 launch support audit. Sixty-five articles. Existing IDs are preserved. Articles 29–35 remain Extension only until their phone flows are checked. Seven new consumer topics use both platforms. Release-dependent behavior is conditional; these guides do not announce a Mainnet or App Store release. See the local review inventory for implementation evidence and unresolved release checks.

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
| 14 | What is the difference between the Fast and Slow routes? | Crosschain | Moving across chains |
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
| 44 | How do I use Explore and mini-apps? | Getting started | Setup and basic use |
| 45 | How do GameCoins and Arcade work? | Getting started | Setup and basic use |
| 46 | Which bridge networks and tokens can I use? | Crosschain | Moving across chains |
| 47 | What should I do if Guardian cannot connect? | Troubleshooting | Common issues |
| 48 | What should I do if a bridge deposit fails? | Troubleshooting | Common issues |
| 49 | How do I send funds from Bread to another blockchain? | Crosschain | Moving across chains |
| 50 | My USDC or USDCX bridge transfer hasn't arrived. Who can help? | Troubleshooting | Common issues |
| 51 | What happens to my funds if an Earn deposit fails? | Earn | Earning yield |
| 52 | Why can't I install Bread on my device? | Getting started | Setup and basic use |
| 53 | Why is Bread or Earn unavailable here? | Troubleshooting | Common issues |
| 54 | Why does Miden Bridge show a different balance from my wallets? | Troubleshooting | Common issues |
| 55 | Why does MetaMask show a 500 error when I bridge to Bread? | Troubleshooting | Common issues |
| 56 | Which wallets can I use to add funds to Bread from another blockchain? | Crosschain | Moving across chains |
| 57 | What should I do if a deposit on Miden Bridge fails? | Troubleshooting | Common issues |
| 58 | Why won't my wallet connect? | Troubleshooting | Common issues |
| 59 | Why does my USDC bridge to Bread show Failed? | Troubleshooting | Common issues |
| 60 | Why do I need USDCX for network fees? | Troubleshooting | Common issues |
| 61 | How do I get my funds back from a locked or failed transfer in Bread? | Troubleshooting | Common issues |
| 62 | How do I recover a locked deposit on Miden Bridge? | Troubleshooting | Common issues |
| 63 | Can I unlock Bread with a passkey? | Manage wallet | Security and recovery |
| 64 | How do I change when Bread locks? | Manage wallet | Security and recovery |
| 65 | Why don't I see a token on Home? | Troubleshooting | Common issues |

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

The emergency key comes from your recovery phrase. It stays on this device unless you remove the recovery phrase; after that, the wallet asks you to type the phrase whenever the key is needed. Some wallet screens call it your **Guardian recovery key** or your **recovery (cold) key**; it is the same key.

It is used when your everyday key has to be replaced (a new or lost device, or a rotation from **Keys**) and when switching Guardian. On a new device, the recovery phrase rebuilds the emergency key. Together, the emergency key and Guardian unlock the backed-up state and establish a fresh everyday key tied to the new device.

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

1. From the wallet homepage, open **Profile** (lower-right corner).

   ![Bread Wallet's Home page, with Profile in the lower-right corner](E19-guardian-home.png)

2. Go to the **Security** section and select **Guardian Settings**.

   ![Bread Wallet's Profile page, with Guardian Settings under Security](E20-guardian-settings-menu.png)

3. Click **Rotate Guardian**.

   ![Bread Wallet's Guardian Settings page, with the Rotate Guardian button](E21-guardian-settings.png)

4. On the **Choose your Guardian** page, select your choice of Guardian, then click **Continue**.

   ![Bread Wallet's Choose your Guardian page, with the Continue button](E22-guardian-choose.png)

5. On the **Review rotation** page, click **Continue**.

   ![Bread Wallet's Review rotation page, with the Continue button](E23-guardian-review.png)

6. Confirm the switch. On the extension, enter your wallet password on the **Enter password** page, then click **Continue**. On your phone, confirm with Face ID, fingerprint or your passcode; if the **Enter your passcode** page appears, enter your passcode.

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

Use your Bread account on one device at a time. Recovering it with your recovery phrase on another device makes that device the only one with access; the previous device shows **Another device holds this account** and can use the account again only by taking it back with **Make this device the main one**, which removes access from the other device. Recovery does not set up synced access across both devices.

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

Use your Bread account on one device at a time. Recovering it with your recovery phrase on another device makes that device the only one with access; the previous device shows **Another device holds this account** and can use the account again only by taking it back with **Make this device the main one**, which removes access from the other device. Recovery does not set up synced access across both devices.

The full round trip across your device, Guardian, and Miden:

1. Your new device requests the state, signed by the emergency key.
2. Guardian returns the state snapshot.
3. Your device generates a new everyday key and proposes the key update, signed by the emergency key.
4. Guardian validates the key update, then acknowledges it.
5. Your device submits the proof for the new state to Miden. The key update is a transaction and pays a network fee. If the recovered account has nothing to pay it with, the wallet shows **Add USDCX to activate your everyday key** and finishes once USDCX arrives.
The device drives recovery, Guardian acknowledges the recovery update, and only a commitment lands on-chain. Guardian keeps the backup, and the emergency key keeps control.

For the in-app steps, see *How do I restore my wallet with a recovery phrase?*

### 13. Can I send funds to another blockchain?
Category: Crosschain › Moving across chains

Yes. You can send USDCX from Bread to an address on **Ethereum**, **Base**, **Arbitrum One** or **Arc**. It arrives there as USDC, through Circle's xReserve route. To **Polygon**, which Circle's route doesn't serve, USDCX goes through the Fast route instead.

Other supported assets use the Fast route or the Ethereum ↔ Miden Agglayer bridge when that exact route is offered. NEAR Intents transfers are not enabled on Partner Mainnet.

Circle takes a fee from the amount you send, so you receive less than you send. Check the address before you confirm: on Circle's route, once it is sent, the transfer can't be reclaimed.

The Miden network fee is paid in USDCX too, so keep some USDCX beyond the amount you send. See *Why do I need USDCX for network fees?*

For the steps, see *How do I send funds from Bread to another blockchain?* For route differences, see *What is the difference between the Fast and Slow routes?* If a transfer doesn't arrive, see *My USDC or USDCX bridge transfer hasn't arrived. Who can help?*

### 14. What is the difference between the Fast and Slow routes?
Category: Crosschain › Moving across chains

When you move funds between Miden and another chain, the route screen shows how they'll travel:

- **Fast · Epoch**: a third party delivers the funds on the other chain for you. The wallet estimates about 30 seconds.
- **Slow · Agglayer**: the funds go through the bridge itself. The wallet estimates about 30 minutes and shows no bridge fee. Check any network fee separately.
- **USDCx (Circle xReserve)**: for USDCX. Circle turns your USDCX into USDC on the other chain, and USDC back into USDCX. How long it takes depends on that chain.

The Fast route works on Ethereum, Base, Arbitrum, Polygon and Robinhood Chain. USDC also moves through Circle on Ethereum, Base, Arbitrum and Arc. On Ethereum, the Slow route carries native ETH and these tokens: WBTC, USDT, PYUSD, PAXG, wrapped SOL, wrapped BNB, NEAR, USDG and POL. ETH can also use the Fast route. For the full list, see *Which bridge networks and tokens can I use?*

Before you confirm, check the route, the amount and the fees on the review screen.

On Testnet, use test tokens only. A route that works on Testnet may not be on Mainnet yet.

If a transfer is still pending, don't start it again. Open it in **Activity** to check its status. A Fast transfer usually finishes on its own. If a transfer into Bread gets stuck, **Activity** shows **Deposit locked**: your deposit is safe, and you can select **Retry bridge** or **Withdraw deposit**. If a transfer out of Bread fails, your funds stay on Miden. **Activity** shows **Awaiting Return** until the block after which you can claim them, then **Ready to Claim**. See *How do I get my funds back from a locked or failed transfer in Bread?* A Slow transfer out of Miden may need a manual claim; some withdrawals are claimed automatically. Select **Claim Asset** only if the transfer details in **Activity** still show funds ready to claim, and connect the wallet for the matching destination address. See *What should I check if a bridge deposit or withdrawal is delayed?*

### 15. Can I swap tokens across chains?
Category: Crosschain › Moving across chains

Partner Mainnet does not currently offer crosschain swaps. The Fast, Circle and Agglayer routes move their supported assets between chains; do not treat them as a general token-swap service. A Swap within Miden is a different operation.

Use a crosschain swap only if your installed version and selected network explicitly offer that source token, destination token and route.

Check the quote, expected received amount, fees and recipient before signing. If the quote expires or changes, review the updated quote. Do not assume a route is available because another token or network works.

Use test assets on Testnet. Use Mainnet routes only when your installed released version supports them. See *What is the difference between the Fast and Slow routes?*

### 16. Can I earn yield in Bread?
Category: Earn › Earning yield

Earn is enabled for eligible Mainnet users, but an enabled feature or a visible vault does not guarantee that a deposit can complete. Your installed version, selected network, market, provider liquidity and quote must all support the action. Earn is not offered in the United Kingdom or New York. If availability cannot be checked, do not submit a new deposit; contact [support](/feedback).

If a vault shows **Deposits are closed**, new deposits into it are paused. Your existing position isn't affected.

**You're Earning!** doesn't mean your deposit has finished. Wait until **Activity** no longer shows **Pending**, then check your position. If it stays pending or your position doesn't appear, contact [support](/feedback) before you deposit again.

**Which vaults can I use?**

The vaults Bread offers are listed under **Available Vaults** in **Earn**. On Mainnet, these are Aave V3 USDC on Base and Aave V3 USDC on Ethereum. Each one supplies native USDC to an external lending market. You fund the deposit with USDCx from your Miden wallet; USDCx and USDC are different tokens. [Aave](https://aave.com/help/aave-101/introduction-to-aave) explains how its markets work.

You can withdraw positions on Base and Ethereum. Withdrawals from Arbitrum aren't available at the moment. If you have a position on Arbitrum, contact [support](/feedback).

Review the market, network, fees and expected amount before confirming. A missing or disabled deposit control means you should not start a deposit. Testnet uses test assets and estimated rewards there do not represent real returns.

The external lending-market portion can be publicly visible. See *Are my funds private while they earn?*

### 17. Are my funds private while they earn?
Category: Earn › Earning yield

Earn does not provide the same privacy as holding assets in your private Miden account.

- **On Miden:** the private account state is hidden from the public chain; Guardian can see its backup.
- **Leaving Miden:** the deposit is sent as a public note, so its amount and destination can be seen on the Miden chain.
- **In an external lending market:** the amount, activity and rewards may be publicly visible.
- **On return:** the assets go back to your Miden account after the route completes and the transfer is accepted.

Earn availability depends on your installed wallet, network, eligibility and provider route. Testnet uses test assets. Review the available route and quote before starting a deposit. See *Can I earn yield in Bread?*

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

4. Select the **Accept Transfer** button. The button shows a spinner while the wallet adds the tokens to your balance.
5. Once accepted, the transfer leaves the **Pending** tab. Select the **Transfer** tab to find it as **Received**, marked **Confirmed**. Select it to see the details of the transaction.

   ![Bread Wallet's Activity page, with the Transfer tab selected and the transfer marked Confirmed](E27-accept-received-tab.png)

To accept everything at once, select **Accept All** in the row above the list on the **Pending** tab, which shows how many transfers are waiting and their total.

If accepting fails, see *What should I do if accepting a transfer fails?*.

**Important note:** If the expanded card shows an expiration date, accept the transfer before then. After that date, a recallable transfer can be reclaimed by the sender; if it is USDCX worth more than its network fee and the sender has **Auto-accept USDCX transfers** on, their wallet may take it back automatically; otherwise it waits in their **Pending** tab.

**Decline** only hides a transfer from **Activity** on this device. It does not return the tokens to the sender or delete the transfer. To bring hidden transfers back, select the **Pending** tab, then select the **Restore** button next to **Hidden transfers**.

Eligible USDCX transfers can be accepted automatically in versions where **Auto-accept USDCX transfers** is on in **General** settings, so it may not appear as a pending transfer. Auto-accept skips a transfer worth less than its network fee, and waits while the fee isn't known yet, so a small transfer can stay in **Pending** with auto-accept on. Accept it yourself if you want it. A very small balance can also be hidden from **Home** after you accept it. See *Why don't I see a token on Home?*

### 19. What should I do if accepting a transfer fails?
Category: Troubleshooting › Common issues

If accepting a transfer fails, the transfer stays in your **Activity** list and its **Accept Transfer** button changes to a **Retry** button.

**Steps:**

1. Open Bread and select the **Activity** tab.

   ![Bread Wallet's Activity page, with a transfer showing the Retry button](E30-accept-fails-activity.png)

2. Select the **Pending** tab and find the transfer card that shows a **Retry** button.

   ![Bread Wallet's Activity page, with the Pending tab selected and the Retry button](E31-accept-fails-pending-tab.png)

3. Let the wallet sync and check the transfer status and your balance. A failed or interrupted screen does not prove that nothing reached the network. Wait while an acceptance is still processing.
4. Select **Retry** only when those checks confirm the acceptance failed. If the outcome is uncertain, contact [support](/feedback) before trying again. If the card shows **You can retry after** a time, Guardian is holding the transaction, and **Retry** works once that countdown ends.

If the expanded card shows an expiration date, accept the transfer before then. After that date, a recallable transfer can be reclaimed by the sender; after expiry, a USDCX transfer may return to the sender automatically if it is worth more than its network fee and they have **Auto-accept USDCX transfers** on. If the card shows **Accept Transfer** rather than **Retry**, it is a pending transfer awaiting acceptance.

If it keeps failing, see *My transfer is stuck on Accepting stage*, or report it to our [**SUPPORT**](/feedback).

To learn how accepting works, see *How do I accept a pending transfer?*.

### 20. What do I need before I can use Earn?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

**Before depositing:** If the vault shows **Deposits are closed**, you can't deposit into it right now. Your existing deposits aren't affected.

You need spendable **USDCx** in your Miden wallet to fund an Earn deposit. The external lending market uses native USDC; the deposit route handles that change of asset.

- Check **Activity** for incoming transfers that still need acceptance. Eligible USDCx transfers can be accepted automatically when **Auto-accept USDCX transfers** is on in **General** settings. Other transfers may need **Accept Transfer**. See *How do I accept a pending transfer?*
- Keep a reserve for the network fee shown by Bread. On Mainnet, your USDCx balance must cover both the deposit and the displayed network fee; do not enter your entire balance without checking the fee reserve.
- Check the exact account, network and supported market before requesting a quote. Testnet assets cannot fund a Mainnet position.

To make a deposit, see *How do I deposit into Earn?*

### 21. How do I deposit into Earn?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

**Before depositing:** If the vault shows **Deposits are closed**, you can't deposit into it right now. Your existing deposits aren't affected.

Depositing spends USDCx from your Miden balance. The supported route supplies native USDC to the external lending market and opens a position there.

**Steps:**

1. Open Bread and select **Earn**.

   ![Bread Wallet's Earn page, with Available Vaults and no active positions](E35-earn-tab.png)

2. Select a supported vault, check its market and network, then select **Deposit** if it is available.

   ![Bread Wallet's vault page, with the Deposit button](E36-earn-vault.png)

3. Enter the amount of USDCx to deposit, leaving enough for the displayed network fee, then select **Confirm**.

   ![Bread Wallet's Deposit Amount page, with an amount entered](E37-earn-deposit-amount.png)

4. Check the **Deposit Amount**, market, **Route**, **Estimated time** and **Max network fee**. Select **Open position** only when the details are correct and the action is available.

   ![Bread Wallet's deposit review, with the Open position button](E38-earn-deposit-review.png)

5. Bread shows **Generating Transaction** while it processes the deposit. You can select **Hide** and follow its status in **Activity**. Do not start another deposit because this screen takes longer than expected.

   ![Bread Wallet's Generating Transaction page for an Earn deposit](E39-earn-deposit-generating.png)

6. Bread may show **You're Earning!** while **Activity** still shows **Pending**. This screen does not confirm settlement. Select **Done**, let the wallet sync, then check the existing transaction status, spendable balance and position. If they do not reconcile or positions cannot load, contact [support](/feedback) before submitting again.

   ![Bread Wallet's success page for an Earn deposit, showing You're Earning!](E40-earn-deposit-success.png)

Your position appears under **Current Positions** in **Earn** after it loads. See *How do I check my Earn position?*

Before you deposit, see *What do I need before I can use Earn?*

### 22. How do I check my Earn position?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

The screenshots below were captured on Bread 1.16.2 Testnet. They illustrate an older flow; token names, balances and layouts can differ from your installed version.

Open **Earn** to check your positions and estimated earnings. Let the wallet load current data; a loading or error state is not proof of a zero balance.

**Steps:**

1. Open **Earn** and check the earnings summary and **Current Positions**. Select **See All** to open **My positions** if needed.

   ![Bread 1.16.2 Testnet Earn page, with a position under Current Positions](E41-earn-tab-position.png)

2. Select a position to see its market, asset, network and details.

   ![Bread 1.16.2 Testnet position page, with Deposit more and Withdraw](E42-earn-position.png)

The position page includes **Deposited**, **Total Earned**, **APY**, **Daily Avg**, **Time Active** and **Started**. **Total earned** and the position's **Total Earned**, **Daily Avg**, **Time Active** and **Started** aren't tracked yet, so they show $0 or a dash. **Deposited** is the position's current value, interest included. APY and projected rewards are estimates, not guaranteed returns.

To add to a position, use **Deposit more** only when it is available and follow *How do I deposit into Earn?*

### 23. How do I withdraw from Earn?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

You can withdraw positions on Base and Ethereum, including one in a vault that's closed to new deposits. Epoch can't currently route withdrawals from Arbitrum. If you have a position on Arbitrum, contact [support](/feedback).

Your first withdrawal on a network can take a little longer while Bread waits for a one-time setup. If that setup outlasts your review, Bread gets a new quote that's never lower than the minimum you reviewed.

A supported withdrawal redeems the selected amount from the external native-USDC position and routes the receipt back to Miden as USDCx. A partial withdrawal leaves the remaining amount invested.

**Steps:**

1. Open **Earn** and select your position under **Current Positions** or **My positions**.
2. Select **Withdraw**. Enter an amount within the displayed available balance, or select **Max**, then select **Review**.
3. Check **You withdraw**, **Stays invested**, the destination network, expected receipt and minimum receipt. Expand the withdrawal details to check the route and fees. Select **Withdraw** only when a valid quote is available and you accept the details.

4. Bread shows **Processing Withdrawal**, then **Withdrawal Started!** when it has started. Select **View in Activities** to follow delivery; starting the withdrawal does not mean the receipt has arrived.

5. Follow **Withdraw from Earn** in **Activity**, including **Redeeming** and **Delivering** where shown. Wait for the existing withdrawal to finish before starting another from the same position.

6. After delivery, check your Miden USDCx balance and **Activity**. Eligible USDCx transfers can be accepted automatically when **Auto-accept USDCX transfers** is on. If the receipt remains pending and shows **Accept Transfer**, accept it there.

Partial amounts still depend on the available balance, supported route and a valid quote. See *Can I withdraw part of my position?*

To learn how accepting works, see *How do I accept a pending transfer?*

### 24. Can I withdraw part of my position?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

Yes, on a supported route with a valid quote. Select **Withdraw**, enter an amount up to the displayed available balance, then select **Review**. Use **Max** if you want to withdraw the available balance instead.

The review shows **You withdraw** and **Stays invested**, so you can check how much remains in the position. The quoted receipt can be lower than the selected amount because of route costs. Check the expected and minimum receipt before confirming.

A small amount may not have a usable quote. Do not exceed the available balance or start another withdrawal while one from the same position is still in progress. See *How do I withdraw from Earn?*

### 25. What does it cost to use Earn?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

- **Depositing** costs a Miden network fee. Check the displayed fee asset and **Max network fee** before confirming; keep enough USDCx on Mainnet for the deposit and that fee. The completed transaction shows the **Network Fee** paid.
- **Withdrawing** on the supported Earn route has its network fee covered for you. Accepting the returned USDCx into your balance is a normal Miden transaction with a small network fee, paid in USDCx. That does not mean the withdrawal has no costs: route costs are reflected in the quoted receipt. Check **You withdraw**, the expected receipt, the minimum receipt and **Route fees** before confirming.

Amounts and fees depend on the route and quote. Testnet fees and balances do not establish Mainnet costs. See *What do I need before I can use Earn?*

### 26. What should I do if an Earn deposit or withdrawal fails?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

The screenshots below were captured on Bread 1.16.2 Testnet. They illustrate an older flow; token names, balances and layouts can differ from your installed version.

If Bread shows **You're Earning!** while **Activity** remains **Pending**, the screen does not confirm settlement. Let the wallet sync, then check the existing transaction status, spendable balance and position. If positions cannot load or the outcome is unclear, contact [support](/feedback) before submitting again. Do not make a replacement deposit to resolve a missing position.

If a deposit shows **Transaction Failed** or **Not confirmed**, check its status and your balance after sync before starting another deposit. A failed or interrupted screen does not by itself prove that nothing was submitted.

**Steps:**

1. On **Transaction Failed**, select **View in Activities**.

   ![Bread 1.16.2 Testnet Transaction Failed page for an Earn deposit](E47-earn-deposit-failed.png)

2. Wait for the wallet to sync. Check **Activity**, your spendable balance, the displayed fee reserve and any existing Earn position.
3. A failed Earn deposit has no **Retry**. If funds left your balance, they come back after a waiting period; see *What happens to my funds if an Earn deposit fails?*. Start a new deposit only after those checks confirm that nothing left your balance and no transfer is still pending. If the outcome is uncertain, contact [support](/feedback) before submitting again. An unavailable quote or provider route is not fixed by repeatedly signing deposits. See *How do I deposit into Earn?*

For a withdrawal, check the existing **Withdraw from Earn** activity and position before starting another one. Let an in-progress withdrawal finish. If the wallet offers a recovery action, follow that existing activity rather than creating a duplicate withdrawal. If the outcome is uncertain or the position and balance disagree, contact [support](/feedback).

After a withdrawal is delivered, eligible incoming USDCx may be accepted automatically. If its acceptance fails and **Activity** shows **Retry**, see *What should I do if accepting a transfer fails?*

Report the wallet version, network, market and error text without recovery information. See *How do I send feedback or report a problem?*

### 27. Do I keep my Earn position if I restore my wallet?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

For a supported position on the same network, recovery uses your recovery phrase and the Guardian backup of your standard Bread account. After restoring, let the wallet sync and check **Current Positions** in **Earn** or open **My positions**. If a position is missing, check the network and account before contacting [support](/feedback). Do not make a replacement deposit to recover a missing position.

Recovery establishes access on the replacement device; it does not provide synchronized use on multiple devices. Use one device at a time, because recovery replaces the former device's access.

Recovery does not move a Testnet position to Mainnet. Developer-created accounts without Guardian require a separate recovery plan.

To restore, see *How do I restore my wallet with a recovery phrase?*

### 28. Do spending limits apply to Earn deposits?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

An Earn deposit is checked against your account's daily spending limit using its value in USD. A withdrawal returns funds to the wallet and does not count as a new deposit against that limit.

Check the amount and any spending-limit or price warning shown before confirming. This daily spending check is separate from the Partner Mainnet total wallet-balance cap.

See *How do I set a spending limit?*

### 29. How do I remove my recovery phrase from my device?
Category: Manage wallet › Security and recovery

Removing your recovery phrase deletes the stored copy from this installation, so someone who gets into your wallet cannot read it. Your wallet keeps working for everyday transactions. You will need to type the recovery phrase when you switch Guardian or rotate your everyday key, so write it down first.

**Steps:**

1. Select **Profile** (the person icon), then select **Recovery Phrase** under **Security**.

   ![Bread Wallet's Profile page, with Recovery Phrase under Security](E48-settings-menu.png)

2. Select **Remove recovery phrase**.

   ![Bread Wallet's Recovery Phrase page, with Reveal recovery phrase and Remove recovery phrase](E49-recovery-phrase-menu.png)

3. On the **Verify recovery phrase** page, make sure no one can see your screen, then select **Continue**.

   ![Bread Wallet's Verify recovery phrase page, with the Continue button](E50-remove-phrase-verify.png)

4. Enter your wallet password and select **Continue**.
5. Your 12 words appear, numbered in order. Write all of them on paper in that order, and keep the paper in a safe place outside this device. Select **Continue**.
6. Select the first and last words of your phrase to confirm you saved it, then select **Continue**.
7. Select **Remove from this device**.

The wallet then shows **Recovery phrase removed from this device**, and **Recovery Phrase** no longer appears in **Profile**.

Earlier backups may still contain the phrase. Keep them secure. After the phrase is removed, you can't add a new account on this device. Guardian changes and everyday key replacement ask you to type the phrase, so keep your offline copy available.

Related: *How do I view my recovery phrase?*, *What should I do if I lose my recovery phrase?*

### 30. How do I view my recovery phrase?
Category: Manage wallet › Security and recovery

You can show your recovery phrase again at any time, as long as it is still stored on this device.

**Steps:**

1. Select **Profile** (the person icon), then select **Recovery Phrase** under **Security**.
2. Select **Reveal recovery phrase**.
3. Make sure no one can see your screen, then select **View**.

   ![Bread Wallet's Recovery Phrase page with the phrase covered, and the View button](E51-reveal-phrase-notice.png)

4. Enter your wallet password and select **Continue**.
5. Select **Show** to see your 12 words. They hide again if the wallet window loses focus. Write them down, or select **Copy**. Select **Hide Recovery Phrase** when you are done.

If **Recovery Phrase** is missing from **Profile**, the phrase has been removed from this device and can no longer be shown here.

> ⚠️ **Important note:** Anyone who knows your recovery phrase can access your wallet and funds. Never share it.

Related: *How do I keep my wallet secure?*, *How do I remove my recovery phrase from my device?*

### 31. How do I reveal my keys in Bread?
Category: Manage wallet › Security and recovery

Bread can show the keys your account signs with: your Miden everyday key and your EVM key. Most people never need them. Do not reveal them for ordinary wallet setup, a dApp connection, troubleshooting or feedback. Requests to paste signing keys into a site or send them to support are unsafe.

**Steps:**

1. Select **Profile** (the person icon), then select **Keys** under **Security**.
2. Select **Reveal Private Key**.
3. Read the **Before you reveal your private keys** warning, enter your wallet password and select **Continue**.

   ![Bread Wallet's page for revealing the keys, with the warning and the password field](E52-reveal-keys-warning.png)

4. The wallet shows a QR code that holds both keys. Select **Show keys as text** to see the **Miden everyday private key** and the **EVM private key** written out, or **Show QR code** to go back.

The keys start hidden. Select **Show** to see them. They hide again when you leave the page or switch to another window. Reveal them again with your password if you need them.

> ⚠️ **Important note:** Keep both keys secret. Anyone with them can control your Miden and EVM assets. Rotating your everyday key does not change or protect a leaked EVM key.

If you think your everyday key has leaked, see *How do I rotate my everyday key?*

### 32. How do I rotate my everyday key?
Category: Guardian › Guardian protection

Rotating creates a new everyday key and replaces the current one on-chain. Do this if you suspect your device is compromised. Your account, address and funds stay the same.

**Steps:**

1. Select **Profile** (the person icon), then select **Keys** under **Security**.
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

1. Select **Profile** (the person icon), then select **Spending limits** under **Security**.

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
- **Priced assets only.** Assets the wallet cannot price are not covered by this USD limit. Review any price warning before confirming.
- **A local safety check.** The limit is not an on-chain restriction. Anyone with direct access to your keys can bypass it.

Your daily spending limit does not raise or replace the Partner Mainnet total wallet-balance cap. See *What is the Partner Mainnet deposit limit?*

Related: *Do spending limits apply to Earn deposits?*

### 34. How do I manage the dApps connected to my wallet?
Category: Manage wallet › Security and recovery

This page manages your consumer wallet permissions; it is not an integration setup guide. Never provide a recovery phrase or signing key to connect a dApp.

**Authorized DApps** controls whether dApps can connect to your wallet, and lists the ones that already have.

**To turn dApp connections on or off:**

1. Select **Profile** (the person icon), then select **Authorized DApps** under **Developer**.
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

1. Select **Profile** (the person icon), then select **Address Book** under **Preferences**.

   ![Bread Wallet's Address Book page, with the New contact button](E61-address-book.png)

2. Select **New contact**.
3. Enter the **Address**, then a **Name**. Use the full Miden address supplied for the correct network. You can also save an Ethereum (0x) address with its network, for sending to another chain. Do not reuse a Testnet address for Mainnet.

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

The Partner Mainnet cap is $1,232.462 USD. When you add funds through **Receive** › **Cross-chain**, Bread stops a deposit that would take the receiving account over the limit. It is not a per-transfer allowance or a daily deposit limit.

When you make a bridge deposit, Bread adds its value to what the receiving account already holds. If the total would go over $1,232.462 USD, Bread stops the deposit. It shows what the account holds and what the deposit would add, so you can enter a smaller amount. For example, an account that holds $1,000 can take up to $232.462 more. Splitting a deposit into smaller ones doesn't help, because they all count toward the same total.

If Bread can't get a price for the token you're depositing, it can't check the cap, so it won't let the deposit through. Try again later.

The cap is separate from any daily spending limit you set. See *How do I prepare for Mainnet and check my network?*

### 37. How do I prepare for Mainnet and check my network?
Category: Getting started › Setup and basic use

Partner Mainnet is a limited, invitation-only phase. It is separate from Testnet and the future public Mainnet launch. Use small testing balances and follow official migration notices. Do not assume that balances will move automatically to a future network.

Mainnet and Testnet are separate networks. Testnet tokens have no real-world value and do not turn into Mainnet funds.

**Get the right build and your invitation**

Use the invitation-enabled Bread version named in your official invitation. A GitHub release, including 1.17.7, does not mean that version is available in every store or installed on your device. Store releases can differ by platform; installing a store update or a test build does not prove that your device has the supported Mainnet flow. Check your version and network before funding. If the expected options are missing, contact [support](/feedback).

Your personal access code is in your invitation email. A code registers one new account. Keep it private: do not post it, include it in screenshots or send it in a support report. If you have not received an invitation, contact [support](/feedback) about access. Downloading Bread does not itself grant an invitation.

**Register a new Partner Mainnet account**

1. Start from the fresh **Welcome** screen in the supported invitation-enabled build. Do not erase a working wallet just to reach this screen; first follow *What should I do before resetting or reinstalling Bread?*
2. If **I have a code** is already visible, select it. If your invitation-enabled build instead shows the general welcome options, tap the **Bread logo** seven times, with less than two seconds between taps, to reveal invitation access. The gesture does not replace a valid code. If it opens Developer Settings, go back; do not change endpoints.
3. Choose **I have a code**, enter your code exactly as supplied in **Access code**, preserving uppercase and lowercase letters, then select **Unlock mainnet**.
4. Complete security and Guardian setup and finish registration. Then choose **Back up your wallet** on Home and save your recovery phrase offline before you add funds. An accepted code alone does not mean registration is finished. Keep Bread connected until registration and sync complete.
5. Check the network, account and usable fee balance before sending or bridging funds. Use only routes enabled for your installed version. See *What is the Partner Mainnet deposit limit?*

**Recover an existing account**

If you already registered a Mainnet account, recover that account instead of registering another one. On the Mainnet welcome screen choose **Recover your account**. Recovery of an existing registered account does not require a new invitation code. It needs your recovery phrase (or encrypted wallet file) and the account's Guardian backup. A Testnet account cannot gain Mainnet access through recovery.

A standard Bread account supports one active device at a time. Recovery replaces the former device's access; it does not synchronize use across devices. In 1.17.7, **Another device holds this account** and **Make this device the main one** identify the device-replacement flow. Earlier installed versions may show different controls.

Follow *How do I restore my wallet with a recovery phrase?*. Wait for recovery, any everyday-key rotation and sync to finish before transacting. Do not reset again if the result is unclear.

**Recovery phrase verification**

For an account created in Bread with its recovery phrase still stored and not yet verified, 1.17.7 requires backup verification when the combined priced Mainnet balance across your accounts reaches $150. Follow the official wallet prompt to confirm your offline backup before continuing. Already verified, recovered or removed phrases are handled differently. Never enter the phrase into a support form or website.

**If the code or registration fails**

Check that you used the invitation's supported build and entered the code exactly. If Bread cannot check the code or registration times out, check your connection and the account's current status before retrying. Do not create another account or repeatedly reinstall to resolve an uncertain registration. Report the error text, platform, version and network through [support](/feedback), without the code, recovery phrase or signing keys.

If Bread shows a Testnet or developer-network indicator, use test assets only. Do not change endpoints to make an account appear to be on Mainnet. See *Do I need Developer Settings to use Bread?*

### 38. Do I need Developer Settings to use Bread?
Category: Getting started › Setup and basic use

No. Standard wallet use does not require custom RPC, prover, faucet or Guardian endpoints. Use the defaults supplied by your official wallet version.

Developer Settings are for developers testing integrations and separate networks. Changing them can break sync or point the wallet at a different network. A reachable endpoint does not prove that it is the right or trusted service.

After setup, **Network endpoints** may show an active override. Returning to defaults can require **Reset to defaults & re-onboard**, which erases local keys and history. Have a supported recovery path before using it. Do not reset a working wallet as a first troubleshooting step.

Developer-created accounts without Guardian do not have the standard Guardian recovery backup. Keep their data and backups separate from normal consumer accounts.

For SDK, API and custom-network integration instructions, use the [Miden developer documentation](https://docs.miden.xyz/). This Help Center covers consumer wallet use. See *How do I prepare for Mainnet and check my network?*

### 39. What should I do before resetting or reinstalling Bread?
Category: Manage wallet › Security and recovery

On the browser extension, if Bread shows **Browser storage is not responding**, your wallet data is not lost. Quit and reopen the browser completely to restore it. Don't reset Bread or reinstall the extension to fix it.

A reset can erase this installation's wallet keys, local history, contacts and settings. Signing out to recover a forgotten password and resetting developer endpoints can also replace local wallet data.

Use your Bread account on one device at a time. Recovering it with your recovery phrase on another device makes that device the only one with access; the previous device shows **Another device holds this account** and can use the account again only by taking it back with **Make this device the main one**, which removes access from the other device. Recovery does not set up synced access across both devices.

Before you continue:

1. Confirm that you have the recovery phrase written correctly and stored offline. A passcode, password or biometric unlock alone cannot restore a wallet on a new installation.
2. Check which network and Guardian the account uses. Standard Guardian recovery needs your phrase and the Guardian operator that keeps your account state.
3. Check **Activity**, balances and any in-flight bridge or Earn transfers. Record non-secret references you may need to follow up.
4. Keep any working installation until you have confirmed a supported recovery path. Do not assume an encrypted-file guide applies to your released version.

If you forgot the wallet password, use the wallet's recovery flow to reimport the account and choose new protection. Support cannot reset your recovery phrase. If the phrase is missing, do not sign out or reset; contact [support](/feedback).

If your installed version offers **Profile** → **Security** → **Encrypted Wallet File**, treat that file as a sensitive backup. It is a snapshot, not a continuously updated copy; save a new snapshot after account changes. Keep it protected and never attach it to a support report. Availability depends on your wallet version and account type.

Restoring Guardian account state from a file does not by itself complete recovery. Replacing the everyday key can still need the Guardian operator; a compatible, previously saved everyday key pair can be another supported path in versions that offer it. Do not assume a file alone or an older snapshot guarantees recovery. If the operator is unavailable or you are unsure which backups you have, keep the working installation and contact [support](/feedback) before resetting.

Resetting does not cancel a transaction already submitted to a network and does not move Testnet assets to Mainnet. See *How do I restore my wallet with a recovery phrase?*

### 40. What should I check if a bridge deposit or withdrawal is delayed?
Category: Troubleshooting › Common issues

A bridge transfer can include a source-chain transaction, route processing and a destination-chain claim or arrival. Confirmation on the source chain alone does not mean the destination balance has updated.

1. Check the source and destination networks, token and recipient in the original transfer.
2. Open **Activity** and read the existing transfer's status and any claim or recovery action. On the Fast route, a transfer into Bread can show **Deposit locked**, and a transfer out can show **Awaiting Return**, **Ready to Claim**, **Returning Funds** or **Funds Returned**. Keep the wallet connected and let it sync.
3. Check whether an incoming Miden transfer is waiting to be accepted. See *How do I accept a pending transfer?*
4. If the outcome is uncertain, check the source and destination balances before retrying. Do not submit a second deposit or withdrawal just because the screen was interrupted.
5. If it remains delayed, report the route, networks, wallet version and a non-secret transaction reference. Hide sensitive information in screenshots. See *How do I send feedback or report a problem?*

A disabled route can stop new transfers without cancelling a transfer already in progress. Follow recovery actions shown for that transfer. Do not change Developer Settings to force a route.

For a USDC or USDCX transfer on Circle's route, see *My USDC or USDCX bridge transfer hasn't arrived. Who can help?*

If a transfer on the Fast route is stuck, see *How do I get my funds back from a locked or failed transfer in Bread?* or *How do I recover a locked deposit on Miden Bridge?*

If Bread shows **Bridge deposit failed**, see *What should I do if a bridge deposit fails?*

### 41. How do I send feedback or report a problem?
Category: Troubleshooting › Common issues

Open [the Bread feedback form](/feedback), or choose **Send feedback** from the wallet's **Profile** and **About** section.

Use **Short title** for one clear summary and **Description** for the details. Choose the feedback type. For a bug, include what you did, what you expected, what happened, your platform, app version and network. Describe one problem per report where possible.

Before adding a screenshot, hide recovery information, signing keys, passwords, invitation codes and any other sensitive information. Never attach a wallet backup file. Never enter a recovery phrase in the form. Support will never ask for it.

Choose **Submit feedback** when your report is ready. If the form cannot open, check your connection and try the link again. Do not reset the wallet to fix a feedback-page problem.

### 42. How do I send or receive tokens on Miden?
Category: Manage wallet › Sending, receiving, and claiming

For a transfer within Miden, both wallets must use the same network. A transfer to another chain needs a supported crosschain route.

**To receive:**

Open **Receive** and share the account address or QR code for the intended network. Share the address, never your recovery phrase or signing keys. Ask the sender to check the network and token. Incoming transfers may need to be accepted in **Activity** before they become spendable. A very small balance can be hidden from **Home**. See *Why don't I see a token on Home?*

**To send:**

Open **Send**, enter or select the recipient, choose the token and amount, then review the network, address, amount, fee and any expiration before confirming. Keep enough of the displayed fee asset for the transaction. If the address or network is unexpected, stop and check with the recipient. If the review shows **New recipient** beside **To**, you haven't sent to it before and it isn't a saved contact or one of your accounts: check it with the recipient before you confirm. **Max** sends your whole spendable balance.

Track the send in **Activity**. A confirmed send can still require the recipient to accept the transfer. See *My transfer shows as confirmed, but the token never arrived.*

### 43. What should I check before a Swap?
Category: Crosschain › Moving across chains

Swap trades one token for another inside Miden. On Partner Mainnet you can swap these pairs, in either direction:

- ETH and USDT
- WBTC and USDT
- Wrapped SOL and USDT
- USDCX and USDT
- ETH and USDCX
- WBTC and USDCX
- Wrapped SOL and USDCX

Wrapped SOL can appear as **SOL** in the token picker. WBNB and PYUSD can't be swapped yet. The token picker shows the current pairs. Swap prices come from [Forkchoice](https://forkchoice.xyz/).

Swap only works within Miden. To move tokens to or from another blockchain, see *Which bridge networks and tokens can I use?*

**Before you confirm**

After you choose **Review Swap**, check **You Send**, **You Receive**, **Rate**, **Slippage** and **Max network fee**. Slippage is how far below the current rate your order may fill. The network fee is paid in USDCX, so keep some in your wallet.

**How a swap fills**

A swap is an order. If there isn't enough liquidity at the current price, Bread warns you that only part of it may fill right away. The rest waits until the time you set in **Cancel if not filled within**. Anything still unfilled then comes back to you, and until then that amount stays reserved for the order.

You can follow the order in **Activity** and stop it there with **Cancel swap**.

**If something goes wrong**

If Bread says **Price unavailable. Try again shortly.**, wait a moment and get a new quote. If it says **No swap tokens are configured for this network yet.**, Swap isn't available on the network you're using. Don't change network settings to get around it. If the problem continues, contact [support](/feedback).

If a swap is interrupted, let the wallet sync, then check **Activity** and both token balances before you try again. See *How do I prepare for Mainnet and check my network?*


### 44. How do I use Explore and mini-apps?
Category: Getting started › Setup and basic use

**Explore** opens the catalog of apps you can use with Bread on Mainnet. The apps shown can differ between wallet versions. An app appearing in the catalog does not guarantee every feature inside it is available.

1. Open **Explore** and choose an app.
2. Check the app's address and the account it asks to connect. Never enter your recovery phrase, signing keys or wallet password into a mini-app or website.
3. Review each request in the wallet before approving it. Bread won't let you approve a transaction it can't simulate. A signature request that says it cannot authorize a transaction from your account can't move your funds. Connecting an app is separate from approving a transfer or signing a transaction. Cancel requests you do not understand.

If an app does not open or connect, check your connection and reopen it from **Explore**. Do not change network endpoints to force a connection.

If a transaction was interrupted, check **Activity** and balances before retrying. For support, include the app name, its public address, wallet version and the error text, with secrets removed. See *How do I send feedback or report a problem?*


### 45. How do GameCoins and Arcade work?
Category: Getting started › Setup and basic use

GameCoin (GC) is used by supported Arcade games. Each game sets its own rules for stakes, leaderboard submissions and payouts, including any posting fee. Bread does not provide a weekly GC allowance or claim service.

In versions that include the Arcade balance display, Bread shows your GC balance for the selected network. On Mainnet you can buy GC in the wallet. In Arcade's **Game Coins**, choose **Buy more GC**, enter the amount in **GC to buy**, check the USDCx price and the network fee, then choose **Confirm purchase**. If Bread says buying GC isn't available, the sale isn't open on your network right now. Store releases can differ by platform; check your installed version.

Before playing or submitting a result, check the game's rules, any GC stake, the network fee and the action shown by the wallet. GC does not replace the network fee asset. Free play and social sharing depend on what the game offers.

GC balance is not a score. Each game has its own scoring and leaderboard; there is no global ranking across games.

Do not repeatedly sign a failed game action: first check **Activity**, your GC balance and the game's status. Do not assume a purchase, stake, submission or payout completed until the wallet and game confirm it.

Report the game, network, wallet version and error text without recovery information. See *How do I send feedback or report a problem?*

### 46. Which bridge networks and tokens can I use?
Category: Crosschain › Moving across chains

Bread's current Partner Mainnet routes connect Miden with Ethereum, Base, Arbitrum, Arc, Polygon and Robinhood Chain. The choices depend on your installed version and the route checks in the wallet.

**USDC: Ethereum, Base, Arbitrum and Arc**

USDC sent through these routes arrives in Bread as USDCX. Sending USDCX out works in reverse: it arrives on the other network as USDC. Circle runs this route through [xReserve](https://www.circle.com/xreserve).

**Other tokens: Ethereum only**

The current Mainnet configuration lists these tokens for deposits from Ethereum through Agglayer:

- WBTC
- USDT
- PYUSD
- PAXG
- Wrapped SOL (WSOL)
- Wrapped BNB (WBNB)
- NEAR
- USDG
- POL

Native ETH is handled separately; use its route only when Bread offers it. Bread checks the bridge registry before offering each token. Check deposits and withdrawals separately: a listed deposit token does not guarantee an available withdrawal route.

Bread labels the route **Slow · Agglayer** and shows an arrival estimate of about 30 minutes. This is an estimate, not a guaranteed arrival time; check the estimate shown when you review your transfer.

WSOL, WBNB and NEAR here are the versions of those tokens that live on Ethereum. You can't send to or from the Solana, BNB Chain or NEAR networks themselves. Learn more about [Agglayer](https://docs.polygon.technology/interoperability/agglayer).

**Fast route: Ethereum, Base, Arbitrum, Polygon and Robinhood Chain**

Bread labels this route **Fast · Epoch**. A third party delivers your funds on the other network for you, and Bread shows an arrival estimate of about 30 seconds. The current Mainnet configuration lists these tokens for deposits and withdrawals:

- Ethereum, Base and Arbitrum: USDC and ETH
- Polygon: USDC and POL
- Robinhood Chain: ETH and USDG

USDC sent through this route arrives in Bread as USDCX. If a Fast transfer gets stuck, see *How do I get my funds back from a locked or failed transfer in Bread?* or *How do I recover a locked deposit on Miden Bridge?*

**Not available on Partner Mainnet**

- **NEAR Intents**: transfers through [NEAR Intents](https://docs.near-intents.org/) are disabled in the current Partner Mainnet configuration. There is no announced availability date.

**Before you move funds**

1. Check your network, then pick the exact token and both networks in Bread. If a route is missing, disabled or cannot be checked, don't send: it may be unsupported or temporarily unavailable. If the problem continues, contact [support](/feedback).
2. On the review screen, check the receiving address, the fees, the amount you'll receive and the arrival estimate.
3. On Partner Mainnet, the current deposit cap is $1,232.462 USD for your total wallet balance after a deposit. If a deposit would take you over, Bread asks for a smaller amount. This is not a per-transfer allowance or a daily deposit limit. See *What is the Partner Mainnet deposit limit?*
4. Keep enough for the network fee on the network you send from: ETH on Ethereum, Base, Arbitrum and Robinhood Chain, POL on Polygon, or USDC on Arc. See *Why do I need USDCX for network fees?*

Only move funds through Bread or [Miden Bridge](https://bridge.miden.xyz/), and never send tokens straight to a bridge contract address. Miden Bridge can offer different choices from your installed wallet; check its route separately.

If a transfer is taking longer than expected, see *What should I check if a bridge deposit or withdrawal is delayed?*

### 47. What should I do if Guardian cannot connect?
Category: Troubleshooting › Common issues

If Bread reports a Guardian connection or authentication error, such as 401, keep the wallet installed. An error does not mean your recovery phrase is wrong, and resetting the wallet is not a connection fix.

Use your Bread account on one device at a time. Recovering it with your recovery phrase on another device makes that device the only one with access; the previous device shows **Another device holds this account** and can use the account again only by taking it back with **Make this device the main one**, which removes access from the other device. Recovery does not set up synced access across both devices. If you have already recovered elsewhere, continue on the device where recovery completed instead of repeatedly recovering back and forth.

1. Check your internet connection and update through the official store. If the wallet is still syncing or rotating an everyday key after recovery, let that operation finish before starting another one.
2. Confirm that the wallet is on the network used by the original account. Mainnet and Testnet have different account state. Do not replace RPC or Guardian endpoints with addresses supplied by strangers.
3. If the error continues, record the exact message, the time it occurred, your platform, wallet version, network and the Guardian name shown by the wallet. Keep recovery information and signing keys out of the report.
4. Contact [support](/feedback) before resetting, reinstalling or trying repeated recovery attempts. Keep any working installation while the issue is investigated.

Guardian backs up account state; it does not replace your recovery phrase. Support cannot recover a missing phrase. See *What should I do before resetting or reinstalling Bread?*

### 48. What should I do if a bridge deposit fails?
Category: Troubleshooting › Common issues

If Bread shows **Bridge deposit failed** after your external wallet, such as MetaMask, asks you to approve the deposit, the connection between Bread and that wallet may need refreshing. Disconnecting and reconnecting the wallet can let the deposit complete.

1. Before you try again, check that the deposit did not go through. Look in **Activity** in Bread and in your external wallet's history. If a deposit transaction was sent, do not send another. See *What should I check if a bridge deposit or withdrawal is delayed?*
2. Tap **Done** to close the failure screen.
3. Open **Receive**, tap **Cross-chain** and go to the amount screen.
4. Tap your wallet address at the top of the screen. **Switch wallet** opens.
5. Tap **Connect another wallet**, choose the same wallet again and approve the connection in it.
6. Enter the amount and continue. Approve each request in your wallet as it appears.

If tokens left your external wallet but never reached Bread, see *How do I get my funds back from a locked or failed transfer in Bread?*

If Bread says MetaMask Smart Transactions could not send the transaction, first check that no deposit was sent (step 1). Then turn off **Smart Transactions** in MetaMask and try again.

If it still fails, report the error, the networks, the token and your wallet version. Hide sensitive information in screenshots. See *How do I send feedback or report a problem?*

### 49. How do I send funds from Bread to another blockchain?
Category: Crosschain › Moving across chains

<!-- platform: extension-desktop -->

These steps send USDCx from Bread to your MetaMask wallet on [Miden Bridge](https://bridge.miden.xyz/). It arrives in MetaMask as USDC.

1. Go to [Miden Bridge](https://bridge.miden.xyz/), connect MetaMask and Bread as in steps 2 to 5 of *How to add funds into Bread?*, and select **Withdraw**.
2. Next to **To**, choose where you want to receive the funds: **Arc**, **Ethereum**, **Base** or **Arbitrum**. Enter the amount and select **Review transfer**.

   ![Miden Bridge's Withdraw tab, with the Select network list next to To](E69-send-out-withdraw.png)

3. Check **Estimated received** and the fees, then select **Confirm in wallet**. Burning USDCx can't be reversed, and the final Circle fee can change after the burn. Keep some USDCx for the Miden network fee.

   ![Miden Bridge's Review transfer window for a withdrawal, with Estimated received and the Confirm in wallet button](E69a-send-out-review.png)

4. Bread opens **Confirm Transaction**. Check the amount under **You pay**, marked **Leaves your account**, and the **Network Fee**, then select **Confirm**.

   ![Bread's Confirm Transaction window for bridge.miden.xyz, with the asset change and the Confirm button](E69b-send-out-confirm.png)

5. The bridge shows **Withdrawal submitted**. It doesn't track the payout yet, so check MetaMask for the USDC. If it doesn't arrive, see *My USDC or USDCX bridge transfer hasn't arrived. Who can help?*

   ![Miden Bridge's transfer card, marked Withdrawal submitted](E70-send-out-submitted.png)

<!-- platform: mobile -->

These steps send USDCX from Bread to your MetaMask wallet. It arrives in MetaMask as USDC.

1. Tap **Send**. Under **Send to**, paste your MetaMask address, or pick it from **Recent** or **Address Book**.

   ![Bread's Send to page, with Paste, Address Book, Scan QR code and the Recent list](M15-send-out-send-to.png)

2. Under **Network**, tap the network and choose where you want to receive the funds: **Ethereum**, **Base**, **Arbitrum One** or **Arc**. Then tap **Continue**.

   ![Bread's Send to page, with a MetaMask address and Network set to Ethereum](M15a-send-out-network.png)

   ![Bread's Select network list, with Ethereum, Base, Arbitrum One and Arc](M15b-send-out-select-network.png)

3. Tap the token and choose **USDCX**.

   ![Bread's Select a token list, with ETH and USDCX](M15c-send-out-select-token.png)

4. Enter the amount and tap **Continue**.

   ![Bread's Enter amount page, with 5 USDCX going to MetaMask on Ethereum](M15d-send-out-enter-amount.png)

5. Under **Choose a route**, check the **Circle fee** and **Estimated arrival**, then tap **Confirm**. Circle's fee comes out of the amount you send, so you receive less than you send.

   ![Bread's Choose a route page, with the Circle xReserve route, the Circle fee and You Receive](M16-send-out-choose-route.png)

6. On **Review Details**, check the address, **Network**, **Route**, **Minimum burn**, **Max network fee** and **Circle fee**, then tap **Send Payment**. Once it is sent, the transfer can't be reclaimed, so check the address carefully.

   ![Bread's Review Details page, with the address, network, route, fees and the Send Payment button](M16a-send-out-review.png)

7. While Bread shows **Generating Transaction**, you can tap **Hide**. Bread notifies you when it's done.

   ![Bread's Generating Transaction page, with its progress steps and the Hide button](M16b-send-out-generating.png)

8. When **Burn submitted** appears, tap **View in Activities** to follow the transfer.

   ![Bread's Burn submitted page, with the Done and View in Activities buttons](M17-send-out-burn-submitted.png)

9. In **Activity**, tap the transfer to open it. The transfer is complete when its **Status** reads **Confirmed**. The USDC is then in your MetaMask wallet. If it shows **Burn confirmed**, or after two hours **Payout delayed**, and the USDC doesn't arrive, see *My USDC or USDCX bridge transfer hasn't arrived. Who can help?*

   ![Bread's Transaction page for the transfer, with the status Confirmed](M17a-send-out-confirmed.png)

### 50. My USDC or USDCX bridge transfer hasn't arrived. Who can help?
Category: Troubleshooting › Common issues

Transfers between USDC on **Ethereum**, **Base**, **Arbitrum One** or **Arc** and USDCX on Miden use Circle's xReserve route. Bread handles the Miden side of the transfer and Circle completes the other side. Many delays can be resolved in Bread, so start there. This page covers Circle's route. If your transfer used the Fast route, see *How do I get my funds back from a locked or failed transfer in Bread?*

**Check Bread first**

1. Open **Activity** and tap the transfer. If it's still in progress, keep Bread open and let it sync.
2. If you're sending USDCX out of Bread, check the wallet you sent it to. The USDC may have arrived even if Bread still shows **Burn confirmed**.
3. If you're adding USDC to Bread and Bread asks you to **Execute on Arc**, do it. This step needs a small network fee on Arc, paid in USDC.
4. If you're adding USDC to Bread, check whether the USDCX is waiting to be accepted. See *How do I accept a pending transfer?* and *My transfer is stuck on Accepting stage*.
5. Don't send the transfer again. Check your balances on both networks first: a second transfer doesn't speed up the first.

If you're unsure what happened, work through *What should I check if a bridge deposit or withdrawal is delayed?* or report it to our [support](/feedback).

**When to contact Circle**

Contact Circle when one side of the transfer is done and the other never arrived:

- **Sending out of Bread:** Bread shows **Burn confirmed** or **Payout delayed**, or Miden Bridge shows **Withdrawal submitted**, but the USDC still hasn't reached the address on the other network.
- **Adding funds to Bread:** your external wallet shows the USDC deposit as successful, but Bread is still waiting for Circle to attest it, long after the arrival time Bread estimated.

Circle Customer Care:

- Email: [customer-support@arc.io](mailto:customer-support@arc.io)
- Help Center: [Contact Us](https://help.arc.io/support_arc?id=support_arc_form)

Tell them the networks, the direction, the amount, the time, the receiving address and the transaction hash from the other network. You can find the hash in your external wallet's history or on a block explorer.

Never share your recovery phrase, keys or wallet backup file. Bread support will never ask for them. Use only the contacts on this page; anyone who messages you first offering to recover your funds is a scam.

### 51. What happens to my funds if an Earn deposit fails?
Category: Earn › Earning yield

A failed Earn deposit can't be retried. If your funds left your account before the deposit failed, they come back to you after a waiting period. Don't make another deposit to get them back.

Epoch, the service that routes Earn deposits, sets the waiting period. On Mainnet it is currently 6,200 Miden blocks, which Bread estimates at about 5 hours. Epoch can change it.

1. Open **Activity** and check the deposit. Let the wallet sync.
2. After the waiting period, the USDCX comes back to your balance. Bread accepts it automatically when **Auto-accept USDCX transfers** is on in **General** settings, which it is unless you turned it off. If the setting is off, accept the pending transfer on the **Activity** page. See *How do I accept a pending transfer?*
3. To deposit again, start a new deposit from the **Earn** tab. See *How do I deposit into Earn?*

If the funds haven't come back long after the waiting period, contact [support](/feedback).

### 52. Why can't I install Bread on my device?
Category: Getting started › Setup and basic use

Bread needs one of these:

- **Android:** Android 9 or later.
- **iPhone:** iOS 15 or later.
- **Computer:** Chrome 114 or later for the extension.

On an older version, the store may not offer Bread, or it may not install. The system minimums depend on your device. Separately, Bread isn't available in some locations; there it shows **Wallet unavailable in your region**.

If your device meets these minimums and Bread still won't install or open, contact [support](/feedback). Include your device model, its system version and your Bread version.

### 53. Why is Bread or Earn unavailable here?
Category: Troubleshooting › Common issues

Bread blocks access in certain countries and regions. There, Bread shows **Wallet unavailable in your region** and the whole wallet is blocked, including withdrawals. New Earn deposits are blocked in the United Kingdom and New York. Individual games and apps may have additional regional restrictions.

If Bread can't check your region, for example, during a service problem, the wallet stays open, but new Earn deposits show **Temporarily unavailable**. Existing Earn positions can still be withdrawn. Restart Bread to check again.

See the full list of restrictions on the [compliance page](https://0xmiden.github.io/wallet/compliance/).

### 54. Why does Miden Bridge show a different balance from my wallets?
Category: Troubleshooting › Common issues

[Miden Bridge](https://bridge.miden.xyz/) reads your balances when you connect your wallets. It doesn't keep them updated while the page is open. If you received or sent funds since then, the **Available** amount can be out of date.

- **Bread balance:** select the refresh icon next to it.
- **Both balances:** reload the page.

Refresh the balances before you enter an amount.

### 55. Why does MetaMask show a 500 error when I bridge to Bread?
Category: Troubleshooting › Common issues

If you see **Fetch error** with **Internal Server Error** a few seconds after you confirm a bridge deposit, MetaMask's **Smart Transactions** setting refused to send it. In Bread, the message says Smart Transactions could not send the transaction and asks you to turn it off in MetaMask. The error comes from MetaMask, not from Bread or the bridge. The deposit was not sent, so no funds moved. If you started the deposit in Bread, **Activity** shows it as **Failed**, but nothing left your wallet.

1. Check MetaMask's activity to confirm that the deposit was not sent.
2. Turn off **Smart Transactions** in MetaMask:
   - **MetaMask mobile app:** open **Settings**, then **Advanced**.
   - **MetaMask extension:** open **Settings**, then **Transactions**.
3. Try the deposit again.

If it still fails, report it to our [support](/feedback). See *How do I send feedback or report a problem?*

### 56. Which wallets can I use to add funds to Bread from another blockchain?
Category: Crosschain › Moving across chains

You can use a wallet app that supports WalletConnect, such as MetaMask, Rainbow or Uniswap Wallet. The wallet also needs to support the network you're sending from. See *Which bridge networks and tokens can I use?*

- **Bread on your phone:** open **Receive**, tap **Cross-chain** and choose your wallet from the list.
- **Bread extension:** scan the QR code with a wallet app on your phone. Browser-extension wallets, such as the MetaMask extension, can't connect to the Bread extension.
- **Miden Bridge:** to use a browser-extension wallet such as MetaMask, go to [Miden Bridge](https://bridge.miden.xyz/) on your computer. See *How to add funds into Bread?*

### 57. What should I do if a deposit on Miden Bridge fails?
Category: Troubleshooting › Common issues

1. Check that nothing was sent. Look in MetaMask's activity and on the **Activity** page in Bread. If a deposit went through, don't send another. See *What should I check if a bridge deposit or withdrawal is delayed?*
2. Find the message:
   - **User rejected request** or **User denied transaction**: the request was cancelled in your wallet. Start again and approve each request.
   - **Fetch error** with **Internal Server Error**: see *Why does MetaMask show a 500 error when I bridge to Bread?*
   - **Your connected wallet changed** or **Refresh the quote before reviewing**: review the transfer again with a new quote.
   - **Source transaction failed** or **The contract rejected this transfer**: the transaction was refused on the source network. Check the amount and try again.
3. Reload the page, reconnect both wallets, and try again.

If tokens left your external wallet but never reached Bread, see *How do I recover a locked deposit on Miden Bridge?* You can also recover it in Bread: see *How do I get my funds back from a locked or failed transfer in Bread?*

If it still fails, contact [support](/feedback) with the message, the networks, the token and the time.

### 58. Why won't my wallet connect?
Category: Troubleshooting › Common issues

**Bread on [Miden Bridge](https://bridge.miden.xyz/)**

- **Wallet extension not detected**: install or turn on the Bread extension in the same Chrome browser, then refresh the page.
- **Connection pending**, or a message that Bread didn't respond within 45 seconds: open Bread, unlock it and approve the connection. If the request is gone, select **Reset connection** and try again.
- If the connected account looks wrong, open the wallet menu and select **Reconnect wallet**.

**MetaMask or another wallet in Bread**

- **In the Bread extension:** scan the QR code with a wallet app on your phone. Browser-extension wallets can't connect to the Bread extension; use [Miden Bridge](https://bridge.miden.xyz/) instead. See *Which wallets can I use to add funds to Bread from another blockchain?*
- **The connected wallet did not approve …**: your wallet didn't allow that network. Reconnect the wallet and approve the network when it asks.

### 59. Why does my USDC bridge to Bread show Failed?
Category: Troubleshooting › Common issues

When you add USDC to Bread from **Ethereum**, **Base**, **Arbitrum One** or **Arc**, Circle's xReserve route turns it into USDCX on Miden. A **Failed** transfer doesn't always mean nothing was sent, so check before you try again. This page covers Circle's route. For a transfer on the Fast route, see *How do I get my funds back from a locked or failed transfer in Bread?*

1. Check your external wallet, such as MetaMask, for a USDC deposit at that time.
   - **No USDC left your wallet:** nothing was sent, and your USDC is still there. You can try again.
   - **USDC left your wallet:** don't send it again. See *My USDC or USDCX bridge transfer hasn't arrived. Who can help?*
2. To see why it failed, open **Activity** in Bread and tap the failed transfer.
3. Keep Bread open until you've approved every request in your wallet. If the deposit screen closes early, the transfer fails.
4. If the same error appears again, stop retrying. Each attempt adds another failed transfer. On a computer, you can add USDC through [Miden Bridge](https://bridge.miden.xyz/) instead. See *How to add funds into Bread?*
5. If you entered your whole USDC balance, lower the amount. On Arc, the network fee is paid in USDC, and from **Base** or **Arbitrum One**, Circle's fee is added on top of the amount. See *Why do I need USDCX for network fees?*

If it keeps failing, report the error text, your Bread version and the network. See *How do I send feedback or report a problem?*

### 60. Why do I need USDCX for network fees?
Category: Troubleshooting › Common issues

Every transaction on Miden pays a small network fee. On Mainnet, the fee is always paid in USDCX, whatever token the transaction moves. Bread takes it from the USDCX in your own balance, so keep some USDCX in your wallet, even if you mostly hold other tokens.

**What pays the network fee**

- **Send**, within Miden and to another blockchain
- Accepting a pending transfer, by hand or through **Auto-accept USDCX transfers**
- **Swap**, and **Cancel swap**
- Depositing into **Earn**
- Activating or rotating your everyday key
- Switching Guardian operators
- Transactions you approve for [Miden Bridge](https://bridge.miden.xyz/), an app in **Explore** or an Arcade game

Withdrawing from **Earn** is the exception: its network fee is covered for you, and the route costs are reflected in the quoted amount you receive. See *What does it cost to use Earn?*

**If you hold no USDCX**

Without USDCX, you can't send, swap or deposit any token, including ETH, WBTC, Wrapped SOL, USDT, USDG, PYUSD, PAXG, Wrapped BNB, NEAR and POL. Accepting a transfer of one of these tokens needs USDCX too.

Accepting a USDCX transfer pays its fee out of the transfer itself, so a new wallet can accept its first USDCX. To get USDCX, see *How to add funds into Bread?*

**Moving funds from another blockchain**

On the other network, your external wallet, such as MetaMask, pays that network's own fee:

- **Ethereum, Base and Arbitrum One:** the fee is paid in ETH. If you bridge ETH, don't send your whole ETH balance.
- **Arc:** the fee is paid in USDC. If you send USDC from Arc, don't send your whole USDC balance.

From **Base** or **Arbitrum One**, Circle adds its fee on top of the USDC you deposit. If the amount and the fee come to more than your wallet holds, Bread asks you to lower the amount.

If a transaction fails, check **Activity** and your balances before you try again. If the problem continues, contact [support](/feedback).

### 61. How do I get my funds back from a locked or failed transfer in Bread?
Category: Troubleshooting › Common issues

Most Fast transfers through Epoch finish within a few minutes. If one gets stuck, your funds are not lost, and you can get them back yourself. What to do depends on the direction:

- **Bridge in**, from an external wallet such as MetaMask into Bread: the deposit can stay locked on the network you sent from.
- **Bridge out**, from Bread to another blockchain: the funds come back to Bread.

This page is only for transfers on the Fast route, which Bread labels **Fast · Epoch**. For USDC through Circle, see *Why does my USDC bridge to Bread show Failed?*

**Bridge in: why the deposit is locked**

When you bridge in with Epoch, your tokens first go into a deposit contract called The Compact on the network you send from, such as Polygon. Epoch then delivers the same amount to Bread. If Epoch doesn't start the bridge, your tokens stay in The Compact, and they don't show in Bread or in your external wallet.

Only the external wallet that made the deposit can take the funds out. Bread, Epoch and Miden can't move them.

You can also get the deposit back on Miden Bridge, without Bread. See *How do I recover a locked deposit on Miden Bridge?*

In **Activity**, the transfer shows **Deposit locked**. A transfer made with an older version of Bread may show **Failed** instead.

**Get your deposit back**

If the transfer's details in **Activity** show **Retry bridge**, you can try it first to send the deposit on to Bread. If that doesn't work, or the button isn't there, withdraw the deposit as below.

The screenshots show the Bread extension with MetaMask on a phone. Your wallet address, network, token and amount may differ.

1. In Bread, open **Profile** (the person icon), then under **Developer**, **Advanced Settings** › **Recover locked bridge funds**.

   ![Advanced Settings with Recover locked bridge funds highlighted](E71-recover-advanced-settings.png)

2. Tap **Connect an EVM wallet** and connect the external wallet that made the deposit. In the extension, scan the WalletConnect QR code with your wallet app on your phone. In MetaMask, select the account that made the deposit and tap **Connect**. If a different wallet is connected, tap **Connect another wallet**.
3. Wait a few seconds while Bread checks. Your locked funds then appear, with the token, network and amount.

   ![Connected external wallet with a locked USDC balance on Polygon](E72-recover-locked-balance.png)

4. Tap the locked amount to open **Locked funds**. Check the wallet address, network and locked amount, then tap **Withdraw deposit**. Confirm the transaction in your external wallet. This requests the withdrawal and starts the waiting period.

   ![Locked funds with Withdrawal shown as Not requested and the Withdraw deposit button](E73-recover-request-withdrawal.png)

5. Wait for the timer to finish, about **1 hour and 5 minutes**. **Withdraw deposit** stays disabled during the countdown. You can close Bread in the meantime.

   ![Withdrawal countdown with Withdraw deposit disabled until the waiting period ends](E74-recover-withdrawal-countdown.png)

6. Come back to the same page. When it shows **The withdrawal is available**, tap **Withdraw deposit** again.

   ![Locked funds with The withdrawal is available and Withdraw deposit enabled](E75-recover-withdrawal-available.png)

7. In the final MetaMask pop-up, review **You receive**, the network and the network fee, then tap **Confirm**. Once the transaction confirms, the whole locked balance of that token is automatically returned to the same external wallet on the network you sent from.

   ![Final MetaMask transaction request showing USDC to receive on Polygon and the Confirm button](E76-recover-metamask-withdraw.png)

8. To bridge this token in again from the same wallet, tap **Disable withdrawal** and confirm in your external wallet. Until you do, Bread can't start a new Fast transfer of that token from that address. Miden Bridge calls this button **Cancel withdrawal**.

If Bread asks you to connect your wallet again, this can happen after you close the browser or lose the connection to MetaMask. Close Bread and fully quit your browser, then reopen it and unlock Bread with your password. Reconnect the same MetaMask wallet and continue with the withdrawal.

**Good to know**

- The funds go back to your external wallet on the network you sent from, not to Bread. To bring them into Bread, bridge again.
- **Nothing is locked for this wallet**: check that you connected the wallet that made the deposit.
- **Could not check**: wait a few minutes and open the page again.

**Bridge out: get back a failed transfer**

When you bridge out through Epoch, Bread puts your tokens in a reclaimable note on Miden. If the bridge fails while the funds are still in that note, you can reclaim them once the block shown in Bread is reached. The transfer may show **Bridge failed - funds reclaimable**. It also shows where your funds are: **Awaiting Return** while they wait on Miden for the block shown, **Ready to Claim** when you can claim them, then **Returning Funds** and **Funds Returned**.

On Mainnet, this is currently about **5 hours and 10 minutes** from when Bread creates the note. This is an estimate: the block shown under **Funds reclaimable after block** determines when you can reclaim the funds.

Once the network passes the block shown under **Funds reclaimable after block**, open the transfer in **Activity** and select **Reclaim funds**. First select the account that sent the transfer: **Reclaim funds** works only for that account. This is a Miden transaction with a small network fee in USDCX. When it completes, **Activity** shows **Reclaimed**.

If a transfer out no longer shows as reclaimable but nothing arrived in your external wallet, contact [support](/feedback) with the transfer details.

Never share your recovery phrase, keys or wallet backup file. Bread support will never ask for them.

### 62. How do I recover a locked deposit on Miden Bridge?
Category: Troubleshooting › Common issues

This page is only for transfers on the Fast route, which Bread labels **Fast · Epoch**. If a Fast transfer into Bread gets stuck, your deposit can stay locked in The Compact, the deposit contract Epoch uses on the network you sent from. You can send it back to your external wallet on [Miden Bridge](https://bridge.miden.xyz/recovery), without opening Bread.

**Miden Bridge or Bread?**

Both check the same locked deposit. Withdrawing it on either one returns it to the external wallet that made it, on the network you sent from, not to Bread. Use one of them, not both at once.

- **Miden Bridge:** use it in a browser where your external wallet is installed, such as MetaMask in Chrome on a computer. It needs only the wallet that made the deposit, not Bread. It finds every locked deposit for that wallet, whichever app made it.
- **Bread:** use **Recover locked bridge funds** in **Advanced Settings** if you're already in Bread. Bread can also offer **Retry bridge**, which tries to send the deposit on to Bread instead. See *How do I get my funds back from a locked or failed transfer in Bread?*

**Before you start**

- Use the external wallet and account that made the deposit.
- Keep a little of the network's own token for two network fees: ETH on Ethereum, Base, Arbitrum and Robinhood Chain, or POL on Polygon.
- Allow about 1 hour and 5 minutes. You can close the page while you wait.

**Recover your deposit**

1. Go to [Miden Bridge](https://bridge.miden.xyz/) and select **Recovery** in the top bar. Check that the network next to it is **Mainnet**.
2. On **Recover Epoch deposits**, select **Connect wallet** under **Deposit wallet**, and connect the wallet that made the deposit.

   ![Recover Epoch deposits with Connect wallet next to Deposit wallet](E77-bridge-recover-connect.png)

3. Wait while the page shows **Checking deposits…**. Each locked deposit then appears under **Locked deposits**, with its token, amount and network.

   ![Locked deposits listing 250 USDC on Polygon, Withdrawal not started](E78-bridge-recover-locked-deposits.png)

4. Select the deposit, then select **Start withdrawal** and approve the transaction in your wallet. The 65-minute wait starts when it confirms.

   ![A 250 USDC deposit on Polygon with the two steps and the Start withdrawal button](E79-bridge-recover-start-withdrawal.png)

5. Wait until the deposit shows **Ready to withdraw**. Until then it shows **Withdrawal started** and the time left.

   ![Withdrawal started, with the time left before Withdraw to wallet and a Cancel withdrawal button](E80-bridge-recover-countdown.png)

6. Select **Withdraw to wallet** and approve the second transaction. When it confirms, the page shows **Withdrawal complete**, and the whole locked balance of that token is back in your wallet.

   ![Ready to withdraw, with the Withdraw to wallet button](E81-bridge-recover-ready.png)

7. Select **Cancel withdrawal** and approve. Until you do, Fast deposits of that token from this wallet stay paused, even though the funds are already out. Bread calls this button **Disable withdrawal**.

   ![Withdrawal complete, 0 USDC left and Cancel the withdrawal to resume Epoch deposits](E82-bridge-recover-complete.png)

If more than one deposit is locked, repeat steps 4 to 7 for each.

**If something looks wrong**

- **No locked deposits found**: check that you connected the wallet that made the deposit, and that the network is **Mainnet**. If the transfer reached Bread, or the funds are already back in your wallet, nothing is locked.
- **Could not check deposits for** a token: select **Refresh**.
- **Withdrawal active for** a token, on the bridge form: Fast deposits of that token are paused. If you've already withdrawn the funds, select **Cancel withdrawal** to bridge again. If funds are still locked, finish the withdrawal first, since canceling keeps them locked.

If the funds don't come back, contact [support](/feedback) with the network, the token, the amount and the deposit's transaction hash.

Never share your recovery phrase, keys or wallet backup file. Bread support will never ask for them. Anyone who messages you first offering to recover your funds is a scam.

### 63. Can I unlock Bread with a passkey?
Category: Manage wallet › Security and recovery

On Chrome 140 or later, on macOS 15 or later or Windows 11, you can unlock Bread with a passkey instead of typing your password. A passkey is a sign-in key stored by your device or password manager. Your wallet password keeps working.

1. Open the wallet side panel. You can't set up passkey unlock from the popup.
2. Select **Profile** (the person icon), then **Passkey unlock** under **Security**.
3. Select **Enable passkey unlock**, enter your wallet password, and follow your passkey provider's prompts.

Anyone who can use your passkey can unlock your wallet, so protect your passkey provider account too. If your provider syncs the passkey, it may work on your other devices.

To turn it off, select **Remove passkey unlock**. This doesn't delete the passkey from your provider; delete it in your provider's settings too if you no longer need it.

### 64. How do I change when Bread locks?
Category: Manage wallet › Security and recovery

The Bread app on your phone or computer locks itself after it has been in the background for a while. To choose how long, select **Profile** (the person icon), then **General** › **Auto-lock**, and pick 1, 5, 10 or 30 minutes. The default is 10 minutes. You can't turn it off. The browser extension keeps its own auto-lock setting.

### 65. Why don't I see a token on Home?
Category: Troubleshooting › Common issues

Bread hides very small balances from Home. **Hide dust tokens** in **Profile** › **General** is on by default. It hides tokens worth less than $0.001, including a zero balance of a token Bread can price. Your native token always stays visible, and so does any token Bread can't price. To see every token, turn **Hide dust tokens** off.
