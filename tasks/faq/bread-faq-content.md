# Bread FAQ: content for implementation

Revised for Brian's 2026-10-23 launch support audit. Forty-nine articles. Existing IDs are preserved. Articles 29–35 remain Extension only until their phone flows are checked. Seven new consumer topics use both platforms. Release-dependent behavior is conditional; these guides do not announce a Mainnet or App Store release. See the local review inventory for implementation evidence and unresolved release checks.

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
| 44 | How do I use Explore and mini-apps? | Getting started | Setup and basic use |
| 45 | How do GameCoins and Arcade work? | Getting started | Setup and basic use |
| 46 | Which bridge networks and tokens can I use? | Crosschain | Moving across chains |
| 47 | What should I do if Guardian cannot connect? | Troubleshooting | Common issues |
| 48 | What should I do if a bridge deposit fails? | Troubleshooting | Common issues |
| 49 | How do I send funds from Bread to another blockchain? | Crosschain | Moving across chains |

## Articles

### 1. What is Bread?
Category: Getting started › Setup and basic use

Bread is a private wallet on Miden. You can use it to send, receive, swap and earn yield.

Every Bread account is private and Guardian-backed. You don't need to manage the details; the wallet handles them for you.

- Private from other users. The people you transact with see their own transaction, not the rest of your balance or history. Nobody watching the chain sees them either.
- Recoverable and still yours. If you lose your device, your recovery phrase and Guardian's backup bring your wallet back. No single key can move your funds.

Mainnet is invite-only for now, so a new wallet needs an invite code. See *How do I prepare for Mainnet and check my network?*

Related: *What is a private account?*, *What is Guardian?*, *How to install Bread*

### 2. Does Bread use Guardian-backed accounts?
Category: Guardian › Guardian protection

Yes. Every Bread account is private and Guardian-backed. When you set up, you only choose which Guardian to use.

Guardian keeps a backup of your account state so you can recover it. The operator can see that state, but it can't move your funds on its own. It never holds your recovery phrase.

Your recovery phrase restores your keys. With Guardian's backup, it brings your wallet back on a new device. Keep it offline. See *How do I restore my wallet with a recovery phrase?*

Other account types exist only in Developer Settings, for testing. You don't need them. See *Do I need Developer Settings to use Bread?*

### 3. What are the three keys in a Guardian-backed account?
Category: Guardian › Guardian protection

A Guardian-backed account has three keys:

- the everyday key, on your device, for everyday actions like sending,
- the emergency key, which comes from your recovery phrase, and
- the Guardian key, held by Guardian, which acknowledges each transaction.

Every action needs two of the three keys, so no single key can move your funds.

![](three-keys-always-in-control.png)

To switch Guardian, you use your everyday key and your emergency key. The old Guardian is only notified, so it can't block you. You can leave a Guardian at any time.

Related: *What is the emergency key?*, *What is the everyday key?*, *What is the Guardian key?*

### 4. What is the emergency key?
Category: Guardian › Guardian protection

The emergency key is the key that comes from your recovery phrase. Some wallet screens call it your **Guardian recovery key** or your **recovery (cold) key**; it is the same key.

You need it to switch Guardian, to rotate your everyday key, and to restore your wallet on a new device. On a new device, your recovery phrase rebuilds the emergency key. With Guardian's backup, it restores your account and sets up a new everyday key there.

The wallet keeps the emergency key on your device until you choose **Remove recovery phrase**. After that, the wallet asks for your recovery phrase whenever it needs the emergency key.

Keep your recovery phrase offline and never share it.

Related: *What should I do if I lose my recovery phrase?*, *How does recovery work with Guardian?*

### 5. What is the everyday key?
Category: Guardian › Guardian protection

The everyday key lives on your device and signs your regular transactions. When you click **Send**, it signs on your device, protected by your wallet password or biometrics.

Sending, swapping and earning use the everyday key plus Guardian. The everyday key can't move funds on its own.

If you think your device is compromised, use **Rotate everyday key** to replace it. If you lose your device, restoring your wallet sets up a new everyday key. See *Can I get my wallet back if I lose my device?*

Related: *What is the emergency key?*, *What is the Guardian key?*

### 6. What is the Guardian key?
Category: Guardian › Guardian protection

The Guardian key is held by your Guardian. It acknowledges each transaction from your account.

Guardian can't act on its own and never holds your funds. You can switch to another Guardian at any time with your own two keys, the everyday key and the emergency key.

Related: *What is Guardian?*, *Can Guardian move my funds or lock me out?*

### 7. Can Guardian move my funds or lock me out?
Category: Guardian › Guardian protection

No. Guardian can't move your funds by itself or take control of your account.

Every action needs two of your three keys. Guardian holds only one of them. You hold the other two, the everyday key and the emergency key, and they let you switch to another Guardian at any time. See *How do I switch Guardian operators?*

If your Guardian stops responding, the wallet shows **Guardian unreachable** and transactions pause. Select **Switch Guardian** to move to another one. If you removed your recovery phrase from this device, you'll need it to switch, so keep it safe.

For more on how Guardian works without holding your funds, see *What is Guardian?*

### 8. How do I switch Guardian operators?
Category: Guardian › Guardian protection

In the wallet, switching Guardian is called **Rotate Guardian**. It uses your everyday key and your emergency key. If you removed your recovery phrase from this device, have it ready. For how the keys work, see *What are the three keys in a Guardian-backed account?*

**Steps:**

