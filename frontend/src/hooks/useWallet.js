import { useState, useEffect } from 'react';

const SEPOLIA_CHAIN_ID = '0xaa36a7';

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check if already connected on load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
          }
        } catch (error) {
          console.error("Failed to fetch accounts:", error);
        }
      }
    };
    checkConnection();
  }, []);

  // Listen to account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          setAccount(null);
          setIsConnected(false);
        }
      });
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use Web3 features.");
      return;
    }

    setIsConnecting(true);
    try {
      // Switch to Sepolia Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      } catch (switchError) {
        // If the chain hasn't been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Testnet',
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Request Account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setIsConnected(true);
    } catch (error) {
      console.error("Wallet connection failed", error);
      alert("Wallet connection failed: " + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    account,
    isConnected,
    isConnecting,
    connectWallet
  };
}
