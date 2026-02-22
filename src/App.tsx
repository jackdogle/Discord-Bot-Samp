import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Shield, 
  Server, 
  MessageSquare, 
  Search, 
  RefreshCw,
  Clock,
  Database,
  Terminal
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface ServerStatus {
  hostname: string;
  gamemode: string;
  mapname: string;
  online: number;
  maxplayers: number;
  rules?: Record<string, string>;
}

interface DBStats {
  totalPlayers: number;
  totalAdmins: number;
  isMock?: boolean;
  message?: string;
}

export default function App() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [stats, setStats] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [view, setView] = useState<'overview' | 'admin'>('overview');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch('/api/server-status').catch(() => null),
        fetch('/api/stats').catch(() => null)
      ]);
      
      if (statusRes && statusRes.ok) {
        const contentType = statusRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          setStatus(await statusRes.json());
        } else {
          console.warn('Server status returned non-JSON response');
          setStatus(null);
        }
      } else {
        setStatus(null);
      }

      if (statsRes && (statsRes.ok || statsRes.status === 503)) {
        const contentType = statsRes.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          setStats(await statsRes.json());
        } else {
          console.warn('Stats returned non-JSON response');
          setStats(null);
        }
      } else {
        setStats(null);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const mockHistory = [
    { time: '10:00', players: 45 },
    { time: '11:00', players: 52 },
    { time: '12:00', players: 68 },
    { time: '13:00', players: 75 },
    { time: '14:00', players: 62 },
    { time: '15:00', players: 58 },
    { time: '16:00', players: 85 },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-white/5 bg-[#0D0D0E] p-6 hidden lg:block">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">NEXUS</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">SA-MP Core</p>
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem 
            icon={<Activity size={18} />} 
            label="Overview" 
            active={view === 'overview'} 
            onClick={() => setView('overview')}
          />
          <NavItem icon={<Users size={18} />} label="Players" />
          <NavItem icon={<Database size={18} />} label="Database" />
          <NavItem icon={<MessageSquare size={18} />} label="Discord Bot" />
          <NavItem 
            icon={<Shield size={18} />} 
            label="Admin Panel" 
            active={view === 'admin'}
            onClick={() => setView('admin')}
          />
          <NavItem icon={<Terminal size={18} />} label="Live Logs" />
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-400">Bot Online</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Nexus Bot is currently monitoring 1 server instance.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 p-8">
        {view === 'overview' ? (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-1">Server Dashboard</h2>
                <p className="text-zinc-500 text-sm">Real-time monitoring and management for your SA-MP community.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setView('admin')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-xs font-medium transition-all"
                >
                  <Shield size={14} className="text-emerald-500" />
                  Admin Panel
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-xs text-zinc-400">
                  <Clock size={14} />
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
                <button 
                  onClick={fetchData}
                  disabled={loading}
                  className="p-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all disabled:opacity-50"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </header>

            {/* Database Warning */}
            {stats?.isMock && (
              <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 text-amber-500">
                <Database className="shrink-0" size={20} />
                <div className="text-sm">
                  <p className="font-bold">Database Connection Failed</p>
                  <p className="opacity-80">{stats.message || 'Please check your MySQL credentials in the environment variables.'}</p>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <StatCard 
                icon={<Users className="text-blue-400" />} 
                label="Online Players" 
                value={status ? `${status.online} / ${status.maxplayers}` : '0 / 0'} 
                subValue="Live query"
              />
              <StatCard 
                icon={<Database className="text-emerald-400" />} 
                label="Total Accounts" 
                value={stats?.totalPlayers.toLocaleString() || '0'} 
                subValue="From MySQL"
              />
              <StatCard 
                icon={<Shield className="text-purple-400" />} 
                label="Staff Members" 
                value={stats?.totalAdmins.toLocaleString() || '0'} 
                subValue="Active admins"
              />
              <StatCard 
                icon={<Server className="text-orange-400" />} 
                label="Server Status" 
                value={status ? 'Online' : 'Offline'} 
                subValue={status?.gamemode || 'N/A'}
                statusColor={status ? 'bg-emerald-500' : 'bg-red-500'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chart Section */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-lg">Player Activity</h3>
                    <select className="bg-white/5 border border-white/10 rounded-lg text-xs px-3 py-1.5 outline-none">
                      <option>Last 24 Hours</option>
                      <option>Last 7 Days</option>
                    </select>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockHistory}>
                        <defs>
                          <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#71717a" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#71717a" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(val) => `${val}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="players" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorPlayers)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-6">
                  <h3 className="font-bold text-lg mb-6">Server Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoRow label="Hostname" value={status?.hostname || 'Connecting...'} />
                    <InfoRow label="Gamemode" value={status?.gamemode || 'N/A'} />
                    <InfoRow label="Map" value={status?.mapname || 'N/A'} />
                    <InfoRow label="Version" value={status?.rules?.version || '0.3.7'} />
                    <InfoRow label="Weather" value={status?.rules?.weather || 'Sunny'} />
                    <InfoRow label="Time" value={status?.rules?.worldtime || '12:00'} />
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-8">
                <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">Discord Integration</h3>
                    <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded uppercase tracking-wider">Active</div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <MessageSquare className="text-indigo-400 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Slash Commands</p>
                        <p className="text-xs text-zinc-500">/status, /players, /lookup</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Shield className="text-orange-400 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Admin Sync</p>
                        <p className="text-xs text-zinc-500">LRP Admin Level Verification</p>
                      </div>
                    </div>
                  </div>
                  <button className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-medium transition-all">
                    Configure Bot Settings
                  </button>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-black">
                  <h3 className="font-bold text-lg mb-2">Need help?</h3>
                  <p className="text-sm opacity-80 mb-6 leading-relaxed">
                    Check our documentation for advanced bot configuration and MySQL optimization.
                  </p>
                  <button className="w-full py-3 bg-black text-white rounded-2xl text-sm font-medium hover:bg-zinc-900 transition-all">
                    Read Documentation
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <header className="flex items-center justify-between mb-10">
              <div>
                <button 
                  onClick={() => setView('overview')}
                  className="text-emerald-500 text-sm font-medium mb-2 hover:underline flex items-center gap-1"
                >
                  ← Back to Dashboard
                </button>
                <h2 className="text-3xl font-bold tracking-tight">Admin Control Panel</h2>
                <p className="text-zinc-500 text-sm">Manage your SA-MP server and players directly from the web.</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="text-emerald-500 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Player Management</h3>
                <p className="text-zinc-500 text-sm mb-6">Ban, kick, or edit player stats directly from the database.</p>
                <button className="w-full py-3 bg-emerald-500 text-black rounded-2xl font-bold hover:bg-emerald-400 transition-all">
                  Open Player List
                </button>
              </div>

              <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Server className="text-blue-500 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Server Configuration</h3>
                <p className="text-zinc-500 text-sm mb-6">Modify server rules, weather, and world time settings.</p>
                <button className="w-full py-3 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-400 transition-all">
                  Edit Config
                </button>
              </div>

              <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center md:col-span-2">
                <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <Terminal className="text-purple-500 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">Live Console</h3>
                <p className="text-zinc-500 text-sm mb-6">View live server logs and execute commands remotely.</p>
                <div className="w-full bg-black rounded-2xl p-4 font-mono text-xs text-zinc-400 text-left mb-6 h-32 overflow-y-auto border border-white/5">
                  <p>[12:45:01] Server started on port 7003</p>
                  <p>[12:45:05] Loading gamemode: LRP-v2.5</p>
                  <p>[12:46:12] Player [ID: 0] Nexus_Admin connected</p>
                  <p className="animate-pulse">_</p>
                </div>
                <button className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all">
                  Connect to Console
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active 
          ? 'bg-emerald-500/10 text-emerald-500' 
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, subValue, statusColor }: { icon: React.ReactNode, label: string, value: string, subValue: string, statusColor?: string }) {
  return (
    <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {statusColor && <div className={`w-2 h-2 rounded-full ${statusColor}`} />}
      </div>
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      <h4 className="text-2xl font-bold tracking-tight mb-1">{value}</h4>
      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">{subValue}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-300">{value}</span>
    </div>
  );
}