1. From the wallet homepage, open **Profile** (lower-right corner).

   ![Bread Wallet's Home page, with Profile in the lower-right corner](E19-guardian-home.png)

2. Go to the **Security** section and select **Guardian Settings**.

   ![Bread Wallet's Profile page, with Guardian Settings under Security](E20-guardian-settings-menu.png)

3. Click **Rotate Guardian**.

   ![Bread Wallet's Guardian Settings page, with the Rotate Guardian button](E21-guardian-settings.png)

4. On the **Choose your Guardian** page, select a Guardian, then click **Continue**.

   ![Bread Wallet's Choose your Guardian page, with the Continue button](E22-guardian-choose.png)

5. On the **Review rotation** page, click **Continue**.

   ![Bread Wallet's Review rotation page, with the Continue button](E23-guardian-review.png)

6. Enter your wallet password to approve the switch, then click **Continue**.

   ![Bread Wallet's Enter password page, with the Continue button](E32-guardian-password.png)

7. If the wallet asks for your recovery phrase, enter it there. Never send it to anyone, including support.
8. Wait while the switch processes, or click **Hide**. When it succeeds, click **Done**.

   ![Bread Wallet's Processing page, with the Hide button](E33-guardian-processing.png)

   ![Bread Wallet's Success page after the Guardian switch, with the Done button](E34-guardian-rotated.png)

### 9. What can other people see about my account on the blockchain?
Category: Privacy › Public and private transactions

Very little. With a private account, your balances and history stay on your device. The public chain only shows that your account exists and that its state changed, not what changed.

On most blockchains, anyone can read an account's balance and full history. Miden works differently. If someone looks up your account on a block explorer, they won't see your balance or past transactions.

![](private-from-other-users.png)

The people you transact with see their own transaction, but not the rest of your balance or history. A few things are visible:

- Your sender address is public on every transfer.
- If you send a **Public** transfer, anyone can see its token, amount and recipient. Transfers are **Private** by default.
- When you bridge, the transaction on the other chain is public there.
- Guardian can see the state it backs up.

Related: *What is a private account?*, *What is a private note?*

### 10. Can I get my wallet back if I lose my device?
Category: Manage wallet › Security and recovery

Yes. Restore Bread on a new device with your recovery phrase, and your Guardian's backup brings back your account. See *How do I restore my wallet with a recovery phrase?*

You need your recovery phrase for this. Guardian can't replace it. If you lose the phrase and every device with your wallet on it, Guardian can't recover your funds for you.

Your account works on one device at a time. Restoring it on a new device makes that device the only one with access.

### 11. What does Guardian back up?
Category: Manage wallet › Security and recovery

Guardian keeps a backup of your account's state: its balances and history.

It works like a phone backup, except it updates with every transaction, so the copy is always current. This matters on Miden. Accounts are private, so there's no public record to rebuild your account from. To recover it, you need both its latest state and your keys.

Guardian keeps the backup, and your emergency key keeps control. Guardian never holds your funds. See *Can Guardian move my funds or lock me out?*

### 12. How does recovery work with Guardian?
Category: Manage wallet › Security and recovery

Your recovery phrase restores your emergency key on the new device. With it, Bread fetches your account's backup from Guardian and makes a new everyday key for this device. Guardian acknowledges the change, and your account moves to the new device.

Your account works on one device at a time. Restoring it makes the new device the only one with access, and the old device shows **Another device holds this account** and can't use the account until you make it the main device again.

Guardian keeps the backup, and your emergency key keeps control.

For the steps in the app, see *How do I restore my wallet with a recovery phrase?*

### 13. Can I send funds to another blockchain?
Category: Crosschain › Moving across chains

Yes. You can send USDCX from Bread to an address on Ethereum, Base, Arbitrum or Arc. It arrives there as USDC, through Circle's xReserve.

You can also send ETH and other tokens to Ethereum through **Slow · Agglayer**. It usually takes about 30 minutes.

**Fast · Epoch** and NEAR Intents transfers aren't available yet. Earn uses Epoch separately, which doesn't make **Fast · Epoch** available.

Circle takes its fee from the amount you send, so you receive a little less. The destination address is public. Check it before you confirm: once sent, the transfer can't be taken back.

For the steps, see *How do I send funds from Bread to another blockchain?* For how the routes differ, see *What is the difference between a solver route and a canonical bridge?*

### 14. What is the difference between a solver route and a canonical bridge?
Category: Crosschain › Moving across chains

They're two ways to move tokens between networks. A solver route is usually faster. A canonical bridge is the network's own built-in path.

On a solver route, a third party called a solver pays you on the other network from its own funds. It then collects what you sent.

On a canonical bridge, your tokens are locked or burned on one network. The same amount is then released or created on the other.

Fees, arrival times and the tokens you can move differ between the two.

In Bread today, every transfer uses a bridge:

- USDC on Ethereum, Base, Arbitrum or Arc moves to and from USDCX on Miden through Circle's xReserve.
- ETH and other tokens move between Ethereum and Miden through **Slow · Agglayer**, in about 30 minutes.

The solver routes, **Fast · Epoch** and NEAR Intents, aren't available yet: fast transfers are disabled on Mainnet for now. Earn uses Epoch separately, which doesn't make **Fast · Epoch** available.

Bread only shows the routes available for the token and network you pick. Check the route, amount and fee before you confirm.

If a transfer is still pending, don't start it again. Follow its status in Bread. See *What should I check if a bridge deposit or withdrawal is delayed?*

### 15. Can I swap tokens across chains?
Category: Crosschain › Moving across chains

Not yet. Crosschain swaps through NEAR Intents aren't available in Bread yet.

You can still move tokens between networks, but they stay the same token. USDC becomes USDCX on Miden and turns back into USDC when you send it out. **Slow · Agglayer** moves ETH and other tokens between Ethereum and Miden.

To trade one token for another, use **Swap** in Bread. It works within Miden only.

To learn how the routes differ, see *What is the difference between a solver route and a canonical bridge?*

### 16. Can I earn yield in Bread?
Category: Earn › Earning yield

Earn is enabled for eligible Mainnet users, but an enabled feature or a visible vault does not guarantee that a deposit can complete. Your installed version, selected network, market, provider liquidity and quote must all support the action. Earn is not offered in the United Kingdom or New York. If availability cannot be checked, do not submit a new deposit; contact [support](/feedback).

**Operational status — 26 October 2026, 14:31 JST:** a later wallet test reported positions-loading failures and a 1 USDCx deposit still **Pending** more than 45 minutes after **You're Earning!** appeared. The success screen does not confirm settlement. The earlier test does not guarantee Base withdrawal availability when positions cannot be loaded.

Let the wallet sync and check the existing **Activity**, spendable balance and position. If the deposit remains pending, positions cannot load or the outcome is unclear, contact [support](/feedback) before submitting another transaction.

**Earlier tests — 26 October 2026, 12:32 JST:** USDCx deposits into Ethereum, Arbitrum and Base Earn markets were reported working in wallet tests. In the same report, withdrawals worked only from Base back to Miden; Ethereum and Arbitrum withdrawals were not working.

Reported tests do not guarantee current availability for every market, amount or installed version. Do not start new deposits into Ethereum or Arbitrum Earn markets while their withdrawal path is unavailable. Before any deposit, confirm that both deposit and withdrawal are currently available for the exact market; contact [support](/feedback) if uncertain. Do not repeatedly submit a failed withdrawal.

**Mainnet markets**

The Mainnet selection covers native USDC in six external lending markets:

- Arbitrum: Aave V3 USDC and Compound III USDC.
- Base: Aave V3 USDC and Compound III USDC.
- Ethereum: Aave V3 USDC and Compound III USDC.

You fund the deposit with USDCx in your Miden wallet; the route supplies native USDC to the external market. USDCx and USDC are distinct assets. Morpho vaults, bridged USDC variants and other assets are not part of this selection. [Aave](https://aave.com/help/aave-101/introduction-to-aave) and [Compound III](https://docs.compound.xyz/) explain their protocols; availability on a provider's own site does not establish availability in Bread.

Review the market, network, fees and expected amount before confirming. A missing or disabled deposit control means you should not start a deposit. Testnet uses test assets and estimated rewards there do not represent real returns.

The external lending-market portion can be publicly visible. See *Are my funds private while they earn?*

### 17. Are my funds private while they earn?
Category: Earn › Earning yield

Earn does not provide the same privacy as holding assets in your private Miden account.

- **On Miden:** the private account state is hidden from the public chain; Guardian can see its backup.
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

4. Select the **Accept Transfer** button. The button changes to **Accepting…** while the wallet adds the tokens to your balance.
5. Once accepted, the transfer leaves the **Pending** tab. Select the **Transfer** tab to find it as **Received**, marked **Confirmed**. Select it to see the details of the transaction.

   ![Bread Wallet's Activity page, with the Transfer tab selected and the transfer marked Confirmed](E27-accept-received-tab.png)

To accept everything at once, select **Accept All** in the row above the list on the **Pending** tab. The row shows how many transfers are waiting and their total.

If accepting fails, see *What should I do if accepting a transfer fails?*.

Some transfers have a deadline. If the expanded card says the transfer returns to the sender by a certain date, accept it before then.

**Decline** only hides a transfer from **Activity** on this device. It doesn't return the tokens to the sender or cancel the transfer. To bring hidden transfers back, select **Restore** in the row above the list on the **Pending** tab.

**Auto-accept USDCX transfers** is on by default in **General** settings, so most USDCX you receive is added to your balance without waiting in **Pending**. Very small amounts, too little to be worth the fee of accepting them, still wait for you to accept them.

### 19. What should I do if accepting a transfer fails?
Category: Troubleshooting › Common issues

If accepting a transfer fails, the transfer stays in your **Activity** list and its **Accept Transfer** button changes to a **Retry** button.

**Steps:**

1. Open Bread and select the **Activity** tab.

   ![Bread Wallet's Activity page, with a transfer showing the Retry button](E30-accept-fails-activity.png)

2. Select the **Pending** tab and find the transfer card that shows a **Retry** button.

   ![Bread Wallet's Activity page, with the Pending tab selected and the Retry button](E31-accept-fails-pending-tab.png)

3. Expand the card and read the message under the transfer:
   - If it says the transfer could not be accepted, select **Retry**.
   - If it says the wallet could not confirm whether it went through, it may still complete. Let the wallet sync and check your balance first. Select **Retry** only if the tokens didn't arrive.

If you're not sure what happened, contact [support](/feedback) before you try again.

If the card says the transfer returns to the sender by a certain date, accept it before then. After that date it does not automatically return to the sender's balance: the sender has to accept it.

If it keeps failing, see *My transfer is stuck on Accepting stage*, or report it to our [support](/feedback) team.

To learn how accepting works, see *How do I accept a pending transfer?*.

### 20. What do I need before I can use Earn?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

**Before depositing:** Do not start new deposits into Ethereum or Arbitrum Earn markets while their withdrawal path is unavailable. Deposits there were reported working on 26 October 2026, but withdrawals were reported working only from Base to Miden. A later report described positions-loading failures and a deposit still pending after the success screen, so do not infer settlement or a reliable exit from those earlier tests. Check the current status in *Can I earn yield in Bread?* and confirm an available withdrawal path for the exact market before starting a new deposit.

You need spendable **USDCx** in your Miden wallet to fund an Earn deposit. The external lending market uses native USDC; the deposit route handles that change of asset.

- Check **Activity** for incoming transfers that still need acceptance. Eligible USDCx transfers can be accepted automatically when **Auto-accept USDCX transfers** is on in **General** settings. Other transfers may need **Accept Transfer**. See *How do I accept a pending transfer?*
- Keep a reserve for the network fee shown by Bread. On Mainnet, your USDCx balance must cover both the deposit and the displayed network fee; do not enter your entire balance without checking the fee reserve.
- Check the exact account, network and supported market before requesting a quote. Testnet assets cannot fund a Mainnet position.

To make a deposit, see *How do I deposit into Earn?*

### 21. How do I deposit into Earn?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

**Before depositing:** Do not start new deposits into Ethereum or Arbitrum Earn markets while their withdrawal path is unavailable. Deposits there were reported working on 26 October 2026, but withdrawals were reported working only from Base to Miden. A later report described positions-loading failures and a deposit still pending after the success screen, so do not infer settlement or a reliable exit from those earlier tests. Check the current status in *Can I earn yield in Bread?* and confirm an available withdrawal path for the exact market before starting a new deposit.

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

The position page includes **Deposited**, **Total Earned**, **APY**, **Daily Avg**, **Time Active** and **Started**. A dash means the wallet has no value to display yet. APY and projected rewards are estimates, not guaranteed returns.

To add to a position, use **Deposit more** only when it is available and follow *How do I deposit into Earn?*

### 23. How do I withdraw from Earn?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

**Withdrawal limitation — 26 October 2026, 12:32 JST:** withdrawals were reported working only from Base to Miden; Ethereum and Arbitrum withdrawals were not working. These are reported tests, not a guarantee for every market, amount or installed version. The earlier test does not guarantee Base withdrawal availability when positions cannot be loaded; a later report described positions-loading failures. Check the existing activity, balance and position after sync, and contact [support](/feedback) if they cannot be reconciled. The steps below describe implemented controls; they do not establish that an affected route can complete. Check the current status in *Can I earn yield in Bread?* and contact [support](/feedback) if your withdrawal route is unavailable.

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

**Withdrawal limitation — 26 October 2026, 12:32 JST:** withdrawals were reported working only from Base to Miden; Ethereum and Arbitrum withdrawals were not working. These are reported tests, not a guarantee for every market, amount or installed version. The earlier test does not guarantee Base withdrawal availability when positions cannot be loaded; a later report described positions-loading failures. Check the existing activity, balance and position after sync, and contact [support](/feedback) if they cannot be reconciled. The steps below describe implemented controls; they do not establish that an affected route can complete. Check the current status in *Can I earn yield in Bread?* and contact [support](/feedback) if your withdrawal route is unavailable.

Yes, on a supported route with a valid quote. Select **Withdraw**, enter an amount up to the displayed available balance, then select **Review**. Use **Max** if you want to withdraw the available balance instead.

The review shows **You withdraw** and **Stays invested**, so you can check how much remains in the position. The quoted receipt can be lower than the selected amount because of route costs. Check the expected and minimum receipt before confirming.

A small amount may not have a usable quote. Do not exceed the available balance or start another withdrawal while one from the same position is still in progress. See *How do I withdraw from Earn?*

### 25. What does it cost to use Earn?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

- **Depositing** costs a Miden network fee. Check the displayed fee asset and **Max network fee** before confirming; keep enough USDCx on Mainnet for the deposit and that fee. The completed transaction shows the **Network Fee** paid.
- **Withdrawing** uses sponsored gas on the supported Earn route. Sponsored gas does not mean the withdrawal has no costs: route costs are reflected in the quoted receipt. Check **You withdraw**, the expected receipt, the minimum receipt and **Route fees** before confirming.

Amounts and fees depend on the route and quote. Testnet fees and balances do not establish Mainnet costs. See *What do I need before I can use Earn?*

### 26. What should I do if an Earn deposit or withdrawal fails?
Category: Earn › Earning yield

Earn depends on your installed version, network, eligibility and an available provider quote. If a control is disabled or a quote is unavailable, do not submit a new transaction. See *Can I earn yield in Bread?*

The screenshots below were captured on Bread 1.16.2 Testnet. They illustrate an older flow; token names, balances and layouts can differ from your installed version.

If Bread shows **You're Earning!** while **Activity** remains **Pending**, the screen does not confirm settlement. Let the wallet sync, then check the existing transaction status, spendable balance and position. If positions cannot load or the outcome is unclear, contact [support](/feedback) before submitting again. Do not make a replacement deposit to resolve a missing position.

If a deposit shows **Transaction Failed**, check its status and your balance after sync before starting another deposit. A failed or interrupted screen does not by itself prove that nothing was submitted.

**Steps:**

1. On **Transaction Failed**, select **View in Activities**.

   ![Bread 1.16.2 Testnet Transaction Failed page for an Earn deposit](E47-earn-deposit-failed.png)

2. Wait for the wallet to sync. Check **Activity**, your spendable balance, the displayed fee reserve and any existing Earn position.
3. Retry only after those checks confirm that the original deposit failed and no transfer is still pending. If the outcome is uncertain, contact [support](/feedback) before submitting again. An unavailable quote or provider route is not fixed by repeatedly signing deposits. See *How do I deposit into Earn?*

Ethereum and Arbitrum Earn withdrawals were reported not working on 26 October 2026, while withdrawals from Base to Miden were reported working. A later report described positions-loading failures, so the earlier Base result does not guarantee withdrawal availability. Check the current status in *Can I earn yield in Bread?*. Do not repeatedly submit withdrawals on an affected route; contact [support](/feedback).

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

Removing your recovery phrase deletes the copy stored in this wallet, so anyone who gets into it can't read the phrase. Sending and receiving keep working. Write the phrase down first: you'll need to type it to switch Guardian or rotate your everyday key.

**Steps:**

1. Select **Profile** (the person icon), then select **Recovery Phrase** under **Security**.

   ![Bread Wallet's Profile page, with Recovery Phrase under Security](E48-settings-menu.png)

2. Select **Remove recovery phrase**.

   ![Bread Wallet's Recovery Phrase page, with Reveal recovery phrase and Remove recovery phrase](E49-recovery-phrase-menu.png)

3. On the **Verify recovery phrase** page, make sure no one can see your screen, then select **Continue**.

   ![Bread Wallet's Verify recovery phrase page, with the Continue button](E50-remove-phrase-verify.png)

4. Enter your wallet password and select **Continue**.
5. Your 12 words appear in order. Write them all on paper, in that order, and keep the paper somewhere safe away from this device. Select **Continue**.
6. Select the first and last words of your phrase, then select **Continue**.
7. Select **Remove from this device**.

The wallet shows **Recovery phrase removed from this device**, and **Recovery Phrase** no longer appears in **Profile**.

Removing the phrase doesn't delete backups you made earlier, so keep those safe. After removal, you can't add a new account in this wallet.

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
5. Your 12 words appear. Write them down, or select **Copy**. Select **Hide Recovery Phrase** when you are done.

If **Recovery Phrase** is missing from **Profile**, the phrase has been removed from this device and can no longer be shown here.

> ⚠️ **Important note:** Anyone who knows your recovery phrase can access your wallet and funds. Never share it.

Related: *How do I keep my wallet secure?*, *How do I remove my recovery phrase from my device?*

### 31. How do I reveal my keys in Bread?
Category: Manage wallet › Security and recovery

Bread can show the two keys your account signs with: your Miden everyday key and your EVM key. Most people never need them. Never paste them into a website or send them to anyone, support included.

**Steps:**

1. Select **Profile** (the person icon), then select **Keys** under **Security**.
2. Select **Reveal Private Key**.
3. Read the **Before you reveal your private keys** warning, enter your wallet password and select **Continue**.

   ![Bread Wallet's page for revealing the keys, with the warning and the password field](E52-reveal-keys-warning.png)

4. The wallet shows a QR code that holds both keys. Select **Show keys as text** to see the **Miden everyday private key** and the **EVM private key**, or **Show QR code** to go back.

The keys hide again after a short time. Enter your password again if you need more time.

> ⚠️ Anyone with these keys can control your Miden and EVM assets. Rotating your everyday key does not protect a leaked EVM key.

If you think your everyday key has leaked, see *How do I rotate my everyday key?*

### 32. How do I rotate my everyday key?
Category: Guardian › Guardian protection

Rotating replaces your everyday key with a new one. Do it if you think your device or key is compromised. Your account, address and funds stay the same.

**Steps:**

1. Select **Profile** (the person icon), then select **Keys** under **Security**.
2. Select **Rotate everyday key**.

   ![Bread Wallet's Keys page, with the Rotate everyday key button](E53-keys.png)

3. Read the message, then select **Confirm rotation**.

   ![Bread Wallet's Keys page, with the Confirm rotation button](E54-rotate-confirm.png)

4. The wallet shows **Generating Transaction** while it works. You can select **Hide** and keep using the wallet.

   ![Bread Wallet's Generating Transaction page for a key rotation](E55-rotate-generating.png)

5. When it shows **Transaction Complete!**, select **Done**, or **View in Activities** to see the transaction.

   ![Bread Wallet's Transaction Complete! page for a key rotation](E56-rotate-complete.png)

The rotation is signed with your emergency key and costs the **Network Fee** your wallet shows. If you removed your recovery phrase from this device, the wallet asks you to type it first.

Related: *What is the everyday key?*, *How do I reveal my keys in Bread?*

### 33. How do I set a spending limit?
Category: Manage wallet › Security and recovery

A spending limit caps how much your account can send in a day, in US dollars. If a transaction would go over it, the wallet asks you to authenticate before it continues.

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
- Raising a limit asks for your password.
- To remove the limit, clear the amount, select **Save** and enter your password. The page shows **No limit set**.

**Good to know:**

- **Stored on this device.** The limit and your spending history live only in this installation. Resetting app data or reinstalling the wallet removes them.
- **Priced assets only.** Tokens the wallet can't price don't count toward the limit.
- **A local safety check.** The limit isn't enforced on-chain. Someone who has your keys can get around it.

A spending limit is separate from the cap on bridge deposits. See *What is the Partner Mainnet deposit limit?*

Related: *Do spending limits apply to Earn deposits?*

### 34. How do I manage the dApps connected to my wallet?
Category: Manage wallet › Security and recovery

**Authorized DApps** lets you turn dApp connections on or off and shows which dApps are connected. A dApp never needs your recovery phrase or keys to connect.

**To turn dApp connections on or off:**

1. Select **Profile** (the person icon), then select **Authorized DApps** under **Developer**.
2. Use the **DApps Interaction** switch. When it is off, dApps can't connect or see your balance.

   ![Bread Wallet's Authorized DApps page, with the DApps Interaction switch](E60-authorized-dapps.png)

**To disconnect a dApp:**

1. On the **Authorized DApps** page, select **See connected**. You only see this when a dApp is connected to the current account.
2. Find the dApp. Each one shows its **Origin**, **Network**, **Account** and **Permissions**.
3. Select **Disconnect**, then select **Disconnect** again on the **Confirm the action** message.

The dApp has to ask to connect again before it can see your account.

### 35. How do I save a contact in Bread?
Category: Manage wallet › Sending, receiving, and claiming

The **Address Book** saves addresses under a name, so you can send to someone without pasting their address each time.

**To add a contact:**

1. Select **Profile** (the person icon), then select **Address Book** under **Preferences**.

   ![Bread Wallet's Address Book page, with the New contact button](E61-address-book.png)

2. Select **New contact**.
3. Enter the **Address**, then a **Name**. Use the person's full Miden address for the network you're on: not an Ethereum address, and not a Testnet address on Mainnet.

   ![Bread Wallet's New contact page, with the Address and Name fields](E62-new-contact.png)

4. Select **Add Contact**.

The wallet shows **Invalid address** if the address isn't valid, and **This is one of your accounts** if it's your own. Your own accounts are already listed under **My accounts**.

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

On Mainnet, when you bridge funds in, the deposit can't take the receiving account above about $1,232. It isn't a per-transfer or daily limit.

The wallet adds the deposit to what that account already holds, in US dollars. If the total would pass the cap, it stops the deposit and asks you to enter a smaller amount. For example, an account holding $1,000 can take in about $232 more. Splitting a deposit into smaller ones doesn't help, because each one counts toward the same total.

If the wallet can't price the token you're depositing, it can't check the cap, so it won't let the deposit through. Try again later.

This cap is separate from any daily spending limit you set. See *How do I prepare for Mainnet and check my network?*

### 37. How do I prepare for Mainnet and check my network?
Category: Getting started › Setup and basic use

Mainnet is Bread's live network, with real funds. Testnet is a separate test network: its tokens have no real value and never move to Mainnet. Mainnet is invite-only for now, so a new Mainnet wallet needs the access code from your invite email.

**Check which network you're on**

On Testnet, the screen where you review a transaction shows **Testnet · Tokens have no real value**. Mainnet shows no network line there. If you see Testnet, use test tokens only.

**Create a new Mainnet wallet**

1. On the **Welcome** screen, select **I have a code**.
2. Enter the 12-character code from your invite email in **Access code**, exactly as written, then select **Unlock mainnet**.
3. Finish setting up your wallet, and write down your new recovery phrase.

Each code registers one account. Keep it private: don't post it, show it in a screenshot or send it to support.

If you don't have a code, select **I don't have a code**. You can still recover an account you already have; for access, contact [support](/feedback).

If the wallet says the code did not work, check it and enter it again. If it says it could not check the code, check your connection and try again later. Don't create another account or reinstall to get past an error.

**Move from Testnet to Mainnet**

Your Testnet wallet can't become a Mainnet wallet. Switching clears the Testnet wallet from this device and starts a new Mainnet one. Save your Testnet recovery details first; see *What should I do before resetting or reinstalling Bread?*

1. Select **Have a mainnet access code?** at the top of the wallet. If it isn't there, select **Profile**, tap the version number at the bottom seven times to open **Developer Settings**, and select **Switch to mainnet**. Don't change anything else in **Developer Settings**.
2. Enter your code and select **Continue**. Nothing is cleared until Mainnet accepts the code.
3. Select **Reset and switch to mainnet**.
4. Create your Mainnet wallet with the code, or recover a Mainnet account you already have.

**Recover an existing Mainnet account**

You don't need a new code to recover a Mainnet account. On the **Welcome** screen, select **I don't have a code**, then **Recover your account**, and follow *How do I restore my wallet with a recovery phrase?*

An account works on one device at a time. Recovering it makes the new device the only one with access, and the old one shows **Another device holds this account**, with a **Make this device the main one** button.

**Back up your recovery phrase at $150**

When your accounts on Mainnet reach $150 in total, the wallet asks you to back up your recovery phrase before you can continue. This applies if you created the wallet in Bread, the phrase is still stored on this device, and you haven't confirmed your backup yet. Never type your phrase into a website or support form.

Before you add funds, see *What is the Partner Mainnet deposit limit?* and *Do I need Developer Settings to use Bread?*

### 38. Do I need Developer Settings to use Bread?
Category: Getting started › Setup and basic use

No. Bread works with its default settings, and most people never need Developer Settings.

Developer Settings are for developers who test integrations, use test faucets or run their own networks. The wallet itself warns that wrong values will break your wallet: a changed endpoint can stop syncing or point Bread at a different network.

If you changed an endpoint, **Network endpoints** appears in your settings. Going back to the defaults can need **Reset to defaults & re-onboard**, which erases this wallet from the device, including your keys and history. Make sure you have your recovery phrase first. Don't reset a working wallet just to fix a problem.

Developers can also create accounts without a Guardian. Those accounts don't get a Guardian backup, so keep them separate from your everyday accounts.

For SDK, API and custom-network guides, see the [Miden developer documentation](https://docs.miden.xyz/). See *How do I prepare for Mainnet and check my network?*

### 39. What should I do before resetting or reinstalling Bread?
Category: Manage wallet › Security and recovery

Resetting or reinstalling erases Bread from this device: your keys, local history, contacts and settings. Signing out after a forgotten password, or resetting developer endpoints, does the same. You get your wallet back only with your recovery phrase or a backup.

Your Bread account works on one device at a time. If you restore it on another device, that device becomes the only one with access and the old device can't use the account. The old device can take it back with **Make this device the main one**, which pays a small network fee. If that option isn't there, restore the wallet with your recovery phrase.

**Before you reset**

1. Check that you have your recovery phrase written down correctly and stored offline. A password, passcode or biometric unlock can't restore a wallet on a new installation.
2. Check which network and Guardian the account uses. Recovery needs your phrase and your Guardian's backup of the account.
3. Check **Activity** and your balances, including any bridge or Earn transfers still in progress. Note any details you may need to follow up.
4. Keep your working installation until you know you can recover.

If you forgot your password, use **Forgot password?** (**Forgot passcode?** on a phone) to sign out and import the account again with a new password. Support can't reset your recovery phrase. If you don't have the phrase, don't sign out or reset; contact [support](/feedback).

**Encrypted Wallet File**

If you see **Profile** → **Security** → **Encrypted Wallet File**, you can save an extra backup. Treat it like a password. It is a snapshot, so save a new one after you change your accounts. Never share it or attach it to a support report.

A file alone may not complete recovery: Bread may still need to set up a new everyday key, and that needs your Guardian to respond. If your Guardian is down, or you're unsure which backups you have, keep your working installation and contact [support](/feedback) before resetting.

Resetting doesn't cancel a transaction you already sent, and it doesn't move Testnet funds to Mainnet. See *How do I restore my wallet with a recovery phrase?*

### 40. What should I check if a bridge deposit or withdrawal is delayed?
Category: Troubleshooting › Common issues

Bridge transfers take time. USDC deposits into Bread usually arrive in about 2 minutes (about 1 minute from Arc), and **Slow · Agglayer** transfers take about 30 minutes. A transfer can be confirmed on the network you sent from before it reaches the other side.

1. Check the original transfer: the networks, the token and the receiving address.
2. Open **Activity** and tap the transfer to see its status. Keep Bread open and connected so it can sync.
3. If the transfer is coming into Bread, check whether it is waiting for you to accept it. See *How do I accept a pending transfer?*
4. If the transfer shows a button such as **Claim Asset** or **Reclaim funds**, follow it. Some withdrawals need you to connect the receiving wallet to claim.
5. Check your balances on both networks before you try again. Don't send a second transfer just because the screen closed or froze.
6. If it's still delayed, report the route, the networks, your wallet version and the transaction ID. Hide sensitive information in screenshots. See *How do I send feedback or report a problem?*

If a route is switched off, that stops new transfers, not ones already on their way. Don't change Developer Settings to force a route.

If Bread shows **Bridge deposit failed**, see *What should I do if a bridge deposit fails?*

### 41. How do I send feedback or report a problem?
Category: Troubleshooting › Common issues

Open [the Bread feedback form](/feedback), or in Bread go to **Profile** → **About** → **Send feedback**.

1. Choose a **Feedback type**, then give it a **Short title** and a **Description**.
2. For a bug, fill in **Steps to reproduce**, **Expected result** and **Actual result**, plus your **Platform**, **App version** and **Network**. One problem per report helps us fix it faster.
3. Add a screenshot if it helps. First hide anything sensitive, such as your recovery phrase, keys, passwords and invite codes.
4. Select **Submit feedback**.

Never put your recovery phrase in the form, and never attach a wallet backup file. Support will never ask for them.

If the form doesn't open, check your connection and try the link again. You don't need to reset your wallet to fix it.

### 42. How do I send or receive tokens on Miden?
Category: Manage wallet › Sending, receiving, and claiming

Use **Send** to send tokens and **Receive** to share your address. Both wallets need to be on the same Miden network.

**To receive**

1. Open **Receive** and share your address or QR code. Never share your recovery phrase or keys.
2. Ask the sender to check the network and the token.
3. Incoming USDCX is accepted automatically by default. Other tokens may need you to accept them in **Activity** before you can use them. See *How do I accept a pending transfer?*

**To send**

1. Open **Send** and paste the address, or pick it from **Recent** or **Address Book**.
2. Choose the token and enter the amount.
3. On the review screen, check the address, the amount, **Transfer type** and **Max network fee**, then confirm.

Network fees are paid in USDCX, so keep a little in your account. If Bread says the address belongs to a different Miden network, stop and check it with the recipient.

Transfers are **Private** by default. Your address as the sender is always visible on the network. A **Public** transfer also shows the token, amount and recipient.

Track your send in **Activity**. To send to another blockchain, see *How do I send funds from Bread to another blockchain?* If a send shows as confirmed but the token never arrived, see *My transfer shows as confirmed, but the token never arrived.*

### 43. What should I check before a Swap?
Category: Crosschain › Moving across chains

Swap trades one token for another inside Miden. Prices come from [Forkchoice](https://forkchoice.xyz/). Swapping to another blockchain isn't available yet.

**Which pairs can I swap?**

As of 26 October 2026, you can swap these seven pairs, in either direction:

- ETH ↔ USDT.
- WBTC ↔ USDT.
- Wrapped SOL ↔ USDT.
- USDCX ↔ USDT.
- ETH ↔ USDCX.
- WBTC ↔ USDCX.
- Wrapped SOL ↔ USDCX.

Wrapped SOL can appear as **SOL** in the token list. Other tokens you hold, such as NEAR, PAXG, WBNB and PYUSD, can't be swapped yet. For moving tokens between networks, see *Which bridge networks and tokens can I use?*

**Before you confirm**

On the review screen, check **You Send**, **You Receive**, **Rate**, **Slippage** and **Max network fee**. Network fees are paid in USDCX, so keep a little in your account.

A swap is an order. It may fill all at once, in parts, or not at all if the price moves. **Cancel if not filled within** sets how long it waits. Whatever hasn't filled by then comes back to you, and you can stop it sooner with **Cancel swap** in **Activity**.

**If something goes wrong**

- **Price unavailable. Try again shortly.** Wait a moment and get a fresh price. Don't rely on a price you saw earlier.
- **No swap tokens are configured for this network yet.** Swap isn't available on the network you're using. Don't change endpoints to get around it.
- If a swap was interrupted, let Bread sync, then check **Activity** and both token balances before trying again. Contact [support](/feedback) if the problem continues.

See *How do I prepare for Mainnet and check my network?*


### 44. How do I use Explore and mini-apps?
Category: Getting started › Setup and basic use

**Explore** lists apps you can use with Bread on your current network. Filter them by **All**, **Finance**, **Arcade** or **Others**, or use **Search dApps**.

1. Open **Explore** and choose an app. On the extension, the app opens in a new browser tab.
2. Check the app's address. Never enter your recovery phrase, keys or wallet password into an app or website.
3. Bread asks before an app connects to your wallet. Connecting is separate from approving a transaction, and Bread asks you to review each one. Cancel any request you don't understand.

You can also paste a website address into the search. Only open sites you trust. If a link sends you to a site that isn't listed in Explore, Bread asks before opening it.

If an app doesn't open or connect, check your connection and reopen it from **Explore**. Make sure the app is on the same network as your wallet: a Testnet app can't use your Mainnet balance. Don't change network endpoints to force a connection.

If a transaction was interrupted, check **Activity** and your balances before trying again. To report a problem, include the app's name and address, your network, your wallet version and the error message, with nothing secret in it. See *How do I send feedback or report a problem?*


### 45. How do GameCoins and Arcade work?
Category: Getting started › Setup and basic use

Game Coins (GC) are the coins that Arcade games use. To find the games, select **Explore Arcade** on Home, or choose **Arcade** in **Explore**.

**Your GC balance**

In Arcade, open **Coins** to see your **Game Coins** balance on your current network. Your balance stays private.

You can't buy GC in Bread yet: **Buy more GC** is disabled, and Bread says so. Bread does not provide a weekly GC allowance either. If a game offers to sell you GC, that's the game's own offer, not Bread's.

**Playing**

Opening a game doesn't connect your wallet; Bread asks first. Each game sets its own rules for stakes, payouts and refunds, so read its rules before you approve anything. Network fees are still paid in USDCX, not GC.

GC isn't a score. Each game keeps its own scores and leaderboard, and there's no ranking across games.

If a game action fails, don't keep approving it. Check **Activity**, your GC balance and the game first. In Arcade, **Activity** shows only transactions from games listed in Arcade.

To report a problem, include the game, your network, your wallet version and the error message, with nothing secret in it. See *How do I send feedback or report a problem?*

### 46. Which bridge networks and tokens can I use?
Category: Crosschain › Moving across chains

Use only the source network, destination network, token and transfer direction currently enabled in your installed Bread version. Support for a chain does not mean support for every token or every direction. A token ticker alone does not identify an asset.

**Partner Mainnet route list — checked 26 October 2026**

The current Partner Mainnet configuration lists these routes in both directions: deposits into Miden and withdrawals from Miden. This describes configured options; it does not guarantee that each route is available in your installed release or for your transfer. Continue only when the wallet offers the exact route and its review information.

- **Circle USDC route:** native USDC on Ethereum, Arbitrum, Base or Arc ↔ USDCX on Miden. This route uses Circle's [xReserve](https://www.circle.com/xreserve) infrastructure; routes from Ethereum, Arbitrum and Base also use Circle's [Cross-Chain Transfer Protocol (CCTP)](https://developers.circle.com/cctp/concepts/supported-chains-and-domains). USDCX on Miden and native USDC on another network are distinct assets.
- **Agglayer route:** Ethereum ↔ Miden for WBTC, wrapped SOL, Ethereum's NEAR token, PAXG, USDT, WBNB and PYUSD. These are the ERC-20 assets listed in the configuration. Native ETH is handled separately through the bridge registry; use it only when the wallet offers the ETH route. Wrapped SOL and WBNB do not establish support for the native Solana or BNB Chain networks. Learn about [Agglayer](https://docs.polygon.technology/interoperability/agglayer).

A separate bridge website may offer different assets or directions; its options do not establish support inside Bread. [Epoch](https://epochprotocol.xyz/)'s fast-bridge route is not currently enabled on Partner Mainnet. Do not infer that other networks or every token supported by a provider are supported in Bread.

**NEAR Intents**

[NEAR Intents](https://docs.near-intents.org/) is disabled in the current Partner Mainnet configuration. There is no announced availability date. Native NEAR-network transfers and NEAR Intents are separate from the Ethereum NEAR-token route listed above. Do not send native NEAR to an Ethereum or Miden address on the assumption that Intents will handle the transfer.

**Before depositing or withdrawing**

1. Check whether Bread is using Partner Mainnet or Testnet. Testnet route availability does not establish Mainnet support.
2. Open the bridge flow and choose the source and destination networks. Check deposits and withdrawals separately; an available route in one direction does not establish the reverse route.
3. Select the exact token offered for that route. Review its source asset and destination asset, the recipient, limits, fees and estimated amount before confirming. USDC and USDCX are not interchangeable token identifiers.
4. Continue only if the wallet enables the route and provides the required review information. If the route is missing, disabled or cannot provide a quote, stop and contact [support](/feedback). Never send directly to a bridge contract or substitute a token with a similar name.

A list of networks in an announcement, website or earlier wallet version does not guarantee that a route is currently available. The available choices can change by network, app version, token, amount, direction or service status.

Do not assume native NEAR-network transfers or NEAR intents are available because you see an Ethereum token named NEAR. Use only the actual networks and route shown by your supported wallet version.

Check the Partner Mainnet balance cap before depositing. If a submitted transfer is delayed, follow *What should I check if a bridge deposit or withdrawal is delayed?*

### 47. What should I do if Guardian cannot connect?
Category: Troubleshooting › Common issues

If Bread can't reach your Guardian, it shows **Guardian unreachable**. Your funds stay yours, but new transactions can't go through until your Guardian responds. Keep the wallet installed: this isn't a problem with your recovery phrase, and resetting won't fix it.

1. Check your internet connection and update Bread from the official store.
2. If Bread is still syncing, or setting up your everyday key after a restore, let it finish before you try anything else.
3. Check that Bread is on the same network as your account. Mainnet and Testnet accounts are separate. Never enter a Guardian address someone sends you.
4. If the outage lasts, select **Switch Guardian** to move to another provider. Your address, funds and history stay the same, and your old Guardian can't block the switch. Bread may ask for your recovery phrase.
5. If it still doesn't work, note the exact message, the time, your platform, wallet version, network and Guardian name. Contact [support](/feedback) before you reset, reinstall or restore again. Keep your recovery phrase and keys out of the report.

Your Bread account works on one device at a time: restoring it on another device makes that device the only one with access. If you've already restored it elsewhere, carry on there rather than restoring back and forth.

Your Guardian backs up your account; it doesn't replace your recovery phrase. Support can't recover a missing phrase. See *What should I do before resetting or reinstalling Bread?*

### 48. What should I do if a bridge deposit fails?
Category: Troubleshooting › Common issues

If Bread shows **Bridge deposit failed** after your external wallet, such as MetaMask, asks you to approve the deposit, the connection between Bread and that wallet may need refreshing. Disconnecting and reconnecting the wallet can let the deposit complete.

1. Before you try again, check that the deposit did not go through. Look in **Activity** in Bread and in your external wallet's history. If a deposit transaction was sent, do not send another. See *What should I check if a bridge deposit or withdrawal is delayed?*
2. Tap **Done** to close the failure screen.
3. Open **Receive**, tap **Cross-chain** and go to the amount screen.
4. Tap your wallet address at the top of the screen. **Switch wallet** opens.
5. Tap **Connect another wallet**, choose the same wallet again and approve the connection in it.
6. Enter the amount and continue. Approve each request in your wallet as it appears.

If it still fails, report the error, the networks, the token and your wallet version. Hide sensitive information in screenshots. See *How do I send feedback or report a problem?*

### 49. How do I send funds from Bread to another blockchain?
Category: Crosschain › Moving across chains

<!-- platform: extension-desktop -->

These steps send USDCx from Bread to your MetaMask wallet on the bridge website, https://bridge.miden.xyz/. It arrives in MetaMask as USDC.

1. Go to https://bridge.miden.xyz/, connect MetaMask and Bread as in steps 2 to 5 of *How to add funds into Bread?*, and select **Withdraw**.
2. Next to **To**, choose where you want to receive the funds: **Arc**, **Ethereum**, **Base** or **Arbitrum**. Enter the amount and select **Review transfer**.

   ![The bridge website's Withdraw tab, with the Select network list next to To](E69-send-out-withdraw.png)

3. Check **Estimated received** and the fees, then select **Confirm in wallet**. Burning USDCx can't be reversed, and the final Circle fee can change after the burn. Keep some USDCx for the Miden network fee.

   ![The bridge website's Review transfer window for a withdrawal, with Estimated received and the Confirm in wallet button](E69a-send-out-review.png)

4. Bread opens **Confirm Transaction**. Check the asset change and **Network Fee**, then select **Confirm**.

   ![Bread's Confirm Transaction window for bridge.miden.xyz, with the asset change and the Confirm button](E69b-send-out-confirm.png)

5. The bridge shows **Withdrawal submitted**. It doesn't track the payout yet, so check MetaMask for the USDC.

   ![The bridge website's transfer card, marked Withdrawal submitted](E70-send-out-submitted.png)

<!-- platform: mobile -->

These steps send USDCX from Bread to your MetaMask wallet. It arrives in MetaMask as USDC.

1. Tap **Send**. Under **Send to**, paste your MetaMask address, or pick it from **Recent** or **Address Book**.

   ![Bread's Send to page, with Paste, Address Book, Scan QR code and the Recent list](M15-send-out-send-to.png)

2. Under **Network**, tap the network and choose where you want to receive the funds: **Ethereum**, **Base**, **Arbitrum One** or **Arc**. Then tap **Confirm**.

   ![Bread's Send to page, with a MetaMask address and Network set to Ethereum](M15a-send-out-network.png)

   ![Bread's Select network list, with Ethereum, Base, Arbitrum One and Arc](M15b-send-out-select-network.png)

3. Tap the token and choose **USDCX**.

   ![Bread's Select a token list, with ETH and USDCX](M15c-send-out-select-token.png)

4. Enter the amount and tap **Confirm**.

   ![Bread's Enter amount page, with 5 USDCX going to MetaMask on Ethereum](M15d-send-out-enter-amount.png)

5. Under **Choose a route**, check the **Circle fee** and **You Receive**, then tap **Confirm**. Circle's fee comes out of the amount you send, so you receive less than you send.

   ![Bread's Choose a route page, with the Circle xReserve route, the Circle fee and You Receive](M16-send-out-choose-route.png)

6. On **Review Details**, check the address, **Network**, **Route** and **You Receive**, then tap **Send Payment**. Once it is sent, the transfer can't be reclaimed, so check the address carefully.

   ![Bread's Review Details page, with the address, network, route, fees and the Send Payment button](M16a-send-out-review.png)

7. While Bread shows **Generating Transaction**, you can tap **Hide**. Bread notifies you when it's done.

   ![Bread's Generating Transaction page, with its progress steps and the Hide button](M16b-send-out-generating.png)

8. When **Burn submitted** appears, tap **View in Activities** to follow the transfer.

   ![Bread's Burn submitted page, with the Done and View in Activities buttons](M17-send-out-burn-submitted.png)

9. In **Activity**, tap the transfer to open it. The transfer is complete when its **Status** reads **Confirmed**. The USDC is then in your MetaMask wallet.

   ![Bread's Transaction page for the transfer, with the status Confirmed](M17a-send-out-confirmed.png)
