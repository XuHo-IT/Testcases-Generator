"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import {
  CHECK_TYPE_LABELS,
  CHECK_TYPES,
  MAX_PATTERN_LENGTH,
  RULE_TARGETS,
  RULE_TARGET_LABELS,
  customRuleSchema,
  describeCheck,
  newCustomRuleId,
  type CheckType,
  type CustomRule,
  type CustomRuleCheck,
  type RuleTarget,
} from "@/lib/schemas/custom-rule";
import { supportsCountCheck } from "@/lib/validation/custom-rules";
import { SEVERITY_LABELS, type RuleSeverity } from "@/lib/validation/rule-catalog";
import { SEVERITIES } from "@/lib/schemas/validation";

const SEVERITY_STYLES: Record<RuleSeverity, string> = {
  error: "bg-danger-soft text-danger",
  warning: "bg-warn-soft text-warn",
  info: "bg-accent-soft text-accent",
};

interface Draft {
  id: string;
  name: string;
  severity: RuleSeverity;
  target: RuleTarget;
  checkType: CheckType;
  text: string;
  num: string;
  ignoreCase: boolean;
  message: string;
}

const EXAMPLES: { label: string; apply: (d: Draft) => Draft }[] = [
  {
    label: "Kết quả mong đợi phải có mã HTTP",
    apply: (d) => ({
      ...d,
      name: "Kết quả mong đợi phải có mã HTTP",
      target: "expectedResult",
      checkType: "matches",
      text: "\\b\\d{3}\\b",
      message: "Kết quả mong đợi phải nêu mã HTTP cụ thể, ví dụ 200 hoặc 401.",
    }),
  },
  {
    label: "Mỗi test case tối thiểu 3 bước",
    apply: (d) => ({
      ...d,
      name: "Mỗi test case tối thiểu 3 bước",
      target: "steps",
      checkType: "minCount",
      num: "3",
      message: "Test case cần ít nhất 3 bước để người khác chạy lại được.",
    }),
  },
  {
    label: "Không được nhắc tên môi trường staging",
    apply: (d) => ({
      ...d,
      name: "Không được nhắc môi trường staging",
      target: "anyText",
      checkType: "mustNotContain",
      text: "staging",
      message: "Test case không được gắn cứng vào môi trường staging.",
    }),
  },
];

function emptyDraft(existing: readonly CustomRule[]): Draft {
  return {
    id: newCustomRuleId(existing),
    name: "",
    severity: "warning",
    target: "expectedResult",
    checkType: "mustContain",
    text: "",
    num: "1",
    ignoreCase: true,
    message: "",
  };
}

function toDraft(rule: CustomRule): Draft {
  const c = rule.check;
  return {
    id: rule.id,
    name: rule.name,
    severity: rule.severity,
    target: rule.target,
    checkType: c.type,
    text: "value" in c && typeof c.value === "string" ? c.value : "pattern" in c ? c.pattern : "",
    num: "value" in c && typeof c.value === "number" ? String(c.value) : "1",
    ignoreCase: "ignoreCase" in c ? c.ignoreCase : true,
    message: rule.message,
  };
}

function buildCheck(draft: Draft): CustomRuleCheck {
  switch (draft.checkType) {
    case "mustContain":
    case "mustNotContain":
      return { type: draft.checkType, value: draft.text, ignoreCase: draft.ignoreCase };
    case "matches":
    case "notMatches":
      return { type: draft.checkType, pattern: draft.text, ignoreCase: draft.ignoreCase };
    default:
      return { type: draft.checkType, value: Number(draft.num) };
  }
}

const isTextCheck = (t: CheckType) =>
  t === "mustContain" || t === "mustNotContain" || t === "matches" || t === "notMatches";
const isRegexCheck = (t: CheckType) => t === "matches" || t === "notMatches";
const isCountCheck = (t: CheckType) => t === "minCount" || t === "maxCount";

