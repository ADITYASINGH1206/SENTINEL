import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export function CommentSection({ postId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        // Stub: Fetch comments logic using fetch API and JWT
    }, [postId, user]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        // Stub: Post comment logic
    };

    return (
        <div className="mt-4 border-t border-gray-800 pt-4 px-2">
            {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
            <div className="flex gap-2 mt-3">
                <input type="text" value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Post your reply" className="flex-grow bg-gray-800 p-2 rounded-full outline-none px-4 text-sm focus:border-blue-500 border border-transparent" />
                <button onClick={handleAddComment} className="bg-blue-500 px-4 rounded-full text-sm font-bold">Reply</button>
            </div>
        </div>
    );
}

export function PostCard({ post }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 50));
  const [shared, setShared] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();

  const handleLike = async () => {
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  const badgeStyles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      verified: 'bg-green-500/20 text-green-400 border-green-500/50',
      flagged: 'bg-red-500/20 text-red-400 border-red-500/50'
  };

  return (
    <div className="border-b border-gray-800 p-4 hover:bg-gray-800/30 transition-colors">
      <div className="flex gap-4">
        <img src={post.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + post.handle} alt="Avatar" className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0" />
        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold hover:underline cursor-pointer">{post.handle || 'User'}</span>
            <span className="text-gray-500 text-sm">· 2h</span>
          </div>
          <Link to={`/post/${post.id}`}>
             <p className="mb-3 text-[15px]">{post.content}</p>
          </Link>
          {post.media_url && (
              <div className="mb-3 w-full h-48 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-gray-500 overflow-hidden">
                 <img src={post.media_url} className="object-cover w-full h-full" alt="Post Media" />
              </div>
          )}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyles[post.status || 'pending']}`}>
            {(post.status || 'pending').toUpperCase()}
          </div>
          
          <div className="flex justify-between items-center mt-4 text-gray-500 max-w-md">
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 hover:text-blue-400 transition group">
                <div className="p-2 rounded-full group-hover:bg-blue-400/10"><MessageCircle size={18} /></div>
            </button>
            <button onClick={()=>setShared(!shared)} className={`flex items-center gap-2 hover:text-green-400 transition group ${shared ? 'text-green-400' : ''}`}>
                <div className="p-2 rounded-full group-hover:bg-green-400/10"><Share size={18} /></div>
            </button>
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-pink-500 transition group ${liked ? 'text-pink-500' : ''}`}>
                <div className="p-2 rounded-full group-hover:bg-pink-500/10"><Heart size={18} fill={liked ? "currentColor" : "none"} /></div>
                <span className="text-sm">{likeCount}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-400 transition group">
                <div className="p-2 rounded-full group-hover:bg-blue-400/10"><BarChart2 size={18} /></div>
            </button>
          </div>

          {showComments && <CommentSection postId={post.id} />}
        </div>
      </div>
    </div>
  );
}

export function NewPost({ onPostSubmit }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!content.trim() && !file) return;
    
    const formData = new FormData();
    formData.append("content", content);
    formData.append("walletAddress", user?.email || "Unknown"); 
    if (file) formData.append("media", file);

    try {
      const response = await fetch('http://localhost:8000/api/v1/posts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user?.token}` }, 
        body: formData
      });
      const data = await response.json();
      if (data.success && onPostSubmit) onPostSubmit();
    } catch(err) { console.error(err); }
    
    setContent(''); setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border-b border-gray-800 p-4">
      <div className="flex gap-4">
        <img src={user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user?.email} alt="Avatar" className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0" />
        <div className="flex-grow flex flex-col">
          <textarea className="w-full bg-transparent text-xl outline-none resize-none placeholder-gray-500 min-h-[100px]" placeholder="What's happening?" value={content} onChange={(e) => setContent(e.target.value)} />
          {file && <p className="text-sm text-blue-400 font-bold mt-2">Attached: {file.name}</p>}
          <div className="border-t border-gray-800 pt-4 flex justify-between items-center mt-2">
            <div>
              <input type="file" ref={fileInputRef} style={{display: 'none'}} onChange={(e) => setFile(e.target.files[0])} />
              <button onClick={() => fileInputRef.current?.click()} className="text-blue-400 hover:bg-gray-800 p-2 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg></button>
            </div>
            <button onClick={handleSubmit} disabled={!content.trim() && !file} className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-full">Post</button>
          </div>
        </div>
      </div>
    </div>
  );
}
