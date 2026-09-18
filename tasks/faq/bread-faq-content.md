# Bread FAQ: final content for implementation

Seventeen articles. Platform: both Extension and Mobile, one body each. Text is verbatim and approved; do not edit.

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

New main categories, last in category order: Cross-chain, with the subcategory Moving across chains (articles 13–15), then Earn, with the subcategory Earning yield (16–17). Within every subcategory, new articles go after the existing ones, in the order above. Activity and transaction status stays empty.

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

The emergency key is recreated from your recovery phrase when you need it.

It is used in two situations: replacing a lost device and switching Guardian. On a new device, the recovery phrase rebuilds the emergency key. Together, the emergency key and Guardian unlock the backed-up state and establish a fresh everyday key tied to the new device.

Guardian keeps the backup, and the emergency key keeps control. Keep your recovery phrase offline and never share it.

Related: *What should I do if I lose my recovery phrase?*, *What is the difference between a recovery phrase and an encrypted wallet file?*, *How does recovery work with Guardian?*

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

Switching Guardian uses your everyday key and your emergency key, so have your recovery phrase ready before you start. In the wallet, this is called **Rotate Guardian**.

**Steps:**

1. From the wallet homepage, open **Settings** (top-right corner).
2. Go to the **Security** section.
3. Select **Guardian**.
4. Click **Rotate Guardian**.
5. On the **Rotate Guardian** page, select your choice of Guardian, then click **Continue**.
6. On the **Review rotation** page, click **Continue**.
7. A password page will appear to authenticate the switch. Enter your wallet password, then click **Continue**.
8. A processing page will appear. You can hide it or wait until the process is complete, then click **Done** once the switch succeeds.

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

![](across-chains-two-routes.png)

### 15. Can I swap tokens across chains?
Category: Cross-chain › Moving across chains

Cross-chain swaps are available only when Bread Beta shows a configured fast route for the selected test asset and destination. When available, a solver can swap the token in transit and deliver the equivalent on the other side. Use only Miden testnet and Ethereum Sepolia test funds; never use assets from Ethereum mainnet or another real network.

Swaps within Miden use Miden-native Swap.

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
Use only the test networks and test assets shown in the wallet.

![](earn-across-the-privacy-line.png)
