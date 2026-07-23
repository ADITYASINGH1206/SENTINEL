# 🛡️ Sentinel — Setup & Run Guide

> **A Web3 social media platform with AI-powered content moderation.**
>
> This guide walks you through running the full Sentinel stack locally on Windows.

---

## 📋 Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Check Command |
|------|---------|---------------|
| **Node.js** | v18+ | `node --version` |
| **npm** | v9+ | `npm --version` |
| **Python** | 3.10+ | `python --version` |
| **Git** | any | `git --version` |
| **MetaMask** | Browser Extension | [Install](https://metamask.io/download/) |

### Optional (for smart contract development)
| Tool | Version | Check Command |
|------|---------|---------------|
| **Hardhat** | latest | `npx hardhat --version` |

---

## 🏗️ Architecture Overview

Sentinel runs **4 services** locally:

```
┌──────────────────┐     ┌──────────────────┐
│   Frontend        │────▶│   Backend         │
│   (Vite + React)  │     │   (Express.js)    │
│   Port: 5173      │     │   Port: 8000      │
└──────────────────┘     └────────┬───────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼                           ▼
          ┌──────────────────┐      ┌──────────────────┐
          │ AI Orchestrator   │      │ Moderation Svc   │
          │ (FastAPI)         │      │ (FastAPI)         │
          │ Port: 5000        │      │ Port: 8002        │
          └──────────────────┘      └──────────────────┘
```

| Service | Port | Tech | Required? |
|---------|------|------|-----------|
| **Frontend** | `5173` | Vite + React 19 + Tailwind v4 | ✅ Yes |
| **Backend** | `8000` | Express.js v5 + Supabase | ✅ Yes |
| **AI Orchestrator** | `5000` | FastAPI (mock inference) | ⚠️ Optional — only needed for media AI analysis |
| **Moderation Service** | `8002` | FastAPI + NudeNet + Deepfake | ⚠️ Optional — only needed for image moderation |

---

## 🔑 Step 1: External Service Setup

### 1.1 — Supabase (Database + Auth)

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. From **Project Settings → API**, copy:
   - `Project URL` → this is your `SUPABASE_URL`
   - `anon public` key → this is your `SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **SQL Editor** and run these scripts **in order**:

   ```
   backend/supabase/schema.sql          ← base tables (users, posts, comments, likes, shares)
   backend/supabase/schema_update.sql   ← follows, reposts, notifications tables
   backend/supabase/schema_update_v2.sql ← hashtags, impressions, RPC function
   ```

4. *(Optional)* Enable **Google OAuth** under **Authentication → Providers → Google** if you want Google sign-in.

### 1.2 — Alchemy / Infura (Blockchain RPC)

> **Skip this if you don't need Web3/blockchain features.** The app will still work for social features.

1. Go to [alchemy.com](https://www.alchemy.com/) and create a free app on **Sepolia Testnet**.
2. Copy the **HTTPS RPC URL** → this is your `NETWORK_RPC_URL`.
3. You need a **relayer wallet** private key:
   - Create a fresh wallet in MetaMask
   - Export the private key → this is your `RELAYER_PRIVATE_KEY`
   - Fund it with Sepolia ETH from a [faucet](https://sepoliafaucet.com/)

### 1.3 — News API Keys (Optional)

For the trending news widget:
- [Currents API](https://currentsapi.services/) → `CURRENTS_API_KEY`
- [NewsData.io](https://newsdata.io/) → `NEWSDATA_API_KEY`

> If neither key is set, the app falls back to hardcoded mock news — **fully functional without these**.

---

## 📁 Step 2: Environment Variables

### 2.1 — Backend `.env`

Create the file `backend/.env`:

```env
# ===== Supabase =====
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ===== Web3 (Optional — remove if not using blockchain) =====
NETWORK_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
RELAYER_PRIVATE_KEY=your-relayer-wallet-private-key
CONTRACT_ADDRESS=0x460DC3605D19B84b76e17Aa59cfe1E2D28479Cc9

# ===== News APIs (Optional) =====
CURRENTS_API_KEY=your-currents-api-key
NEWSDATA_API_KEY=your-newsdata-api-key

# ===== Server =====
PORT=8000
```

> ⚠️ **Important:** The backend **will crash on startup** if `NETWORK_RPC_URL`, `RELAYER_PRIVATE_KEY`, or `CONTRACT_ADDRESS` are missing, because `config/ethers.js` calls `process.exit(1)`. If you don't want Web3, you'll need to comment out the `import relayerRoutes` line in `server.js`.

### 2.2 — Frontend `.env`

Create the file `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.3 — Moderation Service `.env` (Optional)

Create the file `moderation_service/.env`:

```env
# Hugging Face token (for gated model downloads)
HF_TOKEN=hf_your_token_here

# Role 2 Text Analysis service URL (not built yet)
ROLE2_SERVICE_URL=http://localhost:8001

# Supabase (if connecting DB — currently uses stubs)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Server port
PORT=8002
```

### 2.4 — AI Orchestrator `.env` (Optional)

Create the file `ai-orchestrator/.env`:

```env
FASTAPI_PORT=5000
NETWORK_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CONTRACT_ADDRESS=0x460DC3605D19B84b76e17Aa59cfe1E2D28479Cc9
TRUST_SCORE_THRESHOLD=80
```

---

## 🚀 Step 3: Install Dependencies

Open **4 separate terminals** (or use split terminal in VS Code).

### Terminal 1 — Frontend

```bash
cd frontend
npm install
```

### Terminal 2 — Backend

```bash
cd backend
npm install
```

### Terminal 3 — Moderation Service (Optional)

```bash
cd moderation_service
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

> ⏳ This will download large ML models (~2-3 GB for transformers, NudeNet, ultralytics). First run takes time.

### Terminal 4 — AI Orchestrator (Optional)

```bash
cd ai-orchestrator
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

---

## ▶️ Step 4: Start the Services

Start each service in its own terminal. **Order matters** — start backend before frontend.

### Terminal 1 — Backend (start first)

```bash
cd backend
npm run dev
```

Expected output:
```
✅ Web3 Relayer Initialized.
📡 Network: Sepolia Testnet
🏦 Contract: 0x460DC3605D19B84b76e17Aa59cfe1E2D28479Cc9
🔑 Relayer Address: 0x...
🚀 Sentinel Node.js Backend running on port 8000
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://xxx.xxx.xxx.xxx:5173/
```

### Terminal 3 — Moderation Service (Optional)

```bash
cd moderation_service
venv\Scripts\activate
uvicorn app:app --host 0.0.0.0 --port 8002 --reload
```

Or simply:
```bash
cd moderation_service
venv\Scripts\activate
python app.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8002
```

### Terminal 4 — AI Orchestrator (Optional)

```bash
cd ai-orchestrator
venv\Scripts\activate
python app.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:5000
```

---

## 🌐 Step 5: Open the App

1. Open your browser and go to: **http://localhost:5173**
2. You'll see the **Login page**.
3. **Register** with email + password, or use **Google OAuth**.
4. After login, you'll land on the **Home feed**.

---

## 🦊 Step 6: MetaMask & Web3 Setup (Optional)

To use blockchain features ($SNTL tokens, trust scores, content verification):

1. Install **MetaMask** browser extension.
2. Switch to **Sepolia Testnet** in MetaMask.
3. Get free Sepolia ETH from [sepoliafaucet.com](https://sepoliafaucet.com/).
4. In the app, go to the **Dashboard** page (from the sidebar).
5. Click **Connect Wallet** → MetaMask will prompt for approval.
6. Click **Claim 500 $SNTL** to receive your initial tokens.

### Add $SNTL to MetaMask
In the Dashboard, click "Add $SNTL to Wallet" to display your token balance in MetaMask.

**Token Details:**
| Property | Value |
|----------|-------|
| Network | Sepolia Testnet |
| Contract | `0x460DC3605D19B84b76e17Aa59cfe1E2D28479Cc9` |
| Symbol | `SNTL` |
| Decimals | 18 |

---

## 🧪 Testing the Moderation Service

If you have the moderation service running on port 8002, you can test it directly:

### Test Image Moderation
```bash
curl -X POST http://localhost:8002/moderate/image \
  -H "Content-Type: application/json" \
  -d "{\"post_id\": \"test-123\", \"image_url\": \"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/24701-nature-702.jpg/800px-24701-nature-702.jpg\"}"
```

### Test Account Score
```bash
curl -X POST http://localhost:8002/moderate/account-score \
  -H "Content-Type: application/json" \
  -d "{\"account_id\": \"test-account-123\"}"
```

### Test Report
```bash
curl -X POST http://localhost:8002/report \
  -H "Content-Type: application/json" \
  -d "{\"target_type\": \"post\", \"target_id\": \"test-post-123\", \"reason\": \"spam\", \"reporter_id\": \"user-456\"}"
```

### Run Automated Tests
```bash
cd moderation_service
venv\Scripts\activate
pip install -r tests/requirements-test.txt
pytest tests/ -v
```

---

## 📂 Project Structure

```
SENTINEL_HACKATHON/
├── frontend/                    # React + Vite frontend (port 5173)
│   ├── src/
│   │   ├── components/          # Reusable UI components (8 files)
│   │   ├── pages/               # Route pages (12 files)
│   │   ├── context/             # Auth, Theme, Web3 providers
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API client
│   │   └── supabaseClient.js    # Supabase frontend client
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # Express.js API server (port 8000)
│   ├── controllers/             # Route handlers (6 files)
│   ├── routes/                  # Express routes (7 files)
│   ├── middleware/              # Auth middleware
│   ├── services/                # News, AI, Web3 services
│   ├── utils/                   # Web3 relayer, ABI
│   ├── config/                  # Ethers.js initialization
│   ├── supabase/                # SQL schema migrations (3 files)
│   ├── server.js                # Entry point
│   └── package.json
│
├── moderation_service/          # Python FastAPI moderation (port 8002)
│   ├── app.py                   # FastAPI app with 3 endpoints
│   ├── nsfw.py                  # NudeNet NSFW detection
│   ├── deepfake.py              # SigLIP2 + YOLOv8n-face deepfake detection
│   ├── provenance.py            # C2PA content credentials
│   ├── spam_score.py            # Weighted heuristic scoring
│   ├── reports.py               # Report routing
│   ├── db.py                    # Database layer (stubs)
│   ├── tests/                   # Pytest test suite
│   └── requirements.txt
│
├── ai-orchestrator/             # Python FastAPI AI engine (port 5000)
│   ├── app.py                   # Mock AI inference endpoint
│   ├── config.py                # Pydantic settings
│   └── requirements.txt
│
├── smart-contracts/             # Solidity + Hardhat
│   ├── contracts/
│   │   └── SentinelRegistry.sol # ERC20 token + content registry
│   ├── hardhat.config.js
│   └── package.json
│
├── images/                      # Test images (real + AI-generated)
└── .agents/                     # Build spec & agent configs
```

---

## ⚠️ Troubleshooting

### Backend crashes on startup
**Error:** `CRITICAL: Missing Web3 Environment Variables`
**Fix:** Either add Web3 env vars to `backend/.env`, or comment out the relayer import in `backend/server.js`:
```js
// import relayerRoutes from './routes/relayer.js';
// ...
// app.use('/api', relayerRoutes);
```
And in `backend/routes/postRoutes.js`, comment out any web3-related imports if needed.

### Frontend shows "Loading..." forever
**Fix:** Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `frontend/.env`. Restart the Vite dev server after creating the `.env` file.

### Supabase RLS errors (403)
**Fix:** The backend must use the **Service Role Key** (`SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS. The anon key won't work for inserts/updates.

### Moderation service model downloads fail
**Fix:** Set `HF_TOKEN` in `moderation_service/.env` with a valid [Hugging Face token](https://huggingface.co/settings/tokens). Some models are gated.

### MetaMask "Wrong Network" error
**Fix:** Switch MetaMask to **Sepolia Testnet** (Chain ID: `0xaa36a7` / `11155111`).

### Port already in use
**Fix:** Kill the process using the port:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## 🔗 Quick Links

| Resource | URL |
|----------|-----|
| Frontend (local) | http://localhost:5173 |
| Backend API (local) | http://localhost:8000 |
| Moderation Service (local) | http://localhost:8002/docs |
| AI Orchestrator (local) | http://localhost:5000/docs |
| Supabase Dashboard | https://supabase.com/dashboard |
| Sepolia Etherscan | https://sepolia.etherscan.io |
| Contract on Etherscan | https://sepolia.etherscan.io/address/0x460DC3605D19B84b76e17Aa59cfe1E2D28479Cc9 |
| Sepolia Faucet | https://sepoliafaucet.com |
