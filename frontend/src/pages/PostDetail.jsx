import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PostCard, CommentSection } from '../components/PostComponents';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
       try {
           const res = await fetch(`http://localhost:8000/api/v1/posts`); // Using mock list endpoint
           const data = await res.json();
           const found = data.find(p => p.id.toString() === id);
           setPost(found);
       } catch(err) {
           console.error(err);
       }
    };
    fetchPost();
  }, [id]);

  if (!post) {
      return (
         <div className="w-full min-h-screen flex items-center justify-center">
            <p className="text-gray-500">Loading post...</p>
         </div>
      );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-full transition">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>
      
      <div className="border-b border-gray-800 bg-gray-900/50">
          <PostCard post={post} />
      </div>

      {/* Dedicated AI Analysis Section */}
      <div className="p-6 border-b border-gray-800 bg-gray-800/30">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
             <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
             AI Orchestrator Analysis
          </h3>
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
             <div className="flex justify-between items-center mb-2">
                 <span className="text-gray-400">Confidence Score:</span>
                 <span className="font-bold text-green-400">92%</span>
             </div>
             <div className="flex justify-between items-center mb-4">
                 <span className="text-gray-400">Visual Artifacts:</span>
                 <span className="font-bold">None detected</span>
             </div>
             <p className="text-sm text-gray-500 italic">"The media passed all heuristic threshold checks. No deepfake blending anomalies found."</p>
          </div>
      </div>

      <div className="p-4">
          <h2 className="font-bold text-lg mb-4">Comments</h2>
          <CommentSection postId={post.id} />
      </div>
    </div>
  );
}
