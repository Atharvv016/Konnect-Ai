import React, { useState, useRef } from 'react';
import { X, Plus, Clock, Trash2, CheckCircle, AlertCircle, Mic, StopCircle, Play } from 'lucide-react';
import { Reminder, RecurrenceSpec } from '../types';

interface RemindersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: Reminder[];
  onAddReminder: (title: string, description: string, executeTime: number, taskPrompt: string, recurrence?: RecurrenceSpec, attachments?: File[], audio?: { blob: Blob; mimeType?: string; durationMs?: number }) => void;
  onDeleteReminder: (reminderId: string) => void;
  onSnoozeReminder: (reminderId: string, minutes: number) => void;
  onUpdateRecurrence: (reminderId: string, recurrence?: RecurrenceSpec) => void;
}

export function RemindersPanel({
  isOpen,
  onClose,
  reminders,
  onAddReminder,
  onDeleteReminder,
  onSnoozeReminder,
  onUpdateRecurrence,
}: RemindersPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [executeDate, setExecuteDate] = useState('');
  const [executeTime, setExecuteTime] = useState('09:00');
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'interval'>('none');
  const [intervalDays, setIntervalDays] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [editingRecurrenceId, setEditingRecurrenceId] = useState<string | null>(null);
  const [editRecurrenceType, setEditRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'interval'>('none');
  const [editIntervalDays, setEditIntervalDays] = useState(1);
  const [editWeekdays, setEditWeekdays] = useState<number[]>([]);
  // Attachments and voice
  type SelectedFile = { id: string; file: File };
  const [attachments, setAttachments] = useState<SelectedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorderRef, setMediaRecorderRef] = useState<MediaRecorder | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordDurationMs, setRecordDurationMs] = useState<number>(0);
  const recordTimerRef = useRef<number | null>(null);
  // Refs for keyboard navigation
  const titleRef = useRef<HTMLInputElement | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const taskPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const timeRef = useRef<HTMLInputElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleAddReminder = () => {
    // Basic trimming/validation
    if (!title.trim()) {
      alert('Please provide a title');
      titleRef.current?.focus();
      return;
    }
    if (!taskPrompt.trim()) {
      alert('Please provide task instructions');
      taskPromptRef.current?.focus();
      return;
    }
    if (!executeDate || !executeTime) {
      alert('Please select a valid date and time');
      dateRef.current?.focus();
      return;
    }

    const dateTime = new Date(`${executeDate}T${executeTime}`);
    const timestamp = dateTime.getTime();
    if (isNaN(timestamp)) {
      alert('Invalid date or time. Please check your inputs.');
      dateRef.current?.focus();
      return;
    }

    // Recurrence validation
    if (recurrenceType === 'weekly' && weekdays.length === 0) {
      alert('Please select at least one weekday for weekly recurrence');
      return;
    }
    if (recurrenceType === 'interval' && (!intervalDays || intervalDays < 1)) {
      alert('Interval days must be 1 or greater');
      return;
    }

    const recurrence: RecurrenceSpec | undefined = recurrenceType === 'none' ? undefined : recurrenceType === 'interval' ? { type: 'interval', intervalDays } : recurrenceType === 'weekly' ? { type: 'weekly', weekdays } : { type: 'daily' };

    const audioPayload = recordedBlob ? { blob: recordedBlob, mimeType: recordedBlob.type || 'audio/webm', durationMs: recordDurationMs } : undefined;

    const files = attachments.length ? attachments.map(a => a.file) : undefined;
    onAddReminder(title.trim(), description.trim(), timestamp, taskPrompt.trim(), recurrence, files, audioPayload);

    // Reset form
    setTitle('');
    setDescription('');
    setTaskPrompt('');
    setExecuteDate('');
    setExecuteTime('09:00');
    setRecurrenceType('none');
    setIntervalDays(1);
    setWeekdays([]);
    setFormOpen(false);
    // Clear attachments and audio after creating
    setAttachments([]);
    setRecordDurationMs(0);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    if (status === 'executed') return <CheckCircle size={14} className="text-green-500" />;
    if (status === 'failed') return <AlertCircle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-yellow-500" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'executed') return 'bg-green-500/10 border-green-500/30 text-green-400';
    if (status === 'failed') return 'bg-red-500/10 border-red-500/30 text-red-400';
    if (status === 'cancelled') return 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400';
    return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
  };

  if (!isOpen) return null;

  const pendingCount = reminders.filter(r => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-gradient-to-br from-zinc-900 via-black to-red-950/30 border border-red-500/20 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-red-500/20 bg-black/40">
          <div className="flex items-center gap-3">
            <Clock size={24} className="text-red-500" />
            <div>
              <h2 className="text-xl font-bold text-white">Reminders</h2>
              <p className="text-xs text-zinc-400">{pendingCount} pending</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
          >
            <X size={20} className="text-zinc-400 hover:text-red-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Add Reminder Button */}
          <div className="p-6 border-b border-red-500/10">
            {!formOpen ? (
              <button
                onClick={() => setFormOpen(true)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg transition-colors text-red-400 font-medium"
              >
                <Plus size={18} />
                <span>Add New Reminder</span>
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-black/40 rounded-lg border border-red-500/20">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    ref={titleRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        descriptionRef.current?.focus();
                      }
                    }}
                    placeholder="e.g., Review PR#123"
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    ref={descriptionRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        taskPromptRef.current?.focus();
                      }
                    }}
                    placeholder="Add more details..."
                    rows={2}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Task Instructions (for Gemini execution)
                  </label>
                  <textarea
                    ref={taskPromptRef}
                    value={taskPrompt}
                    onChange={(e) => setTaskPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        dateRef.current?.focus();
                      }
                    }}
                    placeholder="e.g., Check GitHub for new PRs and summarize them"
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2">
                      Date
                    </label>
                    <input
                      ref={dateRef}
                      type="date"
                      value={executeDate}
                      onChange={(e) => setExecuteDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          timeRef.current?.focus();
                        }
                      }}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-white text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2">
                      Time
                    </label>
                    <input
                      ref={timeRef}
                      type="time"
                      value={executeTime}
                      onChange={(e) => setExecuteTime(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Press Enter on time will trigger create
                          createButtonRef.current?.click();
                        }
                      }}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-white text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">Recurrence</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={recurrenceType}
                      onChange={(e) => setRecurrenceType(e.target.value as any)}
                      className="px-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-white text-sm"
                    >
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="interval">Every X days</option>
                    </select>

                    {recurrenceType === 'interval' && (
                      <input
                        type="number"
                        min={1}
                        value={intervalDays}
                        onChange={(e) => setIntervalDays(Number(e.target.value))}
                        className="w-20 px-2 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-white text-sm"
                      />
                    )}
                  </div>

                  {recurrenceType === 'weekly' && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setWeekdays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                          className={`px-2 py-1 rounded text-xs ${weekdays.includes(i) ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                        >{d}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attachments + Voice Recorder */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">Attachments</label>
                  <div className="flex items-center gap-2">
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      const list: SelectedFile[] = [];
                      for (let i = 0; i < files.length; i++) {
                        const f = files[i];
                        const id = `att_${Date.now()}_${i}`;
                        list.push({ id, file: f });
                      }
                      setAttachments(prev => [...prev, ...list]);
                      // reset input
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }} multiple />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1 rounded bg-zinc-800 text-sm">Upload Files</button>
                    <div className="flex gap-2 flex-wrap">
                      {attachments.map(a => (
                        <div key={a.id} className="text-xs px-2 py-1 bg-zinc-900 rounded flex items-center gap-2">
                          <span className="truncate max-w-[120px]">{a.file.name}</span>
                          <button type="button" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))} className="text-red-400">×</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-zinc-300 mb-2">Voice (optional)</label>
                    <div className="flex items-center gap-2">
                      {!isRecording ? (
                        <button type="button" onClick={async () => {
                          try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            const mr = new MediaRecorder(stream);
                            const chunks: BlobPart[] = [];
                            mr.ondataavailable = (ev) => chunks.push(ev.data);
                            mr.onstop = async () => {
                              const blob = new Blob(chunks, { type: 'audio/webm' });
                              setRecordedBlob(blob);
                              // stop tracks
                              stream.getTracks().forEach(t => t.stop());
                              if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
                              setIsRecording(false);
                            };
                            mr.start();
                            setMediaRecorderRef(mr);
                            setIsRecording(true);
                            setRecordDurationMs(0);
                            recordTimerRef.current = window.setInterval(() => {
                              setRecordDurationMs(prev => prev + 1000);
                            }, 1000);
                          } catch (err) {
                            console.error('Microphone access denied', err);
                            alert('Microphone access denied or unavailable');
                          }
                        }} className="px-3 py-2 rounded bg-red-500 text-white flex items-center gap-2"><Mic /> Record</button>
                      ) : (
                        <button type="button" onClick={() => { mediaRecorderRef?.stop(); }} className="px-3 py-2 rounded bg-zinc-800 text-white flex items-center gap-2"><StopCircle /> Stop</button>
                      )}

                      {recordedBlob && (
                        <div className="flex items-center gap-2">
                          <audio controls src={URL.createObjectURL(recordedBlob)} className="h-8" />
                          <div className="text-xs text-zinc-400">{Math.round(recordDurationMs/1000)}s</div>
                          <button type="button" onClick={() => { setRecordedBlob(null); setRecordDurationMs(0); }} className="text-red-400 text-xs">Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    ref={createButtonRef}
                    onClick={handleAddReminder}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded transition-colors"
                  >
                    Create Reminder
                  </button>
                  <button
                    onClick={() => setFormOpen(false)}
                    className="flex-1 px-4 py-2 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 font-medium rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reminders List */}
          <div className="p-6 space-y-3">
            {reminders.length === 0 ? (
              <p className="text-center text-zinc-500 py-8">No reminders yet. Create one to get started!</p>
            ) : (
              reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`p-4 rounded-lg border transition-colors ${getStatusColor(
                    reminder.status
                  )} bg-black/20`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(reminder.status)}
                        <h3 className="font-semibold truncate">{reminder.title}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10 whitespace-nowrap">
                          {reminder.status}
                        </span>
                      </div>
                      {reminder.description && (
                        <p className="text-xs opacity-75 mb-1 line-clamp-2">{reminder.description}</p>
                      )}
                      <p className="text-xs opacity-60">{formatTime(reminder.executeTime)}</p>
                      {reminder.result && (
                        <p className="text-xs mt-2 opacity-70 line-clamp-2">
                          <span className="font-semibold">Result:</span> {reminder.result}
                        </p>
                      )}
                      {reminder.errorMessage && (
                        <p className="text-xs mt-2 opacity-70 line-clamp-2">
                          <span className="font-semibold">Error:</span> {reminder.errorMessage}
                        </p>
                      )}
                      {/* Controls: Snooze and Recurrence */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="text-xs text-zinc-300">Snooze:</div>
                        <button onClick={() => onSnoozeReminder(reminder.id, 15)} className="px-2 py-1 rounded bg-zinc-800 text-xs">15m</button>
                        <button onClick={() => onSnoozeReminder(reminder.id, 60)} className="px-2 py-1 rounded bg-zinc-800 text-xs">1h</button>
                        <button onClick={() => onSnoozeReminder(reminder.id, 24*60)} className="px-2 py-1 rounded bg-zinc-800 text-xs">1d</button>

                        <div className="ml-4 text-xs text-zinc-300">Recurrence:</div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs px-2 py-1 bg-zinc-900 rounded">{reminder.recurrence ? reminder.recurrence.type : 'none'}</div>
                          <button
                            onClick={() => {
                              // open editor
                              setEditingRecurrenceId(reminder.id);
                              const rec = reminder.recurrence;
                              setEditRecurrenceType(rec?.type ?? 'none');
                              setEditIntervalDays(rec?.intervalDays ?? 1);
                              setEditWeekdays(rec?.weekdays ?? []);
                            }}
                            className="px-2 py-1 rounded bg-zinc-800 text-xs"
                          >Edit</button>
                        </div>
                      </div>
                      {editingRecurrenceId === reminder.id && (
                        <div className="mt-2 p-2 bg-black/30 rounded border border-red-500/10">
                          <div className="flex items-center gap-2">
                            <select value={editRecurrenceType} onChange={(e) => setEditRecurrenceType(e.target.value as any)} className="px-2 py-1 bg-zinc-900 text-sm rounded">
                              <option value="none">None</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="interval">Every X days</option>
                            </select>
                            {editRecurrenceType === 'interval' && (
                              <input type="number" min={1} value={editIntervalDays} onChange={(e) => setEditIntervalDays(Number(e.target.value))} className="w-20 px-2 py-1 bg-zinc-900 text-sm rounded" />
                            )}
                          </div>
                          {editRecurrenceType === 'weekly' && (
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                                <button key={d} type="button" onClick={() => setEditWeekdays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])} className={`px-2 py-1 rounded text-xs ${editWeekdays.includes(i) ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>{d}</button>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => {
                              const rec: RecurrenceSpec | undefined = editRecurrenceType === 'none' ? undefined : editRecurrenceType === 'interval' ? { type: 'interval', intervalDays: editIntervalDays } : editRecurrenceType === 'weekly' ? { type: 'weekly', weekdays: editWeekdays } : { type: 'daily' };
                              onUpdateRecurrence(reminder.id, rec);
                              setEditingRecurrenceId(null);
                            }} className="px-3 py-1 bg-red-500 rounded text-sm">Save</button>
                            <button onClick={() => setEditingRecurrenceId(null)} className="px-3 py-1 bg-zinc-700 rounded text-sm">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteReminder(reminder.id)}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors flex-shrink-0"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
