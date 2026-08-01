"use client";

import { useSettings } from "@/components/SettingsProvider";
import { ModelPicker } from "@/components/ModelPicker";
import type { Language } from "@/lib/schemas/test-case";

export function DefaultsSection() {
  const { settings, hydrated, update } = useSettings();

  return (
    <section className="card p-5">
      <h2 className="font-display text-xl leading-tight tracking-tight text-ink">
        Mặc định khi sinh test case
      </h2>
      <p className="hint mt-1.5 max-w-2xl">
        Những lựa chọn này được điền sẵn mỗi lần bạn mở trang sinh test case, không phải chọn lại từ đầu.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <ModelPicker
          value={
            settings.defaults.providerId && settings.defaults.modelId
              ? { providerId: settings.defaults.providerId, modelId: settings.defaults.modelId }
              : null
          }
          onChange={(selection) =>
            update((current) => ({
              ...current,
              defaults: { ...current.defaults, ...selection },
            }))
          }
        />

        <div>
          <label htmlFor="default-lang" className="label">
            Ngôn ngữ đầu ra
          </label>
          <select
            id="default-lang"
            value={settings.defaults.language}
            disabled={!hydrated}
            onChange={(e) =>
              update((current) => ({
                ...current,
                defaults: { ...current.defaults, language: e.target.value as Language },
              }))
            }
            className="field"
          >
            <option value="auto">Tự động theo requirement</option>
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>

        <div>
          <span className="label">Tùy chọn</span>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={settings.defaults.includeBva}
              disabled={!hydrated}
              onChange={(e) =>
                update((current) => ({
                  ...current,
                  defaults: { ...current.defaults, includeBva: e.target.checked },
                }))
              }
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span>
              Thêm test case giá trị biên
              <span className="hint mt-0.5 block">
                Sinh tất định min, max, min−1, max+1 cho mỗi field có ràng buộc.
              </span>
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
