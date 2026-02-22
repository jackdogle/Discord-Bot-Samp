import React, { useState } from 'react';
import { Search, Shield, User, DollarSign, Activity } from 'lucide-react';

export default function PlayerManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length < 3) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to search players');
      }
      const data = await res.json();
      setPlayers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Search className="text-emerald-500" size={24} />
          Player Search
        </h3>
        <form onSubmit={handleSearch} className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by username (min 3 chars)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || searchQuery.length < 3}
            className="bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {players.map((player, idx) => (
            <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <User className="text-emerald-500" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{player.Username || player.Name || 'Unknown'}</h4>
                  <div className="flex gap-3 text-xs text-zinc-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Activity size={12} /> Level: {player.Level || player.pLevel || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} /> Money: ${player.Money || player.pCash || player.Cash || 0}
                    </span>
                    {(player.AdminLevel > 0 || player.Admin > 0 || player.pAdmin > 0) && (
                      <span className="flex items-center gap-1 text-purple-400">
                        <Shield size={12} /> Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button className="flex-1 md:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors">
                  View Full Profile
                </button>
                <button className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-sm font-medium transition-colors">
                  Edit Stats
                </button>
              </div>
            </div>
          ))}
          {players.length === 0 && !loading && searchQuery.length >= 3 && !error && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No players found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
