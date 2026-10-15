# Cross-chain step-by-step FAQs — drafts (2026-10-12, revised 2026-10-15)

Status: **draft, not approved, not published.** Ivan asked for these on 2026-10-12. Nothing here is
in `bread-faq-content.md` or in `src/help-center/content/`, and nothing should be until he approves
the titles and the text.

Decisions so far (Ivan, 2026-10-15):

- **Scope.** Swap stays as #45 left it (*What should I check before a Swap?*). Earn is a label
  recheck of articles 43 to 51 against 1.17.3, reported below, not new articles.
- **Network.** Mainnet text, testnet screens: the wording follows #45's Mainnet framing (articles
  36 to 38, 59, 60 and 63); the screenshots come from the live build, which is Miden Testnet.
- **Web bridge.** bridge.miden.xyz gets an article of its own beside the two in-wallet ones.
- **Capture.** Screens are taken by the capture run, as before.

Proposed placement: Cross-chain › Moving across chains, as articles 67, 68 and 69 (FAQ 44, 45 and
46). #45 took articles 60 to 66 and FAQ 37 to 43 on 2026-10-14. Extension only until a phone check.

## 67. How do I bring funds into Bread Wallet from another blockchain?

You can bring USDC or ETH from a supported Ethereum network into Bread Wallet. You need an Ethereum wallet that holds the funds and supports WalletConnect.

Check the network shown in the wallet before you start. On Testnet, connect a wallet that holds test tokens only; never connect a wallet that holds real funds. On Mainnet, keep the resulting wallet balance within the Partner Mainnet cap.

1. Select **Receive**, then **Cross-chain**.
2. On **Connect an EVM wallet**, select **Open wallet** and choose your Ethereum wallet, or scan the QR code with it.
3. On **Miden Bridge**, choose the token and, under **Network**, the network you are sending from.
4. Enter the amount and select **Confirm**.
5. Under **Route**, choose a route and select **Confirm**. **Fast** takes about 30 seconds and **Slow** about 30 minutes.
6. Check the details under **You are depositing**, then select **Confirm Deposit**.
7. Approve the request in your Ethereum wallet. Keep the screen open while it shows **Confirming bridge deposit**.
8. When **Bridge initiated!** appears, select **Done**. Your funds appear in Bread Wallet when the bridge delivers them.

If the funds do not arrive, see *What should I check if a bridge deposit or withdrawal is delayed?* For the cap, see *What is the Partner Mainnet deposit limit?*

## 68. How do I send funds from Bread Wallet to another blockchain?

You can send funds from Bread Wallet to an Ethereum address on a supported network.

Check the network shown in the wallet before you send. On Testnet, send test tokens only; a Sepolia address is not an Ethereum Mainnet address.

1. Select **Send**.
2. Under **Send to**, enter the Ethereum address and select **Confirm**.
3. On **Select Amount**, choose the token and, under **Network**, the destination network.
4. Enter the amount and select **Confirm**.
5. Under **Route**, choose a route, then select **Confirm**. **Fast** takes about 30 seconds and **Slow** about 30 minutes.
6. On **Review Details**, check the address, network and amount, then select **Send Payment**.
7. When **Payment Sent!** appears, select **View in Activities** to follow the transfer.

On the **Slow** route, the funds wait for you to claim them. When the transfer shows **Ready to claim** in **Activity**, connect the destination wallet and select **Claim Asset**.

If the transfer is slow to arrive, see *What should I check if a bridge deposit or withdrawal is delayed?*

## 69. How do I use the Miden Bridge in my browser?

Not drafted. The page at https://bridge.miden.xyz/ is a single-page app: a plain fetch returns only its
title, so its screens, networks and labels have to be read in a browser. The capture driver opens only
Bread Wallet's own pages, and the `site` step that would open an allowlisted URL was not approved on
2026-10-15. The article is written once the page has been walked.

## What is seen and what is not (wallet 1.17.3, 2026-10-15)

Capture run: a new capture profile, Bread Wallet 1.17.3 installed from the Chrome Web Store
(Chrome 155), matching the `v1.17.3` tag; a new throwaway wallet funded with 100 USDCX from the
in-app faucet.

