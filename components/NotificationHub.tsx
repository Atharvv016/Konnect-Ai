import React, { useState } from 'react';
import { NotificationItem } from '../types';
import { X, Reply, MessageCircle, Package } from 'lucide-react';

interface Props {
  notifications: NotificationItem[];
  onQuickReply: (notificationId: string, reply: string) => void;
  onDismiss: (notificationId: string) => void;
}

const NotificationHub: React.FC<Props> = ({ notifications, onQuickReply, onDismiss }) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleSendReply = (notificationId: string) => {
    if (replyText.trim()) {
      onQuickReply(notificationId, replyText);
      setReplyText('');
      setReplyingTo(null);
    }
  };

  const displayedNotifications = notifications.slice(0, 3);

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 w-80 max-h-[70vh] overflow-y-auto">
      {displayedNotifications.map((notif) => (
        <div
          key={notif.id}
          className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg p-4 shadow-xl animate-in slide-in-from-top-2 fade-in duration-300"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${notif.type === 'sms' ? 'bg-cyan-600/20' : 'bg-blue-600/20'}`}>
                {notif.type === 'sms' ? (
                  <MessageCircle size={14} className="text-cyan-400" />
                ) : (
                  <Package size={14} className="text-blue-400" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-white uppercase">{notif.type}</div>
                <div className="text-xs text-zinc-400">{notif.sender}</div>
              </div>
            </div>
            <button
              onClick={() => onDismiss(notif.id)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-3">
            <div className="text-sm font-medium text-white">{notif.title}</div>
            <div className="text-xs text-zinc-300 mt-1">{notif.body}</div>
          </div>

          {replyingTo === notif.id ? (
            <div className="space-y-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendReply(notif.id);
                }}
                placeholder="Quick reply..."
                className="w-full px-3 py-2 bg-zinc-900/50 border border-white/10 rounded text-xs text-white focus:ring-1 focus:ring-blue-600 outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSendReply(notif.id)}
                  className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium transition-colors"
                >
                  Send
                </button>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="flex-1 px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setReplyingTo(notif.id)}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-zinc-300 rounded font-medium transition-colors border border-white/5"
            >
              <Reply size={12} />
              Quick Reply
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotificationHub;