export function CustomRulesSection() {
  const { settings, hydrated, update } = useSettings();
  const rules = settings.customRules;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  function startNew() {
    setErrors([]);
    setDraft(emptyDraft(rules));
  }

  function save() {
    if (!draft) return;
    const candidate = {
      id: draft.id,
      name: draft.name.trim(),
      enabled: true,
      severity: draft.severity,
      target: draft.target,
      check: buildCheck(draft),
      message: draft.message.trim(),
    };
    const parsed = customRuleSchema.safeParse(candidate);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    const rule = parsed.data;
    update((current) => ({
      ...current,
      customRules: current.customRules.some((r) => r.id === rule.id)
        ? current.customRules.map((r) => (r.id === rule.id ? { ...rule, enabled: r.enabled } : r))
        : [...current.customRules, rule],
    }));
    setDraft(null);
    setErrors([]);
  }

  function remove(id: string) {
    update((current) => ({
      ...current,
      customRules: current.customRules.filter((r) => r.id !== id),
    }));
    if (draft?.id === id) setDraft(null);
  }

  function toggle(id: string, enabled: boolean) {
    update((current) => ({
      ...current,
      customRules: current.customRules.map((r) => (r.id === id ? { ...r, enabled } : r)),
    }));
  }

  const countAllowed = draft ? supportsCountCheck(draft.target) : false;

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <h2 className="font-display text-xl leading-tight tracking-tight text-ink">Rule riêng của bạn</h2>
          <p className="hint mt-1.5 max-w-2xl">
            Thêm quy ước của công ty mà chuẩn ISTQB không bao gồm. Rule đang bật vừa được đưa vào yêu cầu
            gửi cho AI, vừa dùng để chấm lại test case sau khi sinh.
          </p>
        </div>
        {!draft && (
          <button type="button" onClick={startNew} disabled={!hydrated} className="btn btn-primary">
            Thêm rule
          </button>
        )}
      </div>

      {hydrated && rules.length === 0 && !draft && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted">Chưa có rule riêng nào.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  setErrors([]);
                  setDraft(ex.apply(emptyDraft(rules)));
                }}
                className="chip"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {rules.length > 0 && (
        <ul className="divide-y divide-line">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-start gap-4 px-5 py-4">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => toggle(rule.id, e.target.checked)}
                aria-label={`Bật rule ${rule.name}`}
                className="mt-1 accent-[var(--accent)]"
              />
              <div className={`flex-1 ${rule.enabled ? "" : "opacity-50"}`}>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-mono text-xs text-muted">{rule.id}</span>
                  <span className="text-sm font-medium text-ink">{rule.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${SEVERITY_STYLES[rule.severity]}`}>
                    {SEVERITY_LABELS[rule.severity]}
                  </span>
                </div>
                <p className="hint mt-1">
                  {RULE_TARGET_LABELS[rule.target]} — {describeCheck(rule.check)}
                </p>
                <p className="hint mt-0.5 italic">Báo lỗi: “{rule.message}”</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setErrors([]);
                    setDraft(toDraft(rule));
                  }}
                  className="chip"
                >
                  Sửa
                </button>
                <button type="button" onClick={() => remove(rule.id)} className="chip">
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <div className="space-y-4 border-t border-line bg-sunken p-5">
          <h3 className="text-sm font-medium text-ink">
            {rules.some((r) => r.id === draft.id) ? `Sửa ${draft.id}` : `Rule mới ${draft.id}`}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cr-name" className="label">
                Tên rule
              </label>
              <input
                id="cr-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Kết quả mong đợi phải có mã HTTP"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="cr-severity" className="label">
                Mức độ
              </label>
              <select
                id="cr-severity"
                value={draft.severity}
                onChange={(e) => setDraft({ ...draft, severity: e.target.value as RuleSeverity })}
                className="field"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cr-target" className="label">
                Kiểm tra ở đâu
              </label>
              <select
                id="cr-target"
                value={draft.target}
                onChange={(e) => {
                  const target = e.target.value as RuleTarget;
                  const nextType =
                    isCountCheck(draft.checkType) && !supportsCountCheck(target)
                      ? "mustContain"
                      : draft.checkType;
                  setDraft({ ...draft, target, checkType: nextType });
                }}
                className="field"
              >
                {RULE_TARGETS.map((t) => (
                  <option key={t} value={t}>
                    {RULE_TARGET_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cr-check" className="label">
                Điều kiện
              </label>
              <select
                id="cr-check"
                value={draft.checkType}
                onChange={(e) => setDraft({ ...draft, checkType: e.target.value as CheckType })}
                className="field"
              >
                {CHECK_TYPES.filter((t) => !isCountCheck(t) || countAllowed).map((t) => (
                  <option key={t} value={t}>
                    {CHECK_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {isTextCheck(draft.checkType) ? (
              <div className="sm:col-span-2">
                <label htmlFor="cr-text" className="label">
                  {isRegexCheck(draft.checkType) ? "Biểu thức chính quy" : "Nội dung"}
                </label>
                <input
                  id="cr-text"
                  value={draft.text}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  maxLength={isRegexCheck(draft.checkType) ? MAX_PATTERN_LENGTH : undefined}
                  placeholder={isRegexCheck(draft.checkType) ? "\\b\\d{3}\\b" : "mã lỗi"}
                  className="field font-mono text-xs"
                />
                <label className="mt-2 flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={draft.ignoreCase}
                    onChange={(e) => setDraft({ ...draft, ignoreCase: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                  Không phân biệt hoa thường
                </label>
                {isRegexCheck(draft.checkType) && (
                  <p className="hint mt-1.5">
                    Tối đa {MAX_PATTERN_LENGTH} ký tự. Biểu thức quá phức tạp có thể làm chậm bước kiểm tra.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="cr-num" className="label">
                  Giá trị
                </label>
                <input
                  id="cr-num"
                  type="number"
                  min={0}
                  value={draft.num}
                  onChange={(e) => setDraft({ ...draft, num: e.target.value })}
                  className="field"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="cr-message" className="label">
                Thông báo khi vi phạm
              </label>
              <input
                id="cr-message"
                value={draft.message}
                onChange={(e) => setDraft({ ...draft, message: e.target.value })}
                placeholder="Kết quả mong đợi phải nêu mã HTTP cụ thể."
                className="field"
              />
              <p className="hint mt-1.5">
                Câu này vừa hiện trong báo cáo kiểm tra, vừa được gửi cho AI để nó tuân thủ ngay từ đầu.
              </p>
            </div>
          </div>

          {errors.length > 0 && (
            <ul className="space-y-1">
              {errors.map((e, i) => (
                <li key={i} className="text-sm text-danger">
                  {e}
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={save} className="btn btn-primary">
              Lưu rule
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setErrors([]);
              }}
              className="btn btn-secondary"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
