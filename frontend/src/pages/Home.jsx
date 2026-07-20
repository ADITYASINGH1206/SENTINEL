import React, { useState, useEffect } from 'react';
import PostComposer from '../components/PostComposer';
import { PostCard } from '../components/PostComponents';
import { apiFetch } from '../services/api';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('for_you');

  const fetchPosts = async () => {
    try {
      const data = await apiFetch('/api/v1/posts');
      if (data.success) setPosts(data.posts);
    } catch(err) {
      console.error('Error fetching feed:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
    const intervalId = setInterval(fetchPosts, 5000); 
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-full min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 z-10 flex flex-col">
        <div className="px-4 py-3 sm:hidden">
            <span className="text-xl font-bold text-gray-900 dark:text-white">Home</span>
        </div>
        <div className="flex w-full">
            <button 
                onClick={() => setActiveTab('for_you')} 
                className="flex-1 hover:bg-gray-200/50 dark:hover:bg-zinc-900/50 transition relative flex justify-center py-4 text-[15px] font-bold text-gray-900 dark:text-white"
            >
                For you
                {activeTab === 'for_you' && <div className="absolute bottom-0 h-1 w-14 bg-blue-500 rounded-full" />}
            </button>
            <button 
                onClick={() => setActiveTab('following')} 
                className="flex-1 hover:bg-gray-200/50 dark:hover:bg-zinc-900/50 transition relative flex justify-center py-4 text-[15px] font-medium text-gray-500 dark:text-gray-400"
            >
                Following
                {activeTab === 'following' && <div className="absolute bottom-0 h-1 w-16 bg-blue-500 rounded-full" />}
            </button>
        </div>
      </div>
      
      {/* Composer */}
      <div className="hidden sm:block">
         <PostComposer onPostSubmit={fetchPosts} />
      </div>
      
      {/* Feed */}
      <div className="pb-20">
        {posts.length === 0 ? (
           <div className="p-8 text-center text-gray-500">No posts yet. Be the first to share something!</div>
        ) : (
           posts.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
