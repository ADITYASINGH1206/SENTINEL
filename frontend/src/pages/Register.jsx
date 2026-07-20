import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wallet, setWallet] = useState('');
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const { error } = await register(email, password, wallet);
    if (!error) navigate('/');
    else alert(error.message);
  };

  const handleGoogle = async () => {
    const { error } = await loginWithGoogle();
    if (error) alert(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-xl w-96 space-y-6 shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Join Sentinel</h2>
        
        <button onClick={handleGoogle} className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 rounded flex items-center justify-center gap-2 transition">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Sign in with Google
        </button>

        <div className="flex items-center gap-2">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="text-gray-400 text-sm">or</span>
            <div className="flex-grow border-t border-gray-600"></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
            <input type="email" placeholder="Email" className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" value={email} onChange={e=>setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" value={password} onChange={e=>setPassword(e.target.value)} />
            <input type="text" placeholder="Wallet Address (0x...)" className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500" value={wallet} onChange={e=>setWallet(e.target.value)} />
            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded transition">Register</button>
        </form>
        
        <p className="text-center text-sm text-gray-400">Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Login</Link></p>
      </div>
    </div>
  );
}
