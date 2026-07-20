import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import TrendingPage from './pages/TrendingPage';
import PostDetail from './pages/PostDetail';

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
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          
            {/* Protected Routes wrapped in Layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
               <Route path="/" element={<Home />} />
               <Route path="/profile" element={<Profile />} />
               <Route path="/profile/:id" element={<Profile />} />
               <Route path="/notifications" element={<Notifications />} />
               <Route path="/trending" element={<TrendingPage />} />
               <Route path="/post/:id" element={<PostDetail />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
