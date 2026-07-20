import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { apiFetch } from '../services/api';

export default function Explore() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/v1/news/trending')
      .then(res => {
         if (res.success) {
            setNews(res.articles);
         }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 p-3 z-10">
         <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none pb-0">
                <Search size={18} className="text-gray-500 group-focus-within:text-blue-500" />
            </div>
            <input 
                type="text" 
                placeholder="Search Explore" 
                className="w-full bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-black border border-transparent focus:border-blue-500 transition-colors"
            />
         </div>
      </div>

      <div className="flex flex-col">
         {loading ? (
             Array(5).fill(0).map((_, i) => (
                 <div key={i} className="flex gap-4 p-4 border-b border-gray-200 dark:border-zinc-800 animate-pulse">
                    <div className="flex-1 space-y-3">
                       <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4"></div>
                       <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-full"></div>
                       <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-5/6"></div>
                    </div>
                    <div className="w-20 h-20 bg-gray-200 dark:bg-zinc-800 rounded-xl"></div>
                 </div>
             ))
         ) : (
             news.map(article => (
                 <a key={article.id} href={article.article_url} target="_blank" rel="noopener noreferrer" className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition">
                    <div className="flex-1 order-2 sm:order-1">
                       <p className="text-[13px] text-gray-500 font-medium mb-1">{article.source_name}</p>
                       <h3 className="font-bold text-[15px] sm:text-[17px] text-gray-900 dark:text-white leading-tight mb-2">{article.title}</h3>
                       <p className="text-sm text-gray-500">
                          {new Date(article.published_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                       </p>
                    </div>
                    {article.thumbnail_url && (
                        <div className="w-full sm:w-28 h-48 sm:h-28 flex-shrink-0 order-1 sm:order-2 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
                            <img src={article.thumbnail_url} alt={article.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                 </a>
             ))
         )}
      </div>
    </div>
  );
}
