import React, { useEffect, useState } from 'react';
import { Trophy, DollarSign, Activity } from 'lucide-react';

export default function EconomyDashboard() {
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopEconomy = async () => {
      try {
        const res = await fetch('/api/economy/top');
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch economy data');
        }
        const data = await res.json();
        setTopPlayers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTopEconomy();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Trophy className="text-yellow-500" size={24} />
          Top 10 Richest Players
        </h3>

        {loading ? (
          <div className="flex justify-center py-12">
            <Activity className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mb-6 text-sm">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {topPlayers.map((player, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                    idx === 1 ? 'bg-gray-400/20 text-gray-400' :
                    idx === 2 ? 'bg-amber-700/20 text-amber-700' :
                    'bg-white/5 text-zinc-500'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{player.Username}</h4>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-lg">
                  <DollarSign size={20} />
                  {player.Wealth?.toLocaleString() || 0}
                </div>
              </div>
            ))}
            {topPlayers.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No economy data found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
