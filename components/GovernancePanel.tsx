import React from 'react';
import { GovernanceCheck } from '../types';
import { ShieldCheck, ShieldAlert, Activity, CheckCircle, Search } from 'lucide-react';

interface GovernancePanelProps {
  governance: GovernanceCheck;
}

export const GovernancePanel: React.FC<GovernancePanelProps> = ({ governance }) => {
  const isPassed = governance.policyStatus === 'passed';
  const isModified = governance.policyStatus === 'modified';

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-lg shadow-black/20">
      <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          {isModified ? (
             <ShieldAlert className="w-4 h-4 text-amber-400" />
          ) : (
             <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          Governance & Policy Audit
        </h2>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
            isModified 
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}>
          {governance.policyStatus === 'modified' ? 'Action Taken' : 'Verified'}
        </span>
      </div>
      
      <div className="p-5 space-y-4">
        
        {/* Critique Section */}
        <div className="flex gap-4">
           <div className="mt-1">
             <Activity className="w-4 h-4 text-blue-600" />
           </div>
           <div>
             <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Self-Critique</h4>
             <p className="text-sm text-zinc-200 leading-relaxed">
               {governance.critique}
             </p>
           </div>
        </div>

        {/* XAI Trace Section */}
        <div className="bg-white/5 rounded-lg p-3 border border-white/5">
           <div className="flex gap-3">
              <div className="mt-0.5">
                <Search className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-mono font-bold text-zinc-500 mb-1 flex items-center gap-2">
                  XAI TRACE LOG
                </h4>
                <p className="text-xs font-mono text-zinc-300">
                  {governance.xaiTrace}
                </p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};