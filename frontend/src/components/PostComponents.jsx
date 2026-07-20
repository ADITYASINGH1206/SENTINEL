import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import VerifiedBadge from './VerifiedBadge';

export function CommentSection({ postId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const data = await apiFetch(`/api/v1/posts/${postId}/comments`);
                if (data.success) setComments(data.comments);
            } catch (err) {
                console.error('Failed to fetch comments', err);
            }
        };
        fetchComments();
    }, [postId]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            const data = await apiFetch(`/api/v1/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment })
            });
            if (data.success) {
                setComments([...comments, data.comment]);
                setNewComment('');
            }
        } catch (err) { console.error('Failed to post comment', err); }
    };

    return (
        <div className="mt-4 border-t border-gray-800 pt-4 px-2">
            {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
            {comments.map(c => (
                <div key={c.id} className="mb-3 flex gap-3">
                    <img src={c.users?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.users?.username} alt="Avatar" className="w-8 h-8 bg-gray-600 rounded-full" />
                    <div>
                        <span className="font-bold text-sm">{c.users?.display_name || c.users?.username}</span>
                        <p className="text-gray-300 text-sm">{c.content}</p>
                    </div>
                </div>
            ))}
            <div className="flex gap-2 mt-3">
                <input type="text" value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder="Post your reply" className="flex-grow bg-gray-800 p-2 rounded-full outline-none px-4 text-sm focus:border-blue-500 border border-transparent" />
                <button onClick={handleAddComment} className="bg-blue-500 px-4 rounded-full text-sm font-bold">Reply</button>
            </div>
        </div>
    );
}

export function PostCard({ post, isRepost }) {
  const { user } = useAuth();
  
  const initialLiked = post.likes?.some(l => l.user_id === user?.id) || false;
  const initialLikeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  
  const initialReposted = post.reposts?.some(r => r.user_id === user?.id) || false;
  const initialRepostCount = post.reposts?.length || 0;

  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [reposted, setReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(initialRepostCount);
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
      try {
          await apiFetch(`/api/v1/posts/${post.id}/like`, { method: 'POST' });
      } catch (err) {
          // Revert optimistic update
          setLiked(!liked);
          setLikeCount(liked ? likeCount + 1 : likeCount - 1);
          console.error("Failed to like post", err);
      }
  };

  const handleRepost = async () => {
      setReposted(!reposted);
      setRepostCount(reposted ? repostCount - 1 : repostCount + 1);
      try {
          await apiFetch(`/api/v1/posts/${post.id}/repost`, { method: 'POST' });
      } catch (err) {
          setReposted(!reposted);
          setRepostCount(reposted ? repostCount + 1 : repostCount - 1);
          console.error("Failed to repost", err);
      }
  };

  const badgeStyles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      verified: 'bg-green-500/20 text-green-400 border-green-500/50',
      flagged: 'bg-red-500/20 text-red-400 border-red-500/50'
  };

  return (
    <div className="border-b border-gray-800 p-4 hover:bg-gray-800/30 transition-colors">
      {isRepost && (
          <div className="text-sm text-gray-500 flex items-center gap-2 mb-2 ml-10 font-bold">
              <Share size={14} /> Reposted
          </div>
      )}
      <div className="flex gap-4">
        <Link to={`/profile/${post.user_id}`} className="flex-shrink-0">
            <img src={post.users?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + post.users?.username} alt="Avatar" className="w-12 h-12 bg-gray-700 rounded-full hover:opacity-80 transition" />
        </Link>
        <div className="flex-grow">
          <div className="flex items-center gap-1 mb-1">
            <Link to={`/profile/${post.user_id}`} className="font-bold hover:underline cursor-pointer">{post.users?.display_name || post.users?.username}</Link>
            <VerifiedBadge status={post.ai_status} />
            <span className="text-gray-500 text-sm ml-1">· {new Date(post.created_at).toLocaleDateString()}</span>
          </div>
          <Link to={`/post/${post.id}`}>
             <p className="mb-3 text-[15px]">{post.content}</p>
          </Link>
          {post.media_url && (
              <div className="mb-3 w-full h-48 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-gray-500 overflow-hidden">
                 <img src={post.media_url} className="object-cover w-full h-full" alt="Post Media" />
              </div>
          )}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyles[post.ai_status || 'pending']}`}>
            {(post.ai_status || 'pending').toUpperCase()}
          </div>
          
          <div className="flex justify-between items-center mt-4 text-gray-500 max-w-md">
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 hover:text-blue-400 transition group">
                <div className="p-2 rounded-full group-hover:bg-blue-400/10"><MessageCircle size={18} /></div>
                <span className="text-sm">{commentCount > 0 ? commentCount : ''}</span>
            </button>
            <button onClick={handleRepost} className={`flex items-center gap-2 hover:text-green-400 transition group ${reposted ? 'text-green-400' : ''}`}>
                <div className="p-2 rounded-full group-hover:bg-green-400/10"><Share size={18} /></div>
                <span className="text-sm">{repostCount > 0 ? repostCount : ''}</span>
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
    if (file) formData.append("media", file);

    try {
      const data = await apiFetch('/api/v1/posts', {
        method: 'POST',
        // apiFetch automatically attaches the Bearer token!
        body: formData
      });
      if (data.success && onPostSubmit) onPostSubmit();
    } catch(err) { console.error("Failed to create post", err); }
    
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
