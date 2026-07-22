import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Web3Provider } from './context/Web3Context';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import TrendingPage from './pages/TrendingPage';
import PostDetail from './pages/PostDetail';
import Explore from './pages/Explore';
import Bookmarks from './pages/Bookmarks';
import Chat from './pages/Chat';
import Studio from './pages/Studio';
import Premium from './pages/Premium';
import Dashboard from './components/Dashboard';
import VerificationHub from './components/VerificationHub';

// --- Protected Route Wrapper ---
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
     return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Web3Provider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            
              {/* Protected Routes wrapped in Layout */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                 <Route path="/" element={<Home />} />
                 <Route path="/explore" element={<Explore />} />
                 <Route path="/notifications" element={<Notifications />} />
                 <Route path="/chat" element={<Chat />} />
                 <Route path="/bookmarks" element={<Bookmarks />} />
                 <Route path="/premium" element={<Premium />} />
                 <Route path="/profile" element={<Profile />} />
                 <Route path="/profile/:id" element={<Profile />} />
                 <Route path="/studio" element={<Studio />} />
                 <Route path="/trending" element={<TrendingPage />} />
                 <Route path="/post/:id" element={<PostDetail />} />
                 <Route path="/dashboard" element={<VerificationHub />} />
              </Route>
            </Routes>
            <ToastContainer position="bottom-right" theme="dark" />
          </Web3Provider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
