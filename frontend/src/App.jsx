import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function SidebarLeft() {
  const handleConnectWallet = () => {
    // TODO: Implement Web3 Wallet Connection.
    console.log("Connect Wallet clicked");
  };

  return (
    <div className="w-1/4 h-screen p-4 border-r border-gray-800 sticky top-0">
      <div className="flex flex-col h-full">
        <div className="text-2xl font-bold mb-8 text-blue-400">Sentinel</div>
        <nav className="flex flex-col space-y-4 flex-grow">
          <Link to="/" className="text-xl font-semibold hover:text-blue-400 transition-colors">Home</Link>
          <a href="#" className="text-xl font-semibold hover:text-blue-400 transition-colors">Explore</a>
          <a href="#" className="text-xl font-semibold hover:text-blue-400 transition-colors">Notifications</a>
          <a href="#" className="text-xl font-semibold hover:text-blue-400 transition-colors">Profile</a>
        </nav>
        <button 
          onClick={handleConnectWallet}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full w-full transition-colors mt-auto"
        >
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
          <div>
            <p className="text-sm text-gray-400">Politics · Trending</p>
            <p className="font-bold">#ElectionDeepfakes</p>
            <p className="text-sm text-gray-400">120K posts</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Technology · Trending</p>
            <p className="font-bold">OpenAI Sora</p>
            <p className="text-sm text-gray-400">85K posts</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewPost({ onPostSubmit }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = async () => {
    if (!content.trim() && !file) return;
    
    const formData = new FormData();
    formData.append("content", content);
    formData.append("walletAddress", "0x000000000000"); // Mock user address
    if (file) {
      formData.append("media", file);
    }

    try {
      const response = await fetch('http://localhost:8000/api/v1/posts', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
         onPostSubmit(); // Trigger refresh
      }
    } catch(err) {
      console.error(err);
    }
    
    setContent('');
    setFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border-b border-gray-800 p-4">
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0"></div>
        <div className="flex-grow flex flex-col">
          <textarea
            className="w-full bg-transparent text-xl outline-none resize-none placeholder-gray-500 min-h-[100px]"
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {file && <p className="text-sm text-blue-400 font-bold mt-2">File attached: {file.name}</p>}
          <div className="border-t border-gray-800 pt-4 flex justify-between items-center mt-2">
            <div>
              <input 
                type="file" 
                ref={fileInputRef}
                style={{display: 'none'}} 
                onChange={(e) => setFile(e.target.files[0])}
              />
              <button onClick={() => fileInputRef.current?.click()} className="text-blue-400 hover:bg-gray-800 p-2 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                </svg>
              </button>
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={!content.trim() && !file}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-full transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post }) {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'verified':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'flagged':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getBadgeIcon = (status) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        );
      case 'verified':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        );
      case 'flagged':
        return (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  const getBadgeText = (status) => {
    switch (status) {
      case 'pending': return 'Pending AI Verification';
      case 'verified': return 'Verified Authentic';
      case 'flagged': return 'Flagged: Deepfake';
      default: return 'Unknown';
    }
  };

  return (
    <div className="border-b border-gray-800 p-4 hover:bg-gray-800/30 transition-colors">
      <div className="flex gap-4">
        <div className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0"></div>
        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold hover:underline cursor-pointer">{post.handle}</span>
            <span className="text-gray-500">· 2h</span>
          </div>
          <p className="mb-3 text-[15px]">{post.content}</p>
          
          <div className="mb-3 w-full h-48 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-gray-500">
            [ Media Placeholder ]
          </div>

          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle(post.status)}`}>
            {getBadgeIcon(post.status)}
            {getBadgeText(post.status)}
          </div>
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
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPosts();
    // Polling every 2 seconds to simulate realtime Supabase websockets
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
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
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
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
