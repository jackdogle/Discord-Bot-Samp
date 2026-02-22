import React, { useState, useEffect } from 'react';
import { Save, MessageSquare, Shield, Activity, CheckCircle2 } from 'lucide-react';

export default function BotSettings() {
  const [settings, setSettings] = useState({
    token: '',
    clientId: '',
    guildId: '',
    statusChannel: '',
    adminRole: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/bot/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch bot settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch('/api/bot/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Bot settings saved successfully. Restart required to apply changes.' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Activity className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0D0D0E] border border-white/5 rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
            <MessageSquare className="text-indigo-500 w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Discord Bot Configuration</h3>
            <p className="text-zinc-500 text-sm">Manage your SA-MP Discord integration settings.</p>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 text-sm ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            {message.type === 'success' && <CheckCircle2 size={18} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Bot Token</label>
              <input
                type="password"
                name="token"
                value={settings.token}
                onChange={handleChange}
                placeholder="••••••••••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-xs text-zinc-600">Keep this secret. Used to authenticate your bot.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Client ID (Application ID)</label>
              <input
                type="text"
                name="clientId"
                value={settings.clientId}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Guild ID (Server ID)</label>
              <input
                type="text"
                name="guildId"
                value={settings.guildId}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-xs text-zinc-600">The ID of your Discord server for slash commands.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Status Channel ID</label>
              <input
                type="text"
                name="statusChannel"
                value={settings.statusChannel}
                onChange={handleChange}
                placeholder="e.g. 123456789012345678"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-xs text-zinc-600">Channel where live server status will be posted.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Admin Role ID</label>
              <input
                type="text"
                name="adminRole"
                value={settings.adminRole}
                onChange={handleChange}
                placeholder="e.g. 987654321098765432"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-xs text-zinc-600">Role required to use admin bot commands.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {saving ? <Activity className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
