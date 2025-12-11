import React, { useState, useCallback, useEffect } from 'react';
import { SimulationState, AgentResponse } from './types';
import { analyzeAndOrchestrate, generateSpeech } from './services/geminiService';
import { executeTools } from './services/toolService';
import { playPCM } from './utils/audioHelpers';
import { useDeviceMesh } from './hooks/useDeviceMesh';
import { useCloudConfig } from './hooks/useCloudConfig'; // New Cloud Hook
import { PlanViewer } from './components/PlanViewer';
import { ResultsViewer } from './components/ResultsViewer';
import { ConfigPanel } from './components/ConfigPanel';
import { PromptBar } from './components/PromptBar';
import { DeviceMeshList } from './components/DeviceMeshList';
import { KonnectLogo } from './components/Logo';
import { Upload, Loader2, Sparkles, AlertCircle, Settings, Terminal, XCircle, LayoutList, Command, Laptop, ChevronDown, Clipboard, ScanSearch } from 'lucide-react';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function App() {
  const [state, setState] = useState<SimulationState>({ status: 'idle' });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isMeshListOpen, setIsMeshListOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  
  // Use Cloud Config Hook (Replaces local useState for config)
  const { config, user, isSyncing, signIn, signOut, saveConfig } = useCloudConfig();

  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [stagedVideo, setStagedVideo] = useState<{ url: string, base64: string, mimeType: string } | null>(null);
  const [clipboardToast, setClipboardToast] = useState<{show: boolean, source: string} | null>(null);
  
  // Initialize Device Mesh Hook
  const { isConnected, onlineDevices, sendHandoff, lastClipboardEvent, toggleDemoMode, isDemoMode } = useDeviceMesh();

  // Listen for global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle Settings (Ctrl/Cmd + S)
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setIsConfigOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Listen for clipboard events to show toast
  useEffect(() => {
    if (lastClipboardEvent) {
      setClipboardToast({ show: true, source: lastClipboardEvent.source });
      const timer = setTimeout(() => {
        setClipboardToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastClipboardEvent]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setStagedImage(reader.result as string);
      setStagedVideo(null); // Clear video if image is selected
    };
    reader.readAsDataURL(file);
  }, []);

  const handleVideoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file.');
      return;
    }

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    
    // Read as base64 for API
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setStagedVideo({
        url,
        base64: base64Data,
        mimeType: file.type
      });
      setStagedImage(null); // Clear image if video is selected
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setStagedImage(reader.result as string);
          setStagedVideo(null);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            setStagedVideo({ url, base64: base64Data, mimeType: file.type });
            setStagedImage(null);
        };
        reader.readAsDataURL(file);
      } else {
         alert('Only image or video files are supported for drag and drop.');
      }
    }
  }, []);

  const handleClearContext = () => {
    setStagedImage(null);
    setStagedVideo(null);
  };

  const handleManualHandoff = (deviceId: string, type: 'url' | 'clipboard', content: string) => {
    if (type === 'url') {
      sendHandoff(deviceId as any, 'open_browser', { url: content });
    } else {
      sendHandoff(deviceId as any, 'clipboard_sync', { content });
    }
  };

  const handleExecute = async (promptText: string, audioBlob?: Blob) => {
    let audioBase64: string | undefined;
    let audioMimeType: string = 'audio/webm';

    if (audioBlob) {
      audioMimeType = audioBlob.type;
      try {
        audioBase64 = await blobToBase64(audioBlob);
      } catch (e) {
        console.error("Failed to process audio", e);
        alert("Failed to process voice recording.");
        return;
      }
    }

    let imageBase64Data: string | null = null;
    if (stagedImage) {
      imageBase64Data = stagedImage.split(',')[1];
    }

    setState(prev => ({ 
      ...prev, 
      status: 'analyzing',
      imagePreview: stagedImage || prev.imagePreview,
      videoPreview: stagedVideo?.url || prev.videoPreview
    }));

    try {
      const response: AgentResponse = await analyzeAndOrchestrate(
        imageBase64Data, 
        promptText, 
        audioBase64, 
        audioMimeType,
        stagedVideo?.base64,
        stagedVideo?.mimeType
      );
      
      const pendingResponse: AgentResponse = {
        ...response,
        orchestrationPlan: response.orchestrationPlan.map(step => ({...step, status: 'pending'}))
      };
      
      setState(prev => ({ 
        status: 'executing_tools',
        imagePreview: prev.imagePreview,
        videoPreview: prev.videoPreview,
        response: pendingResponse
      }));

      // Pass the Cloud Config to the Tool Service
      const logs = await executeTools(pendingResponse.executionResults, config);
      
      // --- Device Handoff Execution ---
      const deviceAction = pendingResponse.executionResults.deviceAction;
      if (deviceAction && deviceAction.shouldExecute) {
        logs.push(`📡 Device Mesh: Sending '${deviceAction.actionType}' to ${deviceAction.targetDevice}`);
        
        let sent = false;
        if (deviceAction.actionType === 'open_url') {
           sent = sendHandoff(deviceAction.targetDevice, 'open_browser', { url: deviceAction.payload });
        } else if (deviceAction.actionType === 'copy_to_clipboard') {
           sent = sendHandoff(deviceAction.targetDevice, 'clipboard_sync', { content: deviceAction.payload });
        }
        
        if (sent) logs.push(`✅ Device Mesh: Signal sent successfully.`);
        else logs.push(`⚠️ Device Mesh: Failed to send (Signaling server unreachable).`);
      }

      const completedResponse: AgentResponse = {
        ...pendingResponse,
        orchestrationPlan: pendingResponse.orchestrationPlan.map(step => ({...step, status: 'complete'})),
        executionResults: { ...pendingResponse.executionResults, toolLogs: logs }
      };

      setState({
        status: 'complete',
        imagePreview: stagedImage || state.imagePreview,
        videoPreview: stagedVideo?.url || state.videoPreview,
        response: completedResponse
      });

      // Provide Audio Feedback if user used Voice OR if Speech is Enabled
      if (audioBlob || isSpeechEnabled) {
         try {
           let summary = `Orchestration complete. I have created a Jira ticket for the ${completedResponse.executionResults.detectedComponent} issue and notified the team on Slack.`;
           if (deviceAction?.shouldExecute) {
             summary += " I also sent the task to your desktop.";
           }
           const pcmAudio = await generateSpeech(summary);
           if (pcmAudio) {
             await playPCM(pcmAudio);
           }
         } catch (e) {
           console.error("Failed to play voice response", e);
         }
      }

    } catch (error) {
      setState(prev => ({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : "Unknown error occurred",
        imagePreview: prev.imagePreview,
        videoPreview: prev.videoPreview,
        response: prev.response 
      }));
    }
  };

  const handleReset = () => {
    setState({ status: 'idle' });
    setStagedImage(null);
    setStagedVideo(null);
  };

  return (
    <div 
      className="min-h-screen font-sans text-zinc-100 selection:bg-blue-500/30 selection:text-blue-200 relative"
      onDragOver={handleDragOver}
    >
      
      {/* Background Image & Overlay */}
      <div className="fixed inset-0 z-0 bg-black">
          <img 
            src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2574&auto=format&fit=crop" 
            alt="Background" 
            className="w-full h-full object-cover opacity-50 grayscale"
          />
          {/* Foggy Blue Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15),transparent_50%)]" />
      </div>

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md border-2 border-dashed border-blue-500 m-4 rounded-3xl flex flex-col items-center justify-center animate-in fade-in duration-200"
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
             <div className="bg-blue-500/20 p-8 rounded-full shadow-[0_0_50px_rgba(59,130,246,0.3)] animate-bounce">
                <Upload size={64} className="text-blue-400" />
             </div>
             <h2 className="mt-8 text-3xl font-bold text-white tracking-tight">Drop Context</h2>
             <p className="mt-2 text-zinc-400">Release to upload image or video</p>
        </div>
      )}

      <ConfigPanel 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        config={config} 
        onSave={saveConfig} 
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
        isSyncing={isSyncing}
      />

      {/* Clipboard Toast Notification */}
      {clipboardToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
           <div className="bg-black/80 backdrop-blur-xl border border-blue-500/30 text-zinc-100 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
              <div className="bg-blue-500/20 p-1 rounded-full">
                <Clipboard size={14} className="text-blue-400" />
              </div>
              <span className="text-sm font-medium">Clipboard synced from Desktop</span>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="bg-white/5 p-2 rounded-lg border border-white/10 backdrop-blur-sm">
              <KonnectLogo size={24} className="text-blue-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Konnect-Ai <span className="text-zinc-500 font-normal">/ Orchestrator</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Device Mesh Status Indicator */}
             <div className="relative">
                <button 
                  onClick={() => setIsMeshListOpen(!isMeshListOpen)}
                  className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all backdrop-blur-sm ${
                    isMeshListOpen 
                      ? 'bg-blue-950/40 border-blue-500/50' 
                      : 'bg-black/60 border-white/5 hover:bg-black/80'
                  }`}
                >
                  <Laptop size={14} className={isConnected ? "text-blue-500" : "text-zinc-600"} />
                  <span className="text-[10px] font-medium text-zinc-400">
                    {isConnected ? "MESH ACTIVE" : "MESH OFFLINE"}
                  </span>
                  {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                  <ChevronDown size={12} className={`text-zinc-500 transition-transform ${isMeshListOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Panel */}
                <DeviceMeshList 
                  isOpen={isMeshListOpen} 
                  onClose={() => setIsMeshListOpen(false)} 
                  devices={onlineDevices}
                  onSendToDevice={handleManualHandoff}
                  onToggleDemo={toggleDemoMode}
                  isDemoMode={isDemoMode}
                />
             </div>

             {state.status === 'complete' && (
               <button 
                onClick={handleReset}
                className="hidden sm:flex px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5 backdrop-blur-sm"
               >
                 New Session
               </button>
             )}
             <button 
               onClick={() => setIsConfigOpen(true)}
               className="text-zinc-500 hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/5 relative"
               title="Settings"
             >
               <Settings size={20} />
               {user && (
                 <span className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full border border-black" />
               )}
             </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
        
        {/* Error Notification */}
        {state.status === 'error' && (
           <div className="mb-8 bg-blue-950/40 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 flex items-center gap-4 animate-in slide-in-from-top-2">
             <div className="bg-blue-500/10 p-2 rounded-full">
               <AlertCircle className="text-blue-400 w-5 h-5" />
             </div>
             <div className="flex-1 min-w-0">
               <h3 className="text-sm font-semibold text-blue-200">Simulation Failed</h3>
               <p className="text-sm text-blue-300/80 break-words mt-0.5">{state.errorMessage}</p>
             </div>
             <button onClick={() => setState(prev => ({ ...prev, status: 'idle' }))} className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline">Dismiss</button>
           </div>
        )}

        {/* Empty State Hero */}
        {state.status === 'idle' && !stagedImage && !stagedVideo && !state.imagePreview && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in duration-700">
            <div className="relative">
               <div className="absolute inset-0 bg-blue-500 blur-[100px] opacity-10 rounded-full" />
               <KonnectLogo size={80} className="relative drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
            </div>
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-sm">
                How can I help you <br/> orchestrate today?
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-8">
               <button onClick={() => document.getElementById('file-upload-hero')?.click()} className="group bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 backdrop-blur-sm p-4 rounded-xl text-left transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer">
                  <ScanSearch className="w-5 h-5 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                  <div className="font-medium text-zinc-200 text-sm">Analyze Image</div>
                  <div className="text-xs text-zinc-500 mt-1">Upload diagrams or photos</div>
               </button>
               <button 
                 onClick={() => handleExecute('')}
                 className="group bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 backdrop-blur-sm p-4 rounded-xl text-left transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer"
               >
                  <Sparkles className="w-5 h-5 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                  <div className="font-medium text-zinc-200 text-sm">Run Simulation</div>
                  <div className="text-xs text-zinc-500 mt-1">Generate demo workflow</div>
               </button>
               <button className="group bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 backdrop-blur-sm p-4 rounded-xl text-left transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 cursor-default">
                  <Command className="w-5 h-5 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                  <div className="font-medium text-zinc-200 text-sm">Voice Command</div>
                  <div className="text-xs text-zinc-500 mt-1">Speak your plan</div>
               </button>
               <input id="file-upload-hero" type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
          </div>
        )}

        {/* Active Workflow View */}
        {(stagedImage || stagedVideo || state.status !== 'idle') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-500">
            
            {/* Left Column: Context & Plan */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Context Card */}
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/80">
                <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                   <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                     <Sparkles className="w-3 h-3 text-blue-500" />
                     Context Input
                   </h3>
                   {state.status === 'analyzing' && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
                </div>
                
                <div className="relative group bg-black/40">
                  {(stagedImage || state.imagePreview) ? (
                    <>
                      <img src={stagedImage || state.imagePreview} alt="Context" className="w-full h-auto object-cover opacity-90" />
                      {stagedImage && state.status === 'idle' && (
                        <button 
                          onClick={handleClearContext}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors border border-white/10"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </>
                  ) : (stagedVideo || state.videoPreview) ? (
                    <>
                       <video 
                         src={stagedVideo?.url || state.videoPreview} 
                         controls 
                         className="w-full h-auto max-h-64 object-contain bg-black" 
                       />
                       {stagedVideo && state.status === 'idle' && (
                        <button 
                          onClick={handleClearContext}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors border border-white/10"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-zinc-500">
                       <p className="text-sm">No context provided</p>
                    </div>
                  )}

                  {state.status === 'analyzing' && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-zinc-200 backdrop-blur-[2px]">
                       <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                       <span className="text-sm font-mono tracking-wide text-blue-100">ANALYZING INPUT...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan Visualization */}
              {(state.response) && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-forwards">
                   <PlanViewer steps={state.response.orchestrationPlan} />
                </div>
              )}
            </div>

            {/* Right Column: Execution Results */}
            <div className="lg:col-span-7 space-y-6">
               {(!state.response) ? (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl bg-black/20 backdrop-blur-sm min-h-[300px]">
                    <div className="bg-white/5 p-4 rounded-full mb-6 ring-1 ring-white/5">
                      <LayoutList className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-300 mb-2">Awaiting Analysis</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto text-sm">
                      Upload an image, video, or use the chat bar below to start the orchestration process.
                    </p>
                  </div>
               ) : (
                  state.response && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                       
                       {/* Tool Logs Console */}
                       {state.response.executionResults.toolLogs && state.response.executionResults.toolLogs.length > 0 && (
                          <div className="mb-6 bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-lg">
                             <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center gap-2">
                                <Terminal className="text-zinc-500 w-3 h-3" />
                                <span className="text-xs font-mono font-bold text-zinc-400">TERMINAL_OUTPUT</span>
                             </div>
                             <div className="p-4 space-y-2 font-mono text-xs max-h-48 overflow-y-auto custom-scrollbar">
                               {state.response.executionResults.toolLogs.map((log, i) => (
                                 <div key={i} className="text-zinc-300 break-all flex gap-2 animate-in slide-in-from-left-2 fade-in duration-300">
                                   <span className="text-blue-500 opacity-50 select-none">$</span>
                                   <span>{log}</span>
                                 </div>
                               ))}
                             </div>
                          </div>
                       )}

                       {/* Results */}
                       <div className={state.status === 'executing_tools' ? 'opacity-60 grayscale-[30%] transition-all scale-[0.99]' : 'transition-all scale-100'}>
                          <ResultsViewer results={state.response.executionResults} transcription={state.response.transcription} />
                       </div>
                    </div>
                  )
               )}
            </div>

          </div>
        )}
      </main>

      {/* Floating Prompt Bar */}
      <PromptBar 
        onSend={handleExecute} 
        isLoading={state.status === 'analyzing' || state.status === 'executing_tools' || state.status === 'uploading'}
        hasImage={!!stagedImage || !!state.imagePreview || !!stagedVideo || !!state.videoPreview}
        onFileUpload={handleFileUpload}
        onVideoUpload={handleVideoUpload}
        isSpeechEnabled={isSpeechEnabled}
        onToggleSpeech={() => setIsSpeechEnabled(!isSpeechEnabled)}
      />

    </div>
  );
}