/**
 * Offline Storage Service
 * 
 * Verwaltet lokales Caching von Notizen in IndexedDB für Offline-Funktionalität
 */

const DB_NAME = 'notenest-offline';
const DB_VERSION = 1;
const STORE_NOTES = 'notes';
const STORE_PENDING = 'pending_changes';

interface NoteCache {
  path: string;
  type: 'private' | 'shared';
  content: string;
  lastModified: number;
  lastSynced: number;
}

interface PendingChange {
  id: string;
  path: string;
  type: 'private' | 'shared';
  action: 'create' | 'update' | 'delete';
  content?: string;
  timestamp: number;
}

let db: IDBDatabase | null = null;

/**
 * Öffnet IndexedDB
 */
async function openDB(): Promise<IDBDatabase> {
  if (db) {
    return db;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store für gecachte Notizen
      if (!database.objectStoreNames.contains(STORE_NOTES)) {
        const notesStore = database.createObjectStore(STORE_NOTES, { keyPath: ['path', 'type'] });
        notesStore.createIndex('lastModified', 'lastModified', { unique: false });
        notesStore.createIndex('lastSynced', 'lastSynced', { unique: false });
      }

      // Store für ausstehende Änderungen (Sync-Queue)
      if (!database.objectStoreNames.contains(STORE_PENDING)) {
        const pendingStore = database.createObjectStore(STORE_PENDING, { keyPath: 'id' });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Speichert eine Notiz im Cache
 */
export async function cacheNote(
  path: string,
  type: 'private' | 'shared',
  content: string
): Promise<void> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NOTES], 'readwrite');
    const store = transaction.objectStore(STORE_NOTES);

    const note: NoteCache = {
      path,
      type,
      content,
      lastModified: Date.now(),
      lastSynced: Date.now()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(note);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error caching note:', error);
    throw error;
  }
}

/**
 * Ruft eine Notiz aus dem Cache ab
 */
export async function getCachedNote(
  path: string,
  type: 'private' | 'shared'
): Promise<NoteCache | null> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NOTES], 'readonly');
    const store = transaction.objectStore(STORE_NOTES);

    return new Promise((resolve, reject) => {
      const request = store.get([path, type]);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached note:', error);
    return null;
  }
}

/**
 * Ruft alle gecachten Notizen ab
 */
export async function getAllCachedNotes(): Promise<NoteCache[]> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NOTES], 'readonly');
    const store = transaction.objectStore(STORE_NOTES);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting all cached notes:', error);
    return [];
  }
}

/**
 * Fügt eine ausstehende Änderung zur Sync-Queue hinzu
 */
export async function addPendingChange(
  path: string,
  type: 'private' | 'shared',
  action: 'create' | 'update' | 'delete',
  content?: string
): Promise<string> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_PENDING], 'readwrite');
    const store = transaction.objectStore(STORE_PENDING);

    const change: PendingChange = {
      id: `${Date.now()}-${Math.random()}`,
      path,
      type,
      action,
      content,
      timestamp: Date.now()
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(change);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return change.id;
  } catch (error) {
    console.error('Error adding pending change:', error);
    throw error;
  }
}

/**
 * Ruft alle ausstehenden Änderungen ab
 */
export async function getPendingChanges(): Promise<PendingChange[]> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_PENDING], 'readonly');
    const store = transaction.objectStore(STORE_PENDING);
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting pending changes:', error);
    return [];
  }
}

/**
 * Entfernt eine ausstehende Änderung (nach erfolgreichem Sync)
 */
export async function removePendingChange(id: string): Promise<void> {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_PENDING], 'readwrite');
    const store = transaction.objectStore(STORE_PENDING);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error removing pending change:', error);
    throw error;
  }
}

/**
 * Löscht alle gecachten Notizen (z.B. beim Logout)
 */
export async function clearCache(): Promise<void> {
  try {
    const database = await openDB();
    const notesTransaction = database.transaction([STORE_NOTES], 'readwrite');
    const notesStore = notesTransaction.objectStore(STORE_NOTES);
    await new Promise<void>((resolve, reject) => {
      const request = notesStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    const pendingTransaction = database.transaction([STORE_PENDING], 'readwrite');
    const pendingStore = pendingTransaction.objectStore(STORE_PENDING);
    await new Promise<void>((resolve, reject) => {
      const request = pendingStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
}

/**
 * Prüft, ob IndexedDB verfügbar ist
 */
export function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

