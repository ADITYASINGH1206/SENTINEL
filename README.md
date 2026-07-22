# 🛡️ Sentinel: On-Chain Verification Hub

Sentinel is a decentralized, full-stack Web3 platform designed to combat misinformation and deepfakes by leveraging community consensus and immutable blockchain anchoring. 

Whenever community consensus is reached on a piece of content (Post or Comment), the system natively generates a cryptographic SHA-256 hash of the content and permanently anchors the verdict to the **Sepolia Ethereum network** via a gasless relayer.

---

## 🛠 Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, ethers.js, Lucide Icons.
- **Backend**: Node.js, Express.js, native `crypto` (SHA-256), ethers.js relayer.
- **Smart Contract**: Deployed on Sepolia Testnet.

---

## 🚀 Getting Started

Follow these instructions to run the full-stack environment locally for testing.

### Prerequisites
1. [Node.js](https://nodejs.org/) (v18+ recommended)
2. [MetaMask](https://metamask.io/) browser extension installed.

### 1. Environment Variables
Your teammate will provide you with a `.env` file. 
- Place the provided `.env` file directly into the `/backend` directory. 
- It contains the `RPC_URL`, `RELAYER_PRIVATE_KEY`, and `CONTRACT_ADDRESS` needed for the backend to execute on-chain transactions.

### 2. Install Dependencies
Open two terminal windows.

**Terminal 1 (Backend):**
```bash
cd backend
npm install
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
```

### 3. Run the Development Servers

Start both servers simultaneously in their respective terminals:

**Backend:**
```bash
npm run dev
# Expected output: 🚀 Sentinel Node.js Backend running on port 8000
```

**Frontend:**
```bash
npm run dev
# Expected output: ➜  Local: http://localhost:5173/
```

---

## 🧪 Testing the "Proof of Integrity" Flow

Once the servers are running, open `http://localhost:5173/dashboard` in your browser.

1. **Connect Wallet**: Click the top right button to connect your MetaMask.
2. **Submit Content**: Go to the **Verification Feed** tab and submit a test post. 
3. **Trigger Consensus**: 
   - A post requires exactly **3 unique votes** to hit consensus.
   - Vote on the post with your current wallet.
   - Switch accounts in MetaMask (Account 2, Account 3) and cast the remaining votes.
4. **On-Chain Anchoring (The 15-Second Delay)**: 
   - Upon the 3rd vote, the backend will compute the hash and call the Sepolia blockchain. 
   - *Wait roughly 15 seconds* for the Ethereum block to be mined.
5. **Verify Cryptography**:
   - The post will move to the **On-Chain Record** tab.
   - Click the **"Verify Local Integrity"** button. The browser will hash the raw text locally using `crypto.subtle` and compare it to the blockchain record. You should see a massive green success notification!
   - Click **View Record** to see the actual anchored transaction on the Sepolia Blockscout explorer.

---

*Built for the Hackathon.* 🚀
