"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { Settings } from "@/lib/settings/schema";
import { withoutSecrets } from "@/lib/settings/storage";
import {
  clientOnlyStore,
  getServerSnapshot,
  getSnapshot,
  setSettings,
  subscribe,
} from "@/lib/settings/store";
import type { ProviderCredentials } from "@/lib/ai/registry";

interface SettingsContextValue {
  settings: Settings;
  /** False during SSR and the first hydration pass — see lib/settings/store.ts. */
  hydrated: boolean;
  update: (patch: Partial<Settings> | ((current: Settings) => Settings)) => void;
  clearSecrets: () => void;
  /** Credentials for one provider, ready to attach to a request. */
  credentialsFor: (providerId: string) => ProviderCredentials | undefined;
  hasCredentials: (providerId: string) => boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    clientOnlyStore.subscribe,
    clientOnlyStore.getSnapshot,
    clientOnlyStore.getServerSnapshot
  );

  const update = useCallback<SettingsContextValue["update"]>((patch) => {
    const current = getSnapshot();
    setSettings(typeof patch === "function" ? patch(current) : { ...current, ...patch });
  }, []);

  const clearSecrets = useCallback(() => {
    setSettings(withoutSecrets(getSnapshot()));
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const credentialsFor = (providerId: string): ProviderCredentials | undefined => {
      if (providerId === "ollama") {
        return settings.ollamaBaseUrl ? { baseUrl: settings.ollamaBaseUrl } : undefined;
      }
      const apiKey = settings.apiKeys[providerId as keyof typeof settings.apiKeys];
      return apiKey ? { apiKey } : undefined;
    };

    return {
      settings,
      hydrated,
      update,
      clearSecrets,
      credentialsFor,
      hasCredentials: (providerId) => Boolean(credentialsFor(providerId)),
    };
  }, [settings, hydrated, update, clearSecrets]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings phải nằm trong <SettingsProvider>");
  return ctx;
}
