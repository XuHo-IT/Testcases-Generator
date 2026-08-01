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
          const model = firstAvailable?.models.find((m) => m.recommended) ?? firstAvailable?.models[0];
          if (firstAvailable && model) {
            onChange({ providerId: firstAvailable.providerId, modelId: model.modelId });
          }
        }
      })
      .catch(() => !cancelled && setError("Không tải được danh sách model"));
    return () => {
      cancelled = true;
    };
    // Chạy một lần — catalog cố định theo deployment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div>
        <span className="label">Model AI</span>
        <p className="text-xs text-danger">{error}</p>
      </div>
    );
  }

  if (!groups) {
    return (
      <div>
        <span className="label">Model AI</span>
        <div className="skeleton h-[38px] w-full" aria-hidden />
        <p className="hint mt-1.5">Đang tải danh sách model…</p>
      </div>
    );
  }

  const anyAvailable = groups.some((g) => g.available && g.models.length > 0);
  const selectValue = value ? `${value.providerId}::${value.modelId}` : "";
  const unavailable = groups.filter((g) => !g.available && g.reason);
  const activeNotes = groups
    .flatMap((g) => g.models)
    .find((m) => m.providerId === value?.providerId && m.modelId === value?.modelId)?.notes;

  return (
    <div>
      <label htmlFor="model" className="label">
        Model AI
      </label>
      <select
        id="model"
        value={selectValue}
        onChange={(e) => {
          const [providerId, modelId] = e.target.value.split("::");
          onChange({ providerId, modelId });
        }}
        className="field"
      >
        {!anyAvailable && <option value="">Chưa cấu hình provider nào</option>}
        {groups.map((group) => (
          <optgroup
            key={group.providerId}
            label={group.available ? group.label : `${group.label} — chưa sẵn sàng`}
          >
            {group.models.map((model) => (
              <option
                key={model.modelId}
                value={`${group.providerId}::${model.modelId}`}
                disabled={!group.available}
              >
                {model.label}
                {model.recommended ? " · khuyến nghị" : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {activeNotes && <p className="hint mt-1.5">{activeNotes}</p>}

      {unavailable.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted transition-colors hover:text-ink">
            {unavailable.length} provider chưa sẵn sàng
          </summary>
          <ul className="mt-1.5 space-y-1">
            {unavailable.map((g) => (
              <li key={g.providerId} className="hint">
                <span className="text-ink">{g.label}:</span> {g.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
