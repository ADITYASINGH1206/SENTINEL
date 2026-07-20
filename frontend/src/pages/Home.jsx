import React, { useState, useEffect } from 'react';
import { NewPost, PostCard } from '../components/PostComponents';

export default function Home() {
  const [posts, setPosts] = useState([]);

  const fetchPosts = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/posts');
      const data = await res.json();
      setPosts(data);
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPosts();
    const intervalId = setInterval(fetchPosts, 3000); // Polling for hackathon mockup
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
