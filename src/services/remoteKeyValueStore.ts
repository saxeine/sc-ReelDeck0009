/**
 * The original editor used the host application's remote KV service for
 * preferences and presets. In ReelDeck these are local to this browser; use an
 * in-memory fallback if storage is unavailable or full.
 */
const memory = new Map<string, string>();
const prefix = "reeldeck.neo1.";
const listeners = new Set<(keys: string[]) => void>();
const notify = (key: string) => listeners.forEach((listener) => listener([key]));

export const remoteStore = {
  getItem(key: string): string | null {
    if (memory.has(key)) return memory.get(key)!;
    try { return localStorage.getItem(prefix + key); } catch { return null; }
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    try { localStorage.setItem(prefix + key, value); } catch { /* Keep the current session usable. */ }
    notify(key);
  },
  removeItem(key: string): void {
    memory.delete(key);
    try { localStorage.removeItem(prefix + key); } catch { /* Storage may be disabled. */ }
    notify(key);
  },
  subscribe(listener: (keys: string[]) => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
