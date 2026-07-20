import React, { createContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const Web3Context = createContext();

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const CONTRACT_ADDRESS = '0x460DC3605D19B84b76e17Aa59cfe1E2D28479Cc9';
const ABI = [
  "function claimInitialTokens() external",
  "function balanceOf(address account) view returns (uint256)",
  "function hasClaimedAirdrop(address) view returns (bool)",
  "function userTrustScores(address) view returns (uint256)"
];

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState(0);
    const [trustScore, setTrustScore] = useState(0);
    const [hasClaimedAirdrop, setHasClaimedAirdrop] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [claimStatus, setClaimStatus] = useState(null);
    const [claimTxHash, setClaimTxHash] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);

    // Fetch user state from blockchain
    const fetchUserState = async (userAddress, userProvider) => {
        try {
            const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, userProvider);
            const bal = await contract.balanceOf(userAddress);
            const trust = await contract.userTrustScores(userAddress);
            const claimed = await contract.hasClaimedAirdrop(userAddress);
            
            setBalance(Number(ethers.formatEther(bal)));
            setTrustScore(Number(trust));
            setHasClaimedAirdrop(claimed);
        } catch (err) {
            console.error("Failed to fetch user state:", err);
        }
    };

    // Auto-connect if already approved
    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                const browserProvider = new ethers.BrowserProvider(window.ethereum);
                setProvider(browserProvider);
                
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        const userSigner = await browserProvider.getSigner();
                        setSigner(userSigner);
                        setAccount(accounts[0]);
                        await fetchUserState(accounts[0], browserProvider);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };
        init();
    }, []);

    const connectWallet = async () => {
        if (!window.ethereum) {
            alert("MetaMask not found!");
            return;
        }

        setIsConnecting(true);
        try {
            // Enforce Sepolia
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: SEPOLIA_CHAIN_ID }],
                });
            } catch (err) {
                if (err.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: SEPOLIA_CHAIN_ID,
                            chainName: 'Sepolia Testnet',
                            nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
                            rpcUrls: ['https://rpc.sepolia.org'],
                            blockExplorerUrls: ['https://sepolia.etherscan.io'],
                        }],
                    });
                }
            }

            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            setProvider(browserProvider);
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userSigner = await browserProvider.getSigner();
            
            setSigner(userSigner);
            setAccount(accounts[0]);
            await fetchUserState(accounts[0], browserProvider);
        } catch (error) {
            console.error("Wallet connection failed", error);
            alert("Wallet connection failed: " + error.message);
        } finally {
            setIsConnecting(false);
        }
    };

    const claimAirdrop = async () => {
        if (!account) {
            alert("Please connect wallet first!");
            return;
        }
        setIsConnecting(true);
        setClaimStatus("Processing Gasless Claim...");
        setClaimTxHash(null);
        try {
            const response = await fetch('http://localhost:8000/api/claim-tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress: account })
            });
            
            const data = await response.json();

            if (data.success) {
                setBalance(prev => prev + 500);
                setHasClaimedAirdrop(true);
                setTrustScore(100);
                setClaimTxHash(data.txHash);
                setClaimStatus("Success!");
            } else {
                throw new Error(data.details || data.error || "Transaction failed");
            }
        } catch (error) {
            console.error("Claim failed", error);
            alert("Claim failed: " + (error.reason || error.message));
            setClaimStatus(null);
        } finally {
            setIsConnecting(false);
        }
    };

    const addTokenToWallet = async () => {
        if (!window.ethereum) return;
        try {
            const wasAdded = await window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: CONTRACT_ADDRESS,
                        symbol: 'SNTL',
                        decimals: 18,
                    },
                },
            });
            if (wasAdded) {
                alert('SNTL token successfully added to your wallet!');
            }
        } catch (error) {
            console.error("Failed to add token to wallet", error);
            alert("Failed to add token: " + error.message);
        }
    };

    return (
        <Web3Context.Provider value={{
            account,
            balance,
            trustScore,
            hasClaimedAirdrop,
            isConnecting,
            claimStatus,
            claimTxHash,
            connectWallet,
            claimAirdrop,
            addTokenToWallet
        }}>
            {children}
        </Web3Context.Provider>
    );
};
