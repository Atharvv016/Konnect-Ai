import React from 'react';
import { Terminal } from 'lucide-react';

interface Props {
  onClick: () => void;
  label?: string;
}

export const ChangeLogButton: React.FC<Props> = ({ onClick, label = 'Docs' }) => {
  return (
    <button
      onClick={onClick}
      className="group relative px-6 py-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-sm font-semibold text-white hover:bg-black/80 hover:border-white/20 transition-all duration-300 shadow-xl flex items-center gap-2.5"
    >
      <Terminal size={16} className="text-zinc-300 group-hover:text-white transition-colors" />
      <span>{label}</span>
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/0 via-blue-600/0 to-blue-600/0 group-hover:from-blue-600/10 group-hover:via-blue-600/5 group-hover:to-blue-600/10 transition-all duration-300" />
    </button>
  );
};

export default ChangeLogButton;

