import React, { useState, useCallback, useEffect } from 'react';
import { SimulationState, AgentResponse } from './types';
import { analyzeAndOrchestrate, generateSpeech } from './services/geminiService';
import { executeTools } from './services/toolService';
import { playPCM } from './utils/audioHelpers';
import { useDeviceMesh } from './hooks/useDeviceMesh';
import { useCloudConfig } from './hooks/useCloudConfig'; // New Cloud Hook
import { useReminders } from './hooks/useReminders'; // New Reminders Hook
import { PlanViewer } from './components/PlanViewer';
import { ResultsViewer } from './components/ResultsViewer';
import { GovernancePanel } from './components/GovernancePanel';
import { ConfigPanel } from './components/ConfigPanel';
import { PromptBar } from './components/PromptBar';
import { DeviceMeshList } from './components/DeviceMeshList';
import { QRCodeConnectModal } from './components/QRCodeConnectModal';
import { Bot, Upload, Loader2, Sparkles, AlertCircle, Settings, Terminal, XCircle, LayoutList, Command, Laptop, ChevronDown, Clipboard, QrCode, Clock } from 'lucide-react';
import ChangeLogPanel from './components/ChangeLogPanel';
import ChangeLogButton from './components/ChangeLogButton';
import NotificationHub from './components/NotificationHub';
import { RemindersPanel } from './components/RemindersPanel';
import { addLog } from './services/changeLog';

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
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [logToast, setLogToast] = useState<{show: boolean; message: string} | null>(null);
  
  // Replaced local useState/useEffect with Cloud Hook
  const { config, user, isSyncing, signIn, signOut, saveConfig } = useCloudConfig();
  const { reminders, addReminder, deleteReminder, snoozeReminder, updateRecurrence } = useReminders();
  
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [clipboardToast, setClipboardToast] = useState<{show: boolean, source: string} | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [transcribedVoiceText, setTranscribedVoiceText] = useState<string | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  
  // Initialize Device Mesh Hook
  const { 
    isConnected, 
    onlineDevices, 
    sendHandoff, 
    lastClipboardEvent, 
    toggleDemoMode,
    notifications,
    mediaStates,
    sendFileTransfer,
    sendMediaCommand,
    sendQuickReply,
    isDemoMode
  } = useDeviceMesh();

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

  // Simulate mobile notifications in demo mode
  useEffect(() => {
    if (!isDemoMode) return;
    const interval = setInterval(() => {
      const types: Array<'sms' | 'app'> = ['sms', 'app'];
      const senders = ['Sarah', 'Boss', 'Mom', 'Friend'];
      const messages = ['Hey, how are you?', 'Can you check the report?', 'Love you!', 'See you later'];
      const apps = ['Instagram', 'Slack', 'Twitter', 'Telegram'];
      
      const type = types[Math.floor(Math.random() * types.length)];
      const sender = type === 'sms' ? senders[Math.floor(Math.random() * senders.length)] : apps[Math.floor(Math.random() * apps.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      // This would normally come from socket, but in demo we simulate it
      console.log('📱 [Demo] Simulated notification from', sender);
    }, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, [isDemoMode]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  }, []);

  const handleClearImage = () => {
    setStagedImage(null);
  };

  const processImageFile = (file: File) => {
    // Validate file size (max 20MB for images)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: `File too large. Maximum size is 20MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
      }));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Please upload an image file (PNG, JPG, WebP, GIF, etc.).'
      }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (!result) {
        setState(prev => ({
          ...prev,
          status: 'error',
          errorMessage: 'Failed to read the file. Please try again.'
        }));
        return;
      }
      setStagedImage(result);
      setState(prev => ({ ...prev, status: 'idle' }));
      setIsDraggingOver(false);
    };
    reader.onerror = () => {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Error reading file. Please try again.'
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the main drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Get the first image file
    let imageFile: File | null = null;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        imageFile = files[i];
        break;
      }
    }

    if (!imageFile) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'No image files found in the dropped items. Please drop image files only.'
      }));
      return;
    }

    processImageFile(imageFile);
  };

  const handleManualHandoff = (deviceId: string, type: 'url' | 'clipboard', content: string) => {
    if (type === 'url') {
      sendHandoff(deviceId as any, 'open_browser', { url: content });
    } else {
      sendHandoff(deviceId as any, 'clipboard_sync', { content });
    }
  };

  const handleExecute = async (promptText: string, audioBlob?: Blob) => {
    // Validate that we have at least some input
    if (!promptText.trim() && !audioBlob) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Please provide either text input, voice input, or upload an image.'
      }));
      return;
    }

    let audioBase64: string | undefined;

    if (audioBlob) {
      try {
        audioBase64 = await blobToBase64(audioBlob);
      } catch (e) {
        console.error("Failed to process audio", e);
        setState(prev => ({
          ...prev,
          status: 'error',
          errorMessage: 'Failed to process voice recording. Please try again.'
        }));
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
      imagePreview: stagedImage || prev.imagePreview 
    }));

    try {
      const response: AgentResponse = await analyzeAndOrchestrate(imageBase64Data, promptText || undefined, audioBase64);
      
      const pendingResponse: AgentResponse = {
        ...response,
        orchestrationPlan: response.orchestrationPlan.map(step => ({...step, status: 'pending'}))
      };
      
      setState(prev => ({ 
        status: 'executing_tools',
        imagePreview: prev.imagePreview,
        response: pendingResponse
      }));

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
        response: completedResponse
      });

      try {
        const details = {
          prompt: promptText,
          hasImage: !!stagedImage,
          detectedComponent: completedResponse.executionResults?.detectedComponent,
          toolLogs: completedResponse.executionResults?.toolLogs?.slice(-10) // last 10 logs
        };
        // Respect user config for auto sync
        const shouldSync = !!(user && config && config.autoSyncLogs);
        await addLog({ title: 'Orchestration completed', details: JSON.stringify(details, null, 2) }, shouldSync ? user?.uid : undefined);
        setLogToast({ show: true, message: 'Saved orchestration to docs' });
        setTimeout(() => setLogToast(null), 3000);
      } catch (e) {
        console.error('Failed to write change log', e);
      }

      if (audioBlob) {
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
        response: prev.response 
      }));
    }
  };

  const handleReset = () => {
    setState({ status: 'idle' });
    setStagedImage(null);
  };

  return (
    <div className="min-h-screen font-sans text-zinc-100 selection:bg-red-600/30 selection:text-red-200">
      
      {/* Background Image & Overlay */}
      <div className="fixed inset-0 z-0 bg-black">
          {/* Red gradient background with white/black fading */}
          <div 
            className="w-full h-full bg-gradient-to-br"
            style={{
              background: 'linear-gradient(135deg, #0f0f0f 0%, #1e293b 15%, #374151 25%, #7f1d1d 40%, #b91c1c 60%, #dc2626 80%, #f5f5f5 95%, #ffffff 100%)'
            }}
          />
          {/* Multi-layer overlay for foggy depth effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/5" />
          <div className="absolute inset-0 bg-gradient-to-l from-red-950/40 via-transparent to-black/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(201,42,42,0.15),transparent_60%)]" />
      </div>

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

      <QRCodeConnectModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
      />

      {/* Clipboard Toast Notification */}
      {clipboardToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
           <div className="bg-black/80 backdrop-blur-xl border border-red-600/30 text-zinc-100 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
              <div className="bg-red-600/20 p-1 rounded-full">
                <Clipboard size={14} className="text-red-500" />
              </div>
              <span className="text-sm font-medium">Clipboard synced from Desktop</span>
           </div>
        </div>
      )}

      {/* Log saved toast */}
      {logToast && logToast.show && (
        <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-60 animate-in slide-in-from-bottom-2">
          <div className="bg-black/80 backdrop-blur-xl border border-cyan-600/30 text-zinc-100 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
            <Terminal size={14} className="text-cyan-400" />
            <span className="text-sm font-medium">{logToast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="bg-red-600/10 p-2 rounded-lg border border-red-600/20 backdrop-blur-sm shadow-[0_0_15px_rgba(201,42,42,0.1)]">
              <Bot size={20} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Konnect-Ai <span className="text-zinc-600 font-normal">/ Orchestrator</span>
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
                      ? 'bg-red-950/40 border-red-600/50' 
                      : 'bg-black/60 border-white/5 hover:bg-black/80'
                  }`}
                >
                  <Laptop size={14} className={isConnected ? "text-red-500" : "text-zinc-600"} />
                  <span className="text-[10px] font-medium text-zinc-400">
                    {isConnected ? "MESH ACTIVE" : "MESH OFFLINE"}
                  </span>
                  {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  <ChevronDown size={12} className={`text-zinc-500 transition-transform ${isMeshListOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Panel */}
                <DeviceMeshList 
                  isOpen={isMeshListOpen} 
                  onClose={() => setIsMeshListOpen(false)} 
                  devices={onlineDevices}
                  onSendToDevice={handleManualHandoff}
                  onToggleDemo={toggleDemoMode}
                  onSendFile={(deviceId, fileName, base64Data) => sendFileTransfer(deviceId, fileName, base64Data)}
                  mediaStates={mediaStates}
                  onMediaCommand={sendMediaCommand}
                />
             </div>

             {/* Connect Mobile Button */}
             <button
               onClick={() => setIsQRModalOpen(true)}
               className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-black bg-red-500 hover:bg-red-600 rounded-full transition-all shadow-[0_0_15px_rgba(201,42,42,0.3)] hover:shadow-[0_0_20px_rgba(201,42,42,0.6)]"
             >
               <QrCode size={14} />
               <span>Connect Mobile</span>
             </button>

             {/* Reminders: accessible from hero area */}

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
               className="text-zinc-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-white/5 relative"
               title="Settings"
             >
               <Settings size={20} />
               {user && (
                 <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border border-black" />
               )}
             </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
        
        {/* Drag & Drop Overlay */}
        {isDraggingOver && (
          <div 
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-in fade-in duration-200"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center space-y-4">
              <div className="bg-red-600/20 rounded-full p-6 w-20 h-20 flex items-center justify-center mx-auto border border-red-600/50">
                <Upload size={40} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Drop Image Here</h3>
                <p className="text-zinc-300">Release to upload your image</p>
              </div>
            </div>
          </div>
        )}

        {/* Main drop zone with drag handlers */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`transition-all duration-200 ${isDraggingOver ? 'ring-2 ring-red-600/50' : ''}`}
        >
        {/* Error Notification */}
        {state.status === 'error' && (
           <div className="mb-8 bg-red-950/40 backdrop-blur-md border border-red-500/20 rounded-xl p-4 flex items-center gap-4 animate-in slide-in-from-top-2">
             <div className="bg-red-500/10 p-2 rounded-full">
               <AlertCircle className="text-red-400 w-5 h-5" />
             </div>
             <div className="flex-1 min-w-0">
               <h3 className="text-sm font-semibold text-red-200">Simulation Failed</h3>
               <p className="text-sm text-red-300/80 break-words mt-0.5">{state.errorMessage}</p>
             </div>
             <button onClick={() => setState(prev => ({ ...prev, status: 'idle' }))} className="text-sm font-medium text-red-400 hover:text-red-300 hover:underline">Dismiss</button>
           </div>
        )}

        {/* Empty State Hero */}
        {state.status === 'idle' && !stagedImage && !state.imagePreview && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in duration-700">
            <div className="relative">
               <div className="absolute inset-0 bg-red-600 blur-[100px] opacity-10 rounded-full" />
               <Bot size={64} className="relative text-white drop-shadow-[0_0_20px_rgba(201,42,42,0.3)]" strokeWidth={1.5} />
            </div>
            <div className="space-y-4 max-w-2xl">
              <p className="text-lg text-zinc-400">
                Upload a diagram, screenshot, or describe a workflow. <br className="hidden sm:block"/>
                I'll handle the Jira, GitHub, Slack, and Docs.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-8">
               <button onClick={() => document.getElementById('file-upload-hero')?.click()} className="group bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 backdrop-blur-sm p-4 rounded-xl text-left transition-all hover:border-red-600/30 hover:shadow-lg hover:shadow-red-600/5">
                  <Upload className="w-5 h-5 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                  <div className="font-medium text-zinc-200 text-sm">Upload Diagram</div>
                  <div className="text-xs text-zinc-500 mt-1">Analyze flows visually</div>
               </button>
               <button
                 onClick={() => setIsRemindersOpen(true)}
                 className="group bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 backdrop-blur-sm p-4 rounded-xl text-left transition-all hover:border-red-600/30 hover:shadow-lg hover:shadow-red-600/5"
               >
                 <Clock className="w-5 h-5 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                 <div className="font-medium text-zinc-200 text-sm">Reminders</div>
                 <div className="text-xs text-zinc-500 mt-1">Schedule tasks & auto-run</div>
               </button>
               <button className="group bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 backdrop-blur-sm p-4 rounded-xl text-left transition-all hover:border-red-600/30 hover:shadow-lg hover:shadow-red-600/5 cursor-default">
                  <Command className="w-5 h-5 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
                  <div className="font-medium text-zinc-200 text-sm">Voice Command</div>
                  <div className="text-xs text-zinc-500 mt-1">Speak your plan</div>
               </button>
               <input id="file-upload-hero" type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </div>
          </div>
        )}

        {/* Active Workflow View */}
        {(stagedImage || state.status !== 'idle') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-500">
            
            {/* Left Column: Context & Plan */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Image Card */}
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/80">
                <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                   <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                     <Sparkles className="w-3 h-3 text-red-500" />
                     Context Input
                   </h3>
                   {state.status === 'analyzing' && <Loader2 className="w-3 h-3 text-red-500 animate-spin" />}
                </div>
                
                <div className="relative group bg-black/40">
                  {(stagedImage || state.imagePreview) ? (
                    <>
                      <img src={stagedImage || state.imagePreview} alt="Context" className="w-full h-auto object-cover opacity-90" />
                      {stagedImage && state.status === 'idle' && (
                        <button 
                          onClick={handleClearImage}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors border border-white/10"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-zinc-500">
                       <p className="text-sm">No image context provided</p>
                    </div>
                  )}

                  {state.status === 'analyzing' && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-zinc-200 backdrop-blur-[2px]">
                       <Loader2 className="w-8 h-8 animate-spin mb-3 text-red-500" />
                       <span className="text-sm font-mono tracking-wide text-red-200">ANALYZING PIXELS...</span>
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
                      Upload an image or use the chat bar below to start the orchestration process.
                    </p>
                  </div>
               ) : (
                  state.response && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                       
                       {/* Governance Panel */}
                       <div className="mb-6">
                          <GovernancePanel governance={state.response.governance} />
                       </div>

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
                                   <span className="text-red-500 opacity-50 select-none">$</span>
                                   <span>{log}</span>
                                 </div>
                               ))}
                             </div>
                          </div>
                       )}

                       {/* Results */}
                       <div className={state.status === 'executing_tools' ? 'opacity-60 grayscale-[30%] transition-all scale-[0.99]' : 'transition-all scale-100'}>
                          <ResultsViewer results={state.response.executionResults} />
                       </div>
                    </div>
                  )
               )}
            </div>

          </div>
        )}
        </div>
      </main>

      {/* Floating Prompt Bar */}
      <PromptBar 
        onSend={handleExecute} 
        isLoading={state.status === 'analyzing' || state.status === 'executing_tools' || state.status === 'uploading'}
        hasImage={!!stagedImage || !!state.imagePreview}
        onFileUpload={handleFileUpload}
        onTranscriptionResult={(text) => setTranscribedVoiceText(text)}
      />

      {/* Change Log viewer toggle (bottom-left) */}
      <div className="fixed left-4 bottom-6 z-60">
        <ChangeLogButton onClick={() => setIsLogOpen(true)} />
      </div>

      <ChangeLogPanel isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />

      {/* Notification Hub */}
      <NotificationHub 
        notifications={notifications.filter(n => !dismissedNotifications.includes(n.id))}
        onQuickReply={sendQuickReply}
        onDismiss={(id) => setDismissedNotifications(prev => [...prev, id])}
      />

      {/* Reminders Panel */}
      <RemindersPanel 
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
        reminders={reminders}
        onAddReminder={addReminder}
        onDeleteReminder={deleteReminder}
        onSnoozeReminder={snoozeReminder}
        onUpdateRecurrence={updateRecurrence}
      />

    </div>
  );
}