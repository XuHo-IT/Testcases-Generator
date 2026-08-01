"use client";

import { useSettings } from "@/components/SettingsProvider";
import { RULE_CATALOG, SCOPE_LABELS, SEVERITY_LABELS, type RuleSeverity } from "@/lib/validation/rule-catalog";

const SEVERITY_STYLES: Record<RuleSeverity, string> = {
  error: "bg-danger-soft text-danger",
  warning: "bg-warn-soft text-warn",
  info: "bg-accent-soft text-accent",
};

export function RulesSection() {
  const { settings, hydrated, update } = useSettings();
  const disabled = new Set(settings.disabledRuleIds);

  function toggle(ruleId: string, enabled: boolean) {
    update((current) => ({
      ...current,
      disabledRuleIds: enabled
        ? current.disabledRuleIds.filter((id) => id !== ruleId)
        : [...current.disabledRuleIds, ruleId],
    }));
  }

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line p-5">
        <h2 className="font-display text-xl leading-tight tracking-tight text-ink">
          14 rule kiểm tra chuẩn ISTQB
        </h2>
        <p className="hint mt-1.5 max-w-2xl">
          Mọi test case sinh ra đều chạy qua các rule này. Tắt rule nào thì rule đó không còn báo lỗi hay
          cảnh báo nữa — dùng khi quy ước của đội bạn khác chuẩn mặc định.
          {hydrated && disabled.size > 0 && (
            <> Đang tắt <span className="tabular text-warn">{disabled.size}</span> rule.</>
          )}
        </p>
      </div>

      <ul className="divide-y divide-line">
        {RULE_CATALOG.map((rule) => {
          const enabled = !disabled.has(rule.id);
          return (
            <li key={rule.id} className="flex items-start gap-4 px-5 py-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={hydrated ? enabled : true}
                  disabled={!hydrated}
                  onChange={(e) => toggle(rule.id, e.target.checked)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span className="sr-only">Bật rule {rule.id}</span>
              </label>

              <div className={`flex-1 ${enabled ? "" : "opacity-50"}`}>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-mono text-xs text-muted">{rule.id}</span>
                  <span className="text-sm font-medium text-ink">{rule.title}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${SEVERITY_STYLES[rule.severity]}`}>
                    {SEVERITY_LABELS[rule.severity]}
                  </span>
                  <span className="text-xs text-subtle">{SCOPE_LABELS[rule.scope]}</span>
                </div>
                <p className="hint mt-1">{rule.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
