import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, Mail, Bookmark, MonitorPlay, Zap, User, CircleEllipsis, Feather, Wallet, Coins } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Web3Context } from '../context/Web3Context';
import ThemeToggler from './ThemeToggler';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { account, balance, hasClaimedAirdrop, isConnecting, claimStatus, claimTxHash, connectWallet, claimAirdrop, addTokenToWallet } = React.useContext(Web3Context);
  const location = useLocation();
  const [showLogout, setShowLogout] = useState(false);

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={26} /> },
    { name: 'Explore', path: '/explore', icon: <Search size={26} /> },
    { name: 'Notifications', path: '/notifications', icon: <Bell size={26} /> },
    { name: 'Messages', path: '/chat', icon: <Mail size={26} /> },
    { name: 'Bookmarks', path: '/bookmarks', icon: <Bookmark size={26} /> },
    { name: 'Premium', path: '/premium', icon: <Zap size={26} /> },
    { name: 'Profile', path: '/profile', icon: <User size={26} /> },
    { name: 'More', path: '#', icon: <CircleEllipsis size={26} /> }
  ];

  return (
    <div className="w-20 sm:w-64 xl:w-72 h-screen fixed top-0 flex flex-col justify-between pt-2 pb-4 px-2 xl:px-4 border-r border-gray-200 dark:border-zinc-800">
      <div className="flex flex-col items-center sm:items-start">
        {/* Logo & Toggler */}
        <div className="flex justify-between items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full w-fit mb-2 transition cursor-pointer">
          <span className="text-2xl font-bold text-blue-500 dark:text-blue-400">Sentinel</span>
          <div className="ml-4 hidden sm:block"><ThemeToggler /></div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col space-y-1 w-full items-center sm:items-start">
          {navItems.map(item => {
             const isActive = location.pathname === item.path;
             return (
               <Link 
                  key={item.name} 
                  to={item.path} 
                  className={`flex items-center gap-4 px-4 py-3 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-900 transition-colors w-fit ${isActive ? 'font-bold' : 'font-normal'}`}
               >
                 {item.icon}
                 <span className="text-xl hidden sm:block">{item.name}</span>
               </Link>
             )
          })}
        </nav>

        {/* Web3 Action Area */}
        <div className="w-[90%] mt-4 space-y-3 hidden sm:block">
           {!account ? (
               <button onClick={connectWallet} disabled={isConnecting} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-3.5 px-4 rounded-full transition shadow-md flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                   <Wallet size={20} />
                   {isConnecting ? 'Connecting...' : 'Connect Wallet'}
               </button>
           ) : (
               <div className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col gap-2">
                   <div className="flex justify-between items-center text-sm">
                       <span className="text-gray-500 font-medium">Wallet</span>
                       <span className="font-bold text-gray-900 dark:text-white bg-gray-200 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{account.slice(0, 6)}...{account.slice(-4)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                       <span className="text-gray-500 font-medium">Balance</span>
                       <span className="font-bold text-blue-500 flex items-center gap-1"><Coins size={14}/> {balance} $SNTL</span>
                   </div>
                   {!hasClaimedAirdrop && !claimStatus && (
                       <button onClick={claimAirdrop} disabled={isConnecting} className="w-full mt-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-2 rounded-xl transition text-sm disabled:opacity-50 shadow-sm animate-pulse hover:animate-none">
                           {isConnecting ? 'Processing...' : 'Claim 500 $SNTL'}
                       </button>
                   )}
                   {claimStatus && (
                       <div className="mt-2 text-center text-xs font-semibold p-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-500">
                           {claimStatus}
                           {claimTxHash && (
                               <div className="mt-1">
                                   <a href={`https://sepolia.blockscout.com/tx/${claimTxHash}`} target="_blank" rel="noreferrer" className="underline hover:text-blue-400">View on Blockscout</a>
                               </div>
                           )}
                       </div>
                   )}
                   {hasClaimedAirdrop && (
                       <button onClick={addTokenToWallet} className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded-xl transition text-sm shadow-sm flex items-center justify-center gap-2">
                           <Coins size={16} />
                           Add $SNTL to Wallet
                       </button>
                   )}
               </div>
           )}
           
           {/* Post Button */}
           <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 px-8 rounded-full transition shadow-md">
             Post
           </button>
        </div>

        {/* Mobile Post Button */}
        <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold p-3 rounded-full w-12 h-12 flex items-center justify-center transition shadow-md sm:hidden">
          <Feather size={24} />
        </button>
      </div>

      {/* User Profile Card */}
      {user && (
        <div className="relative mt-auto w-full">
            {showLogout && (
               <div className="absolute bottom-16 left-0 w-full bg-white dark:bg-zinc-900 shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.05)] rounded-2xl p-2 border border-gray-100 dark:border-zinc-800 z-50">
                  <button onClick={logout} className="w-full text-left font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 p-3 rounded-xl transition">
                     Log out @{user?.user_metadata?.username || user?.email?.split('@')[0]}
                  </button>
               </div>
            )}
            <div className="flex items-center justify-center sm:justify-between p-3 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-900 transition cursor-pointer w-full group" onClick={() => setShowLogout(!showLogout)}>
               <div className="flex items-center gap-3 min-w-0">
                  <img src={user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user?.email} alt="Avatar" className="w-10 h-10 rounded-full bg-gray-300 dark:bg-zinc-700 flex-shrink-0" />
                  <div className="hidden sm:flex flex-col leading-tight min-w-0">
                     <span className="font-bold text-[15px] max-w-[120px] xl:max-w-[160px] truncate">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</span>
                     <span className="text-gray-500 text-[15px] truncate">@{user?.user_metadata?.username || user?.email?.split('@')[0]}</span>
                  </div>
               </div>
               <CircleEllipsis size={18} className="hidden sm:block text-gray-900 dark:text-white flex-shrink-0" />
            </div>
        </div>
      )}
    </div>
  );
}
