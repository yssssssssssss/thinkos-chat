import type { BoardItem, BoardItemKind, BoardState } from './types';

const DB_NAME = 'ThinkosWorkspaceBoard';
const DB_VERSION = 1;

const STORE_ITEMS = 'board_items';
const STORE_STATE = 'board_state';
const STORE_BLOBS = 'board_blobs';

const STATE_ID = 'default';

export type BoardBlobRecord = {
  id: string;
  blob: Blob;
  kind: BoardItemKind;
  createdAt: number;
  filename: string;
  size: number;
};

type PersistedBoardState = BoardState & { id: typeof STATE_ID };

let dbPromise: Promise<IDBDatabase> | null = null;

const openBoardDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
};

const withStore = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, tx: IDBTransaction) => IDBRequest<T> | Promise<T>
): Promise<T> => {
  const db = await openBoardDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], mode);
    const store = tx.objectStore(storeName);

    const settle = (value: T) => resolve(value);
    const fail = (error: unknown) => reject(error);

    try {
      const maybeRequest = run(store, tx);
      if (maybeRequest instanceof Promise) {
        maybeRequest.then(settle).catch(fail);
        return;
      }

      maybeRequest.onsuccess = () => settle(maybeRequest.result);
      maybeRequest.onerror = () => fail(maybeRequest.error);
    } catch (error) {
      fail(error);
    }
  });
};

export const boardDb = {
  async getState(): Promise<BoardState | null> {
    const record = await withStore<PersistedBoardState | undefined>(STORE_STATE, 'readonly', (store) =>
      store.get(STATE_ID)
    );
    if (!record) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...state } = record;
    return state;
  },

  async putState(state: BoardState): Promise<void> {
    const record: PersistedBoardState = { id: STATE_ID, ...state };
    await withStore<IDBValidKey>(STORE_STATE, 'readwrite', (store) => store.put(record));
  },

  async getAllItems(): Promise<BoardItem[]> {
    const items = await withStore<BoardItem[]>(STORE_ITEMS, 'readonly', (store) => store.getAll());
    return Array.isArray(items) ? items : [];
  },

  async putItems(items: BoardItem[]): Promise<void> {
    if (!items.length) return;
    const db = await openBoardDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_ITEMS], 'readwrite');
      const store = tx.objectStore(STORE_ITEMS);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async deleteItem(id: string): Promise<void> {
    await withStore<IDBValidKey>(STORE_ITEMS, 'readwrite', (store) => store.delete(id));
  },

  async clearItems(): Promise<void> {
    await withStore<IDBValidKey>(STORE_ITEMS, 'readwrite', (store) => store.clear());
  },

  async putBlob(record: BoardBlobRecord): Promise<void> {
    await withStore<IDBValidKey>(STORE_BLOBS, 'readwrite', (store) => store.put(record));
  },

  async getBlob(id: string): Promise<BoardBlobRecord | null> {
    const record = await withStore<BoardBlobRecord | undefined>(STORE_BLOBS, 'readonly', (store) => store.get(id));
    return record ?? null;
  },

  async deleteBlob(id: string): Promise<void> {
    await withStore<IDBValidKey>(STORE_BLOBS, 'readwrite', (store) => store.delete(id));
  },

  async clearBlobs(): Promise<void> {
    await withStore<IDBValidKey>(STORE_BLOBS, 'readwrite', (store) => store.clear());
  },

  async clearAll(): Promise<void> {
    const db = await openBoardDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_ITEMS, STORE_STATE, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_ITEMS).clear();
      tx.objectStore(STORE_STATE).clear();
      tx.objectStore(STORE_BLOBS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },
};

