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
      className="relative flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500/30 to-red-600/20 hover:from-red-500/40 hover:to-red-600/30 border border-red-500/40 hover:border-red-500/60 backdrop-blur-md shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_25px_rgba(220,38,38,0.4)] transition-all duration-300 group"
    >
      <Clock
        size={18}
        className="text-red-400 group-hover:text-red-300 transition-colors"
      />
      <span className="text-sm font-semibold text-red-300 group-hover:text-red-200 transition-colors">
        Reminders
      </span>

      {/* Badge for pending reminders */}
      {pendingCount > 0 && (
        <div className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold shadow-lg">
          {pendingCount > 9 ? '9+' : pendingCount}
        </div>
      )}
    </button>
  );
}
