import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import WidgetsPanel from './WidgetsPanel';

export default function AppLayout() {
  return (
    <div className="w-full min-h-screen text-slate-900 bg-white dark:text-white dark:bg-zinc-950 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex justify-center">
        {/* Left Sidebar Spacer */}
        <div className="w-20 sm:w-64 xl:w-72 flex-shrink-0">
           <Sidebar />
        </div>
        
        {/* Center Main Content */}
        <div className="flex-grow max-w-[600px] w-full min-h-screen border-x border-gray-200 dark:border-zinc-800">
           <Outlet />
        </div>

        {/* Right Widgets Spacer */}
        <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
           <WidgetsPanel />
        </div>
      </div>
    </div>
  );
}
