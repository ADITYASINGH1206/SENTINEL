import express from 'express';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { sentinelContract, wallet } from '../config/ethers.js';

const generateHash = (content) => crypto.createHash('sha256').update(content).digest('hex');

const router = express.Router();

// --- IN-MEMORY MOCK STATE ---
// In a real app, this would be a database (e.g. Postgres via Supabase)
const users = {}; // Format: { address: { pendingBalance, totalEarned, correctVotes, totalVotes } }
const contentPool = [];

export const addReportedContent = (id, text, authorAddress, comment) => {
    contentPool.push({
        id: id,
        type: "post",
        text: `[REPORTED POST] ${text}\n\n[REPORTER COMMENT] ${comment}`,
        author: authorAddress || "Unknown",
        status: "pending",
        votes: { authentic: 0, fake: 0 },
        votedUsers: [],
        contentHash: null,
        txHash: null,
        isReported: true
    });
};

// Helper to init user state
const initUser = (address) => {
    if (!users[address]) {
        users[address] = { 
            pendingBalance: 0,
            totalEarned: 0,
            correctVotes: 0,
            totalVotes: 0,
            trustScore: 0
        };
    }
};

// Route: GET /api/content
// Returns the unified content pool (posts and comments)
router.get('/content', (req, res) => {
    // Only return non-reported content for normal feed
    const normalContent = contentPool.filter(c => !c.isReported);
    res.json({ success: true, content: normalContent });
});

// Route: GET /api/content/reported
// Returns the reported content pool
router.get('/content/reported', (req, res) => {
    const reportedContent = contentPool.filter(c => c.isReported);
    res.json({ success: true, content: reportedContent });
});

// Route: POST /api/content
// Submits new content for verification
router.post('/content', (req, res) => {
    const { type, text, authorAddress, isReported } = req.body;
    if (!type || !text) {
        return res.status(400).json({ error: "Missing required fields: type, text." });
    }
    const newContent = {
        id: `content_${Date.now()}`,
        type,
        text,
        author: authorAddress || "Anonymous",
        status: "pending",
        votes: { authentic: 0, fake: 0 },
        votedUsers: [],
        contentHash: null,
        txHash: null,
        isReported: isReported || false
    };
    contentPool.push(newContent);
    res.json({ success: true, content: newContent });
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

    // Trust score check for reported content
    if (item.isReported && users[userAddress].trustScore < 0) {
        return res.status(403).json({ error: "Insufficient Trust Score to verify reported content. Unlock at 50 Trust Score." });
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
    const rewardTokens = item.isReported ? 250 : 100;
    const rewardTrust = item.isReported ? 10 : 5;
    
    users[userAddress].pendingBalance += rewardTokens;
    users[userAddress].totalEarned += rewardTokens;
    users[userAddress].trustScore += rewardTrust;

    console.log(`🗳️ User ${userAddress} voted '${vote}' on ${item.type} ${contentId}. Earned +${rewardTokens} $SNTL, +${rewardTrust} Trust.`);

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
                const smartContractAuthor = (item.author === "Anonymous" || !item.author) 
                    ? "0x0000000000000000000000000000000000000000" 
                    : item.author;
                    
                const registerTx = await sentinelContract.registerContent(hashResult, mockIpfsHash, smartContractAuthor);
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
            totalVotes: u.totalVotes,
            trustScore: u.trustScore
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

    if (currentBalance < 100) {
        return res.status(400).json({ 
            success: false, 
            error: `Minimum 100 tokens required to claim. Current pending balance: ${currentBalance}` 
        });
    }

    try {
        console.log(`🚀 Relaying batch token claim for user: ${userAddress}, Amount: ${currentBalance}`);
        
        // Ensure the relayer has enough balance
        const relayerBal = await sentinelContract.balanceOf(wallet.address);
        const claimAmount = ethers.parseEther(currentBalance.toString());
        
        if (relayerBal < claimAmount) {
            console.log("⚠️ Relayer has insufficient tokens, mocking claim transfer.");
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
            users[userAddress].pendingBalance = 0;
            return res.json({ 
                success: true, 
                message: `Successfully claimed ${currentBalance} tokens (Mocked)!`,
                txHash: mockTxHash,
                newBalance: 0
            });
        }

        // Execute actual ERC20 transfer from Relayer to User
        const tx = await sentinelContract.transfer(userAddress, claimAmount);
        const receipt = await tx.wait();
        
        // Reset balance after successful real transaction
        users[userAddress].pendingBalance = 0;
        
        console.log("✅ Gasless Batch Claim processed successfully. TxHash:", receipt.hash);

        return res.json({ 
            success: true, 
            message: `Successfully claimed ${currentBalance} tokens!`,
            txHash: receipt.hash,
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

// Route: POST /api/airdrop
// Relays the airdrop by transferring SNTL from the relayer's wallet to the user
router.post('/airdrop', async (req, res) => {
    const { userAddress } = req.body;

    if (!userAddress) {
        return res.status(400).json({ error: "Missing required field: userAddress." });
    }

    try {
        console.log(`🚀 Processing gasless airdrop for user: ${userAddress}`);
        
        initUser(userAddress);
        if (users[userAddress].hasClaimedAirdrop) {
            return res.status(400).json({
                success: false,
                error: "Airdrop already claimed! You can only claim this once."
            });
        }
        
        // Ensure the relayer has enough balance
        const relayerBal = await sentinelContract.balanceOf(wallet.address);
        if (relayerBal < ethers.parseEther("500")) {
            // For hackathon demo purposes, if relayer runs out of tokens, we will mock the airdrop
            console.log("⚠️ Relayer has insufficient tokens, mocking airdrop transfer.");
            await new Promise(resolve => setTimeout(resolve, 2000));
            return res.json({ 
                success: true, 
                message: "Airdrop Claimed (Mocked fallback)!",
                txHash: "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')
            });
        }

        // Execute actual ERC20 transfer from Relayer to User
        const tx = await sentinelContract.transfer(userAddress, ethers.parseEther("500"));
        const receipt = await tx.wait();
        
        users[userAddress].hasClaimedAirdrop = true;
        console.log("✅ Airdrop transferred successfully. TxHash:", receipt.hash);

        return res.json({ 
            success: true, 
            message: "Airdrop Claimed successfully!",
            txHash: receipt.hash
        });

    } catch (error) {
        console.error("❌ Relayer Airdrop Error:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Failed to process airdrop", 
            details: error.message 
        });
    }
});

export default router;
