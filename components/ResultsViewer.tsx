import React from 'react';
import { ExecutionResults } from '../types';
import { FileText, MessageSquare, AlertTriangle, GitCommit, User, Mail } from 'lucide-react';

interface ResultsViewerProps {
  results: ExecutionResults;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ results }) => {
  return (
    <div className="space-y-6">
      
      {/* Simulation Summary Card */}
      <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-lg shadow-black/40">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-1 bg-red-600 rounded-full shadow-[0_0_8px_rgba(201,42,42,0.8)]"></span> Detected Context
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 flex items-start gap-3 backdrop-blur-sm">
             <div className="bg-red-500/10 p-1.5 rounded-lg text-red-400">
                <AlertTriangle size={16} />
             </div>
             <div>
               <div className="text-xs text-red-300/80 font-medium mb-0.5">Priority Bug</div>
               <div className="text-sm text-zinc-200 font-medium">{results.bugSummary}</div>
             </div>
          </div>
          <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 backdrop-blur-sm">
             <div className="bg-white/5 p-1.5 rounded-lg text-zinc-400">
                <GitCommit size={16} />
             </div>
             <div>
               <div className="text-xs text-zinc-500 font-medium mb-0.5">Affected Component</div>
               <div className="text-sm text-zinc-300 font-mono">{results.detectedComponent}</div>
             </div>
          </div>
          <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 backdrop-blur-sm">
             <div className="bg-white/5 p-1.5 rounded-lg text-zinc-400">
                <GitCommit size={16} />
             </div>
             <div>
               <div className="text-xs text-zinc-500 font-medium mb-0.5">Last Commit</div>
               <div className="text-sm text-zinc-300 font-mono">{results.commitHash.substring(0, 8)}...</div>
             </div>
          </div>
          <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5 flex items-center gap-3 backdrop-blur-sm">
             <div className="bg-white/5 p-1.5 rounded-lg text-zinc-400">
                <User size={16} />
             </div>
             <div>
               <div className="text-xs text-zinc-500 font-medium mb-0.5">Developer</div>
               <div className="text-sm text-zinc-300">{results.developerName}</div>
             </div>
          </div>
        </div>
      </div>

      {/* Simulated Google Doc */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-zinc-800 opacity-95">
        <div className="bg-black px-4 py-3 flex items-center gap-3 border-b border-zinc-800">
          <FileText className="text-red-600 w-4 h-4" />
          <div className="text-zinc-200 font-medium text-sm">Google Docs Simulation</div>
          <div className="ml-auto text-red-600 text-[10px] bg-red-950/30 px-2 py-0.5 rounded-full border border-red-950/50">
            {results.docEntryId}
          </div>
        </div>
        <div className="p-8 bg-zinc-50 min-h-[160px]">
          <div className="max-w-2xl mx-auto p-6 bg-white border border-zinc-200 shadow-sm">
            <h1 className="text-xl font-bold text-black mb-3">Release Notes: Hotfix v2.4.1</h1>
            <div className="prose prose-sm prose-zinc text-zinc-600 whitespace-pre-line leading-relaxed">
              {results.docContent}
            </div>
          </div>
        </div>
      </div>

      {/* Gmail Simulation */}
      {results.gmailBody && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-zinc-800 opacity-95">
          <div className="bg-black px-4 py-3 flex items-center gap-3 border-b border-zinc-800">
            <Mail className="text-red-500 w-4 h-4" />
            <div className="text-zinc-200 font-medium text-sm">Gmail Simulation</div>
            <div className="ml-auto text-zinc-500 text-[10px] font-mono">
              Sent
            </div>
          </div>
          <div className="p-6 bg-white text-zinc-800">
            <div className="mb-4 border-b border-zinc-100 pb-4 space-y-1">
              <div className="flex gap-2 text-sm">
                <span className="text-zinc-500 w-12">To:</span>
                <span className="font-medium bg-zinc-100 px-1.5 rounded text-zinc-700">{results.gmailRecipient}</span>
              </div>
              <div className="flex gap-2 text-sm">
                 <span className="text-zinc-500 w-12">Subject:</span>
                 <span className="font-medium">{results.gmailSubject}</span>
              </div>
            </div>
            <div className="prose prose-sm prose-zinc text-zinc-700 whitespace-pre-line leading-relaxed">
              {results.gmailBody}
            </div>
          </div>
        </div>
      )}

      {/* Simulated Slack Message */}
      <div className="bg-zinc-900/95 backdrop-blur rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
        <div className="bg-black px-4 py-3 flex items-center gap-3 border-b border-zinc-800">
          <MessageSquare className="text-white w-4 h-4" />
          <div className="text-white font-medium text-sm">Slack Simulation</div>
          <div className="ml-auto text-zinc-500 text-[10px] font-mono">
            {results.slackChannel}
          </div>
        </div>
        <div className="p-5 bg-zinc-900">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded bg-red-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
              CP
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-zinc-200 text-sm">Konnect-Ai Agent</span>
                <span className="text-[10px] text-zinc-500">APP 2:45 PM</span>
              </div>
              <div className="mt-1 text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
                {results.slackMessage}
              </div>
              <div className="mt-3 border-l-2 border-zinc-700 pl-3 py-1">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-950/20 flex items-center justify-center">
                        <FileText size={10} className="text-red-600"/>
                    </div>
                    <div className="text-xs font-medium text-red-600 hover:underline cursor-pointer">
                    Release Notes ({results.docEntryId})
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};