import { ethers } from 'ethers';
import dotenv from 'dotenv';
import SentinelABI from '../SentinelABI.json' assert { type: 'json' };

dotenv.config();

const RPC_URL = process.env.NETWORK_RPC_URL;
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("❌ CRITICAL: Missing Web3 Environment Variables in .env!");
    console.error("Ensure NETWORK_RPC_URL, RELAYER_PRIVATE_KEY, and CONTRACT_ADDRESS are set.");
    process.exit(1);
}

// 1. Initialize the Provider for Sepolia
export const provider = new ethers.JsonRpcProvider(RPC_URL);

// 2. Set up the Relayer Wallet with the Provider
export const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// 3. Instantiate the SentinelRegistry Contract
export const sentinelContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    SentinelABI,
    wallet
);

console.log("✅ Web3 Relayer Initialized.");
console.log(`📡 Network: Sepolia Testnet`);
console.log(`🏦 Contract: ${CONTRACT_ADDRESS}`);
console.log(`🔑 Relayer Address: ${wallet.address}`);
