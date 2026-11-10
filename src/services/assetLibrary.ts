/**
 * Asset Provider library service.
 *
 * The editable holding area for artwork that feeds the sequencer and the
 * choreographer. Records live in an IndexedDB database so the library survives
 * reloads; when no database is available it falls back to in-memory storage.
 * Slice exports and Zoom Studio creations are added here alongside uploads.
 */

export type AssetOrigin = "upload" | "slice" | "zoom" | "frame";

export interface LibraryAsset {
  id: string;
  name: string;
  origin: AssetOrigin;
  tags: string[];
  favorite: boolean;
  w: number;
  h: number;
  createdAt: number;
  updatedAt: number;
  /** Image source. Data URLs keep sequencer/choreographer feeds durable. */
  src: string;
}

export interface NewLibraryAsset {
  name: string;
  origin: AssetOrigin;
  src: string;
  w?: number;
  h?: number;
  tags?: string[];
}

const DB_NAME = "reeldeck-asset-library";
const STORE_NAME = "assets";

const EMPTY: LibraryAsset[] = [];
let cache: LibraryAsset[] | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function sortAssets(assets: LibraryAsset[]) {
  return [...assets].sort((a, b) => b.createdAt - a.createdAt);
}

function makeId() {
  return `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribeLibrary(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stable snapshot for useSyncExternalStore; a new array after every mutation. */
export function getLibrarySnapshot(): LibraryAsset[] {
  return cache ?? EMPTY;
}

export function libraryStorageMode(): "indexeddb" | "memory" {
  return typeof indexedDB === "undefined" ? "memory" : "indexeddb";
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Asset library transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("Asset library transaction aborted"));
  });
}

async function readAll(db: IDBDatabase): Promise<LibraryAsset[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result ?? []) as LibraryAsset[]);
    request.onerror = () => reject(request.error ?? new Error("Could not read the asset library"));
  });
}

async function writeAssets(db: IDBDatabase, assets: LibraryAsset[]) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const asset of assets) store.put(asset);
  await transactionDone(tx);
}

async function deleteFromDb(db: IDBDatabase, ids: string[]) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const id of ids) store.delete(id);
  await transactionDone(tx);
}

async function ensureLoaded(): Promise<LibraryAsset[]> {
  if (loaded && cache) return cache;
  const db = await openDatabase();
  if (db) {
    try {
      cache = sortAssets(await readAll(db));
    } catch {
      cache = cache ?? [];
    }
    db.close();
  } else if (!cache) {
    cache = [];
  }
  loaded = true;
  notify();
  return cache;
}

/** Load the library from the database (once per session). */
export async function loadLibrary(): Promise<LibraryAsset[]> {
  return ensureLoaded();
}

/** Add artwork to the holding area. Returns the stored records. */
export async function addLibraryAssets(items: NewLibraryAsset[]): Promise<LibraryAsset[]> {
  const assets = await ensureLoaded();
  const now = Date.now();
  const created: LibraryAsset[] = items.map((item, index) => ({
    id: makeId() + `_${index}`,
    name: item.name.trim() || "Untitled asset",
    origin: item.origin,
    tags: item.tags ? [...item.tags] : [],
    favorite: false,
    w: item.w ?? 0,
    h: item.h ?? 0,
    createdAt: now + index,
    updatedAt: now + index,
    src: item.src,
  }));
  cache = sortAssets([...created, ...assets]);
  notify();
  const db = await openDatabase();
  if (db) {
    try {
      await writeAssets(db, created);
    } finally {
      db.close();
    }
  }
  return created;
}

/** Edit the name, tags, or favourite flag of a stored asset. */
export async function updateLibraryAsset(
  id: string,
  patch: Partial<Pick<LibraryAsset, "name" | "tags" | "favorite">>,
): Promise<void> {
  const assets = await ensureLoaded();
  const existing = assets.find((asset) => asset.id === id);
  if (!existing) return;
  const updated: LibraryAsset = {
    ...existing,
    ...patch,
    name: patch.name !== undefined ? patch.name.trim() || existing.name : existing.name,
    tags: patch.tags !== undefined ? [...patch.tags] : existing.tags,
    updatedAt: Date.now(),
  };
  cache = sortAssets(assets.map((asset) => (asset.id === id ? updated : asset)));
  notify();
  const db = await openDatabase();
  if (db) {
    try {
      await writeAssets(db, [updated]);
    } finally {
      db.close();
    }
  }
}

/** Remove assets from the holding area. */
export async function removeLibraryAssets(ids: string[]): Promise<void> {
  const assets = await ensureLoaded();
  const doomed = new Set(ids);
  cache = assets.filter((asset) => !doomed.has(asset.id));
  notify();
  const db = await openDatabase();
  if (db) {
    try {
      await deleteFromDb(db, ids);
    } finally {
      db.close();
    }
  }
}

/** Clear the in-memory cache and every stored record (used by tests). */
export async function resetLibraryForTests(): Promise<void> {
  cache = null;
  loaded = false;
  notify();
  const db = await openDatabase();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      await transactionDone(tx);
    } finally {
      db.close();
    }
  }
}
