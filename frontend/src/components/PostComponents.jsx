import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share, Eye, BarChart2, CircleEllipsis, Bookmark, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import VerifiedBadge from './VerifiedBadge';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import { Web3Context } from '../context/Web3Context';
import { ShieldCheck, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'react-toastify';

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
  const { trustScore, balance } = React.useContext(Web3Context);
  
  const initialLiked = post.likes?.some(l => l.user_id === user?.id) || false;
  const initialLikeCount = post.likes?.length || 0;
  const commentCount = post.comments?.length || 0;
  
  const initialReposted = post.reposts?.some(r => r.user_id === user?.id) || false;
  const initialRepostCount = post.reposts?.length || 0;

  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [reposted, setReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(initialRepostCount);
  const [impressions, setImpressions] = useState(post.impressions_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [hasTracked, setHasTracked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [targetRef, isIntersecting] = useIntersectionObserver({ threshold: 0.5 });

  useEffect(() => {
      if (isIntersecting && !hasTracked) {
          setHasTracked(true);
          setImpressions(prev => prev + 1);
          apiFetch(`/api/v1/posts/${post.id}/impression`, { method: 'POST' }).catch(console.error);
      }
  }, [isIntersecting, hasTracked, post.id]);

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

  const handleFollow = async (e) => {
      e.preventDefault(); // Prevent navigating to profile if wrapped in link
      setIsFollowing(!isFollowing);
      try {
          await apiFetch(`/api/v1/users/${post.user_id}/follow`, { method: 'POST' });
      } catch (err) {
          setIsFollowing(!isFollowing);
      }
  };

  const badgeStyles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      verified: 'bg-green-500/20 text-green-400 border-green-500/50',
      flagged: 'bg-red-500/20 text-red-400 border-red-500/50'
  };

  const handleCopyHash = async () => {
      try {
          const textToHash = post.media_url || post.content || post.id.toString();
          const msgUint8 = new TextEncoder().encode(textToHash);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          
          await navigator.clipboard.writeText(hashHex);
          toast.success("Post Hash copied to clipboard!");
          setShowMenu(false);
      } catch (err) {
          toast.error("Failed to copy hash");
      }
  };

  return (
    <div ref={targetRef} className="border-b border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      {isRepost && (
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2 ml-10 font-bold">
              <Share size={14} /> Reposted
          </div>
      )}
      <div className="flex gap-4">
        <Link to={`/profile/${post.user_id}`} className="flex-shrink-0">
            <img src={post.users?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + post.users?.username} alt="Avatar" className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full hover:opacity-80 transition" />
        </Link>
        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1 text-gray-900 dark:text-white flex-wrap min-w-0">
                <Link to={`/profile/${post.user_id}`} className="font-bold hover:underline cursor-pointer truncate">{post.users?.display_name || post.users?.username}</Link>
                {post.ai_status === 'verified' && <ShieldCheck size={16} className="text-green-500 ml-1" />}
                {post.ai_status === 'flagged' && <AlertTriangle size={16} className="text-red-500 ml-1" />}
                <span className="text-gray-500 dark:text-gray-400 text-[15px] ml-1 truncate">@{post.users?.username}</span>
                
                {/* Web3 Trust Badges */}
                <span className="ml-2 text-xs bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full border border-indigo-500/20 font-medium">
                   Trust: {trustScore}
                </span>
                <span className="ml-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">
                   {balance} SNTL
                </span>

                <span className="text-gray-500 dark:text-gray-400 text-[15px] ml-1">· {new Date(post.created_at).toLocaleDateString()}</span>
                {user?.id !== post.user_id && (
                    <button onClick={handleFollow} className={`ml-2 text-xs font-bold px-3 py-1 rounded-full transition-colors ${isFollowing ? 'border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400' : 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'}`}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                )}
              </div>
              <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 dark:text-gray-400 hover:text-blue-500 transition p-2 rounded-full hover:bg-blue-500/10">
                     <CircleEllipsis size={18} />
                  </button>
                  {showMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                          <button 
                             onClick={handleCopyHash} 
                             className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                             <Copy size={16} /> Copy On-Chain Hash
                          </button>
                      </div>
                  )}
              </div>
          </div>
          <Link to={`/post/${post.id}`}>
             <p className="mb-3 text-[15px] text-gray-900 dark:text-white">{post.content}</p>
          </Link>
          {post.media_url && (
              <div className="mb-3 w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 overflow-hidden">
                 <img src={post.media_url} className="object-cover w-full h-full" alt="Post Media" />
              </div>
          )}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyles[post.ai_status || 'pending']}`}>
            {(post.ai_status || 'pending').toUpperCase()}
          </div>
          
          <div className="flex justify-between items-center mt-3 text-gray-500 dark:text-gray-400 max-w-md w-full">
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 hover:text-blue-500 transition group flex-1">
                <div className="p-2 rounded-full group-hover:bg-blue-500/10"><MessageCircle size={18} /></div>
                <span className="text-sm">{commentCount > 0 ? commentCount : ''}</span>
            </button>
            <button onClick={handleRepost} className={`flex items-center gap-2 hover:text-green-500 transition group flex-1 ${reposted ? 'text-green-500' : ''}`}>
                <div className="p-2 rounded-full group-hover:bg-green-500/10"><Share size={18} /></div>
                <span className="text-sm">{repostCount > 0 ? repostCount : ''}</span>
            </button>
            <button onClick={handleLike} className={`flex items-center gap-2 hover:text-pink-500 transition group flex-1 ${liked ? 'text-pink-500' : ''}`}>
                <div className="p-2 rounded-full group-hover:bg-pink-500/10"><Heart size={18} fill={liked ? "currentColor" : "none"} /></div>
                <span className="text-sm">{likeCount > 0 ? likeCount : ''}</span>
            </button>
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 cursor-default flex-1 group hover:text-blue-500 transition">
                <div className="p-2 rounded-full group-hover:bg-blue-500/10"><Eye size={18} /></div>
                <span className="text-sm">{impressions > 0 ? impressions : ''}</span>
            </div>
            <div className="flex items-center gap-1 justify-end flex-1">
                <button className="p-2 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition"><Bookmark size={18} /></button>
                <button className="p-2 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition"><Upload size={18} /></button>
            </div>
          </div>

          {showComments && <CommentSection postId={post.id} />}
        </div>
      </div>
    </div>
  );
}


