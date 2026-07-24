# 🦊 MetaMask & Sepolia Setup Guide

Welcome to Sentinel! Since Sentinel operates on the **Sepolia Testnet** (a testing environment for Ethereum), you will need a Web3 wallet to interact with the platform securely.

This guide will walk you through setting up a MetaMask wallet from scratch, adding the Sepolia network, getting free test funds, and connecting it to Sentinel.

---

## 🛠️ Step 1: Install MetaMask

MetaMask is a browser extension that acts as your secure Web3 wallet.

1. **Download:** Go to the official [MetaMask Website](https://metamask.io/download/) and click **Install MetaMask** for your browser (Chrome, Firefox, Brave, or Edge).
2. **Add to Browser:** Follow the prompts to add the extension to your browser.
3. **Pin it:** For easy access, click the "puzzle piece" icon in your browser toolbar and pin the MetaMask fox icon.

---

## 🔐 Step 2: Create Your Wallet

1. Click on the MetaMask fox icon in your toolbar to open it.
2. Click **Create a new wallet**.
3. **Password:** Create a strong password. You will use this to unlock the wallet on your current device.
4. **Secret Recovery Phrase (CRITICAL):** 
   - MetaMask will generate a 12-word Secret Recovery Phrase. 
   - **Write this down on a physical piece of paper.**
   - Do NOT save it on your computer, take a screenshot, or share it with anyone. If you lose this phrase, you lose access to your wallet permanently. If someone else gets it, they can steal your funds.
5. Verify the phrase by clicking the words in the correct order when prompted.

---

## 🌐 Step 3: Enable the Sepolia Testnet

By default, MetaMask is connected to the Ethereum Mainnet. Since Sentinel uses test money (so it's completely free to use!), we need to switch to the Sepolia Testnet.

1. Open MetaMask.
2. Click on the **Network Dropdown** at the top left of the MetaMask window (it usually says "Ethereum Mainnet").
3. Toggle the switch that says **"Show test networks"** to the ON position.
4. In the list of networks, select **Sepolia**.

*(If Sepolia doesn't appear automatically, you can add it manually by going to Settings > Networks > Add Network > Add a network manually, and entering the Sepolia RPC details).*

---

## 🚰 Step 4: Get Free Sepolia ETH

To interact with Sentinel (like posting content), you need "Gas" to pay for the transaction fees. On the Sepolia network, this money is completely fake and free. You can get it from a "Faucet".

1. **Copy your wallet address:** Open MetaMask and click on your account name (e.g., "Account 1") at the top. It will copy a long string starting with `0x...` to your clipboard.
2. **Visit a Sepolia Faucet:**
   - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/) (Requires a free Alchemy account)
   - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
   - [QuickNode Sepolia Faucet](https://faucet.quicknode.com/ethereum/sepolia)
3. Paste your wallet address (`0x...`) into the faucet and click **Send Me ETH**.
4. Wait a few moments, check your MetaMask, and you should see your balance update!

---

## 🔗 Step 5: Connect to Sentinel

Now that your wallet is set up and funded, you are ready to use the platform!

1. Open the **Sentinel web application** in your browser.
2. Look for the **"Connect Wallet"** button (usually in the sidebar or top right corner).
3. Click it and select **MetaMask**.
4. MetaMask will pop up asking for permission to connect to the site. Click **Next** and then **Connect**.
5. Once connected, your wallet address will be displayed in the application, and you can start creating verifiable, on-chain posts!

🎉 **Congratulations! You are now fully set up in the Web3 ecosystem.**
