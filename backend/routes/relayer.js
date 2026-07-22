import express from 'express';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { sentinelContract } from '../config/ethers.js';

const generateHash = (content) => crypto.createHash('sha256').update(content).digest('hex');

const router = express.Router();

// --- IN-MEMORY MOCK STATE ---
// In a real app, this would be a database (e.g. Postgres via Supabase)
const users = {}; // Format: { address: { pendingBalance, totalEarned, correctVotes, totalVotes } }
const contentPool = [
    { 
        id: "content_3001", 
        type: "post",
        text: "AI generated this deepfake, verify my analysis.", 
        author: "0xAlice", 
        status: "pending",
        votes: { authentic: 0, fake: 0 },
        votedUsers: [], // To track who voted to prevent double voting
        contentHash: null,
        txHash: null 
    },
    { 
        id: "content_3002", 
        type: "comment",
        text: "This comment contains a phishing link.", 
        author: "0xBob", 
        status: "pending",
        votes: { authentic: 0, fake: 0 },
        votedUsers: [],
        contentHash: null,
        txHash: null 
    }
];

// Helper to init user state
const initUser = (address) => {
    if (!users[address]) {
        users[address] = { 
            pendingBalance: 0,
            totalEarned: 0,
            correctVotes: 0,
            totalVotes: 0
        };
    }
};

// Route: GET /api/content
// Returns the unified content pool (posts and comments)
router.get('/content', (req, res) => {
    res.json({ success: true, content: contentPool });
});

// Route: POST /api/content/vote
// Handles voting for both posts and comments.
router.post('/content/vote', async (req, res) => {
    const { userAddress, contentId, vote } = req.body; // vote is 'authentic' or 'fake'

    if (!userAddress || !contentId || !vote) {
        return res.status(400).json({ error: "Missing required fields: userAddress, contentId, vote." });
    }

    initUser(userAddress);
    
    const item = contentPool.find(c => c.id === contentId);
    if (!item) {
        return res.status(404).json({ error: "Content not found." });
    }
    
    if (item.status === "finalized") {
        return res.status(400).json({ error: "Consensus already reached for this content." });
    }

    // Check if user already voted
    if (item.votedUsers.includes(userAddress)) {
        return res.status(400).json({ error: "User already voted on this content." });
    }

    // Record vote
    if (vote === 'authentic') {
        item.votes.authentic += 1;
    } else if (vote === 'fake') {
        item.votes.fake += 1;
    } else {
        return res.status(400).json({ error: "Invalid vote type." });
    }
    
    item.votedUsers.push(userAddress);
    users[userAddress].totalVotes += 1;
    
    // Reward for participation
    users[userAddress].pendingBalance += 100;
    users[userAddress].totalEarned += 100;

    console.log(`🗳️ User ${userAddress} voted '${vote}' on ${item.type} ${contentId}.`);

    let message = "Vote recorded!";

    // Check for consensus
    const totalVotes = item.votes.authentic + item.votes.fake;
    if (totalVotes >= 3) {
        item.status = "finalized";
        message = "Consensus reached! Content finalized.";
        
        const majorityVerdict = item.votes.authentic > item.votes.fake ? 'authentic' : 'fake';
        item.verdict = majorityVerdict; // save for frontend display
        
        console.log(`⚖️ Content ${contentId} finalized. Verdict: ${majorityVerdict}.`);

        // Execute On-Chain Anchoring
        try {
            console.log(`🚀 Executing on-chain anchoring for content ${contentId}...`);
            const hashResult = "0x" + generateHash(item.text);
            const mockIpfsHash = `ipfs://mock_${contentId}`;
            
            // 1. Register Content
            try {
                console.log("📝 Registering content on-chain...");
                const registerTx = await sentinelContract.registerContent(hashResult, mockIpfsHash, item.author);
                await registerTx.wait();
                console.log("✅ Content registered. TxHash:", registerTx.hash);
            } catch (err) {
                if (err.message && err.message.includes("Content already registered")) {
                    console.log("ℹ️ Content was already registered, proceeding to verdict...");
                } else {
                    throw err;
                }
            }

            // 2. Render Verdict
            const statusCode = majorityVerdict === 'authentic' ? 1 : 2;
            console.log(`⚖️ Rendering verdict on-chain: ${majorityVerdict} (${statusCode})`);
            const verdictTx = await sentinelContract.updateVerification(hashResult, statusCode);
            const receipt = await verdictTx.wait();
            
            console.log("✅ Verdict anchored successfully. TxHash:", receipt.hash);
            
            item.txHash = receipt.hash;
            item.contentHash = hashResult;
        } catch (onChainError) {
            console.error("❌ On-Chain Anchoring Failed:", onChainError);
            item.txHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
            item.contentHash = "0x" + generateHash(item.text);
        }
    }

    return res.json({ 
        success: true, 
        message: message,
        status: item.status,
        pendingBalance: users[userAddress].pendingBalance 
    });
});

