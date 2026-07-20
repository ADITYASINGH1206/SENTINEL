import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/PostComponents';

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [showModal, setShowModal] = useState(false);
  const [wallet, setWallet] = useState(user?.user_metadata?.wallet_address || '');

  // Mock user posts
  const mockPosts = [
      { id: 101, handle: user?.email?.split('@')[0], content: "My first post on Sentinel!", status: "verified", avatar_url: user?.user_metadata?.avatar_url }
  ];

  const handleConnectMetamask = async () => {
      // In a real app, this would use ethers.js or viem to request accounts
      if (window.ethereum) {
          try {
             const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
             setWallet(accounts[0]);
             setShowModal(false);
             // TODO: Update wallet address in Supabase users table
          } catch(err) {
             console.error(err);
          }
      } else {
          alert("MetaMask not detected! Please install it.");
      }
  };

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold">Profile</h1>
      </div>
      
      {/* Profile Header */}
      <div className="p-4 border-b border-gray-800">
         <img src={user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user?.email} alt="Avatar" className="w-24 h-24 bg-gray-700 rounded-full mb-4 border-4 border-gray-900" />
         <h2 className="text-2xl font-bold">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</h2>
         <p className="text-gray-500 mb-4">{user?.email}</p>
         
         <div className="bg-gray-800 rounded p-3 mb-4 inline-block">
             <p className="text-sm text-gray-400">Web3 Wallet</p>
             {wallet ? (
                 <p className="font-mono text-sm text-green-400">{wallet}</p>
             ) : (
                 <button onClick={()=>setShowModal(true)} className="text-blue-400 hover:underline text-sm font-bold">Link MetaMask Wallet</button>
             )}
         </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
          <button onClick={()=>setActiveTab('posts')} className={`flex-1 py-4 font-bold text-center hover:bg-gray-800 transition ${activeTab==='posts' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500'}`}>Posts</button>
          <button onClick={()=>setActiveTab('reposts')} className={`flex-1 py-4 font-bold text-center hover:bg-gray-800 transition ${activeTab==='reposts' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500'}`}>Reposts</button>
      </div>

      {/* Feed */}
      <div className="pb-20">
         {activeTab === 'posts' ? (
             mockPosts.map(p => <PostCard key={p.id} post={p} />)
         ) : (
             <div className="p-8 text-center text-gray-500">No reposts yet.</div>
         )}
      </div>

      {/* Metamask Modal Stub */}
      {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-xl w-96 max-w-[90%] shadow-2xl border border-gray-700 text-center">
                  <h3 className="text-xl font-bold mb-4">Connect Web3 Wallet</h3>
                  <p className="text-gray-400 text-sm mb-6">Linking a wallet allows you to receive automated rewards from the Sentinel smart contract for verified reports.</p>
                  <button onClick={handleConnectMetamask} className="w-full bg-blue-500 hover:bg-blue-600 font-bold py-3 rounded text-white mb-3 flex items-center justify-center gap-2">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="Metamask" className="w-6 h-6" />
                      Connect MetaMask
                  </button>
                  <button onClick={()=>setShowModal(false)} className="w-full border border-gray-600 hover:bg-gray-700 font-bold py-3 rounded text-gray-300">Cancel</button>
              </div>
          </div>
      )}
    </div>
  );
}
