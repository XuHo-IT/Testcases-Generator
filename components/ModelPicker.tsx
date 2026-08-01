"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ModelEntry, ProviderId } from "@/lib/ai/models.config";
import { useSettings } from "./SettingsProvider";

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
  const { hasCredentials, hydrated } = useSettings();
  const [groups, setGroups] = useState<ProviderGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models")
      .then((r) => r.json())
      .then((data: { providers: ProviderGroup[] }) => {
        if (cancelled) return;
        setGroups(data.providers);
      })
      .catch(() => !cancelled && setError("Không tải được danh sách model"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-select only once settings are known, otherwise a provider the user has
  // a key for would be skipped in favour of an env-configured one.
  useEffect(() => {
    if (!groups || value || !hydrated) return;
    const firstUsable = groups.find(
      (g) => (g.available || hasCredentials(g.providerId)) && g.models.length > 0
    );
    const model = firstUsable?.models.find((m) => m.recommended) ?? firstUsable?.models[0];
    if (firstUsable && model) {
      onChange({ providerId: firstUsable.providerId, modelId: model.modelId });
    }
  }, [groups, value, hydrated, hasCredentials, onChange]);

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

  // A provider is usable when the deployment configured it OR the user pasted
  // their own key in Cài đặt.
  const usable = (g: ProviderGroup) => g.available || hasCredentials(g.providerId);
  const anyAvailable = groups.some((g) => usable(g) && g.models.length > 0);
  const selectValue = value ? `${value.providerId}::${value.modelId}` : "";
  const unavailable = groups.filter((g) => !usable(g) && g.reason);
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
            label={
              usable(group)
                ? hasCredentials(group.providerId) && !group.available
                  ? `${group.label} — key của bạn`
                  : group.label
                : `${group.label} — chưa sẵn sàng`
            }
          >
            {group.models.map((model) => (
              <option
                key={model.modelId}
                value={`${group.providerId}::${model.modelId}`}
                disabled={!usable(group)}
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
            <li className="hint">
              <Link href="/cai-dat" className="text-accent underline underline-offset-2">
                Nhập API key của bạn trong Cài đặt
              </Link>{" "}
              để dùng provider mà không cần biến môi trường.
            </li>
          </ul>
        </details>
      )}
    </div>
  );
}