// Route: GET /api/leaderboard
// Returns ranked users based on total earned and accuracy
router.get('/leaderboard', (req, res) => {
    const leaderboard = Object.keys(users).map(address => {
        const u = users[address];
        const accuracyRate = u.totalVotes > 0 ? (u.correctVotes / u.totalVotes) * 100 : 0;
        return {
            address,
            pendingBalance: u.pendingBalance,
            totalEarned: u.totalEarned,
            accuracyRate: parseFloat(accuracyRate.toFixed(1)),
            totalVotes: u.totalVotes
        };
    }).sort((a, b) => (b.pendingBalance + b.totalEarned) - (a.pendingBalance + a.totalEarned));

    return res.json({ success: true, leaderboard });
});


// Route: POST /api/verify-content
// Acts as a gasless relayer to register content and trigger token rewards
router.post('/verify-content', async (req, res) => {
    const { userAddress, contentId, verificationStatus } = req.body;

    if (!userAddress || !contentId || !verificationStatus) {
        return res.status(400).json({ error: "Missing required fields: userAddress, contentId, or verificationStatus." });
    }

    try {
        console.log(`🚀 Relaying verification for content: ${contentId} from user: ${userAddress}`);
        
        // Ensure contentId is converted to a bytes32 hash
        const contentHash = ethers.id(contentId.toString());
        const mockIpfsHash = `ipfs://mock_${contentId}`;

        // 1. Try to register the content first
        try {
            console.log("📝 Registering content on-chain...");
            const registerTx = await sentinelContract.registerContent(contentHash, mockIpfsHash, userAddress);
            await registerTx.wait();
            console.log("✅ Content registered. TxHash:", registerTx.hash);
        } catch (err) {
            // It's possible the content is already registered, which is fine, we just proceed.
            if (err.message && err.message.includes("Content already registered")) {
                console.log("ℹ️ Content was already registered, proceeding to verdict...");
            } else {
                throw err;
            }
        }

        // 2. Submit the verification verdict (this mints/burns SNTL)
        const statusEnumMap = { 'PENDING': 0, 'VERIFIED': 1, 'FLAGGED': 2 };
        const statusCode = statusEnumMap[verificationStatus.toUpperCase()] || 0;

        console.log(`⚖️ Rendering verdict on-chain: ${verificationStatus} (${statusCode})`);
        const verdictTx = await sentinelContract.updateVerification(contentHash, statusCode);
        const receipt = await verdictTx.wait();
        
        console.log("✅ Verdict rendered successfully. TxHash:", receipt.hash);

        return res.json({ 
            success: true, 
            message: "Content verified and tokens rewarded!",
            txHash: receipt.hash
        });

    } catch (error) {
        console.error("❌ Relayer Error:", error);
        
        // Clean up error message for frontend
        let errorMessage = error.message;
        if (error.info && error.info.error && error.info.error.message) {
            errorMessage = error.info.error.message;
        }

        return res.status(500).json({ 
            success: false, 
            error: "Failed to relay transaction", 
            details: errorMessage 
        });
    }
});

// Route: POST /api/claim-tokens
// Acts as a gasless relayer to process batch token claims
router.post('/claim-tokens', async (req, res) => {
    const { userAddress } = req.body;

    if (!userAddress) {
        return res.status(400).json({ error: "Missing required field: userAddress." });
    }

    initUser(userAddress);
    const currentBalance = users[userAddress].pendingBalance;

    if (currentBalance < 500) {
        return res.status(400).json({ 
            success: false, 
            error: `Minimum 500 tokens required to claim. Current pending balance: ${currentBalance}` 
        });
    }

    try {
        console.log(`🚀 Relaying batch token claim for user: ${userAddress}, Amount: ${currentBalance}`);
        
        // Due to the smart contract limitation (claimInitialTokens uses msg.sender),
        // we are mocking the transaction response here to keep the frontend demo functional 
        // without polluting the blockchain with fake posts.
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock a tx hash
        const mockTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
        
        // Reset balance after successful mock transaction
        users[userAddress].pendingBalance = 0;
        
        console.log("✅ Mock Gasless Batch Claim processed successfully. TxHash:", mockTxHash);

        return res.json({ 
            success: true, 
            message: `Successfully claimed ${currentBalance} tokens!`,
            txHash: mockTxHash,
            newBalance: 0
        });

    } catch (error) {
        console.error("❌ Relayer Claim Error:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Failed to relay claim transaction", 
            details: error.message 
        });
    }
});

export default router;
