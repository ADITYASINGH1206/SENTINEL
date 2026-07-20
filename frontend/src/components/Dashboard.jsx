import React, { useState } from 'react';
import { useWallet } from '../hooks/useWallet';

const MOCK_POSTS = [
  { id: "post_1001", content: "Web3 verification is critical for fighting AI misinformation.", author: "Alice" },
  { id: "post_1002", content: "Just published my latest article on zk-SNARKs and privacy.", author: "Bob" }
];

export default function Dashboard() {
  const { account, isConnected, isConnecting, connectWallet } = useWallet();
  const [verifyingId, setVerifyingId] = useState(null);
  const [successTx, setSuccessTx] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const handleVerify = async (postId) => {
    if (!isConnected) {
      alert("Please connect your wallet first.");
      return;
    }

    setVerifyingId(postId);
    setSuccessTx(null);
    setErrorMsg(null);

    try {
      // POST to the backend Relayer
      const response = await fetch('http://localhost:8000/api/verify-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: account,
          contentId: postId,
          verificationStatus: 'VERIFIED'
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessTx(data.txHash);
      } else {
        setErrorMsg(data.details || data.error || "Transaction failed");
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-12 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-blue-400">Sentinel Dashboard</h1>
        
        <button 
          onClick={connectWallet} 
          disabled={isConnecting || isConnected}
          className={`px-6 py-2 rounded-full font-bold transition-all ${
            isConnected 
              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {isConnecting ? "Connecting..." : isConnected ? `Connected: ${formatAddress(account)}` : "Connect Wallet"}
        </button>
      </header>

      {/* Notifications */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {successTx && (
        <div className="mb-6 p-4 bg-green-900/50 border border-green-500 text-green-200 rounded-lg flex justify-between items-center">
          <span><strong>Success!</strong> Your content was verified & you earned $SNTL rewards.</span>
          <a 
            href={`https://sepolia.etherscan.io/tx/${successTx}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-800 hover:bg-green-700 rounded transition"
          >
            View on Etherscan
          </a>
        </div>
      )}

      {/* Feed */}
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-400">Mock Content Feed</h2>
        
        {MOCK_POSTS.map(post => (
          <div key={post.id} className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
            
            {/* Loading Overlay */}
            {verifyingId === post.id && (
              <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                <p className="font-bold text-blue-400">Processing Gasless Transaction...</p>
                <p className="text-sm text-gray-400 mt-1">Calling Smart Contract via Relayer</p>
              </div>
            )}

            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-bold text-lg">{post.author}</p>
                <p className="text-gray-500 text-sm">ID: {post.id}</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 text-lg">"{post.content}"</p>
            
            <button 
              onClick={() => handleVerify(post.id)}
              disabled={verifyingId !== null}
              className="w-full py-3 rounded-lg font-bold bg-gray-800 hover:bg-blue-600 border border-gray-700 hover:border-blue-500 transition-all shadow-md"
            >
              Verify & Earn $SNTL
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
