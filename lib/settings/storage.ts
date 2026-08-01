import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "./schema";

/**
 * Settings — including API keys — are kept in the browser, never on the server.
 * That way a shared deployment lets each tester use their own key, and no
 * secret is ever written to disk or a log on our side.
 *
 * Trade-off the settings page states plainly: localStorage is readable by
 * anything running in this browser profile, so keys should not be pasted on a
 * shared machine.
 */

export const STORAGE_KEY = "tcg.settings.v1";

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Never throws: bad JSON, a schema change or a wiped key all fall back to
 * defaults rather than leaving the app stuck on a blank screen.
 */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = settingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function loadSettings(): Settings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  try {
    return parseSettings(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Private mode or a blocked storage partition.
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Quota exceeded or storage disabled — settings just do not persist.
  }
}

export function clearSettings(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/** Wipes only the secrets, keeping rules and preferences. */
export function withoutSecrets(settings: Settings): Settings {
  return { ...settings, apiKeys: {}, ollamaBaseUrl: undefined };
}
