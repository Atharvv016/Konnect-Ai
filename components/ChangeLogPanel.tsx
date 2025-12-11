import React, { useEffect, useState } from 'react';
import { listLogs, clearLogs, ChangeLogEntry } from '../services/changeLog';
import { X, Trash2 } from 'lucide-react';
import { useCloudConfig } from '../hooks/useCloudConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangeLogPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const { user } = useCloudConfig();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await listLogs(user?.uid);
        if (mounted) setEntries(list);
      } catch (e) {
        console.error('Failed to load logs', e);
      }
    };

    if (isOpen) load();
    return () => { mounted = false; };
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed left-4 bottom-4 z-[90]">
      <div className="w-96 max-h-[70vh] bg-black/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-bold text-white">Change Log</h3>
          <div className="flex items-center gap-2">
            <button onClick={async () => { await clearLogs(user?.uid); setEntries([]); }} title="Clear logs" className="text-zinc-400 hover:text-blue-500 p-1">
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-3 overflow-y-auto max-h-[60vh]">
          {entries.length === 0 ? (
            <div className="text-zinc-500 text-sm">No changes recorded yet.</div>
          ) : (
            <ul className="space-y-3">
              {entries.map(e => (
                <li key={e.id} className="bg-white/3 p-3 rounded-md border border-white/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-zinc-400">{new Date(e.timestamp).toLocaleString()}</div>
                      <div className="text-sm font-medium text-white mt-1">{e.title}</div>
                    </div>
                  </div>
                  <pre className="mt-2 text-xs text-zinc-300 whitespace-pre-wrap max-h-36 overflow-y-auto">{e.details}</pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeLogPanel;
