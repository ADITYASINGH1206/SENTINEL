import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';

// 1. Safe-load the configuration
dotenv.config();

const {
    NETWORK_RPC_URL,
    RELAYER_PRIVATE_KEY,
    CONTRACT_ADDRESS
} = process.env;

const testBlockchainConnection = async () => {
    console.log("🚀 Initializing Web3 Relayer Test Environment...");

    // Validate Environment Variables
    if (!NETWORK_RPC_URL || !RELAYER_PRIVATE_KEY || !CONTRACT_ADDRESS) {
        console.error("❌ CRITICAL ERROR: Missing essential environment variables.");
        console.error("Please ensure NETWORK_RPC_URL, RELAYER_PRIVATE_KEY, and CONTRACT_ADDRESS are set in your .env file.");
        process.exit(1);
    }

    let abi;
    try {
        // 2. Read the contract ABI
        console.log("📂 Loading SentinelRegistry ABI from sentinel.json...");
        const abiFile = fs.readFileSync('./sentinel.json', 'utf8');
        abi = JSON.parse(abiFile);
        console.log("✅ ABI successfully loaded.");
    } catch (err) {
        console.error("❌ CRITICAL ERROR: Failed to read or parse sentinel.json.");
        console.error("Details:", err.message);
        process.exit(1);
    }

    try {
        // 3. Initialize Provider and Wallet
        console.log(`\n🔌 Connecting to Sepolia via RPC...`);
        const provider = new ethers.JsonRpcProvider(NETWORK_RPC_URL);
        
        console.log(`🔐 Initializing Relayer Wallet...`);
        const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

        // 4. Log Address and Fetch Balance
        console.log(`✅ Wallet Connected.`);
        console.log(`👤 Relayer Address: ${wallet.address}`);
        
        console.log(`💰 Fetching Sepolia ETH balance...`);
        const balanceWei = await provider.getBalance(wallet.address);
        const balanceEth = ethers.formatEther(balanceWei);
        console.log(`💎 Balance: ${balanceEth} ETH`);

        if (parseFloat(balanceEth) < 0.01) {
            console.warn("⚠️ WARNING: Relayer gas balance is extremely low (< 0.01 ETH). You may fail to broadcast transactions.");
        }

        // 5. Instantiate Contract
        console.log(`\n🏗️  Instantiating Contract Interface...`);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
        console.log(`✅ Contract Instance created at address: ${CONTRACT_ADDRESS}`);

        // 6. Test a read function on the contract
        console.log(`🔍 Testing a read call to the contract (fetching token name)...`);
        const tokenName = await contract.name();
        console.log(`✅ Success! Connected to Token: ${tokenName}`);
        
        console.log("\n🎉 All systems go! Relayer is fully operational.");
    } catch (error) {
        console.error("\n❌ FATAL ERROR: Execution failed.");
        if (error.message.includes("invalid private key")) {
            console.error("The RELAYER_PRIVATE_KEY in your .env is malformed. Please ensure it is exactly 64 hex characters (without the 0x prefix).");
        } else if (error.message.includes("could not detect network")) {
            console.error("Network timeout or unreachable RPC URL. Check your NETWORK_RPC_URL.");
        } else {
            console.error("Details:", error.message);
        }
        process.exit(1);
    }
};

testBlockchainConnection();
