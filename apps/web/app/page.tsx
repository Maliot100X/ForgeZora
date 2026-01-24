"use client";

import React, { useState, useEffect } from 'react';

type User = {
  id: string;
  fid: number;
  profile: {
    username: string;
    bio: string;
    avatar_url: string;
  } | null;
  wallets: {
    address: string;
    wallet_type: string;
  }[];
};

export default function Home() {
  const [fid, setFid] = useState<string>("3"); // Default to FID 3 (dwr.eth) for testing
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async (currentFid: string) => {
    try {
      const res = await fetch(`http://localhost:3001/wallets/${currentFid}`);
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user", err);
    }
  };

  const handleSync = async () => {
    if (!fid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3001/sync/${fid}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      } else {
        setError(data.error || "Sync failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch if FID is set
  useEffect(() => {
    if (fid) fetchUser(fid);
  }, [fid]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-900 text-white">
      <div className="max-w-md w-full flex flex-col gap-6">
        <h1 className="text-3xl font-bold text-center text-blue-400">Forgecast Phase 2</h1>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <label className="block text-sm font-medium mb-2 text-slate-300">Farcaster FID</label>
          <div className="flex gap-2 mb-4">
            <input 
              type="number" 
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter FID"
            />
            <button 
              onClick={handleSync}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? "Syncing..." : "Sync Profile"}
            </button>
          </div>
          
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm mb-4">
              {error}
            </div>
          )}

          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg">
                {user.profile?.avatar_url && (
                  <img 
                    src={user.profile.avatar_url} 
                    alt={user.profile.username || "Avatar"} 
                    className="w-16 h-16 rounded-full border-2 border-blue-500"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold">@{user.profile?.username}</h2>
                  <p className="text-slate-400 text-sm">{user.profile?.bio}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Connected Wallets</h3>
                <div className="space-y-2">
                  {user.wallets.length > 0 ? (
                    user.wallets.map((wallet, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-700 text-sm font-mono break-all">
                        <span className="text-green-400">{wallet.wallet_type}</span>
                        <span className="text-slate-300">{wallet.address}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No wallets found.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">
              Enter an FID and sync to view profile.
            </div>
          )}
        </div>
        
        <div className="text-center text-xs text-slate-600">
          Powered by Zora & Neynar
        </div>
      </div>
    </main>
  );
}
