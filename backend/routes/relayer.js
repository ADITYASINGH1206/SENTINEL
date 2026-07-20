import express from 'express';
import { ethers } from 'ethers';
import { sentinelContract } from '../config/ethers.js';

const router = express.Router();

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
// Acts as a gasless relayer to process initial airdrop claims
router.post('/claim-tokens', async (req, res) => {
    const { userAddress } = req.body;

    if (!userAddress) {
        return res.status(400).json({ error: "Missing required field: userAddress." });
    }

    try {
        console.log(`🚀 Relaying token claim for user: ${userAddress}`);
        
        // Due to the smart contract limitation (claimInitialTokens uses msg.sender),
        // we are mocking the transaction response here to keep the frontend demo functional 
        // without polluting the blockchain with fake posts.
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock a tx hash
        const mockTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
        
        console.log("✅ Mock Gasless Claim processed successfully. TxHash:", mockTxHash);

        return res.json({ 
            success: true, 
            message: "Tokens claimed successfully via relayer!",
            txHash: mockTxHash
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
