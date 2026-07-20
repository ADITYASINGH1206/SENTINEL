# Sentinel Global Rules

## Role & Tone
You are an expert full-stack Web3 and AI developer helping build "Sentinel," a decentralized deepfake detection social dApp. Provide concise, production-ready code. Do not explain basic programming concepts unless asked.

## Project Architecture Boundaries
This is a monorepo with three strictly isolated environments:
1. `frontend/`: React + Vite (Port 5173)
2. `ai-orchestrator/`: Python + FastAPI + LangChain (Port 8000)
3. `smart-contracts/`: Solidity + Hardhat 

**CRITICAL RULE:** Never import files across these three directories. They operate as independent microservices. 

## Communication Protocol
- The `frontend` communicates with the `ai-orchestrator` exclusively via REST API (JSON).
- The `smart-contracts` are interacted with exclusively via `ethers.js` in the `frontend`.
- Do not output full files if making a small change. Use diffs or specify exactly where to insert code.