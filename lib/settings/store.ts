import { DEFAULT_SETTINGS, type Settings } from "./schema";
import { STORAGE_KEY, loadSettings, saveSettings } from "./storage";

/**
 * localStorage as an external store, read through useSyncExternalStore.
 *
 * That hook is the hydration-safe way to read browser-only state: React renders
 * `getServerSnapshot()` on the server and during hydration, then swaps to the
 * real value — no setState-in-effect, and no mismatch warning.
 *
 * Subscribing to `storage` events also keeps two open tabs in sync.
 */

let cache: Settings | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent): void {
  if (event.key === null || event.key === STORAGE_KEY) {
    cache = null; // Re-read lazily on the next snapshot.
    emit();
  }
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

/** Must return a stable reference while nothing changes, or React loops. */
export function getSnapshot(): Settings {
  if (cache === null) cache = loadSettings();
  return cache;
}

export function getServerSnapshot(): Settings {
  return DEFAULT_SETTINGS;
}

export function setSettings(next: Settings): void {
  cache = next;
  saveSettings(next);
  emit();
}

/** Test seam — drops the memoised snapshot. */
export function resetCache(): void {
  cache = null;
}

// A store that is simply "false on the server, true in the browser", used to
// grey out controls until the real settings are known.
const noopSubscribe = () => () => {};
export const clientOnlyStore = {
  subscribe: noopSubscribe,
  getSnapshot: () => true,
  getServerSnapshot: () => false,
};
