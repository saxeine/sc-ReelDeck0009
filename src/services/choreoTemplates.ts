/**
 * Choreographer show templates.
 *
 * A template is a complete saved show: its scenes (images, formations, motion,
 * transitions, positions), the show clock and loop flag. Built-in templates are
 * generated from the advert pool at runtime; these records are the user's own
 * editable copies, stored in IndexedDB so they survive reloads even when their
 * scenes embed data-URL artwork.
 */

import type { ChoreoCue } from "../components/ledStudio/types";

export interface ChoreoShowTemplate {
  id: string;
  name: string;
  description: string;
  cues: ChoreoCue[];
  bpm: number;
  timeScale: number;
  loop: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NewChoreoShowTemplate {
  name: string;
  description?: string;
  cues: ChoreoCue[];
  bpm: number;
  timeScale: number;
  loop: boolean;
}

const DB_NAME = "reeldeck-choreo-templates";
const STORE_NAME = "templates";

const EMPTY: ChoreoShowTemplate[] = [];
let cache: ChoreoShowTemplate[] | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function sortTemplates(templates: ChoreoShowTemplate[]) {
  return [...templates].sort((a, b) => b.updatedAt - a.updatedAt);
}

function makeId() {
  return `show_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function subscribeChoreoTemplates(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stable snapshot for useSyncExternalStore; a new array after every mutation. */
export function getChoreoTemplateSnapshot(): ChoreoShowTemplate[] {
  return cache ?? EMPTY;
}

export function choreoTemplateStorageMode(): "indexeddb" | "memory" {
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
    tx.onerror = () => reject(tx.error ?? new Error("Show template transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("Show template transaction aborted"));
  });
}

async function readAll(db: IDBDatabase): Promise<ChoreoShowTemplate[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result ?? []) as ChoreoShowTemplate[]);
    request.onerror = () => reject(request.error ?? new Error("Could not read show templates"));
  });
}

async function writeTemplates(db: IDBDatabase, templates: ChoreoShowTemplate[]) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const template of templates) store.put(template);
  await transactionDone(tx);
}

async function deleteFromDb(db: IDBDatabase, ids: string[]) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const id of ids) store.delete(id);
  await transactionDone(tx);
}

function normalize(input: NewChoreoShowTemplate): Omit<ChoreoShowTemplate, "id" | "createdAt" | "updatedAt"> {
  return {
    name: input.name.trim() || "Untitled show",
    description: (input.description ?? "").trim(),
    cues: input.cues.map((cue) => ({
      ...cue,
      assetUrls: [...cue.assetUrls],
      castSlots: [...cue.castSlots],
    })),
    bpm: input.bpm,
    timeScale: input.timeScale,
    loop: input.loop,
  };
}

async function ensureLoaded(): Promise<ChoreoShowTemplate[]> {
  if (loaded && cache) return cache;
  const db = await openDatabase();
  if (db) {
    try {
      cache = sortTemplates(await readAll(db));
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

/** Load the saved show templates from the database (once per session). */
export async function loadChoreoTemplates(): Promise<ChoreoShowTemplate[]> {
  return ensureLoaded();
}

/** Store the current show as a new editable template. */
export async function createChoreoTemplate(input: NewChoreoShowTemplate): Promise<ChoreoShowTemplate> {
  const templates = await ensureLoaded();
  const now = Date.now();
  const created: ChoreoShowTemplate = {
    id: makeId(),
    ...normalize(input),
    createdAt: now,
    updatedAt: now,
  };
  cache = sortTemplates([created, ...templates]);
  notify();
  const db = await openDatabase();
  if (db) {
    try {
      await writeTemplates(db, [created]);
    } finally {
      db.close();
    }
  }
  return created;
}

/** Rename/redescribe a template and/or replace its program with a new show. */
export async function updateChoreoTemplate(
  id: string,
  patch: Partial<NewChoreoShowTemplate>,
): Promise<ChoreoShowTemplate | null> {
  const templates = await ensureLoaded();
  const existing = templates.find((template) => template.id === id);
  if (!existing) return null;
  const updated: ChoreoShowTemplate = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name.trim() || existing.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
    ...(patch.cues !== undefined
      ? {
          cues: patch.cues.map((cue) => ({
            ...cue,
            assetUrls: [...cue.assetUrls],
            castSlots: [...cue.castSlots],
          })),
        }
      : {}),
    ...(patch.bpm !== undefined ? { bpm: patch.bpm } : {}),
    ...(patch.timeScale !== undefined ? { timeScale: patch.timeScale } : {}),
    ...(patch.loop !== undefined ? { loop: patch.loop } : {}),
    updatedAt: Date.now(),
  };
  cache = sortTemplates(templates.map((template) => (template.id === id ? updated : template)));
  notify();
  const db = await openDatabase();
  if (db) {
    try {
      await writeTemplates(db, [updated]);
    } finally {
      db.close();
    }
  }
  return updated;
}

/** Remove an editable template. */
export async function removeChoreoTemplate(id: string): Promise<void> {
  const templates = await ensureLoaded();
  cache = templates.filter((template) => template.id !== id);
  notify();
  const db = await openDatabase();
  if (db) {
    try {
      await deleteFromDb(db, [id]);
    } finally {
      db.close();
    }
  }
}

/** Clear the in-memory cache and every stored template (used by tests). */
export async function resetChoreoTemplatesForTests(): Promise<void> {
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
