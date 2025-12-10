import React from 'react';
import { OrchestrationStep, SystemType } from '../types';
import { CheckCircle2, GitBranch, FileText, MessageSquare, Search, LayoutDashboard, Circle, Loader2, Mail } from 'lucide-react';

interface PlanViewerProps {
  steps: OrchestrationStep[];
}

const getSystemIcon = (system: SystemType) => {
  // Monochromatic icons for cleanliness, let the status indicators provide color
  switch (system) {
    case SystemType.JIRA: return <LayoutDashboard className="w-4 h-4 text-zinc-300" />;
    case SystemType.GITHUB: return <GitBranch className="w-4 h-4 text-zinc-300" />;
    case SystemType.DOCS: return <FileText className="w-4 h-4 text-zinc-300" />;
    case SystemType.SLACK: return <MessageSquare className="w-4 h-4 text-zinc-300" />;
    case SystemType.GMAIL: return <Mail className="w-4 h-4 text-zinc-300" />;
    case SystemType.ANALYSIS: return <Search className="w-4 h-4 text-red-600" />;
    default: return <Search className="w-4 h-4 text-zinc-500" />;
  }
};

const getStatusIcon = (status: 'pending' | 'processing' | 'complete') => {
  switch (status) {
    case 'complete':
      return (
        <div className="w-6 h-6 rounded-full bg-red-600/20 border border-red-600/50 flex items-center justify-center z-10 shadow-[0_0_10px_rgba(201,42,42,0.2)] backdrop-blur-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
        </div>
      );
    case 'processing':
      return (
        <div className="w-6 h-6 rounded-full bg-white/10 border border-white/30 flex items-center justify-center z-10 animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.1)] backdrop-blur-sm">
          <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
        </div>
      );
    case 'pending':
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center z-10">
          <Circle className="w-3.5 h-3.5 text-zinc-700" />
        </div>
      );
  }
};

export const PlanViewer: React.FC<PlanViewerProps> = ({ steps }) => {
  return (
    <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-xl shadow-black/40">
      <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Orchestration Plan</h2>
        <span className="text-[10px] font-bold uppercase text-zinc-400 bg-black/40 px-2 py-0.5 rounded border border-white/5">
          {steps.filter(s => s.status === 'complete').length} / {steps.length}
        </span>
      </div>
      <div className="p-6">
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-[1px] bg-zinc-800" />

          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.stepNumber} className={`relative flex items-start group transition-all duration-500 ${step.status === 'pending' ? 'opacity-30' : 'opacity-100'}`}>
                {/* Step Circle */}
                <div className="absolute left-0 w-6 flex justify-center">
                  {getStatusIcon(step.status)}
                </div>

                {/* Content */}
                <div className="ml-10 w-full pt-0.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-zinc-300 border border-white/5 flex items-center gap-1.5 backdrop-blur-md">
                      {getSystemIcon(step.system)}
                      {step.system}
                    </span>
                    {step.status === 'processing' && <span className="text-[10px] text-white animate-pulse font-medium">Processing...</span>}
                  </div>
                  <h3 className={`text-sm font-medium ${step.status === 'complete' ? 'text-white' : 'text-zinc-400'}`}>
                    {step.action}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 pl-2 border-l border-zinc-800">
                    {step.dataFlow}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};