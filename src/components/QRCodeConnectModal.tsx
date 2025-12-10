import React, { useEffect, useState } from 'react';
import { X, Smartphone, ScanLine, Copy, Check } from 'lucide-react';

interface QRCodeConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeConnectModal: React.FC<QRCodeConnectModalProps> = ({ isOpen, onClose }) => {
  const [sessionId, setSessionId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Simulate unique session generation
      const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newId = `KONNECT-${timestamp}-${random}`;
      setSessionId(newId);
    }
  }, [isOpen]);

  /**
   * DEEP LINK CONFIGURATION:
   * We use the https scheme to support Universal Links (iOS) and App Links (Android).
   * This allows the native camera app to recognize the URL and open the installed 
   * Konnect-AI app directly, bypassing the browser if configured correctly 
   * (via apple-app-site-association / assetlinks.json).
   */
  const uri = `https://konnectai.org/connect?sessionID=${sessionId}`;
  
  // Generate a Red on Black QR code matching the app theme
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(uri)}&color=dc2626&bgcolor=09090b&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden relative ring-1 ring-white/5">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="p-8 flex flex-col items-center text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <ScanLine className="text-red-500" />
              Scan to Connect
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Scan this code with your mobile device's <strong className="text-zinc-200">native camera app</strong> to instantly connect.
            </p>
          </div>

          <div className="relative p-4 bg-white/5 rounded-2xl border border-white/10 shadow-inner group">
             {/* QR Code Container */}
             <div className="relative z-10 rounded-xl overflow-hidden bg-zinc-950 border border-white/5">
                <img src={qrUrl} alt="QR Code" className="w-48 h-48 object-contain mix-blend-screen" />
             </div>
             
             {/* Decorative Glow Effects */}
             <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-700" />
             <div className="absolute -inset-1 bg-gradient-to-tr from-red-500/20 to-transparent opacity-20 blur-lg rounded-3xl" />
          </div>

          <div className="w-full bg-zinc-900/50 rounded-xl p-3 border border-white/5 flex items-center justify-between">
            <div className="text-left">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Manual Code</div>
              <div className="text-sm font-mono text-red-500 font-medium tracking-wide">{sessionId}</div>
            </div>
            <button 
              onClick={handleCopy}
              className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title="Copy Code"
            >
              {copied ? <Check size={16} className="text-white" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-zinc-600 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
            <Smartphone size={12} />
            <span>Requires Konnect-AI Mobile App v2.0+</span>
          </div>
        </div>
        
        {/* Animated Timeout Bar */}
        <div className="h-1 bg-zinc-900 w-full">
            <div className="h-full bg-red-500/50 w-full animate-[shrink_60s_linear_forwards]" style={{width: '100%'}} />
        </div>
      </div>
    </div>
  );
};