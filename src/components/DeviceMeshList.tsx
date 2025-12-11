import React, { useState } from 'react';
import { DeviceInfo } from '../types';
import { Laptop, Smartphone, Globe, Monitor, X, Radio, Share2, ArrowRight, Link, Type, Play, Square, StopCircle } from 'lucide-react';

interface DeviceMeshListProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceInfo[];
  onSendToDevice: (deviceId: string, type: 'url' | 'clipboard', content: string) => void;
  onToggleDemo: () => void;
  isDemoMode: boolean;
}

const getDeviceIcon = (type: string) => {
  switch (type) {
    case 'desktop': return <Monitor className="w-4 h-4 text-blue-500" />;
    case 'mobile': return <Smartphone className="w-4 h-4 text-blue-400" />;
    case 'web': return <Globe className="w-4 h-4 text-blue-300" />;
    default: return <Laptop className="w-4 h-4 text-zinc-400" />;
  }
};

const isUrl = (string: string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return string.includes('.') && !string.includes(' '); // Basic fallback
  }
};

export const DeviceMeshList: React.FC<DeviceMeshListProps> = ({ isOpen, onClose, devices, onSendToDevice, onToggleDemo, isDemoMode }) => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    if (!selectedDevice || !inputValue.trim()) return;
    
    const type = isUrl(inputValue) ? 'url' : 'clipboard';
    onSendToDevice(selectedDevice, type, inputValue);
    
    // Reset
    setInputValue('');
    setSelectedDevice(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
    if (e.key === 'Escape') {
      setSelectedDevice(null);
      setInputValue('');
    }
  };

  return (
    <div className="absolute top-16 right-0 md:right-6 mt-2 w-80 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
      <div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Device Mesh</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device List */}
        <div className="p-2 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {devices.length === 0 ? (
            <div className="px-4 py-6 text-center space-y-3">
               <div className="text-xs text-zinc-500">No other devices detected.</div>
               <button 
                onClick={onToggleDemo}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-950/30 hover:bg-blue-950/50 border border-blue-500/20 rounded-md transition-colors"
               >
                 <Play size={10} /> Enable Demo Mode
               </button>
               <p className="text-[10px] text-zinc-600">Simulate devices to test the UI.</p>
            </div>
          ) : (
            devices.sort((a, b) => (a.isCurrent ? -1 : 1)).map((device) => {
              const isSelected = selectedDevice === device.deviceId;

              return (
                <div 
                  key={device.deviceId} 
                  className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                    device.isCurrent 
                      ? 'bg-blue-950/20 border-blue-500/20' 
                      : 'bg-zinc-900/40 border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${device.isCurrent ? 'bg-blue-500/10' : 'bg-black/40'}`}>
                       {getDeviceIcon(device.deviceType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {device.deviceType.charAt(0).toUpperCase() + device.deviceType.slice(1)}
                        </span>
                        {device.isCurrent && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">YOU</span>
                        )}
                        {!device.isCurrent && !isSelected && (
                           <button 
                             onClick={() => setSelectedDevice(device.deviceId)}
                             className="text-zinc-500 hover:text-blue-400 p-1 rounded-md hover:bg-blue-950/30 transition-colors"
                             title="Send to Device"
                           >
                             <Share2 size={14} />
                           </button>
                        )}
                        {isSelected && (
                           <button 
                             onClick={() => setSelectedDevice(null)}
                             className="text-zinc-500 hover:text-blue-400 p-1 rounded-md hover:bg-blue-950/30 transition-colors"
                           >
                             <X size={14} />
                           </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${device.isCurrent ? 'bg-white' : 'bg-zinc-600'}`}></span>
                        <span className="text-[10px] text-zinc-500 truncate" title={device.deviceId}>
                          ID: {device.deviceId.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Input Area when selected */}
                  {isSelected && (
                    <div className="mt-1 animate-in slide-in-from-top-1 duration-200">
                       <div className="flex items-center gap-1 bg-black/50 border border-zinc-700 rounded-md p-1 pr-1.5 focus-within:border-blue-500/50 transition-colors">
                          <div className="pl-2 text-zinc-500">
                             {inputValue.length > 0 && isUrl(inputValue) ? <Link size={12}/> : <Type size={12}/>}
                          </div>
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="Type URL or Text..." 
                            className="flex-1 bg-transparent border-none text-xs text-zinc-200 placeholder:text-zinc-600 focus:ring-0 p-1"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                          />
                          <button 
                             onClick={handleSend}
                             disabled={!inputValue.trim()}
                             className="bg-blue-600 hover:bg-blue-500 text-white p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                             <ArrowRight size={12} />
                          </button>
                       </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 text-[10px] text-zinc-600 flex justify-between items-center">
           <div className="flex items-center gap-2">
             <span>{devices.length} Device{devices.length !== 1 ? 's' : ''} Online</span>
             {isDemoMode && (
                <button 
                  onClick={onToggleDemo} 
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/20 px-1.5 py-0.5 rounded transition-colors ml-2"
                >
                  <StopCircle size={10} /> Stop Demo
                </button>
             )}
           </div>
           {selectedDevice && <span className="text-blue-500/70">Press Enter to send</span>}
        </div>
      </div>
    </div>
  );
};