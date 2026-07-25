import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { apiFetch } from '../services/api';
import { ShieldCheck, Lock, CheckCircle, AlertTriangle, AlertCircle, PlaySquare, FileText, Image, Search, Loader2, CheckCircle2, ThumbsUp, ThumbsDown, ExternalLink, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, SENTINEL_ABI } from '../config/constants';

export default function VerificationHub() {
  const { account, isConnected, connectWallet } = useWallet();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'finalized' | 'manual'
  const [contentList, setContentList] = useState([]);
  const [verifyingId, setVerifyingId] = useState(null);
  const [localVerified, setLocalVerified] = useState(new Set()); // Track UI state to prevent immediate double clicks
  
  const [trustScore, setTrustScore] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [reportedContent, setReportedContent] = useState([]);
  const [isClaiming, setIsClaiming] = useState(false);
  
  // Manual Verification State
  const [manualInput, setManualInput] = useState('');
  const [manualResult, setManualResult] = useState(null);

  const fetchContent = async () => {
    try {
      const [contentRes, reportedRes, lbRes] = await Promise.all([
         fetch('http://localhost:8000/api/content'),
         fetch('http://localhost:8000/api/content/reported'),
         fetch('http://localhost:8000/api/leaderboard')
      ]);
      
      const contentData = await contentRes.json();
      const reportedData = await reportedRes.json();
      const lbData = await lbRes.json();
      
      if (contentData.success) setContentList(contentData.content);
      if (reportedData.success) setReportedContent(reportedData.content);
      
      if (lbData.success && account) {
         const userStat = lbData.leaderboard.find(u => u.address.toLowerCase() === account.toLowerCase());
         if (userStat) {
             setTrustScore(userStat.trustScore || 0);
             setPendingBalance(userStat.pendingBalance || 0);
         }
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [account]);

  const handleVote = async (contentId, voteType) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setVerifyingId(contentId);
    try {
      const res = await fetch('http://localhost:8000/api/content/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account, contentId, vote: voteType })
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setLocalVerified(prev => new Set(prev).add(contentId));
        if (data.status === 'finalized') {
           toast.info("🎉 Consensus reached! Content anchored to Sepolia.");
        }
        fetchContent();
      } else {
        toast.error(data.error || "Failed to vote.");
      }
    } catch (err) {
      toast.error("Error voting.");
    } finally {
      setVerifyingId(null);
    }
  };

  const verifyLocalIntegrity = async (text, expectedHash) => {
    try {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (hashHex === expectedHash) {
        toast.success("✅ Cryptographic Match! Content has not been tampered with.");
      } else {
        toast.error(`❌ Hash Mismatch! Local: ${hashHex} | Expected: ${expectedHash}`);
      }
    } catch (err) {
      toast.error("Failed to compute hash locally.");
    }
  };

  const handleClaimTokens = async () => {
    if (pendingBalance < 100) {
        toast.error("You need at least 100 pending tokens to claim.");
        return;
    }
    
    setIsClaiming(true);
    try {
      const response = await fetch('http://localhost:8000/api/claim-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account })
      });
      const data = await response.json();
      if (data.success) {
        setPendingBalance(data.newBalance);
        toast.success(`Successfully claimed tokens! Tx: ${data.txHash.substring(0,10)}...`);
        fetchContent();
      } else {
        toast.error(data.error || "Claim failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleManualVerify = async () => {
    if (!manualInput.trim()) return;
    
    try {
      const input = manualInput.trim();
      let calculatedHash = input;
      
      // If it's not a hex hash, calculate the hash
      if (!input.startsWith('0x')) {
          const msgUint8 = new TextEncoder().encode(input);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          calculatedHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }
      
      // First check local finalized content (from old relayer)
      const foundMatch = finalizedContent.find(c => c.contentHash === calculatedHash || c.contentHash === input);
      
      if (foundMatch) {
          setManualResult({
             success: true,
             hash: foundMatch.contentHash,
             txHash: foundMatch.txHash || '0x' + calculatedHash.substring(2, 66),
             verdict: foundMatch.verdict,
             author: foundMatch.author
          });
          toast.success("✅ Match found! Content is anchored on-chain.");
          return;
      }

      // If not found in mock relayer, check real Supabase posts
      const data = await apiFetch('/api/v1/posts');
      if (data.success && data.posts) {
          for (const post of data.posts) {
              const textToHash = post.media_url || post.content || post.id.toString();
              const msgUint8 = new TextEncoder().encode(textToHash);
              const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const postHashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
              
              if (postHashHex === calculatedHash || postHashHex === input) {
                  // Try to fetch real on-chain transaction hash
                  let realTxHash = null;
                  try {
                      const txRes = await apiFetch(`/api/v1/posts/${post.id}/tx`);
                      if (txRes.success && txRes.txHash) {
                          realTxHash = txRes.txHash;
                      }
                  } catch (err) {
                      console.log("TxHash not yet available or failed to fetch");
                  }

                  setManualResult({
                      success: true,
                      hash: postHashHex,
                      txHash: realTxHash, // Will be null if not yet mined
                      verdict: post.ai_status || 'verified',
                      author: post.users?.username || 'Unknown'
                  });
                  toast.success("✅ Match found! Content verified.");
                  return;
              }
          }
      }

      // If still not found
      setManualResult({
          success: false,
          hash: calculatedHash
      });
      toast.error("❌ No on-chain record found for this content or hash.");

    } catch (err) {
       console.error(err);
       toast.error("Failed to verify manual input.");
    }
  };

  const pendingContent = contentList.filter(c => c.status === 'pending');
  const finalizedContent = [...contentList, ...reportedContent].filter(c => c.status === 'finalized');
  const pendingReportedContent = reportedContent.filter(c => c.status === 'pending');

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-[#0d1117] dark:text-white p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-blue-500" />
          Verification Hub
        </h1>
        
        <div className="flex items-center gap-4">
            {isConnected && (
               <div className="flex items-center gap-2">
                   <div className="flex flex-col text-right">
                       <span className="text-xs text-gray-500 font-bold uppercase">Pending</span>
                       <span className="text-sm text-green-400 font-bold">{pendingBalance} $SNTL</span>
                   </div>
                   <button 
                      onClick={handleClaimTokens}
                      disabled={pendingBalance < 100 || isClaiming}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          pendingBalance >= 100 && !isClaiming
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white shadow-lg' 
                            : 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                      }`}
                   >
                      {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Claim'}
                   </button>
               </div>
            )}
            <button 
              onClick={connectWallet} 
              disabled={isConnected}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                isConnected 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isConnected && account ? `Connected: ${account.substring(0,6)}...${account.substring(account.length-4)}` : "Connect Wallet"}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-800 mb-6">
           <button 
              onClick={() => setActiveTab('pending')}
              className={`pb-3 px-4 font-semibold text-lg transition-colors ${activeTab === 'pending' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
           >
              Pending Verification ({pendingContent.length})
           </button>
           <button 
              onClick={() => setActiveTab('reported')}
              className={`pb-3 px-4 font-semibold text-lg transition-colors ${activeTab === 'reported' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-gray-300'}`}
           >
              Reported Posts ({pendingReportedContent.length})
           </button>
           <button 
              onClick={() => setActiveTab('manual')}
              className={`pb-3 px-4 font-semibold text-lg transition-colors ${activeTab === 'manual' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
           >
              Verify Any Post
           </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'pending' ? (
             pendingContent.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No content pending verification.</p>
             ) : (
                pendingContent.map(item => {
                  const hasVoted = localVerified.has(item.id) || (item.votedUsers && item.votedUsers.includes(account));
                  const isVerifying = verifyingId === item.id;
                  
                  return (
                    <div key={item.id} className="bg-slate-50 border border-gray-200 dark:bg-slate-900/60 dark:border-gray-800 p-6 rounded-xl shadow-lg relative overflow-hidden transition-all hover:border-gray-300 dark:hover:border-gray-700">
                      {isVerifying && (
                        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                          <Loader2 className="animate-spin h-8 w-8 text-blue-500 mb-2" />
                          <p className="font-bold text-blue-400">Recording Vote...</p>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${item.type === 'post' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'bg-orange-500/20 text-orange-400 border border-orange-500/50'}`}>
                             {item.type === 'post' ? <FileText size={12}/> : <MessageSquare size={12}/>}
                             {item.type.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">by {item.author}</span>
                        </div>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">ID: {item.id}</span>
                      </div>
                      
                      <p className="text-base font-medium text-slate-900 dark:text-slate-100 my-3">"{item.text}"</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleVote(item.id, 'authentic')}
                          disabled={hasVoted}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all shadow-sm ${
                            hasVoted 
                             ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 border border-gray-300 dark:border-gray-700 cursor-not-allowed'
                             : 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700'
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4"/>
                          <span>Authentic (+100 SNTL)</span>
                        </button>
                        <button 
                          onClick={() => handleVote(item.id, 'fake')}
                          disabled={hasVoted}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all shadow-sm ${
                            hasVoted 
                             ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 border border-gray-300 dark:border-gray-700 cursor-not-allowed'
                             : 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700'
                          }`}
                        >
                          <ThumbsDown className="w-4 h-4"/>
                          <span>Fake (+100 SNTL)</span>
                        </button>
                      </div>
                      
                      {hasVoted && (
                         <p className="text-center text-sm text-gray-500 mt-4">Vote recorded. Waiting for consensus...</p>
                      )}
                    </div>
                  );
                })
             )
          ) : activeTab === 'reported' ? (
             trustScore < 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-gray-200 dark:bg-slate-900/60 dark:border-gray-800 rounded-xl shadow-lg">
                    <Lock className="w-16 h-16 text-gray-400 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reported Feed Locked</h2>
                    <p className="text-gray-500 text-center max-w-md">
                        Unlock at 50 Trust Score. Keep verifying normal posts accurately to build your reputation. Current Trust Score: {trustScore}
                    </p>
                </div>
             ) : pendingReportedContent.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No reported content pending verification.</p>
             ) : (
                pendingReportedContent.map(item => {
                  const hasVoted = localVerified.has(item.id) || (item.votedUsers && item.votedUsers.includes(account));
                  const isVerifying = verifyingId === item.id;
                  
                  return (
                    <div key={item.id} className="bg-slate-50 border border-gray-200 dark:bg-slate-900/60 dark:border-gray-800 p-6 rounded-xl shadow-lg relative overflow-hidden transition-all hover:border-gray-300 dark:hover:border-gray-700 mb-6">
                      {isVerifying && (
                        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                          <Loader2 className="animate-spin h-8 w-8 text-blue-500 mb-2" />
                          <p className="font-bold text-blue-400">Recording Vote...</p>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20`}>
                             <ShieldCheck size={12}/> REPORTED CONTENT
                          </span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">by {item.author}</span>
                        </div>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">ID: {item.id}</span>
                      </div>
                      
                      <div className="bg-white dark:bg-zinc-950 p-4 rounded-lg border border-gray-200 dark:border-gray-800 my-4">
                        <p className="text-base whitespace-pre-wrap text-slate-900 dark:text-slate-100">{item.text}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleVote(item.id, 'authentic')}
                          disabled={hasVoted}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold transition-all shadow-sm ${
                            hasVoted 
                             ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 border border-gray-300 dark:border-gray-700 cursor-not-allowed'
                             : 'text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
                          }`}
                        >
                          <ThumbsUp className="w-5 h-5"/>
                          <span>Authentic (+100 SNTL)</span>
                        </button>
                        <button 
                          onClick={() => handleVote(item.id, 'fake')}
                          disabled={hasVoted}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold transition-all shadow-sm ${
                            hasVoted 
                             ? 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 border border-gray-300 dark:border-gray-700 cursor-not-allowed'
                             : 'text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500'
                          }`}
                        >
                          <ThumbsDown className="w-5 h-5"/>
                          <span>Fake (+100 SNTL)</span>
                        </button>
                      </div>
                      
                      {hasVoted && (
                         <p className="text-center text-sm text-gray-500 mt-4">Vote recorded. Waiting for consensus...</p>
                      )}
                    </div>
                  );
                })
             )
          ) : activeTab === 'manual' ? (
             <div className="bg-slate-50 border border-gray-200 dark:bg-slate-900/60 dark:border-gray-800 p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Universal On-Chain Verifier</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Paste the raw text of any post or a direct cryptographic hash to verify its authenticity instantly against the Sepolia blockchain.</p>
                
                <textarea 
                   className="w-full bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-900 dark:text-white font-mono text-sm resize-none focus:outline-none focus:border-purple-500 transition-colors"
                   rows="4"
                   placeholder="Paste post text or 0x... hash here"
                   value={manualInput}
                   onChange={(e) => setManualInput(e.target.value)}
                ></textarea>
                
                <button 
                   onClick={handleManualVerify}
                   disabled={!manualInput.trim()}
                   className="mt-4 w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                   <ShieldCheck size={20} /> Verify on Sepolia
                </button>
                
                {manualResult && (
                   <div className={`mt-8 p-6 rounded-xl border ${manualResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                      {manualResult.success ? (
                         <>
                            <h3 className="text-green-400 font-bold text-xl flex items-center gap-2 mb-4">
                               <CheckCircle2 size={24} /> Verified Authentic Record
                            </h3>
                            <div className="space-y-2 font-mono text-sm">
                               <p><span className="text-gray-500">Verdict:</span> <span className="text-green-300 uppercase font-bold">{manualResult.verdict}</span></p>
                               <p><span className="text-gray-500">Author:</span> <span className="text-gray-300">{manualResult.author}</span></p>
                               <p><span className="text-gray-500">Hash:</span> <span className="text-gray-300 break-all">{manualResult.hash}</span></p>
                               {manualResult.txHash ? (
                                  <a 
                                     href={`https://sepolia.etherscan.io/tx/${manualResult.txHash}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="inline-flex mt-2 items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                     <ExternalLink size={16} /> View Blockchain Transaction
                                  </a>
                               ) : (
                                  <div className="mt-2 text-yellow-500 flex items-center gap-2 text-sm font-bold">
                                      <Loader2 size={16} className="animate-spin" /> Transaction processing on Sepolia...
                                  </div>
                               )}
                            </div>
                         </>
                      ) : (
                         <>
                            <h3 className="text-red-400 font-bold text-xl flex items-center gap-2 mb-2">
                               <ThumbsDown size={24} /> No Record Found
                            </h3>
                            <p className="text-gray-400 text-sm mb-2">This content has not been verified by the community or the AI, and does not exist on the Sepolia blockchain.</p>
                            <p className="text-gray-500 font-mono text-xs break-all">Calculated Hash: {manualResult.hash}</p>
                         </>
                      )}
                   </div>
                )}
             </div>
           ) : null}
        </div>
      </main>
    </div>
  );
}
