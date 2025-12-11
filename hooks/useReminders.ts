import { useState, useEffect } from 'react';
import { Reminder, RecurrenceSpec, Attachment, ReminderAudio } from '../types';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeAndOrchestrate } from '../services/geminiService';
import { useCloudConfig } from './useCloudConfig';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';

const STORAGE_KEY = 'konnect_reminders';
const REMINDER_CHECK_INTERVAL = 60000; // Check every minute

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user, config } = useCloudConfig();

  // Load reminders from localStorage on mount
  useEffect(() => {
    const loadReminders = async () => {
      try {
        // Load from localStorage first
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsedLocal = stored ? JSON.parse(stored) : [];
        
        if (parsedLocal && parsedLocal.length > 0) {
          setReminders(parsedLocal);
        }

        // Sync from Firestore if user is signed in
        if (user?.uid) {
          const remindersRef = collection(db, 'users', user.uid, 'reminders');
          const snapshot = await getDocs(remindersRef);
          const firestoreReminders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Reminder[];

          // Merge: Firestore takes precedence
          const merged = mergeReminders(parsedLocal, firestoreReminders);
          setReminders(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      } catch (error) {
        console.error('Error loading reminders:', error);
      }
    };

    loadReminders();
  }, [user?.uid]);

  // Check for reminders to execute every minute
  useEffect(() => {
    const checkReminders = async () => {
      const now = Date.now();
      const pendingReminders = reminders.filter(r => r.status === 'pending' && r.executeTime <= now);

      for (const reminder of pendingReminders) {
        await executeReminder(reminder);
      }
    };

    const interval = setInterval(checkReminders, REMINDER_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [reminders, config, user?.uid]);

  // Execute reminder using Gemini
  const executeReminder = async (reminder: Reminder) => {
    setIsLoading(true);
    try {
      // Prepare audioBase64: if audio URL is a data URL, extract base64; if it's an http(s) URL, fetch and convert to base64
      let audioBase64: string | undefined = undefined;
      let audioMime = reminder.audio?.mimeType || 'audio/webm';
      if (reminder.audio?.url) {
        if (reminder.audio.url.startsWith('data:')) {
          const parts = reminder.audio.url.split(',');
          audioBase64 = parts[1];
        } else {
          // fetch remote URL and convert to base64
          try {
            const resp = await fetch(reminder.audio.url);
            const blob = await resp.blob();
            audioMime = blob.type || audioMime;
            const reader = new FileReader();
            audioBase64 = await new Promise<string>((resolve) => {
              reader.onloadend = () => {
                const s = reader.result as string;
                resolve(s.split(',')[1]);
              };
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.error('Failed to download audio for execution', err);
          }
        }
      }

      const response = await analyzeAndOrchestrate(null, reminder.taskPrompt, audioBase64, audioMime);

      const result = response?.orchestrationPlan?.[0]?.action || 'Task executed successfully';
      // If this reminder has recurrence, compute next occurrence and reschedule
      if (reminder.recurrence && reminder.recurrence.type && reminder.recurrence.type !== 'none') {
        const next = computeNextOccurrence(reminder);

        const updatedReminder: Reminder = {
          ...reminder,
          // keep it pending for the next run
          status: 'pending',
          executedAt: Date.now(),
          result: result,
          executeTime: next
        };

        // Update in state
        setReminders(prev => prev.map(r => r.id === reminder.id ? updatedReminder : r));

        // Persist to localStorage
        const currentReminders = reminders.map(r => r.id === reminder.id ? updatedReminder : r);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentReminders));

        // Persist to Firestore if signed in
        if (user?.uid) {
          const reminderRef = doc(db, 'users', user.uid, 'reminders', reminder.id);
          await updateDoc(reminderRef, {
            status: 'pending',
            executedAt: Date.now(),
            result: result,
            executeTime: next
          });
        }
      } else {
        const updatedReminder: Reminder = {
          ...reminder,
          status: 'executed',
          executedAt: Date.now(),
          result: result
        };

        // Update in state
        setReminders(prev => prev.map(r => r.id === reminder.id ? updatedReminder : r));

        // Persist to localStorage
        const currentReminders = reminders.map(r => r.id === reminder.id ? updatedReminder : r);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentReminders));

        // Persist to Firestore if signed in
        if (user?.uid) {
          const reminderRef = doc(db, 'users', user.uid, 'reminders', reminder.id);
          await updateDoc(reminderRef, {
            status: 'executed',
            executedAt: Date.now(),
            result: result
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const updatedReminder: Reminder = {
        ...reminder,
        status: 'failed',
        errorMessage: errorMessage
      };

      // Update in state
      setReminders(prev => prev.map(r => r.id === reminder.id ? updatedReminder : r));

      // Persist to localStorage
      const currentReminders = reminders.map(r => r.id === reminder.id ? updatedReminder : r);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentReminders));

      // Persist to Firestore if signed in
      if (user?.uid) {
        const reminderRef = doc(db, 'users', user.uid, 'reminders', reminder.id);
        await updateDoc(reminderRef, {
          status: 'failed',
          errorMessage: errorMessage
        });
      }

      console.error('Error executing reminder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute the next occurrence for a recurring reminder
  const computeNextOccurrence = (rem: Reminder): number => {
    const now = rem.executeTime || Date.now();
    const recurrence: RecurrenceSpec | undefined = rem.recurrence;
    if (!recurrence || recurrence.type === 'none') return now;

    const oneDay = 24 * 60 * 60 * 1000;

    if (recurrence.type === 'daily') {
      return now + oneDay;
    }

    if (recurrence.type === 'interval') {
      const days = recurrence.intervalDays && recurrence.intervalDays > 0 ? recurrence.intervalDays : 1;
      return now + days * oneDay;
    }

    if (recurrence.type === 'weekly') {
      // If weekdays specified, pick next weekday occurrence
      const days = recurrence.weekdays && recurrence.weekdays.length > 0 ? recurrence.weekdays : [new Date(now).getDay()];
      const currentDate = new Date(now);
      // search up to 7 days ahead
      for (let i = 1; i <= 7; i++) {
        const candidate = new Date(now + i * oneDay);
        if (days.includes(candidate.getDay())) return candidate.getTime();
      }
      // fallback to one week later
      return now + 7 * oneDay;
    }

    return now + oneDay;
  };

  // Add a new reminder
  const addReminder = async (
    title: string,
    description: string,
    executeTime: number,
    taskPrompt: string,
    recurrence?: RecurrenceSpec,
    attachmentFiles?: File[],
    audioBlob?: { blob: Blob; mimeType?: string; durationMs?: number }
  ) => {
    const id = `reminder_${Date.now()}`;

    // Prepare attachments: upload to Firebase Storage if signed in, otherwise fallback to base64 inline
    let attachmentsMeta: Attachment[] | undefined = undefined;
    if (attachmentFiles && attachmentFiles.length > 0) {
      attachmentsMeta = [];
      for (let i = 0; i < attachmentFiles.length; i++) {
        const f = attachmentFiles[i];
        const attId = `${id}_att_${i}`;
        if (user?.uid) {
          try {
            const path = `users/${user.uid}/reminders/${id}/attachments/${encodeURIComponent(f.name)}`;
            const sRef = storageRef(storage, path);
            await uploadBytes(sRef, f);
            const url = await getDownloadURL(sRef);
            attachmentsMeta.push({ id: attId, fileName: f.name, fileSize: f.size, mimeType: f.type, url });
          } catch (err) {
            console.error('Error uploading attachment to storage', err);
            // fallback to no URL
            attachmentsMeta.push({ id: attId, fileName: f.name, fileSize: f.size, mimeType: f.type });
          }
        } else {
          // fallback: convert to base64 and store inline (older behavior)
          const reader = new FileReader();
          const base64: string = await new Promise((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(f);
          });
          attachmentsMeta.push({ id: attId, fileName: f.name, fileSize: f.size, mimeType: f.type, url: `data:${f.type};base64,${base64}` });
        }
      }
    }

    // Prepare audio: upload blob if available
    let audioMeta: ReminderAudio | undefined = undefined;
    if (audioBlob?.blob) {
      const audioId = `${id}_audio`;
      if (user?.uid) {
        try {
          const path = `users/${user.uid}/reminders/${id}/audio.${audioBlob.mimeType?.split('/')[1] ?? 'webm'}`;
          const sRef = storageRef(storage, path);
          await uploadBytes(sRef, audioBlob.blob);
          const url = await getDownloadURL(sRef);
          audioMeta = { id: audioId, url, mimeType: audioBlob.mimeType, durationMs: audioBlob.durationMs };
        } catch (err) {
          console.error('Error uploading audio to storage', err);
          audioMeta = { id: audioId, mimeType: audioBlob.mimeType, durationMs: audioBlob.durationMs };
        }
      } else {
        // fallback to data URL
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(audioBlob.blob);
        });
        audioMeta = { id: audioId, url: `data:${audioBlob.mimeType};base64,${base64}`, mimeType: audioBlob.mimeType, durationMs: audioBlob.durationMs };
      }
    }

    const newReminder: Reminder = {
      id,
      title,
      description,
      executeTime,
      status: 'pending',
      taskPrompt,
      createdAt: Date.now(),
      recurrence: recurrence,
      attachments: attachmentsMeta,
      audio: audioMeta
    };

    // Add to state
    setReminders(prev => [...prev, newReminder]);

    // Persist to localStorage
    const updated = [...reminders, newReminder];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Persist to Firestore if signed in
    if (user?.uid) {
      try {
        await addDoc(collection(db, 'users', user.uid, 'reminders'), newReminder);
      } catch (error) {
        console.error('Error saving reminder to Firestore:', error);
      }
    }
  };

  // Snooze a reminder for given minutes
  const snoozeReminder = async (reminderId: string, minutes: number) => {
    const snoozeUntil = Date.now() + Math.max(1, minutes) * 60 * 1000;
    setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, executeTime: snoozeUntil, snoozedUntil: snoozeUntil, status: 'pending' } : r));

    const updated = reminders.map(r => r.id === reminderId ? { ...r, executeTime: snoozeUntil, snoozedUntil: snoozeUntil, status: 'pending' } : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (user?.uid) {
      try {
        const reminderRef = doc(db, 'users', user.uid, 'reminders', reminderId);
        await updateDoc(reminderRef, {
          executeTime: snoozeUntil,
          snoozedUntil: snoozeUntil,
          status: 'pending'
        });
      } catch (err) {
        console.error('Error snoozing reminder in Firestore:', err);
      }
    }
  };

  // Update recurrence spec for a reminder
  const updateRecurrence = async (reminderId: string, recurrence: RecurrenceSpec | undefined) => {
    setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, recurrence } : r));
    const updated = reminders.map(r => r.id === reminderId ? { ...r, recurrence } : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (user?.uid) {
      try {
        const reminderRef = doc(db, 'users', user.uid, 'reminders', reminderId);
        await updateDoc(reminderRef, { recurrence });
      } catch (err) {
        console.error('Error updating recurrence in Firestore:', err);
      }
    }
  };

  // Delete a reminder
  const deleteReminder = async (reminderId: string) => {
    setReminders(prev => prev.filter(r => r.id !== reminderId));

    // Update localStorage
    const updated = reminders.filter(r => r.id !== reminderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Delete from Firestore if signed in
    if (user?.uid) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'reminders', reminderId));
      } catch (error) {
        console.error('Error deleting reminder from Firestore:', error);
      }
    }
  };

  return {
    reminders,
    isLoading,
    addReminder,
    deleteReminder,
    executeReminder,
    snoozeReminder,
    updateRecurrence
  };
}

// Merge local and Firestore reminders, preferring Firestore for executed/failed statuses
function mergeReminders(local: Reminder[], firestore: Reminder[]): Reminder[] {
  const map = new Map<string, Reminder>();

  local.forEach(r => map.set(r.id, r));
  firestore.forEach(r => {
    const existing = map.get(r.id);
    if (!existing || (r.status !== 'pending' && existing.status === 'pending')) {
      map.set(r.id, r);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.executeTime - b.executeTime);
}
