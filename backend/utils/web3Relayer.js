import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { SentinelRegistryABI } from './abi.js';

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

let provider;
let wallet;
let contract;

// Strictly enforce Web3 initialization. If missing, it will throw when called, ensuring no simulated state.
if (RPC_URL && RELAYER_PRIVATE_KEY && CONTRACT_ADDRESS) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, SentinelRegistryABI, wallet);
    console.log("Web3 Relayer securely connected to network and contract.");
} else {
    console.warn("WARNING: Web3 configuration missing in .env (RPC_URL, RELAYER_PRIVATE_KEY, or CONTRACT_ADDRESS). Web3 functions will fail.");
}

/**
 * Signs and broadcasts the registerContent transaction to the blockchain.
 */
export const relayContentRegistration = async (contentHash, ipfsHash, userAddress) => {
    if (!contract) throw new Error("Web3 Contract not initialized. Check .env variables.");
    
    console.log(`Relaying content registration for hash: ${contentHash}`);
    const tx = await contract.registerContent(ethers.id(contentHash), ipfsHash, userAddress);
    const receipt = await tx.wait();
    
    return { success: true, txHash: receipt.hash };
};

/**
 * Triggers the updateVerification logic on-chain based on AI verdict.
 * Status: 0=PENDING, 1=VERIFIED, 2=FLAGGED
 */
export const relayUpdateVerification = async (contentHash, finalStatus) => {
    if (!contract) throw new Error("Web3 Contract not initialized. Check .env variables.");

    const statusEnumMap = { 'pending': 0, 'verified': 1, 'flagged': 2 };
    const statusCode = statusEnumMap[finalStatus.toLowerCase()] || 0;

    console.log(`Relaying verdict update for hash: ${contentHash} to status: ${statusCode}`);
    const tx = await contract.updateVerification(ethers.id(contentHash), statusCode);
    const receipt = await tx.wait();
    
    return { success: true, txHash: receipt.hash };
};

/**
 * Reads a user's $SNTL token balance and trust score directly from the blockchain.
 */
export const getUserWeb3State = async (userAddress) => {
    if (!contract) throw new Error("Web3 Contract not initialized. Check .env variables.");

    const balanceWei = await contract.balanceOf(userAddress);
    const trustScore = await contract.userTrustScores(userAddress);
    const hasClaimed = await contract.hasClaimedAirdrop(userAddress);

    return {
        balance: ethers.formatUnits(balanceWei, 18),
        trustScore: trustScore.toString(),
        hasClaimedAirdrop: hasClaimed
    };
};
