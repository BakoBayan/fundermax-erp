const DB_NAME = 'bako_erp_idb_v1';
const STORE_NAME = 'kv_store';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

export async function get<T = unknown>(key: string): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  try {
    const db = await openDB();
    const val = await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });

    if (val !== undefined && val !== null) {
      return val;
    }

    // One-time seamless migration from legacy localStorage if present
    try {
      const legacyRaw = window.localStorage.getItem(key);
      if (legacyRaw !== null) {
        let parsed: unknown = legacyRaw;
        try {
          parsed = JSON.parse(legacyRaw);
        } catch {
          parsed = legacyRaw;
        }
        await set(key, parsed);
        window.localStorage.removeItem(key);
        return parsed as T;
      }
    } catch {}

    return null;
  } catch {
    return null;
  }
}

export async function set<T = unknown>(key: string, value: T): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    // Ensure legacy localStorage copy is purged so 5MB quota is never consumed
    try {
      window.localStorage.removeItem(key);
    } catch {}
  } catch {}
}

export async function remove(key: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    try {
      window.localStorage.removeItem(key);
    } catch {}
  } catch {}
}

export const idb = {
  get,
  set,
  remove,
};

