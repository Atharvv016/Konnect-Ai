
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, StopCircle, MicOff, ImagePlus, AlertCircle } from 'lucide-react';

interface PromptBarProps {
  onSend: (text: string, audioBlob?: Blob) => void;
  isLoading: boolean;
  hasImage: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTranscriptionResult?: (transcribedText: string) => void;
}

export const PromptBar: React.FC<PromptBarProps> = ({ onSend, isLoading, hasImage, onFileUpload, onTranscriptionResult }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Cleanup active recording on unmount
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/ogg',
      'audio/wav'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm'; // Fallback
  };

  const startRecording = async () => {
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const mimeType = getSupportedMimeType();
      const options = { mimeType };
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e.error);
        setRecordingError(`Recording error: ${e.error}`);
        setIsRecording(false);
      };

      mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          if (blob.size === 0) {
            setRecordingError("Recording failed: no audio data captured");
            return;
          }
          // Transcribe the audio
          transcribeAudio(blob, mimeType);
        } catch (e) {
          console.error("Error processing recording:", e);
          setRecordingError("Failed to process recording");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setRecordingError("Microphone permission denied. Please enable microphone access.");
        } else if (err.name === 'NotFoundError') {
          setRecordingError("No microphone found. Please connect a microphone.");
        } else {
          setRecordingError(`Microphone error: ${err.message}`);
        }
      } else {
        setRecordingError("Could not access microphone. Please check permissions.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (e) {
        console.error("Error stopping recording:", e);
        setRecordingError("Failed to stop recording");
      }
    }
  };

  const handleSend = () => {
    if (!text.trim() && !isRecording) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    onSend(text);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = event.target.files?.[0];
    
    if (!file) return;

    // Validate file size (max 20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`File too large. Maximum size is 20MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG, WebP, etc.).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    onFileUpload(event);
    setUploadError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setRecordingError(null);

    try {
      // Convert audio blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const audioBase64 = (reader.result as string).split(',')[1];
          
          // Use Gemini API to transcribe the audio
          const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
          if (!apiKey) {
            setRecordingError("API key not configured. Cannot transcribe audio.");
            setIsTranscribing(false);
            return;
          }

          const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: audioBase64
                    }
                  },
                  {
                    text: "Please transcribe this audio and return ONLY the transcribed text, nothing else."
                  }
                ]
              }],
              generationConfig: {
                temperature: 0.3,
              }
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Transcription failed');
          }

          const result = await response.json();
          const transcribedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          if (!transcribedText) {
            setRecordingError("Could not transcribe audio. Please try again.");
            setIsTranscribing(false);
            return;
          }

          // Update the text input with transcribed content
          setText(transcribedText);
          setRecordingError(null);
          
          // Call callback if provided
          if (onTranscriptionResult) {
            onTranscriptionResult(transcribedText);
          }
        } catch (e) {
          console.error("Transcription error:", e);
          setRecordingError(`Transcription failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
          setIsTranscribing(false);
        }
      };
      reader.onerror = () => {
        setRecordingError("Failed to read audio data");
        setIsTranscribing(false);
      };
      reader.readAsDataURL(audioBlob);
    } catch (e) {
      console.error("Error in transcribeAudio:", e);
      setRecordingError("Failed to transcribe audio");
      setIsTranscribing(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-4">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Error Messages */}
        {(recordingError || uploadError) && (
          <div className="bg-blue-950/60 backdrop-blur-sm border border-blue-600/40 rounded-lg p-3 flex items-start gap-3 animate-in slide-in-from-bottom-2">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200">{recordingError || uploadError}</p>
            <button 
              onClick={() => {
                setRecordingError(null);
                setUploadError(null);
              }}
              className="ml-auto text-blue-400 hover:text-blue-300 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 p-2 flex items-end gap-2 ring-1 ring-white/5">
          
          {/* Upload Button */}
          <div className="relative group">
            <button 
              className="p-3 text-zinc-400 hover:text-blue-500 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              title="Upload Image"
              disabled={isLoading || isRecording}
            >
                <ImagePlus size={20} />
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
              accept="image/*" 
              onChange={handleFileUpload}
              disabled={isLoading || isRecording}
            />
          </div>

          {/* Input Area */}
          <div className="flex-1 min-h-[48px] flex items-center px-2">
            {isRecording ? (
               <div className="flex-1 flex items-center gap-3 text-blue-500 font-medium animate-pulse px-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Recording... {formatTime(recordingTime)}</span>
               </div>
            ) : isTranscribing ? (
               <div className="flex-1 flex items-center gap-3 text-blue-500 font-medium px-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>Transcribing audio...</span>
               </div>
            ) : (
               <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={hasImage ? "Ask about the image..." : "Describe your task..."}
                  disabled={isLoading}
                  className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-zinc-500 text-sm md:text-base py-3"
               />
            )}
          </div>

          {/* Actions Right */}
          <div className="flex items-center gap-1">
            {/* Voice Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isTranscribing}
              className={`p-3 rounded-full transition-all ${
                isRecording 
                  ? 'bg-blue-600/30 text-blue-500 hover:bg-blue-600/40' 
                  : 'text-zinc-400 hover:text-blue-500 hover:bg-white/10'
              }`}
              title={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={isLoading || isTranscribing || (text.trim().length === 0 && !isRecording)}
              className={`p-3 rounded-full transition-all ${
                 (text.trim().length > 0 || isRecording) && !isLoading && !isTranscribing
                   ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:bg-blue-700' 
                   : 'bg-white/5 text-zinc-600 cursor-not-allowed'
              }`}
              title={isRecording ? "Stop recording" : "Send"}
            >
              <Send size={18} className={isLoading || isTranscribing ? 'opacity-0' : 'ml-0.5'} />
              {(isLoading || isTranscribing) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
