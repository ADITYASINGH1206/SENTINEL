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
Open three terminal windows.

**Terminal 1 (Backend - Node.js):**
```bash
cd backend
npm install
```

**Terminal 2 (Frontend - React):**
```bash
cd frontend
npm install
```

**Terminal 3 (AI Orchestrator - Python):**
```bash
cd ai-orchestrator
pip install -r requirements.txt
# Requires GOOGLE_API_KEY, GROQ_API_KEY, OPENAI_API_KEY in .env
```

### 3. Run the Development Servers

Start all four servers simultaneously in their respective terminals:

**Backend:**
```bash
cd backend
npm run dev
# Expected output: 🚀 Sentinel Node.js Backend running on port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
# Expected output: ➜  Local: http://localhost:5173/
```

**Moderation Service:**
```bash
cd moderation_service
# If using Command Prompt / PowerShell:
venv\Scripts\activate
# If using Git Bash / Mac / Linux:
source venv/Scripts/activate

python app.py
# Expected output: INFO:     Uvicorn running on http://0.0.0.0:8002
```

**AI Orchestrator:**
```bash
cd ai-orchestrator
# If using Command Prompt / PowerShell:
venv\Scripts\activate
# If using Git Bash / Mac / Linux:
source venv/Scripts/activate

python app.py
# Expected output: Uvicorn running on http://0.0.0.0:5000
```

### 4. How to Close the Project

To safely shut down the servers, navigate to each of the three terminal windows you opened and press:

**`Ctrl + C`** (Windows/Linux) or **`Cmd + C`** (Mac)

If you are prompted with `Terminate batch job (Y/N)?` on Windows, simply type `Y` and press Enter. Once you have done this in all three terminals, the entire project will be closed.

---

## 🤖 Text Safety Engine (AI Orchestrator)

The platform features a **3-tier LangChain Fallback Hierarchy** (Gemini 2.0 Flash → Groq Llama 3.3 70B → OpenAI GPT-4o-mini) that evaluates text posts in a single pass to provide:
1. **AI Generation Detection:** Identifies stylometric markers indicating LLM authorship.
2. **Harm & Safety Assessment:** Flags hate speech, misinformation, and other high-risk content using a strictly enforced **10-Tag Harm Taxonomy** (e.g., Harassment, Self-Harm, Scams) and a Zero-Tolerance Rubric.
3. **Domain Classification:** Categorizes the text by topic (e.g., Politics, Tech).

The backend automatically routes text posts to this engine and renders the resulting scores and tags seamlessly in the frontend UI.
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
