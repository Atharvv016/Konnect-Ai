import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';

export interface ChangeLogEntry {
  id: string;
  timestamp: number;
  title: string;
  details: string; // human-friendly summary or JSON
}

const STORAGE_KEY = 'konnect_change_logs_v1';

const readLocal = (): ChangeLogEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChangeLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read change log', e);
    return [];
  }
};

const writeLocal = (entries: ChangeLogEntry[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to write change log', e);
  }
};

const makeEntry = (entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>): ChangeLogEntry => ({
  ...entry,
  id: `${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
  timestamp: Date.now()
});

/**
 * Add a log locally and optionally sync to Firestore when `userId` provided.
 */
export const addLog = async (entry: Omit<ChangeLogEntry, 'id' | 'timestamp'>, userId?: string) => {
  const newEntry = makeEntry(entry);
  const all = readLocal();
  all.unshift(newEntry);
  writeLocal(all.slice(0, 200));

  // Firestore sync (best-effort)
  if (userId) {
    try {
      const colRef = collection(db, 'users', userId, 'changeLogs');
      const docRef = doc(colRef, newEntry.id);
      await setDoc(docRef, newEntry, { merge: true });
    } catch (e) {
      console.error('Failed to sync change log to Firestore', e);
    }
  }

  return newEntry;
};

/**
 * List logs. If `userId` is provided attempt to fetch cloud logs and merge with local ones.
 */
export const listLogs = async (userId?: string): Promise<ChangeLogEntry[]> => {
  const local = readLocal();
  if (!userId) return local.sort((a,b) => b.timestamp - a.timestamp);

  try {
    const colRef = collection(db, 'users', userId, 'changeLogs');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(200));
    const snap = await getDocs(q);
    const cloud: ChangeLogEntry[] = snap.docs.map(d => d.data() as ChangeLogEntry);

    // Merge cloud and local, prefer cloud entries when ids collide
    const map = new Map<string, ChangeLogEntry>();
    for (const e of cloud) map.set(e.id, e);
    for (const e of local) if (!map.has(e.id)) map.set(e.id, e);

    return Array.from(map.values()).sort((a,b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.error('Failed to read cloud change logs', e);
    return local.sort((a,b) => b.timestamp - a.timestamp);
  }
};

export const clearLogs = async (userId?: string) => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear local change log', e);
  }

  if (userId) {
    try {
      const colRef = collection(db, 'users', userId, 'changeLogs');
      const snap = await getDocs(query(colRef, orderBy('timestamp', 'desc'), limit(500)));
      const deletes = snap.docs.map(d => deleteDoc(doc(colRef, d.id)));
      await Promise.all(deletes);
    } catch (e) {
      console.error('Failed to clear cloud change logs', e);
    }
  }
};

export default { addLog, listLogs, clearLogs };
