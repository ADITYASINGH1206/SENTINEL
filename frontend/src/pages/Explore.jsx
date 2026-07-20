import React, { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { apiFetch } from '../services/api';

export default function Explore() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNews = (force = false) => {
    setLoading(true);
    apiFetch(`/api/v1/news/trending${force ? '?force=true' : ''}`)
      .then(res => {
         if (res.success) {
            setNews(res.articles);
         }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredNews = news.filter(article => 
      article.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      article.source_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 p-3 z-10 flex items-center gap-2">
         <div className="relative group flex-grow">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none pb-0">
                <Search size={18} className="text-gray-500 group-focus-within:text-blue-500" />
            </div>
            <input 
                type="text" 
                placeholder="Search Explore" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-white rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-black border border-transparent focus:border-blue-500 transition-colors"
            />
         </div>
         <button onClick={() => fetchNews(true)} disabled={loading} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 transition disabled:opacity-50 text-gray-700 dark:text-gray-300">
             <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
         </button>
      </div>

      <div className="flex flex-col">
         {loading ? (
             Array(5).fill(0).map((_, i) => (
                 <div key={i} className="flex flex-col p-4 border-b border-gray-200 dark:border-zinc-800 animate-pulse">
                    <div className="w-full h-48 sm:h-64 bg-gray-200 dark:bg-zinc-800 rounded-xl mb-4"></div>
                    <div className="flex-1 space-y-3">
                       <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4"></div>
                       <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-full"></div>
                       <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-5/6"></div>
                    </div>
                 </div>
             ))
         ) : filteredNews.length === 0 ? (
             <div className="p-8 text-center text-gray-500">No matching articles found.</div>
         ) : (
             filteredNews.map(article => (
                 <a key={article.id} href={article.article_url} target="_blank" rel="noopener noreferrer" className="flex flex-col p-4 border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition cursor-pointer group">
                    {article.thumbnail_url && (
                        <div className="w-full h-48 sm:h-64 mb-4 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
                            <img src={article.thumbnail_url} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        </div>
                    )}
                    <div className="flex flex-col">
                       <div className="flex items-center gap-2 mb-1 text-[13px] text-gray-500 font-medium">
                          <span>{article.source_name}</span>
                          <span>·</span>
                          <span>{new Date(article.published_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                       </div>
                       <h3 className="font-extrabold text-[18px] sm:text-[20px] text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-blue-500 transition">{article.title}</h3>
                       <p className="text-blue-500 text-[14px] hover:underline w-fit">Read more</p>
                    </div>
                 </a>
             ))
         )}
      </div>
    </div>
  );
}
