import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, StopCircle, MicOff, ImagePlus, Volume2, VolumeX, Video } from 'lucide-react';
import { analyzeBugVideo } from '../../services/geminiService';

interface PromptBarProps {
  onSend: (text: string, audioBlob?: Blob) => void;
  isLoading: boolean;
  hasImage: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isSpeechEnabled: boolean;
  onToggleSpeech: () => void;
}

export const PromptBar: React.FC<PromptBarProps> = ({ 
  onSend, 
  isLoading, 
  hasImage, 
  onFileUpload,
  onVideoUpload,
  isSpeechEnabled,
  onToggleSpeech
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/wav',
      'audio/webm;codecs=opus'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Let the browser choose default if none match
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const type = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        onSend(text, blob);
        setText('');
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = () => {
    if (!text.trim() && !isRecording) return;
    onSend(text);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setText('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Type for video file handler
  const handleVideoDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files: FileList = event.dataTransfer.files;
    const videoFile: File | undefined = Array.from(files).find((f: File) => f.type === 'video/mp4');
    if (videoFile) {
      setIsVideoLoading(true);
      setVideoResult(null);
      try {
        const result: string = await analyzeBugVideo(videoFile, videoFile.type);
        setVideoResult(result);
      } catch (err) {
        setVideoResult('Error analyzing video.');
      }
      setIsVideoLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Switched to dark background with lighter border for 'midnight' feel */}
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/80 p-2 flex items-end gap-2 ring-1 ring-white/5">
          
          {/* Upload Image Button */}
          <div className="relative group">
            <button className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Upload Image">
                <ImagePlus size={20} />
            </button>
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              accept="image/*" 
              onChange={onFileUpload}
            />
          </div>

          {/* Upload Video Button */}
          <div className="relative group">
            <button className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors" title="Upload Video">
                <Video size={20} />
            </button>
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              accept="video/mp4,video/*" 
              onChange={onVideoUpload}
            />
          </div>

          {/* Input Area */}
          <div className="flex-1 min-h-[48px] flex items-center px-2">
            {isRecording ? (
               <div className="flex-1 flex items-center gap-3 text-red-400 font-medium animate-pulse px-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Recording Voice Command... ({formatTime(recordingTime)})
               </div>
            ) : (
               <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={hasImage ? "Ask to analyze the context..." : "Describe a task..."}
                  disabled={isLoading}
                  className="w-full bg-transparent border-none focus:ring-0 text-zinc-100 placeholder:text-zinc-500 text-sm md:text-base py-3"
               />
            )}
          </div>

          {/* Actions Right */}
          <div className="flex items-center gap-1">
            {/* Speech Toggle */}
            <button
              onClick={onToggleSpeech}
              className={`p-3 rounded-full transition-all hidden sm:block ${
                isSpeechEnabled
                  ? 'text-red-500 bg-red-500/10'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
              title={isSpeechEnabled ? "Read Aloud: ON" : "Read Aloud: OFF"}
            >
               {isSpeechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>

            {/* Voice Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`p-3 rounded-full transition-all ${
                isRecording 
                  ? 'bg-red-500/20 text-red-500' 
                  : 'text-zinc-400 hover:text-red-500 hover:bg-red-500/10'
              }`}
            >
              {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isLoading || (text.trim().length === 0 && !isRecording)}
              className={`p-3 rounded-full transition-all ${
                 (text.trim().length > 0 || isRecording) && !isLoading
                   ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] hover:bg-red-500 font-bold' 
                   : 'bg-white/5 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Send size={18} className={isLoading ? 'opacity-0' : 'ml-0.5'} />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                </div>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Video Drop Zone - Added for drag-and-drop video support */}
      <div 
        onDragOver={e => e.preventDefault()} 
        onDrop={handleVideoDrop}
        className="fixed inset-0 z-40 pointer-events-none"
      >
        <div className="flex items-center justify-center h-full pointer-events-auto">
          {isVideoLoading ? (
            <div className="text-center text-teal-400">
              Analyzing video...
            </div>
          ) : videoResult ? (
            <div className="mt-2 p-2 bg-teal-900/20 rounded text-white font-mono whitespace-pre">
              {videoResult}
            </div>
          ) : (
            <div className="text-zinc-500">
              Drag and drop an .mp4 video file here to analyze
            </div>
          )}
        </div>
      </div>

    </div>
  );
};