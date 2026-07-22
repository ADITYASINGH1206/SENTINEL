import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ShieldCheck, CheckCircle2, Loader2, ThumbsUp, ThumbsDown, Lock, ExternalLink, MessageSquare, FileText } from 'lucide-react';
import { toast } from 'react-toastify';

export default function VerificationHub() {
  const { account, isConnected, connectWallet } = useWallet();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'finalized'
  const [contentList, setContentList] = useState([]);
  const [verifyingId, setVerifyingId] = useState(null);
  const [localVerified, setLocalVerified] = useState(new Set()); // Track UI state to prevent immediate double clicks

  const fetchContent = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/content');
      const data = await res.json();
      if (data.success) {
        setContentList(data.content);
      }
    } catch (err) {
      console.error("Failed to fetch content", err);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

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

  const pendingContent = contentList.filter(c => c.status === 'pending');
  const finalizedContent = contentList.filter(c => c.status === 'finalized');

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-blue-500" />
          Verification Hub
        </h1>
        
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
              onClick={() => setActiveTab('finalized')}
              className={`pb-3 px-4 font-semibold text-lg transition-colors ${activeTab === 'finalized' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}
           >
              On-Chain Record ({finalizedContent.length})
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
                    <div key={item.id} className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg relative overflow-hidden transition-all hover:border-gray-700">
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
                          <span className="text-gray-400 text-sm">by {item.author}</span>
                        </div>
                        <span className="text-gray-500 text-xs font-mono">ID: {item.id}</span>
                      </div>
                      
                      <p className="text-gray-200 mb-6 text-lg">"{item.text}"</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleVote(item.id, 'authentic')}
                          disabled={hasVoted}
                          className={`py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                            hasVoted 
                             ? 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'
                             : 'bg-gray-800 hover:bg-blue-600/20 text-gray-300 hover:text-blue-400 border border-gray-700 hover:border-blue-500/50'
                          }`}
                        >
                          <ThumbsUp size={18} /> ✅ Vote Authentic
                        </button>
                        <button 
                          onClick={() => handleVote(item.id, 'fake')}
                          disabled={hasVoted}
                          className={`py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                            hasVoted 
                             ? 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'
                             : 'bg-gray-800 hover:bg-red-600/20 text-gray-300 hover:text-red-400 border border-gray-700 hover:border-red-500/50'
                          }`}
                        >
                          <ThumbsDown size={18} /> 🚨 Vote Fake
                        </button>
                      </div>
                      
                      {hasVoted && (
                         <p className="text-center text-sm text-gray-500 mt-4">Vote recorded. Waiting for consensus...</p>
                      )}
                    </div>
                  );
                })
             )
          ) : (
             finalizedContent.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No finalized records yet.</p>
             ) : (
                finalizedContent.map(item => (
                   <div key={item.id} className="bg-gray-900 border border-green-500/30 p-6 rounded-xl shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${item.type === 'post' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'bg-orange-500/20 text-orange-400 border border-orange-500/50'}`}>
                             {item.type === 'post' ? <FileText size={12}/> : <MessageSquare size={12}/>}
                             {item.type.toUpperCase()}
                          </span>
                          <span className="text-gray-400 text-sm">by {item.author}</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 mb-6 text-lg italic">"{item.text}"</p>
                      
                      {/* Immutable Proof Card */}
                      <div className="w-full bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-xl p-5 shadow-inner">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                           <div>
                             <h3 className="font-bold text-blue-300 flex items-center gap-2 mb-1">
                                <Lock size={18} />
                                Immutable Proof
                             </h3>
                             <p className="text-sm text-gray-400 font-mono break-all">
                               Hash: {item.contentHash ? `${item.contentHash.substring(0, 10)}...${item.contentHash.substring(item.contentHash.length - 8)}` : 'N/A'}
                             </p>
                           </div>
                           
                           <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                              <button 
                                 onClick={() => verifyLocalIntegrity(item.text, item.contentHash)}
                                 className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                              >
                                 <ShieldCheck size={14} /> Verify Local Integrity
                              </button>
                              {item.txHash && (
                                 <a 
                                    href={`https://sepolia.blockscout.com/tx/${item.txHash}`}
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
                            <span className="text-gray-400 text-sm">Community Verdict:</span>
                            <span className={`font-bold capitalize px-3 py-1 rounded-full text-xs ${item.verdict === 'authentic' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                               {item.verdict}
                            </span>
                        </div>
                      </div>
                   </div>
                ))
             )
          )}
        </div>
      </main>
    </div>
  );
}
