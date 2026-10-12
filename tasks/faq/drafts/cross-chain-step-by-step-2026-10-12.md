# Cross-chain step-by-step FAQs — drafts (2026-10-12)

Status: **draft, not approved, not published.** Ivan asked for these on 2026-10-12. The text below
is what was shown to him that day; he has not approved the titles or the wording yet. Nothing here
is in `bread-faq-content.md` or in `src/help-center/content/`, and nothing should be until he
approves it.

Proposed placement: Cross-chain › Moving across chains, as articles 60 and 61 (FAQ 37 and 38),
Extension only until a phone check. Pull request #43 took article 59 and FAQ 36 on 2026-10-12.

## 60. How do I bring funds into Bread Wallet from another blockchain?

You can bring USDC from Arc Testnet or Ethereum Sepolia, or ETH from Ethereum Sepolia, into Bread Wallet. You need an Ethereum wallet that holds those test funds.

⚠️ **Test funds only:** connect a wallet that holds test tokens only. Never bridge from mainnet or any other real network.

1. Select **Receive**, then **Cross-chain**.
2. On **Connect an EVM wallet**, select **Open wallet** and choose your Ethereum wallet.
3. On **Miden Bridge**, choose the token and, under **Network**, the network you are sending from.
4. Enter the amount and select **Confirm**.
5. Under **Route**, choose a route and select **Confirm**. **Fast** takes about 30 seconds and **Slow** about 30 minutes. USDC arrives through the **USDCx** route.
6. Check the details under **You are depositing**, then select **Confirm Deposit**.
7. Approve the request in your Ethereum wallet. Keep the screen open while it shows **Confirming bridge deposit**.
8. When **Bridge initiated!** appears, select **Done**. Your funds appear in Bread Wallet when the bridge delivers them.

## 61. How do I send funds from Bread Wallet to another blockchain?

You can send funds from Bread Wallet to an Ethereum address on a supported test network.

1. Select **Send**.
2. Under **Send to**, enter the Ethereum address and select **Confirm**.
3. On **Select Amount**, choose the token and, under **Network**, the destination network. Networks other than Sepolia accept USDCx only.
4. Enter the amount and select **Confirm**.
5. Under **Route**, choose **Fast**, **Slow** or **USDCx (Circle xReserve)**, then select **Confirm**. **Fast** takes about 30 seconds and **Slow** about 30 minutes.
6. On **Review Details**, check the address, network and amount, then select **Send Payment**.
7. When **Payment Sent!** appears, select **View in Activities** to follow the transfer.

On the **Slow** route, the funds wait for you to claim them. When the transfer shows **Ready to claim** in **Activity**, connect the destination wallet and select **Claim Asset**.

## What is seen and what is not

- **Seen on wallet 1.17.2:** **Receive** › **Cross-chain**, **Connect an EVM wallet**, **Open wallet** and the wallet picker; the **Send** tab with **Send to** and **Confirm**.
- **From source only:** every step after those, in both articles. The source is the wallet's `main` branch, since 1.17.2 has no tag.
- **Wallet picker:** it showed an **Invalid App Configuration** notice during capture. That may come from how the capture tool opens the panel, or it may be a real fault; a connected wallet is needed to tell.

## Open points for Ivan

1. **USDCX or USDCx.** The balance on Home reads USDCX; the route labels in source read USDCx. The drafts use USDCx where they quote a label. Which one goes in plain text?
2. **Test payout.** The source has a notice saying the test faucet burns USDCx on Miden "without a destination payout". If that shows on 1.17.2, article 61 should say a USDCx send may not arrive on testnet.
3. **Routes per token.** Which routes each token gets on screen is not yet known, so step 5 in both articles lists all of them.
4. **Verifying on screen.** Walking both flows and taking screenshots needs a throwaway Ethereum wallet with Sepolia test USDC or ETH in the capture profile, and a permission rule that allows typing an Ethereum address into **Send to**. The alternative is that Ivan walks both flows and sends the screens.
5. **Articles 36 to 38.** They still say Sepolia only and use the old product name. They are unchanged; rewrites can be proposed if wanted.
6. **Article 59.** It describes a Partner Mainnet deposit limit in the same subcategory, while these drafts say test funds only. The two need to read consistently.
