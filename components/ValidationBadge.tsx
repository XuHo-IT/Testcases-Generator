"use client";

import type { CaseValidation } from "@/lib/schemas/validation";

const STYLES: Record<CaseValidation["status"], string> = {
  valid: "bg-ok-soft text-ok",
  repaired: "bg-warn-soft text-warn",
  invalid: "bg-danger-soft text-danger",
};

const LABELS: Record<CaseValidation["status"], string> = {
  valid: "Đạt",
  repaired: "Đã sửa",
  invalid: "Lỗi",
};

export function ValidationBadge({ validation }: { validation?: CaseValidation }) {
  if (!validation) return null;
  const tooltip =
    validation.issues.map((i) => `${i.ruleId}: ${i.message}`).join("\n") || "Đạt toàn bộ rule";

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${STYLES[validation.status]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {LABELS[validation.status]}
      {validation.issues.length > 0 && (
        <span className="tabular opacity-70">{validation.issues.length}</span>
      )}
    </span>
  );
}
