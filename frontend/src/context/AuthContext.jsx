import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Automatically upsert Google OAuth user into public.users
  const upsertPublicUser = async (authUser) => {
      if (!authUser) return;
      
      const { id, email, user_metadata } = authUser;
      const username = email.split('@')[0];
      const displayName = user_metadata?.full_name || username;
      const avatarUrl = user_metadata?.avatar_url || null;

      try {
          // Check if user exists
          const { data, error } = await supabase.from('users').select('id').eq('id', id).single();
          
          if (error && error.code === 'PGRST116') {
              // User doesn't exist, insert them
              await supabase.from('users').insert({
                  id: id,
                  username: username,
                  display_name: displayName,
                  avatar_url: avatarUrl
              });
          }
      } catch (err) {
          console.error("Error upserting public user", err);
      }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) upsertPublicUser(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) upsertPublicUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };
  
  const loginWithGoogle = async () => {
    return supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { redirectTo: window.location.origin } 
    });
  };

  const register = async (email, password, walletAddress) => {
    return supabase.auth.signUp({ 
        email, 
        password, 
        options: { data: { wallet_address: walletAddress } }
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
