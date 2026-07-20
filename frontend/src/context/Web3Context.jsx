import React, { createContext, useState, useEffect } from 'react';

export const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState(0);
    const [trustScore, setTrustScore] = useState(0);
    const [hasClaimedAirdrop, setHasClaimedAirdrop] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // Mock connection for Hackathon demo speed
    const connectWallet = async () => {
        setIsConnecting(true);
        setTimeout(() => {
            const mockAddress = "0x7a83B38A3A8679D6B30C7B7D4E677F6E4C123b2c";
            setAccount(mockAddress);
            setBalance(0); // Assuming brand new user
            setTrustScore(100); // Base score
            setHasClaimedAirdrop(false);
            setIsConnecting(false);
        }, 800); // Simulate network delay
    };

    const claimAirdrop = async () => {
        setIsConnecting(true);
        setTimeout(() => {
            setBalance(prev => prev + 500);
            setHasClaimedAirdrop(true);
            setIsConnecting(false);
        }, 1200); // Simulate TX mining time
    };

    return (
        <Web3Context.Provider value={{
            account,
            balance,
            trustScore,
            hasClaimedAirdrop,
            isConnecting,
            connectWallet,
            claimAirdrop
        }}>
            {children}
        </Web3Context.Provider>
    );
};
