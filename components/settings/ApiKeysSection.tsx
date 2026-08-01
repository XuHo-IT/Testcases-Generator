"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { KEYED_PROVIDERS, type KeyedProvider } from "@/lib/settings/schema";
import { MODEL_CATALOG, PROVIDER_LABELS } from "@/lib/ai/models.config";

const KEY_HELP: Record<KeyedProvider, { where: string; prefix: string }> = {
  anthropic: { where: "console.anthropic.com → Settings → API keys", prefix: "sk-ant-…" },
  openai: { where: "platform.openai.com → API keys", prefix: "sk-…" },
  google: { where: "aistudio.google.com → Get API key", prefix: "AIza…" },
};

type TestState = { status: "idle" | "testing" | "ok" | "fail"; message?: string };

export function ApiKeysSection() {
  const { settings, hydrated, update, clearSecrets } = useSettings();
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [tests, setTests] = useState<Record<string, TestState>>({});

  async function testConnection(providerId: string) {
    const model = MODEL_CATALOG.find((m) => m.providerId === providerId && m.recommended)
      ?? MODEL_CATALOG.find((m) => m.providerId === providerId);
    if (!model) return;

    setTests((t) => ({ ...t, [providerId]: { status: "testing" } }));
    try {
      const credentials =
        providerId === "ollama"
          ? { baseUrl: settings.ollamaBaseUrl }
          : { apiKey: settings.apiKeys[providerId as KeyedProvider] };

      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, modelId: model.modelId, credentials }),
      });
      const data = await res.json();
      setTests((t) => ({
        ...t,
        [providerId]: data.ok
          ? { status: "ok", message: `Kết nối được tới ${model.label}` }
          : { status: "fail", message: data.error ?? "Không kết nối được" },
      }));
    } catch {
      setTests((t) => ({ ...t, [providerId]: { status: "fail", message: "Lỗi mạng" } }));
    }
  }

  const hasAnySecret =
    KEYED_PROVIDERS.some((p) => settings.apiKeys[p]) || Boolean(settings.ollamaBaseUrl);

  return (
    <section className="card p-5">
      <h2 className="font-display text-xl leading-tight tracking-tight text-ink">API key của bạn</h2>
      <p className="hint mt-1.5 max-w-2xl">
        Key được lưu trong trình duyệt trên máy này và chỉ gửi kèm khi bạn bấm sinh test case — máy chủ
        không lưu lại và không ghi vào log. Không nên nhập key trên máy dùng chung.
      </p>

      <div className="mt-5 space-y-5">
        {KEYED_PROVIDERS.map((providerId) => {
          const help = KEY_HELP[providerId];
          const test = tests[providerId] ?? { status: "idle" as const };
          const value = settings.apiKeys[providerId] ?? "";
          return (
            <div key={providerId}>
              <label htmlFor={`key-${providerId}`} className="label">
                {PROVIDER_LABELS[providerId]}
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id={`key-${providerId}`}
                  type={visible[providerId] ? "text" : "password"}
                  value={hydrated ? value : ""}
                  disabled={!hydrated}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={hydrated ? help.prefix : "Đang tải…"}
                  onChange={(e) =>
                    update((current) => ({
                      ...current,
                      apiKeys: { ...current.apiKeys, [providerId]: e.target.value.trim() || undefined },
                    }))
                  }
                  className="field flex-1 font-mono text-xs"
                  style={{ minWidth: "16rem" }}
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => ({ ...v, [providerId]: !v[providerId] }))}
                  className="btn btn-secondary"
                >
                  {visible[providerId] ? "Ẩn" : "Hiện"}
                </button>
                <button
                  type="button"
                  onClick={() => testConnection(providerId)}
                  disabled={!value || test.status === "testing"}
                  className="btn btn-secondary"
                >
                  {test.status === "testing" ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
                </button>
              </div>
              <p className="hint mt-1.5">Lấy key tại {help.where}</p>
              {test.status === "ok" && <p className="mt-1 text-xs text-ok">{test.message}</p>}
              {test.status === "fail" && <p className="mt-1 text-xs text-danger">{test.message}</p>}
            </div>
          );
        })}

        <div>
          <label htmlFor="ollama-url" className="label">
            {PROVIDER_LABELS.ollama}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="ollama-url"
              type="url"
              value={hydrated ? (settings.ollamaBaseUrl ?? "") : ""}
              disabled={!hydrated}
              placeholder="http://localhost:11434"
              onChange={(e) => update({ ollamaBaseUrl: e.target.value.trim() || undefined })}
              className="field flex-1 font-mono text-xs"
              style={{ minWidth: "16rem" }}
            />
            <button
              type="button"
              onClick={() => testConnection("ollama")}
              disabled={!settings.ollamaBaseUrl || tests.ollama?.status === "testing"}
              className="btn btn-secondary"
            >
              {tests.ollama?.status === "testing" ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
            </button>
          </div>
          <p className="hint mt-1.5">
            Model chạy nội bộ — dữ liệu requirement không ra khỏi mạng của bạn.
          </p>
          {tests.ollama?.status === "ok" && <p className="mt-1 text-xs text-ok">{tests.ollama.message}</p>}
          {tests.ollama?.status === "fail" && (
            <p className="mt-1 text-xs text-danger">{tests.ollama.message}</p>
          )}
        </div>
      </div>

      {hasAnySecret && (
        <button type="button" onClick={clearSecrets} className="btn btn-secondary mt-5">
          Xóa toàn bộ key khỏi trình duyệt
        </button>
      )}
    </section>
  );
}
