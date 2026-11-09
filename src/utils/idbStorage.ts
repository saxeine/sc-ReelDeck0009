import { remoteStore } from "../services/remoteKeyValueStore";

/** Browser-local preferences for the imported sequence and warp preset studios. */
export async function getStoredJson<T>(key: string): Promise<T | null> {
  try { return JSON.parse(remoteStore.getItem(key) || "null") as T | null; } catch { return null; }
}
export async function saveStoredJson(key: string, value: unknown): Promise<boolean> {
  try { remoteStore.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
