import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ethers } from 'ethers';
import './App.css';

function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (err) {
        console.error("User denied account access", err);
      }
    } else {
      alert("Please install MetaMask to use this feature.");
    }
  };

  const mockPosts = [
    { id: 1, author: "0x123...abc", content: "Is this video real?", confidence: "98% Authentic" },
    { id: 2, author: "0x456...def", content: "Check out this crazy photo!", confidence: "Fake (AI Generated)" }
  ];

  return (
    <div className="home-container">
      <header className="header">
        <h1>Sentinel Social Feed</h1>
        {walletAddress ? (
          <button className="wallet-btn connected">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </button>
        ) : (
          <button className="wallet-btn" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </header>
      
      <main className="feed-main">
        <section className="upload-box">
          <h2>Upload Media to Verify</h2>
          <input type="file" className="file-input" />
          <button className="upload-btn">Verify & Post</button>
        </section>

        <section className="post-list">
          <h2>Recent Posts</h2>
          {mockPosts.map((post) => (
            <div key={post.id} className="post-card">
              <p className="post-author">By: {post.author}</p>
              <p className="post-content">{post.content}</p>
              <p className="post-confidence">Status: {post.confidence}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
