import React from 'react';
import { ExecutionResults } from '../types';
import { FileText, MessageSquare, AlertTriangle, GitCommit, User, Mail, Mic, Calendar, Database, Eye, ShieldAlert, BookOpen, ExternalLink, Activity, Youtube, Play } from 'lucide-react';

interface ResultsViewerProps {
  results: ExecutionResults;
  transcription?: string;
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ results, transcription }) => {
  return (
    <div className="space-y-6">
      
      {/* Transcription Card */}
      {transcription && (
        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-white/5 p-4 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white/5 p-2 rounded-full border border-white/10">
               <Mic className="w-4 h-4 text-red-500" />
            </div>
            <div>
               <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Voice Command</h4>
               <p className="text-zinc-200 text-sm italic">"{transcription}"</p>
            </div>
        </div>
      )}

      {/* War Room / Calendar Card */}
      {results.calendarEvent && (
        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-red-500/20 p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-red-500/10 p-3 rounded-xl text-red-500">
               <Calendar size={20} />
            </div>
            <div className="flex-1">
               <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">War Room Scheduled</h4>
                    <p className="text-xs text-zinc-400">{results.calendarEvent.startTime}</p>
                  </div>
                  <a href={results.calendarEvent.meetLink} target="_blank" rel="noreferrer" className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full transition-colors font-medium border border-red-500/10">
                    Join Meet
                  </a>
               </div>
               <div className="mt-2 text-xs text-zinc-400 flex gap-2">
                  <span className="font-semibold text-zinc-500">Attendees:</span>
                  {results.calendarEvent.attendees.map(a => a.split('@')[0]).join(', ')}
               </div>
            </div>
        </div>
      )}

      {/* YouTube Solutions Card */}
      {results.youtubeResults && results.youtubeResults.videos && results.youtubeResults.videos.length > 0 && (
         <div className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-4 animate-in fade-in slide-in-from-bottom-2">
             <div className="flex items-center gap-2 mb-3">
               <Youtube className="w-4 h-4 text-red-500" />
               <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Suggested Solutions</h4>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.youtubeResults.videos.map((video) => (
                   <a 
                     key={video.id} 
                     href={`https://www.youtube.com/watch?v=${video.id}`} 
                     target="_blank" 
                     rel="noreferrer"
                     className="group block bg-black/40 rounded-xl overflow-hidden border border-white/5 hover:border-red-500/30 transition-all"
                   >
                      <div className="relative aspect-video">
                         <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/60 rounded-full p-2 backdrop-blur-sm group-hover:bg-red-600/80 transition-colors">
                               <Play size={12} className="text-white fill-white" />
                            </div>
                         </div>
                      </div>
                      <div className="p-2">
                         <h5 className="text-xs font-bold text-zinc-200 line-clamp-1 group-hover:text-red-400 transition-colors">{video.title}</h5>
                         <p className="text-[10px] text-zinc-500">{video.channel}</p>
                      </div>
                   </a>
                ))}
             </div>
         </div>
      )}

      {/* Sentry Analysis Card */}
      {results.sentryAnalysis && (
        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-0 overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <Activity size={14} className="text-red-400" />
                  <span className="text-xs font-bold text-red-400">SENTRY DEBUGGER</span>
               </div>
               <span className="text-[10px] text-zinc-400 font-mono">{results.sentryAnalysis.fileLocation}</span>
            </div>
            <div className="p-4 space-y-3">
               <div>
                  <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Root Cause Analysis</div>
                  <p className="text-sm text-zinc-200">{results.sentryAnalysis.rootCause}</p>
               </div>
               <div className="bg-black/50 p-3 rounded border border-white/5 font-mono text-xs text-red-300 overflow-x-auto">
                  {results.sentryAnalysis.stackTraceSnippet}
               </div>
            </div>
        </div>
      )}

      {/* Visual QA / Figma Card */}
      {results.figmaComparison && (
        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 mb-3">
               <div className="bg-black p-1.5 rounded-lg border border-white/10">
                  <Eye size={16} className="text-white" />
               </div>
               <h4 className="text-sm font-bold text-zinc-200">Visual QA Check</h4>
               <div className={`ml-auto text-xs font-bold px-2 py-0.5 rounded ${results.figmaComparison.driftScore > 10 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'}`}>
                  {results.figmaComparison.driftScore}% Drift
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
               <div className="h-24 bg-zinc-800 rounded flex items-center justify-center border border-white/5 text-xs text-zinc-600">
                  Implementation
               </div>
               <div className="h-24 bg-zinc-800 rounded flex items-center justify-center border border-red-500/20 text-xs text-red-900/50 font-bold">
                  Figma Design
               </div>
            </div>
            <p className="text-xs text-zinc-400 border-l-2 border-red-500/50 pl-3">
               {results.figmaComparison.critique}
            </p>
        </div>
      )}

      {/* SQL Safe Mode Card */}
      {results.sqlQuery && (
        <div className="bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center gap-2">
               <Database size={14} className="text-red-500" />
               <span className="text-xs font-bold text-zinc-300">SAFE SQL MODE</span>
               {results.sqlQuery.isSafe ? (
                 <span className="ml-auto text-[10px] bg-white/10 text-white px-2 py-0.5 rounded border border-white/10">READ ONLY</span>
               ) : (
                 <span className="ml-auto text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/20">BLOCKED</span>
               )}
            </div>
            <div className="p-4 bg-black/40">
               <code className="text-sm font-mono text-zinc-300 block mb-3">
                  {results.sqlQuery.query}
               </code>
               <p className="text-xs text-zinc-500">{results.sqlQuery.explanation}</p>
            </div>
        </div>
      )}
      
      {/* RAG Context Card */}
      {results.ragContext && results.ragContext.length > 0 && (
         <div className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-white/5 p-4 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
               <BookOpen size={12} /> Corporate Memory
            </h4>
            <div className="space-y-2">
               {results.ragContext.map((ctx, i) => (
                  <div key={i} className="bg-black/40 p-3 rounded-lg border border-white/5 hover:border-red-500/30 transition-colors group cursor-pointer">
                     <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-red-400 group-hover:underline">{ctx.sourceTitle}</span>
                        <ExternalLink size={10} className="text-zinc-600 group-hover:text-red-400" />
                     </div>
                     <p className="text-xs text-zinc-400 line-clamp-2">{ctx.snippet}</p>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* Standard Simulation Summary Card */}
      <div className="bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 p-5 shadow-lg shadow-black/40">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-1 bg-red-500 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.8)]"></span> Detected Context
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/20 flex items-start gap-3 backdrop-blur-sm">
             <div className="bg-red-500/10 p-1.5 rounded-lg text-red-500">
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
        </div>
      </div>

      {/* Simulated Google Doc */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-zinc-800 opacity-95">
        <div className="bg-black px-4 py-3 flex items-center gap-3 border-b border-zinc-800">
          <FileText className="text-red-500 w-4 h-4" />
          <div className="text-zinc-200 font-medium text-sm">Google Docs Simulation</div>
          <div className="ml-auto text-red-500 text-[10px] bg-red-950/30 px-2 py-0.5 rounded-full border border-red-800/50">
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

      {/* Confluence Page Simulation */}
      {results.confluencePage && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-zinc-800 opacity-95">
          <div className="bg-black px-4 py-3 flex items-center gap-3 border-b border-zinc-800">
            <BookOpen className="text-white w-4 h-4" />
            <div className="text-white font-medium text-sm">Confluence Wiki</div>
            <div className="ml-auto text-white/70 text-[10px] bg-white/10 px-2 py-0.5 rounded-full">
              Space: {results.confluencePage.spaceKey}
            </div>
          </div>
          <div className="p-8 bg-white min-h-[160px]">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-2xl font-bold text-zinc-900 mb-4">{results.confluencePage.title}</h1>
              <div className="prose prose-sm prose-zinc text-zinc-800 whitespace-pre-line leading-relaxed">
                {results.confluencePage.content}
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <div className="w-4 h-4 rounded bg-red-900/20 flex items-center justify-center">
                        <FileText size={10} className="text-red-400"/>
                    </div>
                    <div className="text-xs font-medium text-red-400 hover:underline cursor-pointer">
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