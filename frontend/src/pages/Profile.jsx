import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/PostComponents';
import { apiFetch } from '../services/api';

export default function Profile() {
  const { id } = useParams();
  const { user, setDbUser } = useAuth();
  const profileId = id || user?.id;
  const isOwnProfile = profileId === user?.id;
  
  const [activeTab, setActiveTab] = useState('posts');
  const [profileUser, setProfileUser] = useState(null);
  
  const [myPosts, setMyPosts] = useState([]);
  const [reposts, setReposts] = useState([]);
  
  const [socialCounts, setSocialCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', avatar_url: '', cover_url: '', wallet_address: '' });
  const [avatarFile, setAvatarFile] = useState(null);

  // Social Modal State
  const [showSocialModal, setShowSocialModal] = useState(null); // 'followers' | 'following' | null
  const [socialList, setSocialList] = useState([]);
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);

  // Fetch Profile Info & Counts
  useEffect(() => {
      const fetchData = async () => {
          if (!profileId) return;
          try {
              // Get User Info
              const userRes = await apiFetch(`/api/v1/users/${profileId}`);
              if (userRes.success) setProfileUser(userRes.user);

              // Get Social Counts
              const countsRes = await apiFetch(`/api/v1/users/${profileId}/social-counts`);
              if (countsRes.success) {
                  setSocialCounts({ followers: countsRes.followers, following: countsRes.following });
              }

              // Get Posts & Reposts
              const postsRes = await apiFetch('/api/v1/posts');
              if (postsRes.success) {
                  const authored = postsRes.posts.filter(p => p.user_id === profileId);
                  const reposted = postsRes.posts.filter(p => p.reposts && p.reposts.some(r => r.user_id === profileId));
                  setMyPosts(authored);
                  setReposts(reposted);
              }
          } catch(err) {
              console.error(err);
          }
      };
      fetchData();
  }, [profileId]);

  const handleFollowToggle = async () => {
      try {
          const res = await apiFetch(`/api/v1/users/${profileId}/follow`, { method: 'POST' });
          if (res.success) {
              setIsFollowing(res.action === 'followed');
              setSocialCounts(prev => ({
                  ...prev, 
                  followers: res.action === 'followed' ? prev.followers + 1 : prev.followers - 1
              }));
          }
      } catch (err) {
          console.error(err);
      }
  };

  const openSocialModal = async (type) => {
      setShowSocialModal(type);
      setIsLoadingSocial(true);
      setSocialList([]);
      try {
          const res = await apiFetch(`/api/v1/users/${profileId}/${type}`);
          if (res.success) {
              setSocialList(res.users);
          }
      } catch (err) {
          console.error(`Failed to fetch ${type}`, err);
      } finally {
          setIsLoadingSocial(false);
      }
  };

  const handleEditSave = async () => {
      try {
          const formData = new FormData();
          formData.append('bio', editForm.bio || '');
          formData.append('wallet_address', editForm.wallet_address || '');
          formData.append('cover_url', editForm.cover_url || '');
          if (avatarFile) {
              formData.append('avatar_file', avatarFile);
          } else if (editForm.avatar_url) {
              formData.append('avatar_url', editForm.avatar_url);
          }
          
          const res = await apiFetch('/api/v1/users/profile', {
              method: 'PUT',
              body: formData
          });
          if (res.success) {
              setProfileUser(res.user);
              if (setDbUser) setDbUser(res.user);
              setShowEditModal(false);
              setAvatarFile(null);
          }
      } catch (err) {
          console.error(err);
      }
  };

  if (!profileUser) {
      return (
         <div className="w-full min-h-screen p-8">
             <div className="h-48 bg-gray-800 animate-pulse rounded-xl mb-4"></div>
             <div className="h-20 w-20 rounded-full bg-gray-700 animate-pulse -mt-10 ml-4"></div>
         </div>
      );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold">{profileUser.display_name || profileUser.username}</h1>
      </div>
      
      {/* Sleek Profile Header */}
      <div className="relative border-b border-gray-800 pb-4">
         <div className="h-48 w-full bg-gray-800">
             {profileUser.cover_url && <img src={profileUser.cover_url} className="w-full h-full object-cover" alt="Cover" />}
         </div>
         
         <div className="px-4 flex justify-between items-start">
             <img src={profileUser.avatar_url || "https://api.dicebear.com/7.x/micah/svg?seed=" + profileUser.username} onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/7.x/micah/svg?seed=" + profileUser.username; }} alt="Avatar" className="w-32 h-32 bg-gray-900 rounded-full border-4 border-gray-900 -mt-16 relative" />
             <div className="mt-4">
                 {isOwnProfile ? (
                     <button onClick={() => { setEditForm(profileUser); setShowEditModal(true); }} className="border border-gray-600 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-full transition">Edit Profile</button>
                 ) : (
                     <button onClick={handleFollowToggle} className={`${isFollowing ? 'border border-gray-600 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500' : 'bg-white text-black hover:bg-gray-200'} font-bold py-2 px-6 rounded-full transition`}>
                         {isFollowing ? 'Following' : 'Follow'}
                     </button>
                 )}
             </div>
         </div>
         
         <div className="px-4 mt-2">
             <h2 className="text-2xl font-bold">{profileUser.display_name || profileUser.username}</h2>
             <p className="text-gray-500 mb-2">@{profileUser.username}</p>
             {profileUser.bio && <p className="mb-3">{profileUser.bio}</p>}
             
             {profileUser.wallet_address && (
                 <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                     <span className="font-mono bg-gray-800 px-2 py-1 rounded">{profileUser.wallet_address.slice(0,6)}...{profileUser.wallet_address.slice(-4)}</span>
                 </div>
             )}
             
             <div className="flex gap-4 text-sm text-gray-500">
                 <span onClick={() => openSocialModal('following')} className="cursor-pointer hover:underline"><strong className="text-white">{socialCounts.following}</strong> Following</span>
                 <span onClick={() => openSocialModal('followers')} className="cursor-pointer hover:underline"><strong className="text-white">{socialCounts.followers}</strong> Followers</span>
             </div>
         </div>
      </div>

      <div className="flex border-b border-gray-800">
          <button onClick={()=>setActiveTab('posts')} className={`flex-1 py-4 font-bold text-center hover:bg-gray-800 transition ${activeTab==='posts' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500'}`}>Posts</button>
          <button onClick={()=>setActiveTab('reposts')} className={`flex-1 py-4 font-bold text-center hover:bg-gray-800 transition ${activeTab==='reposts' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-500'}`}>Reposts</button>
      </div>

      <div className="pb-20">
         {activeTab === 'posts' ? (
             myPosts.length > 0 ? myPosts.map(p => <PostCard key={p.id} post={p} />) : <div className="p-8 text-center text-gray-500">No posts yet.</div>
         ) : (
             reposts.length > 0 ? reposts.map(p => <PostCard key={p.id} post={p} isRepost />) : <div className="p-8 text-center text-gray-500">No reposts yet.</div>
         )}
      </div>

      {showEditModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-gray-900 p-6 rounded-xl w-full max-w-lg shadow-2xl border border-gray-700">
                  <h3 className="text-xl font-bold mb-4">Edit Profile</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-sm text-gray-400">Bio</label>
                          <textarea className="w-full bg-gray-800 p-2 rounded mt-1 outline-none focus:border-blue-500 border border-transparent" value={editForm.bio || ''} onChange={e=>setEditForm({...editForm, bio: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-sm text-gray-400">Wallet Address</label>
                          <input type="text" className="w-full bg-gray-800 p-2 rounded mt-1 outline-none focus:border-blue-500 border border-transparent font-mono text-sm" value={editForm.wallet_address || ''} onChange={e=>setEditForm({...editForm, wallet_address: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-sm text-gray-400 mb-2 block">Select Avatar</label>
                          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                              {['Felix', 'Aneka', 'Oliver', 'Jude', 'Leo', 'Molly', 'Coco', 'Oscar', 'Jasper', 'Bandit', 'Lily', 'Mia', 'Chloe', 'Zoe', 'Sophia', 'Ava', 'Isabella', 'Emma', 'Avery', 'Riley', 'Aria'].map(seed => {
                                  const url = `https://api.dicebear.com/7.x/micah/svg?seed=${seed}`;
                                  const isSelected = editForm.avatar_url === url && !avatarFile;
                                  return (
                                      <img 
                                          key={seed} 
                                          src={url} 
                                          alt={seed}
                                          onClick={() => { setEditForm({...editForm, avatar_url: url}); setAvatarFile(null); }}
                                          className={`w-14 h-14 rounded-full cursor-pointer transition-all flex-shrink-0 border-2 ${isSelected ? 'border-blue-500 bg-gray-800 scale-110 shadow-lg shadow-blue-500/20' : 'border-transparent hover:bg-gray-800 hover:scale-105 bg-gray-900/50'}`}
                                      />
                                  );
                              })}
                          </div>
                          
                          <label className="text-sm text-gray-400 mt-4 block">Or Upload Your Own Photo</label>
                          <input type="file" accept="image/*" onChange={(e) => { if(e.target.files[0]) { setAvatarFile(e.target.files[0]); setEditForm({...editForm, avatar_url: ''}); } }} className="w-full bg-gray-800 p-2 rounded mt-1 outline-none text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20" />

                          <label className="text-sm text-gray-400 mt-4 block">Or Paste Image URL</label>
                          <input type="text" className="w-full bg-gray-800 p-2 rounded mt-1 outline-none focus:border-blue-500 border border-transparent text-sm" value={editForm.avatar_url || ''} onChange={e=>{ setEditForm({...editForm, avatar_url: e.target.value}); setAvatarFile(null); }} placeholder="https://..." />
                      </div>
                      <div>
                          <label className="text-sm text-gray-400">Cover Image URL</label>
                          <input type="text" className="w-full bg-gray-800 p-2 rounded mt-1 outline-none focus:border-blue-500 border border-transparent text-sm" value={editForm.cover_url || ''} onChange={e=>setEditForm({...editForm, cover_url: e.target.value})} />
                      </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                      <button onClick={()=>setShowEditModal(false)} className="flex-1 border border-gray-600 hover:bg-gray-800 font-bold py-2 rounded transition">Cancel</button>
                      <button onClick={handleEditSave} className="flex-1 bg-white hover:bg-gray-200 text-black font-bold py-2 rounded transition">Save</button>
                  </div>
              </div>
          </div>
      )}

      {/* Social Modal (Followers/Following) */}
      {showSocialModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-800 flex flex-col max-h-[80vh]">
                  <div className="flex justify-between items-center p-4 border-b border-gray-800">
                      <h3 className="text-xl font-bold capitalize">{showSocialModal}</h3>
                      <button onClick={() => setShowSocialModal(null)} className="p-2 hover:bg-gray-800 rounded-full transition">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="overflow-y-auto p-4 flex-1">
                      {isLoadingSocial ? (
                          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
                      ) : socialList.length === 0 ? (
                          <div className="text-center text-gray-500 p-8">No {showSocialModal} yet.</div>
                      ) : (
                          <div className="space-y-4">
                              {socialList.map(u => (
                                  <Link 
                                      key={u.id} 
                                      to={`/profile/${u.id}`} 
                                      onClick={() => setShowSocialModal(null)}
                                      className="flex items-center gap-3 hover:bg-gray-800 p-2 rounded-xl transition"
                                  >
                                      <img src={u.avatar_url || "https://api.dicebear.com/7.x/micah/svg?seed=" + u.username} onError={(e) => { e.target.onerror = null; e.target.src = "https://api.dicebear.com/7.x/micah/svg?seed=" + u.username; }} alt="Avatar" className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                          <div className="font-bold text-[15px] truncate text-white">{u.display_name || u.username}</div>
                                          <div className="text-gray-500 text-[15px] truncate">@{u.username}</div>
                                      </div>
                                  </Link>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
