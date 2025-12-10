import React, { useState, useEffect } from 'react';
import { ApiConfig } from '../types';
import { Settings, Save, X, Key, Github, Slack, Trello, Cloud, LogOut, Loader2, Mail, Calendar, Database, Figma, Shield, BookOpen, Youtube } from 'lucide-react';
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
              <Settings className="w-5 h-5 text-red-500" />
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
                 <Cloud className="w-4 h-4 text-red-500" /> 
                 Sync Everywhere
               </h3>
               {isSyncing && <Loader2 className="w-3 h-3 text-red-500 animate-spin" />}
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
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-xs">
                        {user.displayName?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate">{user.displayName}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
                    </div>
                    <button onClick={onSignOut} className="text-zinc-500 hover:text-red-400 p-2" title="Sign Out">
                      <LogOut size={16} />
                    </button>
                 </div>
                 <div className="flex items-center gap-2 text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                    <Cloud size={10} />
                    <span>Configuration synced with Cloud Firestore</span>
                 </div>
               </div>
             )}
          </div>

          <div className="space-y-8">
            
            {/* Advanced Integrations Section */}
            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 pb-2 border-b border-white/5">
                 <Shield className="w-4 h-4" /> Advanced Integrations
               </h3>
               
               {/* Confluence */}
               <div className="p-3 bg-zinc-900/30 rounded-lg border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                    <BookOpen size={12}/> Atlassian Confluence
                  </div>
                  <div className="space-y-1">
                    <input
                      type="text"
                      name="confluenceDomain"
                      placeholder="https://company.atlassian.net"
                      value={localConfig.confluenceDomain || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-md text-xs text-zinc-200 outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <input
                      type="email"
                      name="confluenceEmail"
                      placeholder="User Email"
                      value={localConfig.confluenceEmail || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-md text-xs text-zinc-200 outline-none focus:border-red-500"
                    />
                    <input
                      type="password"
                      name="confluenceToken"
                      placeholder="API Token"
                      value={localConfig.confluenceToken || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-md text-xs text-zinc-200 outline-none focus:border-red-500"
                    />
                  </div>
               </div>

               <div className="space-y-1">
                 <label className="text-xs font-medium text-zinc-500 flex items-center gap-2"><Youtube size={12}/> YouTube Data API Key</label>
                 <input
                   type="password"
                   name="youtubeApiKey"
                   placeholder="AIzaSy..."
                   value={localConfig.youtubeApiKey || ''}
                   onChange={handleChange}
                   className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-xs font-medium text-zinc-500 flex items-center gap-2"><Calendar size={12}/> Calendar ID</label>
                 <input
                   type="text"
                   name="calendarId"
                   placeholder="primary"
                   value={localConfig.calendarId || ''}
                   onChange={handleChange}
                   className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-medium text-zinc-500 flex items-center gap-2"><Figma size={12}/> Figma Token</label>
                 <input
                   type="password"
                   name="figmaToken"
                   placeholder="figd_..."
                   value={localConfig.figmaToken || ''}
                   onChange={handleChange}
                   className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-medium text-zinc-500 flex items-center gap-2"><Shield size={12}/> Sentry DSN</label>
                 <input
                   type="text"
                   name="sentryDsn"
                   placeholder="https://...@sentry.io/..."
                   value={localConfig.sentryDsn || ''}
                   onChange={handleChange}
                   className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-medium text-zinc-500 flex items-center gap-2"><Database size={12}/> DB Connection String</label>
                 <input
                   type="password"
                   name="dbConnectionString"
                   placeholder="postgres://user:pass@localhost:5432/db"
                   value={localConfig.dbConnectionString || ''}
                   onChange={handleChange}
                   className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                 />
               </div>
            </div>

            {/* Existing Integrations (Collapsed for brevity visually, but fully present in code) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 pb-2 border-b border-white/5">
                <Github className="w-4 h-4" /> Core Tools (GitHub, Jira, Slack)
              </h3>
              {/* GitHub */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">GH Owner</label>
                  <input
                    type="text"
                    name="githubOwner"
                    value={localConfig.githubOwner}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">GH Repo</label>
                  <input
                    type="text"
                    name="githubRepo"
                    value={localConfig.githubRepo}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">GH Token</label>
                <input
                  type="password"
                  name="githubToken"
                  value={localConfig.githubToken}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                />
              </div>

              {/* Slack & Jira & Gmail simplified for space in this update, assuming standard structure */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Slack Webhook</label>
                <input
                  type="password"
                  name="slackWebhook"
                  value={localConfig.slackWebhook}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-500">Gmail Address</label>
                <input
                  type="email"
                  name="gmailAddress"
                  value={localConfig.gmailAddress}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                />
              </div>
              
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Jira Email</label>
                  <input
                    type="email"
                    name="jiraEmail"
                    value={localConfig.jiraEmail}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Jira Domain</label>
                  <input
                    type="text"
                    name="jiraDomain"
                    value={localConfig.jiraDomain}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                  />
                </div>
              </div>
               <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">Jira Token</label>
                  <input
                    type="password"
                    name="jiraToken"
                    value={localConfig.jiraToken}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-md text-sm text-zinc-200 outline-none focus:border-red-500"
                  />
                </div>
            </div>

          </div>

          <div className="mt-12">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
            >
              <Save className="w-4 h-4" />
              {user ? 'Save to Cloud' : 'Save Locally'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};