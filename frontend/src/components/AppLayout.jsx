import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggler from './ThemeToggler';

function SidebarLeft() {
  const { logout } = useAuth();
  
  return (
    <div className="w-64 h-screen p-4 border-r border-gray-200 dark:border-gray-800 sticky top-0 flex-shrink-0">
      <div className="flex flex-col h-full">
        <div className="text-2xl font-bold mb-8 text-blue-500 dark:text-blue-400 pl-4 flex justify-between items-center">
            <span>Sentinel</span>
            <ThemeToggler />
        </div>
        <nav className="flex flex-col space-y-2 flex-grow text-gray-900 dark:text-white">
          <Link to="/" className="text-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full py-3 px-4 transition-colors">Home</Link>
          <Link to="/profile" className="text-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full py-3 px-4 transition-colors">Profile</Link>
          <Link to="/notifications" className="text-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full py-3 px-4 transition-colors">Notifications</Link>
          <Link to="/trending" className="text-xl font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full py-3 px-4 transition-colors">Trending</Link>
          <button onClick={logout} className="text-xl font-semibold text-left text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800 rounded-full py-3 px-4 transition-colors">Logout</button>
        </nav>
      </div>
    </div>
  );
}

function RightPanel() {
  return (
    <div className="w-80 h-screen p-4 sticky top-0 hidden lg:block flex-shrink-0">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Trending</h2>
        <div className="space-y-4">
          <div className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded cursor-pointer transition">
             <p className="text-sm text-gray-500 dark:text-gray-400">Politics</p>
             <p className="font-bold text-gray-900 dark:text-white">#ElectionDeepfakes</p>
          </div>
          <div className="hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded cursor-pointer transition">
             <p className="text-sm text-gray-500 dark:text-gray-400">Tech</p>
             <p className="font-bold text-gray-900 dark:text-white">OpenAI Sora</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <div className="flex max-w-7xl mx-auto min-h-screen text-slate-900 bg-white dark:text-white dark:bg-zinc-950 transition-colors duration-200">
      <SidebarLeft />
      <div className="flex-grow min-h-screen border-r border-gray-200 dark:border-gray-800">
         <Outlet />
      </div>
      <RightPanel />
    </div>
  );
}
