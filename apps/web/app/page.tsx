"use client";

import React, { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// --- Types ---
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

type Coin = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  price_usd?: string;
  market_cap?: string;
  volume_24h?: string;
  percent_change_24h?: string;
  image_url?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// --- Components ---

// Coin Details Modal
const CoinDetailsModal = ({ coin, onClose }: { coin: any, onClose: () => void }) => {
  const [activeView, setActiveView] = useState<'holders' | 'swaps' | 'comments'>('holders');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setData(null);
      try {
        let endpoint = '';
        if (activeView === 'holders') endpoint = `/zora_get_coin_holders/${coin.address}`;
        else if (activeView === 'swaps') endpoint = `/zora_get_coin_swaps/${coin.address}`;
        else if (activeView === 'comments') endpoint = `/zora_get_coin_comments/${coin.address}`;
        
        const res = await fetch(`${API_BASE_URL}${endpoint}`);
        const json = await res.json();
        setData(json);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [activeView, coin]);

  const renderContent = () => {
    if (loading) return <div className="text-center py-8 text-slate-500 animate-pulse">Loading data...</div>;
    if (!data) return <div className="text-center py-8 text-slate-500">No data found.</div>;

    // Handle Zora SDK response wrappers
    const list = data.holders || data.swaps || data.comments || data.data?.holders || data.data?.swaps || data.data?.comments || [];
    
    // Fallback if list is empty or not found
    if (!Array.isArray(list) || list.length === 0) return <div className="text-center py-8 text-slate-500">No records found.</div>;

    if (activeView === 'holders') {
      return (
        <div className="space-y-2">
          {list.map((h: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-2 bg-slate-800/50 rounded border border-slate-800">
              <span className="text-xs font-mono text-blue-400 truncate w-1/2">{h.address || "Unknown"}</span>
              <span className="text-xs text-slate-300">{h.balance ? Number(h.balance).toLocaleString() : '0'} tokens</span>
            </div>
          ))}
        </div>
      );
    }
    if (activeView === 'swaps') {
      return (
        <div className="space-y-2">
          {list.map((s: any, i: number) => (
            <div key={i} className="flex justify-between items-center p-2 bg-slate-800/50 rounded border border-slate-800">
               <div className="flex flex-col">
                 <span className={`text-xs font-bold ${s.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{s.type || "SWAP"}</span>
                 <span className="text-[10px] text-slate-500">{new Date(s.timestamp * 1000).toLocaleTimeString()}</span>
               </div>
               <span className="text-xs font-mono text-slate-300">{s.amount ? Number(s.amount).toFixed(4) : '0'} ETH</span>
            </div>
          ))}
        </div>
      );
    }
    if (activeView === 'comments') {
      return (
        <div className="space-y-3">
          {list.map((c: any, i: number) => (
            <div key={i} className="p-3 bg-slate-800/50 rounded border border-slate-800">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold text-blue-400">{c.author || "Anon"}</span>
                <span className="text-[10px] text-slate-500">{c.timestamp ? new Date(c.timestamp * 1000).toLocaleDateString() : ''}</span>
              </div>
              <p className="text-sm text-slate-300">{c.text || "No content"}</p>
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-md h-[85vh] sm:h-auto sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl border border-slate-700 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-300 font-bold">{coin.symbol?.[0]}</div>
             <div>
               <h3 className="font-bold text-white">{coin.name}</h3>
               <p className="text-xs text-slate-400">{coin.symbol}</p>
             </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">✕</button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/30">
           {(['holders', 'swaps', 'comments'] as const).map(v => (
             <button key={v} onClick={() => setActiveView(v)} className={`flex-1 py-3 text-xs uppercase tracking-wider font-bold transition-colors ${activeView === v ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>{v}</button>
           ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
           {renderContent()}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-3">
           <button onClick={() => alert("Trading coming in Phase 3")} className="flex-1 bg-green-600/20 text-green-400 border border-green-600/50 py-3 rounded-xl font-bold hover:bg-green-600/30 transition-colors">Buy</button>
           <button onClick={() => alert("Trading coming in Phase 3")} className="flex-1 bg-red-600/20 text-red-400 border border-red-600/50 py-3 rounded-xl font-bold hover:bg-red-600/30 transition-colors">Sell</button>
        </div>
      </div>
    </div>
  );
}

// 1. Home Tab (formerly Launch Tab)
const HomeTab = () => {
  const [homeTab, setHomeTab] = useState<'new' | 'boosted' | 'graduated' | 'trending'>('new');
  const [coins, setCoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);

  useEffect(() => {
    const fetchCoins = async () => {
      setLoading(true);
      setError(null);
      try {
        let endpoint = '';
        switch (homeTab) {
          case 'new': endpoint = '/zora_explore_new'; break;
          case 'boosted': endpoint = '/zora_explore_most_valuable'; break;
          case 'graduated': endpoint = '/zora_explore_top_volume_24h'; break;
          case 'trending': endpoint = '/zora_explore_top_gainers'; break;
        }
        const res = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!res.ok) throw new Error("Failed to fetch coins");
        const json = await res.json();
        
        let items: any[] = [];
        if (json.data?.exploreList?.items) {
          items = json.data.exploreList.items.map((i: any) => i.coin);
        } else if (json.coins) {
          items = json.coins;
        } else if (Array.isArray(json)) {
          items = json;
        }
        setCoins(items);
      } catch (err: any) {
        console.error("Failed to fetch coins", err);
        setError(err.message || "Failed to load coins");
      } finally {
        setLoading(false);
      }
    };
    fetchCoins();
  }, [homeTab]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-700 overflow-x-auto no-scrollbar">
        {(['new', 'boosted', 'graduated', 'trending'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setHomeTab(t)}
            className={`flex-1 py-3 px-4 text-sm font-medium capitalize whitespace-nowrap ${
              homeTab === t 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-slate-500 py-8 animate-pulse">Loading coins...</div>
        ) : coins.length > 0 ? (
          coins.map((coin, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedCoin(coin)}
              className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 active:scale-[0.98] transition-transform cursor-pointer hover:bg-slate-750"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden">
                  {coin.image_url ? <img src={coin.image_url} alt={coin.symbol} className="w-full h-full object-cover" /> : (coin.symbol?.[0] || "?")}
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">{coin.name}</h3>
                  <p className="text-xs text-slate-400">{coin.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-slate-200">{coin.price_usd ? `$${Number(coin.price_usd).toFixed(4)}` : '-'}</p>
                <p className={`text-xs ${Number(coin.percent_change_24h) >= 0 ? 'text-green-400' : 'text-red-400'} mb-2`}>
                  {coin.percent_change_24h ? `${Number(coin.percent_change_24h).toFixed(2)}%` : '-'}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-slate-500 py-8">No coins found.</div>
        )}
      </div>
      
      {selectedCoin && <CoinDetailsModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />}
    </div>
  );
};

// 2. Launch Tab (New Implementation)
const LaunchTab = () => {
  const [isLaunching, setIsLaunching] = useState(false);

  const handleLaunch = () => {
    setIsLaunching(true);
    // Simulation of launch and bot trigger
    setTimeout(() => {
      alert("Coin Launched (Simulated)!\nNeynar Bot Triggered!");
      setIsLaunching(false);
    }, 2000);
  };

  return (
    <div className="p-6 flex flex-col h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Launch Coin</h2>
      
      <div className="space-y-4 flex-1">
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Token Name</label>
          <input type="text" placeholder="e.g. Based Coin" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Symbol</label>
          <input type="text" placeholder="e.g. BASED" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Description</label>
          <textarea placeholder="What is this coin about?" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none h-24 resize-none" />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Image URL</label>
          <input type="text" placeholder="https://..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" />
        </div>

        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 mt-6">
           <h3 className="text-sm font-bold text-slate-300 mb-2">Bot Integration</h3>
           <p className="text-xs text-slate-500">
             Neynar Bot will automatically announce your launch on Farcaster.
           </p>
        </div>
      </div>

      <div className="mt-6">
        <button 
          onClick={handleLaunch}
          disabled={isLaunching}
          className="w-full sm:w-auto px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 rounded-full font-bold text-white transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-50 mx-auto"
        >
          <span>{isLaunching ? "Launching..." : "Launch"}</span>
          <span>🚀</span>
        </button>
      </div>
    </div>
  );
};

// 3. Shop Tab (Updated with Boosts & Subscriptions)
const ShopTab = () => {
  const [coins, setCoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<any>(null);
  const [sort, setSort] = useState<'volume' | 'gainers' | 'trending'>('volume');
  const [activeShopView, setActiveShopView] = useState<'market' | 'boosts'>('market');

  useEffect(() => {
    if (activeShopView === 'market') {
      const fetchCoins = async () => {
        setLoading(true);
        try {
          let endpoint = '/zora_explore_top_volume_24h'; // Default
          if (sort === 'gainers') endpoint = '/zora_explore_top_gainers';
          if (sort === 'trending') endpoint = '/zora_explore_most_valuable';

          const res = await fetch(`${API_BASE_URL}${endpoint}`);
          const json = await res.json();
          let items: any[] = [];
          if (json.data?.exploreList?.items) {
            items = json.data.exploreList.items.map((i: any) => i.coin);
          } else if (json.coins) {
            items = json.coins;
          } else if (Array.isArray(json)) {
            items = json;
          }
          setCoins(items);
        } catch (err) {
          console.error("Failed to fetch coins", err);
        } finally {
          setLoading(false);
        }
      };
      fetchCoins();
    }
  }, [sort, activeShopView]);

  const handlePurchase = (item: string, price: string) => {
    alert(`Purchasing ${item} for ${price}\n(Referral wallet: 0xccd...2ef6)`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Shop Nav */}
      <div className="flex border-b border-slate-700 bg-slate-900">
        <button 
          onClick={() => setActiveShopView('market')} 
          className={`flex-1 py-3 text-sm font-bold ${activeShopView === 'market' ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}
        >
          Market
        </button>
        <button 
          onClick={() => setActiveShopView('boosts')} 
          className={`flex-1 py-3 text-sm font-bold ${activeShopView === 'boosts' ? 'text-white border-b-2 border-pink-500' : 'text-slate-500'}`}
        >
          Boosts & Subs
        </button>
      </div>

      {activeShopView === 'market' ? (
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Market</h2>
            <select 
              value={sort} 
              onChange={(e) => setSort(e.target.value as any)}
              className="bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 p-2 focus:outline-none"
            >
              <option value="volume">Top Volume</option>
              <option value="gainers">Top Gainers</option>
              <option value="trending">Trending</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center text-slate-500">Loading market...</div>
            ) : coins.map((coin, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedCoin(coin)}
                className="p-3 bg-slate-800 rounded-lg border border-slate-700 flex justify-between items-center cursor-pointer hover:bg-slate-750 active:scale-[0.98] transition-transform"
              >
                <div>
                  <div className="font-bold text-slate-200">{coin.name}</div>
                  <div className="text-xs text-slate-500">{coin.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-200 text-sm">{coin.price_usd ? `$${Number(coin.price_usd).toFixed(4)}` : '-'}</div>
                  <div className={`text-xs ${Number(coin.percent_change_24h) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {coin.percent_change_24h ? `${Number(coin.percent_change_24h).toFixed(2)}%` : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          {/* Boosts */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">🚀 Boost Your Coin</h3>
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => handlePurchase("10min Boost", "$1.99")}
                className="bg-slate-800 p-4 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-750 active:scale-95 transition-all text-center"
              >
                <div className="text-2xl mb-1">⚡ 10m</div>
                <div className="font-bold text-white">10 Minutes</div>
                <div className="text-green-400 text-sm">$1.99</div>
              </div>
              <div 
                onClick={() => handlePurchase("30min Boost", "$4.99")}
                className="bg-slate-800 p-4 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-750 active:scale-95 transition-all text-center"
              >
                <div className="text-2xl mb-1">🔥 30m</div>
                <div className="font-bold text-white">30 Minutes</div>
                <div className="text-green-400 text-sm">$4.99</div>
              </div>
            </div>
          </div>

          {/* Subscriptions */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">💎 Pro Subscription</h3>
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-5 rounded-xl border border-indigo-500/30">
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <h4 className="font-bold text-white text-lg">Pro Badge</h4>
                   <p className="text-xs text-indigo-200">Unlock advanced analytics & badges</p>
                 </div>
                 <span className="bg-white text-indigo-900 text-xs font-bold px-2 py-1 rounded">$15/mo</span>
               </div>
               <div className="space-y-2 mb-6">
                 <div className="flex items-center gap-2 text-sm text-indigo-100">
                   <span>✓</span> Verified Badge
                 </div>
                 <div className="flex items-center gap-2 text-sm text-indigo-100">
                   <span>✓</span> 0% Trading Fees
                 </div>
                 <div className="flex items-center gap-2 text-sm text-indigo-100">
                   <span>✓</span> Priority Support
                 </div>
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={() => handlePurchase("Pro Subscription", "$15")}
                   className="flex-1 bg-white text-indigo-900 font-bold py-2 rounded-lg hover:bg-indigo-50"
                 >
                   Subscribe
                 </button>
                 <button 
                    onClick={() => alert("Starting 1-min Demo...")}
                    className="px-4 py-2 border border-indigo-400 text-indigo-200 rounded-lg text-sm hover:bg-indigo-900/50"
                 >
                   Demo
                 </button>
               </div>
               <p className="text-[10px] text-center mt-3 text-indigo-300">Includes 24h free trial</p>
            </div>
          </div>
        </div>
      )}
      
      {selectedCoin && <CoinDetailsModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />}
    </div>
  );
};

// 4. Profile Tab (Updated with Wallets)
const ProfileTab = ({ user, fid, onSync, loadingSync, metamaskAddress }: { user: User | null, fid: string, onSync: () => void, loadingSync: boolean, metamaskAddress: string | null }) => {
  return (
    <div className="p-6 flex flex-col gap-6 h-full overflow-y-auto">
      {user ? (
        <>
          <div className="flex flex-col items-center gap-4">
            {user.profile?.avatar_url ? (
              <img 
                src={user.profile.avatar_url} 
                alt={user.profile.username || "Avatar"} 
                className="w-24 h-24 rounded-full border-4 border-blue-500 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-2xl font-bold text-slate-400">
                {user.profile?.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">@{user.profile?.username}</h2>
              <p className="text-slate-400 text-sm mt-1">{user.profile?.bio}</p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Connected Wallets</h3>
            <div className="space-y-2">
              {user.wallets.map((wallet, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 text-xs font-mono break-all">
                  <span className="text-blue-400 font-bold">{wallet.wallet_type.toUpperCase()}</span>
                  <span className="text-slate-400 ml-2 truncate">{wallet.address}</span>
                </div>
              ))}
              {/* Metamask Auto-detection Display inside Profile */}
              {metamaskAddress && (
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-orange-700/50 text-xs font-mono break-all">
                   <span className="text-orange-400 font-bold">METAMASK</span>
                   <span className="text-slate-400 ml-2 truncate">{metamaskAddress}</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-10">
          <p className="text-slate-400 mb-4">Profile not found. Please sync.</p>
          {metamaskAddress && (
             <div className="mb-4 p-3 bg-slate-800 rounded border border-orange-700/50 text-xs font-mono break-all">
                <span className="text-orange-400 font-bold block mb-1">Detected MetaMask</span>
                <span className="text-slate-400">{metamaskAddress}</span>
             </div>
          )}
        </div>
      )}
      
      <div className="space-y-3 mt-auto pb-6">
        <button 
          onClick={onSync}
          disabled={loadingSync}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold text-white disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
        >
          <span>{loadingSync ? "Syncing Profile & Wallets..." : "Sync Profile & Wallets"}</span>
          {!loadingSync && <span>🔄</span>}
        </button>
      </div>
    </div>
  );
};

// 5. More Tab
const MoreTab = () => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
    <div className="text-4xl mb-4">⋯</div>
    <h3 className="text-lg font-bold text-slate-300">More Features</h3>
    <div className="w-full space-y-3 mt-6">
       <div className="p-3 bg-slate-800 rounded border border-slate-700 text-left">
         <h4 className="font-bold text-slate-300">Tools</h4>
         <p className="text-xs text-slate-500">Advanced charts, Analytics</p>
       </div>
       <div className="p-3 bg-slate-800 rounded border border-slate-700 text-left">
         <h4 className="font-bold text-slate-300">Settings</h4>
         <p className="text-xs text-slate-500">Notifications, Preferences</p>
       </div>
       <div className="p-3 bg-slate-800 rounded border border-slate-700 text-left">
         <h4 className="font-bold text-slate-300">Help</h4>
         <p className="text-xs text-slate-500">FAQ, Support</p>
       </div>
    </div>
  </div>
);


// --- Main Layout ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'launch' | 'shop' | 'profile' | 'more'>('home');
  const [fid, setFid] = useState<string>("3"); // Default to FID 3
  const [user, setUser] = useState<User | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const [metamaskAddress, setMetamaskAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Farcaster SDK
    sdk.actions.ready();

    // Check for MetaMask
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) setMetamaskAddress(accounts[0]);
        })
        .catch(console.error);
    }
  }, []);

  // Fetch User
  const fetchUser = async (currentFid: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/wallets/${currentFid}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUser(fid);
  }, [fid]);

  // Sync Handler
  const handleSync = async () => {
    setLoadingSync(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sync/${fid}`, { method: 'POST' });
      if (res.ok) {
        await fetchUser(fid);
      } else {
        alert("Sync failed. Ensure server is running and configured.");
      }
    } catch (e) {
      console.error(e);
      alert("Sync error");
    } finally {
      setLoadingSync(false);
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
        <div className="text-gray-300 text-center mb-6">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <main className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden max-w-md mx-auto shadow-2xl border-x border-slate-800">
      {/* Header */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-10">
        <h1 className="font-bold text-lg text-blue-500 tracking-tight">ForgeZora</h1>
      </header>
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "launch" && <LaunchTab />}
        {activeTab === 'shop' && <ShopTab />}
        {activeTab === 'profile' && <ProfileTab user={user} fid={fid} onSync={handleSync} loadingSync={loadingSync} metamaskAddress={metamaskAddress} />}
        {activeTab === 'more' && <MoreTab />}
      </div>
      
      {/* Bottom Navigation */}
      <nav className="bg-slate-900 border-t border-slate-800 flex justify-around items-center p-2 pb-6 safe-area-pb">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "home" ? "text-purple-500" : "text-gray-500"
          }`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-xs">Home</span>
        </button>
        <button
          onClick={() => setActiveTab("launch")}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "launch" ? "text-purple-500" : "text-gray-500"
          }`}
        >
          <span className="text-xl">🚀</span>
          <span className="text-xs">Launch</span>
        </button>
        <button
          onClick={() => setActiveTab("shop")}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "shop" ? "text-purple-500" : "text-gray-500"
          }`}
        >
          <span className="text-xl">🛒</span>
          <span className="text-xs">Shop</span>
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "profile" ? "text-purple-500" : "text-gray-500"
          }`}
        >
          <span className="text-xl">👤</span>
          <span className="text-xs">Profile</span>
        </button>
        <button
          onClick={() => setActiveTab("more")}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "more" ? "text-purple-500" : "text-gray-500"
          }`}
        >
          <span className="text-xl">⋯</span>
          <span className="text-xs">More</span>
        </button>
      </nav>
    </main>
  );
}