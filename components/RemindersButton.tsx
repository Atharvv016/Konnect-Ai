import React from 'react';
import { Clock } from 'lucide-react';

interface RemindersButtonProps {
  onClick: () => void;
  pendingCount: number;
}

export function RemindersButton({ onClick, pendingCount }: RemindersButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/30 to-blue-600/20 hover:from-blue-500/40 hover:to-blue-600/30 border border-blue-500/40 hover:border-blue-500/60 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all duration-300 group"
    >
      <Clock
        size={18}
        className="text-blue-400 group-hover:text-blue-300 transition-colors"
      />
      <span className="text-sm font-semibold text-blue-300 group-hover:text-blue-200 transition-colors">
        Reminders
      </span>

      {/* Badge for pending reminders */}
      {pendingCount > 0 && (
        <div className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full text-white text-xs font-bold shadow-lg">
          {pendingCount > 9 ? '9+' : pendingCount}
        </div>
      )}
    </button>
  );
}
