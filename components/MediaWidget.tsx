import React from 'react';
import { MediaState } from '../types';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface Props {
  mediaState: MediaState | undefined;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const MediaWidget: React.FC<Props> = ({ mediaState, onPlay, onPause, onNext, onPrev }) => {
  if (!mediaState) return null;

  return (
    <div className="bg-black/40 border border-white/10 rounded-lg p-3 mt-3 space-y-2">
      <div className="text-xs font-semibold text-zinc-300 uppercase">Now Playing</div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-white truncate">{mediaState.track || 'Unknown Track'}</div>
        <div className="text-xs text-zinc-400 truncate">{mediaState.artist || 'Unknown Artist'}</div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onPrev}
          className="flex-1 p-2 bg-white/5 hover:bg-white/10 rounded transition-colors"
          title="Previous"
        >
          <SkipBack size={14} className="text-white" />
        </button>
        {mediaState.isPlaying ? (
          <button
            onClick={onPause}
            className="flex-1 p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            title="Pause"
          >
            <Pause size={14} className="text-white" />
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="flex-1 p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            title="Play"
          >
            <Play size={14} className="text-white" />
          </button>
        )}
        <button
          onClick={onNext}
          className="flex-1 p-2 bg-white/5 hover:bg-white/10 rounded transition-colors"
          title="Next"
        >
          <SkipForward size={14} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default MediaWidget;
