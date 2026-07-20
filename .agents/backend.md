# Backend Agent Rules (Node.js + Express)

## Tech Stack
- Node.js, Express
- Supabase (Storage, Database, Auth)
- Web3: `ethers`
- AI: JS `fetch` to Hugging Face, Replicate, or `langchain`

## Architecture & Workflows
- Keep routes lightweight in `server.js`.
- Move business logic into `/services` (e.g., `aiService.js` and `web3Relayer.js`).
- **Supabase**: Assume all user media is uploaded directly to Supabase Storage by the frontend. The backend only receives the public `mediaUrl`.
- **Ethers.js**: The backend acts as a relayer. It uses a securely stored `RELAYER_PRIVATE_KEY` in `.env` to sign transactions and reward/flag users autonomously on the smart contract based on the AI response.

## Security
- Do not log private keys.
- Wrap all async routes in try-catch blocks.
