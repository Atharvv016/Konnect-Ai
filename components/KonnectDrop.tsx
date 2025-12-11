import React, { useState } from 'react';
import { FileUp, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  deviceId: string;
  deviceName: string;
  onFileDrop: (file: File) => Promise<void>;
}

export const KonnectDrop: React.FC<Props> = ({ deviceId, deviceName, onFileDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];

    // Limit to 5MB for demo
    if (file.size > 5 * 1024 * 1024) {
      setStatus('error');
      setError('File too large (max 5MB for demo)');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    try {
      setStatus('uploading');
      setError('');
      await onFileDrop(file);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Transfer failed');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all mt-2 ${
        isDragging
          ? 'border-red-500 bg-red-600/10'
          : status === 'success'
          ? 'border-emerald-500 bg-emerald-600/10'
          : status === 'error'
          ? 'border-red-500 bg-red-600/10'
          : 'border-white/20 hover:border-white/40 bg-white/5'
      }`}
    >
      {status === 'idle' && (
        <>
          <FileUp size={16} className="text-zinc-400 mx-auto mb-1" />
          <div className="text-xs text-zinc-400">Drop file to send</div>
          <div className="text-[10px] text-zinc-600">to {deviceName}</div>
        </>
      )}
      {status === 'uploading' && (
        <div className="text-xs text-white animate-pulse">Sending...</div>
      )}
      {status === 'success' && (
        <>
          <CheckCircle size={16} className="text-emerald-400 mx-auto mb-1" />
          <div className="text-xs text-emerald-300">Sent!</div>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle size={16} className="text-red-400 mx-auto mb-1" />
          <div className="text-xs text-red-300">{error}</div>
        </>
      )}
    </div>
  );
};

export default KonnectDrop;
