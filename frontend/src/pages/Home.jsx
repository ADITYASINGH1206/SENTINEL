import React, { useState, useEffect } from 'react';
import { NewPost, PostCard } from '../components/PostComponents';
import { apiFetch } from '../services/api';

export default function Home() {
  const [posts, setPosts] = useState([]);

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
    // Use interval to simulate realtime updates for the hackathon
    const intervalId = setInterval(fetchPosts, 3000); 
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
        <h1 className="text-xl font-bold">Home</h1>
      </div>
      
      <NewPost onPostSubmit={fetchPosts} />
      
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
