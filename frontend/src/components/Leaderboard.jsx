import React, { useState, useEffect } from 'react';
import { Trophy, Target, Coins, Medal } from 'lucide-react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/leaderboard');
        const data = await response.json();
        if (data.success) {
          setLeaderboard(data.leaderboard);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (loading) {
    return <div className="text-gray-400 p-8 text-center animate-pulse">Loading Leaderboard...</div>;
  }

  if (leaderboard.length === 0) {
    return <div className="text-gray-500 p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">No verifiers on the network yet. Be the first!</div>;
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="text-yellow-500" />
          Global Top Verifiers
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-950/50 text-gray-400 text-sm uppercase tracking-wider border-b border-gray-800">
              <th className="px-6 py-4 font-semibold">Rank</th>
              <th className="px-6 py-4 font-semibold">Verifier Address</th>
              <th className="px-6 py-4 font-semibold text-center">Accuracy Rate</th>
              <th className="px-6 py-4 font-semibold text-right">Total Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {leaderboard.map((user, idx) => (
              <tr key={user.address} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 font-bold text-gray-300">
                    {idx === 0 && <Medal className="text-yellow-500 h-5 w-5" />}
                    {idx === 1 && <Medal className="text-gray-400 h-5 w-5" />}
                    {idx === 2 && <Medal className="text-amber-700 h-5 w-5" />}
                    {idx > 2 && <span className="w-5 text-center">{idx + 1}</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-400">
                  {formatAddress(user.address)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5 font-semibold text-green-400">
                    <Target size={16} />
                    {user.accuracyRate}%
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1.5 font-bold text-white">
                    <Coins size={16} className="text-yellow-500" />
                    {user.totalEarned + user.pendingBalance} $SNTL
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
