import React, { useState, useEffect } from 'react';
import { ApiConfig } from '../types';
import { Settings, Save, X, Key, Github, Slack, Trello, Cloud, LogOut, Loader2, Mail } from 'lucide-react';
import { User } from 'firebase/auth';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ 
  isOpen, 
  onClose, 
  config, 
  onSave,
  user,
  onSignIn,
  onSignOut,
  isSyncing
}) => {
  const [localConfig, setLocalConfig] = useState<ApiConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-black/90 backdrop-blur-2xl border-l border-white/10 h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="p-6">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-red-600" />
              Settings
            </h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Cloud Sync Section */}
          <div className="mb-8 bg-zinc-900/40 rounded-xl p-4 border border-white/5">
             <div className="flex items-center justify-between mb-3">
               <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                 <Cloud className="w-4 h-4 text-red-600" /> 
                 Sync Everywhere
               </h3>
               {isSyncing && <Loader2 className="w-3 h-3 text-red-600 animate-spin" />}
             </div>
             
             {!user ? (
               <div className="space-y-3">
                 <p className="text-xs text-zinc-500">
                   Sign in to sync your API keys across your Laptop and Mobile devices automatically.
                 </p>
                 <button 
                   onClick={onSignIn}
                   className="w-full bg-white text-black hover:bg-zinc-200 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                 >
                   <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                   Sign in with Google
                 </button>
               </div>
             ) : (
               <div className="space-y-3">
                 <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-bold text-xs">
                        {user.displayName?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{user.displayName}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
                    </div>
                    <button onClick={onSignOut} className="text-zinc-500 hover:text-red-600 p-2" title="Sign Out">
                      <LogOut size={16} />
                    </button>
                 </div>
                 <div className="flex items-center gap-2 text-[10px] text-red-500 bg-red-600/10 px-2 py-1 rounded border border-red-600/20">
                    <Cloud size={10} />
                    <span>Configuration synced with Cloud Firestore</span>
                 </div>
               </div>
             )}
          </div>

          <div className="space-y-8">
            {/* Gmail Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 pb-2 border-b border-white/5">
                <Mail className="w-4 h-4" /> Gmail Configuration
              </h3>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Sender Address</label>
                <input
                  type="email"
                  name="gmailAddress"
                  placeholder="agent@company.com"
                  value={localConfig.gmailAddress}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none placeholder:text-zinc-700"
                />
                <p className="text-[10px] text-zinc-600">Simulates the 'From' address for drafted emails.</p>
              </div>
            </div>

            {/* GitHub Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 pb-2 border-b border-white/5">
                <Github className="w-4 h-4" /> GitHub Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Owner</label>
                  <input
                    type="text"
                    name="githubOwner"
                    placeholder="e.g. facebook"
                    value={localConfig.githubOwner}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none placeholder:text-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Repo</label>
                  <input
                    type="text"
                    name="githubRepo"
                    placeholder="e.g. react"
                    value={localConfig.githubRepo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none placeholder:text-zinc-700"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Personal Access Token</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-2.5 text-zinc-600" />
                  <input
                    type="password"
                    name="githubToken"
                    placeholder="ghp_..."
                    value={localConfig.githubToken}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none placeholder:text-zinc-700"
                  />
                </div>
                <p className="text-[10px] text-zinc-600">Used to fetch real commit data.</p>
              </div>
            </div>

            {/* Slack Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 pb-2 border-b border-white/5">
                <Slack className="w-4 h-4" /> Slack Configuration
              </h3>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Webhook URL</label>
                <input
                  type="password"
                  name="slackWebhook"
                  placeholder="https://hooks.slack.com/services/..."
                  value={localConfig.slackWebhook}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none placeholder:text-zinc-700"
                />
                <p className="text-[10px] text-zinc-600">Used to post the drafted announcement message.</p>
              </div>
            </div>

            {/* Jira Section */}
            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 pb-2 border-b border-white/5">
                <Trello className="w-4 h-4" /> Jira Configuration
              </h3>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Domain URL</label>
                <input
                  type="text"
                  name="jiraDomain"
                  placeholder="https://company.atlassian.net"
                  value={localConfig.jiraDomain}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none placeholder:text-zinc-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Email</label>
                  <input
                    type="email"
                    name="jiraEmail"
                    placeholder="me@company.com"
                    value={localConfig.jiraEmail}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none placeholder:text-zinc-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Project Key</label>
                  <input
                    type="text"
                    name="jiraProjectKey"
                    placeholder="e.g. PROJ"
                    value={localConfig.jiraProjectKey}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none placeholder:text-zinc-700"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">API Token</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-2.5 text-zinc-600" />
                  <input
                    type="password"
                    name="jiraToken"
                    placeholder="Atlassian API Token"
                    value={localConfig.jiraToken}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none placeholder:text-zinc-700"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="mt-12">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black py-3 rounded-xl font-bold transition-colors shadow-lg shadow-cyan-500/20"
            >
              <Save className="w-4 h-4" />
              {user ? 'Save to Cloud' : 'Save Locally'}
            </button>
            <p className="text-center mt-4 text-xs text-zinc-600">
              {user ? 'Keys are encrypted in Firestore.' : 'Keys are stored locally in your browser.'}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};