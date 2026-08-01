"use client";

import { useEffect, useState } from "react";
import type { ModelEntry, ProviderId } from "@/lib/ai/models.config";

export interface ProviderGroup {
  providerId: ProviderId;
  label: string;
  available: boolean;
  reason?: string;
  models: ModelEntry[];
}

export interface ModelSelection {
  providerId: string;
  modelId: string;
}

interface Props {
  value: ModelSelection | null;
  onChange: (selection: ModelSelection) => void;
}

export function ModelPicker({ value, onChange }: Props) {
  const [groups, setGroups] = useState<ProviderGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models")
      .then((r) => r.json())
      .then((data: { providers: ProviderGroup[] }) => {
        if (cancelled) return;
        setGroups(data.providers);
        if (!value) {
          const firstAvailable = data.providers.find((g) => g.available && g.models.length > 0);
          const model =
            firstAvailable?.models.find((m) => m.recommended) ?? firstAvailable?.models[0];
          if (firstAvailable && model) {
            onChange({ providerId: firstAvailable.providerId, modelId: model.modelId });
          }
        }
      })
      .catch(() => !cancelled && setError("Could not load the model list"));
    return () => {
      cancelled = true;
    };
    // Intentionally run once — the catalog is static per deployment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!groups) return <p className="text-sm opacity-60">Loading models…</p>;

  const anyAvailable = groups.some((g) => g.available && g.models.length > 0);
  const selectValue = value ? `${value.providerId}::${value.modelId}` : "";

  return (
    <div className="space-y-1">
      <label htmlFor="model" className="block text-sm font-medium">
        AI model
      </label>
      <select
        id="model"
        value={selectValue}
        onChange={(e) => {
          const [providerId, modelId] = e.target.value.split("::");
          onChange({ providerId, modelId });
        }}
        className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      >
        {!anyAvailable && <option value="">No provider configured</option>}
        {groups.map((group) => (
          <optgroup
            key={group.providerId}
            label={group.available ? group.label : `${group.label} — unavailable`}
          >
            {group.models.map((model) => (
              <option
                key={model.modelId}
                value={`${group.providerId}::${model.modelId}`}
                disabled={!group.available}
              >
                {model.label}
                {model.recommended ? " ★" : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {groups
        .filter((g) => !g.available && g.reason)
        .map((g) => (
          <p key={g.providerId} className="text-xs opacity-60">
            {g.label}: {g.reason}
          </p>
        ))}

      {(() => {
        const notes = groups
          .flatMap((g) => g.models)
          .find((m) => m.providerId === value?.providerId && m.modelId === value?.modelId)?.notes;
        return notes ? <p className="text-xs opacity-70">{notes}</p> : null;
      })()}
    </div>
  );
}
