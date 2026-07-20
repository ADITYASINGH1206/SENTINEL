import { relayContentRegistration, relayUpdateVerification, getUserWeb3State } from '../utils/web3Relayer.js';

export const registerPostOnChain = async (req, res) => {
    const { contentHash, ipfsHash, userAddress } = req.body;
    
    if (!contentHash || !userAddress) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const result = await relayContentRegistration(contentHash, ipfsHash || "mock_ipfs", userAddress);
        return res.json(result);
    } catch (err) {
        console.error("Relayer error:", err);
        return res.status(500).json({ success: false, message: "Relayer failed" });
    }
};

export const renderVerdictOnChain = async (req, res) => {
    const { contentHash, finalStatus } = req.body;
    
    if (!contentHash || finalStatus === undefined) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        const result = await relayUpdateVerification(contentHash, finalStatus);
        return res.json(result);
    } catch (err) {
        console.error("Relayer error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const getUserState = async (req, res) => {
    const { address } = req.params;
    if (!address) {
        return res.status(400).json({ success: false, message: "Missing address parameter" });
    }

    try {
        const state = await getUserWeb3State(address);
        return res.json({ success: true, ...state });
    } catch (err) {
        console.error("Failed to fetch user state:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};
