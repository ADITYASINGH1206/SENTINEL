import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Heart, MessageCircle, Share, BarChart2 } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Auth Context ---
const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For hackathon, we simulate a logged in user if supabase is mocked, or check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    // Mock login fallback if supabase is just a mock URL
    if (supabaseUrl === 'https://mock.supabase.co') {
        setUser({ id: 'mock-user-id', email, token: 'mock-jwt-token' });
        return { error: null };
    }
    return supabase.auth.signInWithPassword({ email, password });
  };
  
  const register = async (email, password, walletAddress) => {
    if (supabaseUrl === 'https://mock.supabase.co') {
        setUser({ id: 'mock-user-id', email, token: 'mock-jwt-token' });
        return { error: null };
    }
    return supabase.auth.signUp({ email, password, options: { data: { wallet_address: walletAddress } }});
  };

  const logout = async () => {
    if (supabaseUrl === 'https://mock.supabase.co') {
        setUser(null); return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

// --- Protected Route ---
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// --- Auth Pages ---
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await login(email, password);
    if (!error) navigate('/');
    else alert(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-xl w-96 space-y-4 shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Login to Sentinel</h2>
        <input type="email" placeholder="Email" className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded">Login</button>
        <p className="text-center text-sm text-gray-400">Don't have an account? <Link to="/register" className="text-blue-400 hover:underline">Register</Link></p>
      </form>
    </div>
  );
}

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wallet, setWallet] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const { error } = await register(email, password, wallet);
    if (!error) navigate('/');
    else alert(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <form onSubmit={handleRegister} className="bg-gray-800 p-8 rounded-xl w-96 space-y-4 shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Join Sentinel</h2>
        <input type="email" placeholder="Email" className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" value={password} onChange={e=>setPassword(e.target.value)} />
        <input type="text" placeholder="Wallet Address (0x...)" className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" value={wallet} onChange={e=>setWallet(e.target.value)} />
        <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded">Register</button>
        <p className="text-center text-sm text-gray-400">Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Login</Link></p>
      </form>
    </div>
  );
}


// --- Main Application Components ---

function SidebarLeft() {
  const { logout } = useAuth();
  const handleConnectWallet = () => {
    console.log("Connect Wallet clicked");
  };

  return (
    <div className="w-1/4 h-screen p-4 border-r border-gray-800 sticky top-0">
      <div className="flex flex-col h-full">
        <div className="text-2xl font-bold mb-8 text-blue-400">Sentinel</div>
        <nav className="flex flex-col space-y-4 flex-grow">
          <Link to="/" className="text-xl font-semibold hover:text-blue-400 transition-colors">Home</Link>
          <a href="#" className="text-xl font-semibold hover:text-blue-400 transition-colors">Explore</a>
          <a href="#" className="text-xl font-semibold hover:text-blue-400 transition-colors">Profile</a>
          <button onClick={logout} className="text-xl font-semibold text-left text-red-400 hover:text-red-300 transition-colors">Logout</button>
        </nav>
        <button onClick={handleConnectWallet} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full w-full transition-colors mt-auto">
          Connect Wallet
        </button>
      </div>
    </div>
  );
}

function RightPanel() {
  return (
    <div className="w-1/4 h-screen p-4 sticky top-0 hidden lg:block">
      <div className="bg-gray-800 rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-4">Trending</h2>
        <div className="space-y-4">
          <div><p className="text-sm text-gray-400">Politics</p><p className="font-bold">#ElectionDeepfakes</p></div>
          <div><p className="text-sm text-gray-400">Tech</p><p className="font-bold">OpenAI Sora</p></div>
        </div>
      </div>
    </div>
  );
}

function NewPost({ onPostSubmit }) {
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
        headers: { 'Authorization': `Bearer ${user?.token}` }, // Token needed for protected routes
        body: formData
      });
      const data = await response.json();
      if (data.success) onPostSubmit();
    } catch(err) { console.error(err); }
    
    setContent(''); setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border-b border-gray-800 p-4">
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0"></div>
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

function CommentSection({ postId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        fetch(`http://localhost:8000/api/v1/posts/${postId}/comments`, {
            headers: { 'Authorization': `Bearer ${user?.token}` }
        })
        .then(res => res.json())
        .then(data => { if(data.success) setComments(data.comments) })
        .catch(console.error);
    }, [postId, user]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            const res = await fetch(`http://localhost:8000/api/v1/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
                body: JSON.stringify({ content: newComment })
            });
            const data = await res.json();
            if (data.success) {
                setComments([...comments, data.comment]);
                setNewComment('');
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="mt-4 border-t border-gray-800 pt-4 px-2">
            {comments.map(c => (
                <div key={c.id} className="mb-3 flex gap-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                    <div>
                        <span className="font-bold text-sm">{c.user.handle}</span>
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

function PostCard({ post }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 50));
  const [shared, setShared] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { user } = useAuth();

  const handleLike = async () => {
      // Optimistic update
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);

      try {
          await fetch(`http://localhost:8000/api/v1/posts/${post.id}/like`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${user?.token}` }
          });
      } catch (err) {
          // Revert on error
          setLiked(!liked);
          setLikeCount(liked ? likeCount + 1 : likeCount - 1);
      }
  };

  const handleShare = async () => {
      setShared(!shared);
      try {
          await fetch(`http://localhost:8000/api/v1/posts/${post.id}/share`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${user?.token}` }
          });
      } catch (err) { setShared(!shared); }
  };

  const badgeStyles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      verified: 'bg-green-500/20 text-green-400 border-green-500/50',
      flagged: 'bg-red-500/20 text-red-400 border-red-500/50'
  };

  return (
    <div className="border-b border-gray-800 p-4 hover:bg-gray-800/30 transition-colors">
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0"></div>
        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold hover:underline cursor-pointer">{post.handle}</span>
            <span className="text-gray-500 text-sm">· 2h</span>
          </div>
          <p className="mb-3 text-[15px]">{post.content}</p>
          <div className="mb-3 w-full h-48 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-gray-500">[ Media Placeholder ]</div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyles[post.status] || badgeStyles.pending}`}>
            {post.status.toUpperCase()}
          </div>
          
          {/* Interaction Bar */}
          <div className="flex justify-between items-center mt-4 text-gray-500 max-w-md">
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 hover:text-blue-400 transition group">
                <div className="p-2 rounded-full group-hover:bg-blue-400/10"><MessageCircle size={18} /></div>
                <span className="text-sm">2</span>
            </button>
            <button onClick={handleShare} className={`flex items-center gap-2 hover:text-green-400 transition group ${shared ? 'text-green-400' : ''}`}>
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

function CentralFeed() {
  const [posts, setPosts] = useState([]);

  const fetchPosts = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/posts');
      const data = await res.json();
      setPosts(data);
    } catch(err) {}
  };

  useEffect(() => {
    fetchPosts();
    const intervalId = setInterval(fetchPosts, 2000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-full lg:w-1/2 border-r border-gray-800 min-h-screen">
      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 z-10">
        <h1 className="text-xl font-bold">Home</h1>
      </div>
      <NewPost onPostSubmit={fetchPosts} />
      <div className="pb-20">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="flex max-w-7xl mx-auto min-h-screen">
      <SidebarLeft />
      <CentralFeed />
      <RightPanel />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