- **Seen on screen:** **Receive** › **Cross-chain** (**from Ethereum Sepolia**), **Connect an EVM
  wallet** with its notice **Connect a test wallet only** ("This bridge uses Arc Testnet or Ethereum
  Sepolia for USDC and Ethereum Sepolia for ETH. Do not connect a wallet that holds real funds…"),
  **Open wallet**, and the Reown **Connect Wallet** picker (email, Google, socials, WalletConnect,
  MetaMask, Rainbow, Uniswap Wallet). The **Invalid App Configuration** notice seen on 1.17.2 is gone.
  The **Send** tab with **Send to** and **Confirm**.
- **From source only (`v1.17.3`):** every step after **Open wallet** in article 67, and every step
  after **Send to** in article 68. Every bold label in both was found in the 1.17.3 strings.
- **Screens that carry Testnet wording** (for "Mainnet text, testnet screens"): the **Receive** tab
  (**Miden Testnet**, "Only send Miden Testnet tokens here…"), **Cross-chain from Ethereum Sepolia**,
  and the **Connect a test wallet only** notice. Each needs Ivan's yes before it is placed.

## Why the flows past Open wallet cannot be captured yet

- **Connecting a wallet.** The Extension connects to an Ethereum wallet only through Reown AppKit
  and WalletConnect (`src/lib/walletconnect/appkit.tsx`). A browser wallet such as MetaMask cannot
  inject into the extension's own pages, so its row in the picker leads to a QR code for a phone
  wallet. Installing MetaMask in the capture profile, approved on 2026-10-15, would not get past
  **Open wallet**, so it was not installed. Step 2 of article 67 now names the QR code for this reason.
- **Typing an address.** Walking article 68 past **Send to** needs typing an Ethereum address into
  the field; that was not approved.
- **Test funds.** Article 67 also needs Sepolia USDC or ETH in the connected wallet.

## Earn recheck against 1.17.3 (articles 43 to 51)

Reported, not changed. Every bold label in articles 43 to 51 was compared with the 1.17.3 strings,
and steps 1 to 3 of article 44 were walked on the build.

- **Article 44, step 2, and E35.** 1.17.3 heads the vault list **Available Vaults**; the article and
  the E35 alt text say **Featured Vaults**. E35 is retaken on 1.17.3 (raw, not placed). Proposed:
  - Step 2: "Under **Featured Vaults**, select a vault…" → "Under **Available Vaults**, select a vault…"
  - E35 alt: "Bread Wallet's Earn page, with Featured Vaults and no active positions" → "Bread
    Wallet's Earn page, with Available Vaults and no active positions"
- **Article 44, steps 1 to 3.** Unchanged on 1.17.3: the vault page's **Deposit** button, then
  **Deposit Amount** with **Confirm**.
- **Steps 4 onward and articles 45 to 51.** Labels unchanged in the strings; not walked, because the
  capture wallet holds USDCX and the testnet vault takes USDC.

## Open points for Ivan

1. **Testnet screens.** Which of the Testnet-worded screens above may be placed under the Mainnet text?
2. **Connecting a wallet.** Will you scan the WalletConnect QR code with a phone wallet that holds
   Sepolia test funds while the capture runs, or send the screens yourself?
3. **Article 68.** May the capture type an Ethereum address into **Send to**? It would stop at
   **Review Details** unless you allow a real test send.
4. **Article 69.** May the driver get a `site` step that opens only https://bridge.miden.xyz/ from an
   allowlist in its config?
5. **Test payout.** 1.17.3 still ships the notice "This test faucet burns USDCx on Miden without a
   destination payout." If it shows on a USDCx send, article 68 needs a Testnet line about it.
6. **USDCX or USDCx.** Plain labels read **USDCX**; **USDCx** appears only in that notice and in the
   route label **USDCx (Circle xReserve)**. The drafts no longer name the token in plain text.
7. **Article 44 and E35.** Approve the two changes above. They go in a pull request of their own.
