import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';

export default function WidgetsPanel() {
  const [trends, setTrends] = useState([]);
  const [news, setNews] = useState([]);

  useEffect(() => {
     apiFetch('/api/v1/trending').then(res => {
         if (res.success) setTrends(res.hashtags);
     }).catch(console.error);

     apiFetch('/api/v1/news/trending').then(res => {
         if (res.success) setNews(res.articles);
     }).catch(console.error);
  }, []);

  return (
    <div className="w-72 xl:w-80 h-screen sticky top-0 hidden lg:flex flex-col pl-8 py-2">
      {/* Search Bar */}
      <div className="relative group sticky top-0 bg-white dark:bg-zinc-950 pb-2 z-10 pt-1">
         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none pb-2 pt-1">
             <Search size={18} className="text-gray-500 group-focus-within:text-blue-500" />
         </div>
         <input 
            type="text" 
            placeholder="Search" 
            className="w-full bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-black border border-transparent focus:border-blue-500 transition-colors"
         />
      </div>

      <div className="flex-grow overflow-y-auto pb-16 space-y-4" style={{scrollbarWidth: 'none'}}>
          {/* Subscribe Premium */}
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800">
             <h2 className="font-extrabold text-xl mb-2">Subscribe to Premium</h2>
             <p className="font-medium text-[15px] leading-tight mb-3">Subscribe to unlock new features and if eligible, receive a share of ads revenue.</p>
             <button className="bg-gray-900 dark:bg-blue-500 text-white font-bold py-1.5 px-4 rounded-full hover:bg-gray-800 dark:hover:bg-blue-600 transition">Subscribe</button>
          </div>

          {/* What's happening */}
          <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
             <h2 className="font-extrabold text-xl p-4 pb-2">What's happening</h2>
             
             {news.slice(0, 5).map((article) => (
                 <a key={article.id} href={article.article_url} target="_blank" rel="noopener noreferrer" className="flex gap-2 hover:bg-gray-200 dark:hover:bg-zinc-800 p-4 cursor-pointer transition">
                     <div className="flex-1">
                        <p className="text-[13px] text-gray-500 dark:text-gray-400">{article.source_name} · {new Date(article.published_at).toLocaleDateString()}</p>
                        <p className="font-bold text-[15px] text-gray-900 dark:text-white mt-0.5 leading-tight">{article.title}</p>
                     </div>
                     {article.thumbnail_url && (
                        <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-zinc-800 ml-2">
                           <img src={article.thumbnail_url} className="w-full h-full object-cover" alt="" />
                        </div>
                     )}
                 </a>
             ))}

             <div className="p-4 hover:bg-gray-200 dark:hover:bg-zinc-800 cursor-pointer transition">
                 <Link to="/explore" className="text-blue-500 text-[15px] hover:underline block w-full">Show more</Link>
             </div>
          </div>
      </div>
    </div>
  );
}
