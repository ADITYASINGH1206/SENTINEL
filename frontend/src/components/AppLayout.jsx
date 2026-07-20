import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function SidebarLeft() {
  const { logout } = useAuth();
  
  return (
    <div className="w-64 h-screen p-4 border-r border-gray-800 sticky top-0 flex-shrink-0">
      <div className="flex flex-col h-full">
        <div className="text-2xl font-bold mb-8 text-blue-400 pl-4">Sentinel</div>
        <nav className="flex flex-col space-y-2 flex-grow">
          <Link to="/" className="text-xl font-semibold hover:bg-gray-800 rounded-full py-3 px-4 transition-colors">Home</Link>
          <Link to="/profile" className="text-xl font-semibold hover:bg-gray-800 rounded-full py-3 px-4 transition-colors">Profile</Link>
          <Link to="/notifications" className="text-xl font-semibold hover:bg-gray-800 rounded-full py-3 px-4 transition-colors">Notifications</Link>
          <button onClick={logout} className="text-xl font-semibold text-left text-red-400 hover:bg-gray-800 rounded-full py-3 px-4 transition-colors">Logout</button>
        </nav>
      </div>
    </div>
  );
}

function RightPanel() {
  return (
    <div className="w-80 h-screen p-4 sticky top-0 hidden lg:block flex-shrink-0">
      <div className="bg-gray-800 rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-4">Trending</h2>
        <div className="space-y-4">
          <div className="hover:bg-gray-700 p-2 rounded cursor-pointer transition">
             <p className="text-sm text-gray-400">Politics</p>
             <p className="font-bold">#ElectionDeepfakes</p>
          </div>
          <div className="hover:bg-gray-700 p-2 rounded cursor-pointer transition">
             <p className="text-sm text-gray-400">Tech</p>
             <p className="font-bold">OpenAI Sora</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <div className="flex max-w-7xl mx-auto min-h-screen text-white bg-gray-900">
      <SidebarLeft />
      
      {/* Central Content Area */}
      <div className="flex-grow min-h-screen border-r border-gray-800">
         <Outlet />
      </div>

      <RightPanel />
    </div>
  );
}
