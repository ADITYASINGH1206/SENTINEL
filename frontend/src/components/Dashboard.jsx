import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { CheckCircle2, Coins, Loader2, ThumbsUp, ThumbsDown, ShieldCheck, ExternalLink, Target, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import SubmitPost from './SubmitPost';
import Leaderboard from './Leaderboard';

export default function Dashboard() {
  const { account, isConnected, isConnecting, connectWallet } = useWallet();
  
  // State
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'leaderboard'
  const [posts, setPosts] = useState([]);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [accuracyRate, setAccuracyRate] = useState(0);
  const [verifiedPosts, setVerifiedPosts] = useState(new Set()); // Track local votes to prevent double-clicking
  
  // Action States
  const [verifyingId, setVerifyingId] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccessTx, setClaimSuccessTx] = useState(null);

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Posts
      const postsRes = await fetch('http://localhost:8000/api/posts');
      const postsData = await postsRes.json();
      if (postsData.success) {
        setPosts(postsData.posts);
      }

      // 2. Fetch User Stats from Leaderboard
      if (account) {
        const lbRes = await fetch('http://localhost:8000/api/leaderboard');
        const lbData = await lbRes.json();
        if (lbData.success) {
          const userStat = lbData.leaderboard.find(u => u.address.toLowerCase() === account.toLowerCase());
          if (userStat) {
             setPendingBalance(userStat.pendingBalance);
             setAccuracyRate(userStat.accuracyRate);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  // Fetch data on mount and when account changes
  useEffect(() => {
    fetchDashboardData();
  }, [account]);

  const handleVerify = async (postId, userVote) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setVerifyingId(postId);

    try {
      const response = await fetch('http://localhost:8000/api/verify-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account, postId, userVote })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setPendingBalance(data.pendingBalance);
        setVerifiedPosts(prev => new Set(prev).add(postId));
        
        // Refresh feed in case it hit consensus
        if (data.postStatus === 'FINALIZED') {
           toast.info("🎉 Post reached consensus!");
           fetchDashboardData();
        }
      } else {
        toast.error(data.details || data.error || "Verification failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleClaimTokens = async () => {
    if (pendingBalance < 500) return;
    
    setIsClaiming(true);
    setClaimSuccessTx(null);

    try {
      const response = await fetch('http://localhost:8000/api/claim-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account })
      });

      const data = await response.json();

      if (data.success) {
        setClaimSuccessTx(data.txHash);
        setPendingBalance(data.newBalance);
        toast.success(`Successfully claimed tokens!`);
        fetchDashboardData(); // Refresh accuracy and stats
      } else {
        toast.error(data.details || data.error || "Claim failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const verifyIntegrity = async (text, expectedHash) => {
    try {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (hashHex === expectedHash) {
        toast.success("✅ Cryptographic Match! Content is unaltered and verified on-chain.");
      } else {
        toast.error(`❌ Hash Mismatch! Expected ${expectedHash} but got ${hashHex}`);
      }
    } catch (err) {
      toast.error("Failed to verify hash locally.");
    }
  };

  const canClaim = pendingBalance >= 500;
  const progressPercent = Math.min((pendingBalance / 500) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-blue-500" />
          Sentinel
        </h1>
        
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

      {/* Main Layout */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-gray-800 pb-2 mb-6">
             <button 
                onClick={() => setActiveTab('feed')}
                className={`pb-2 px-2 font-semibold transition-colors ${activeTab === 'feed' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
             >
                Verification Feed
             </button>
             <button 
                onClick={() => setActiveTab('leaderboard')}
                className={`pb-2 px-2 font-semibold transition-colors ${activeTab === 'leaderboard' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
             >
                Leaderboard
             </button>
          </div>

          {activeTab === 'feed' ? (
             <>
                {/* Submission Area */}
                <SubmitPost account={account} onPostSubmitted={fetchDashboardData} />
                
                {/* Posts Feed */}
                <div className="space-y-6">
                  {posts.map(post => {
                    const hasVotedLocally = verifiedPosts.has(post.id);
                    const isVerifying = verifyingId === post.id;
                    const isFinalized = post.status === "FINALIZED";
                    // Check if user already voted in backend state
                    const hasVotedBackend = post.votes && post.votes.some(v => v.userAddress.toLowerCase() === account?.toLowerCase());
                    const cannotVote = isVerifying || isFinalized || hasVotedLocally || hasVotedBackend;
                    
                    return (
                      <div key={post.id} className={`bg-gray-900 border ${isFinalized ? 'border-green-500/30' : 'border-gray-800'} p-6 rounded-xl shadow-lg relative overflow-hidden transition-all hover:border-gray-700`}>
                        
                        {/* Loading Overlay */}
                        {isVerifying && (
                          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                            <Loader2 className="animate-spin h-8 w-8 text-blue-500 mb-2" />
                            <p className="font-bold text-blue-400">Recording Vote...</p>
                          </div>
                        )}

                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-bold text-lg text-gray-200">{post.author}</p>
                            <p className="text-gray-500 text-xs mt-1 font-mono">ID: {post.id}</p>
                          </div>
                          
                          {isFinalized && (
                             <span className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                               <CheckCircle2 size={14} />
                               AI & Community Consensus
                             </span>
                          )}
                        </div>
                        
                        <p className="text-gray-300 mb-6 text-lg break-words">"{post.content}"</p>
                        
                        {isFinalized ? (
                           <div className="w-full mt-6 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-xl p-5 shadow-inner">
                             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                  <h3 className="font-bold text-blue-300 flex items-center gap-2 mb-1">
                                     <Lock size={18} />
                                     On-Chain Certificate
                                  </h3>
                                  <p className="text-sm text-gray-400 font-mono break-all">
                                    Hash: {post.contentHash ? `${post.contentHash.substring(0, 10)}...${post.contentHash.substring(post.contentHash.length - 8)}` : 'N/A'}
                                  </p>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                   <button 
                                      onClick={() => verifyIntegrity(post.content, post.contentHash)}
                                      className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                   >
                                      <ShieldCheck size={14} /> Verify Integrity
                                   </button>
                                   {post.onChainTx && (
                                      <a 
                                         href={`https://sepolia.blockscout.com/tx/${post.onChainTx}`}
                                         target="_blank"
                                         rel="noopener noreferrer"
                                         className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                      >
                                         View Record <ExternalLink size={14} />
                                      </a>
                                   )}
                                </div>
                             </div>
                             
                             <div className="mt-4 pt-4 border-t border-blue-500/20 flex items-center justify-between">
                                 <span className="text-gray-400 text-sm">Majority Verdict:</span>
                                 <span className={`font-bold capitalize px-3 py-1 rounded-full text-xs ${post.aiResult.verdict === 'authentic' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                                    {post.aiResult.verdict}
                                 </span>
                             </div>
                           </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <button 
                              onClick={() => handleVerify(post.id, 'authentic')}
                              disabled={cannotVote}
                              className={`py-3 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                                cannotVote 
                                 ? 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'
                                 : 'bg-gray-800 hover:bg-blue-600/20 text-gray-300 hover:text-blue-400 border border-gray-700 hover:border-blue-500/50'
                              }`}
                            >
                              <ThumbsUp size={18} />
                              Vote Authentic
                            </button>
                            <button 
                              onClick={() => handleVerify(post.id, 'manipulated')}
                              disabled={cannotVote}
                              className={`py-3 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                                cannotVote 
                                 ? 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'
                                 : 'bg-gray-800 hover:bg-red-600/20 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-500/50'
                              }`}
                            >
                              <ThumbsDown size={18} />
                              Vote Manipulated
                            </button>
                          </div>
                        )}
                        
                        {(hasVotedLocally || hasVotedBackend) && !isFinalized && (
                            <p className="text-center text-sm text-gray-500 mt-4">Vote recorded. Waiting for consensus...</p>
                        )}
                      </div>
                    );
                  })}
                </div>
             </>
          ) : (
             <Leaderboard />
          )}

        </div>

        {/* Right Column: User Dashboard & Claim Hub */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg sticky top-8">
            <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
              <Coins className="text-yellow-500" />
              Batch Claim Hub
            </h2>
            
            {/* User Stats Mini-Dashboard */}
            <div className="mb-6 grid grid-cols-2 gap-4">
               <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-center">
                  <p className="text-gray-500 text-xs uppercase font-bold mb-1">Accuracy</p>
                  <p className="text-xl font-bold text-green-400 flex justify-center items-center gap-1">
                     <Target size={16}/> {accuracyRate}%
                  </p>
               </div>
               <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-center">
                  <p className="text-gray-500 text-xs uppercase font-bold mb-1">Pending</p>
                  <p className="text-xl font-bold text-blue-400 flex justify-center items-center gap-1">
                     <Coins size={16}/> {pendingBalance}
                  </p>
               </div>
            </div>

            {/* Progress Bar Area */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2 text-gray-400 font-medium">
                <span>Accrual Goal</span>
                <span className={canClaim ? "text-green-400 font-bold" : "text-white"}>
                  {pendingBalance} / 500 $SNTL
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${canClaim ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              {!canClaim && (
                <p className="text-xs text-gray-500 mt-3 text-center">Vote accurately with the majority to earn points.</p>
              )}
            </div>

            {/* Success Notifications */}
            {claimSuccessTx && (
              <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg text-center">
                <p className="text-green-400 font-bold mb-2">🎉 Claim Successful!</p>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${claimSuccessTx}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-green-800/80 hover:bg-green-700 text-green-100 text-sm font-semibold rounded transition"
                >
                  View on Explorer
                </a>
              </div>
            )}

            {/* Action Button */}
            <button 
              onClick={handleClaimTokens}
              disabled={!canClaim || isClaiming}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                isClaiming
                  ? 'bg-blue-600 cursor-wait'
                  : canClaim 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }`}
            >
              {isClaiming ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Relaying Claim...
                </>
              ) : (
                "Claim $SNTL Tokens"
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
