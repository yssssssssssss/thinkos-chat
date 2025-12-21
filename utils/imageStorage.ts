const DB_NAME = 'thinkos-image-store';
const STORE_NAME = 'imageNodes';
const DB_VERSION = 1;

type ImageRecord = {
  images: string[];
  updatedAt: number;
};

const hasIndexedDB = typeof indexedDB !== 'undefined';

const openDb = (): Promise<IDBDatabase> => {
  if (!hasIndexedDB) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error || new Error('indexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const txDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('indexedDB transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('indexedDB transaction aborted'));
  });

const lsKey = (nodeId: string) => `thinkos-image-node-${nodeId}`;

export async function persistNodeImages(nodeId: string, images: string[]) {
  if (!images.length) {
    await deleteNodeImages(nodeId);
    return;
  }

  const record: ImageRecord = { images, updatedAt: Date.now() };

  if (hasIndexedDB) {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record, nodeId);
    await txDone(tx);
    return;
  }

  try {
    localStorage.setItem(lsKey(nodeId), JSON.stringify(record));
  } catch {
    // Best effort only; swallow quota errors to avoid crashing the UI.
  }
}

export async function loadNodeImages(nodeId: string): Promise<string[] | null> {
  if (hasIndexedDB) {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(nodeId);
      const record = await new Promise<ImageRecord | undefined>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as ImageRecord | undefined);
        request.onerror = () => reject(request.error || new Error('indexedDB read failed'));
      });
      if (record?.images?.length) return record.images;
    } catch {
      // fall through to localStorage fallback
    }
  }

  try {
    const raw = localStorage.getItem(lsKey(nodeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImageRecord;
    if (parsed?.images?.length) return parsed.images;
  } catch {
    return null;
  }
  return null;
}

export async function deleteNodeImages(nodeId: string) {
  if (hasIndexedDB) {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(nodeId);
      await txDone(tx);
    } catch {
      // ignore
    }
  }

  try {
    localStorage.removeItem(lsKey(nodeId));
  } catch {
    // ignore
  }
}
