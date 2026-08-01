"use client";

import type { CaseValidation } from "@/lib/schemas/validation";

const STYLES: Record<CaseValidation["status"], string> = {
  valid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  repaired: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  invalid: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const LABELS: Record<CaseValidation["status"], string> = {
  valid: "Valid",
  repaired: "Repaired",
  invalid: "Invalid",
};

export function ValidationBadge({ validation }: { validation?: CaseValidation }) {
  if (!validation) return null;
  const tooltip = validation.issues.map((i) => `${i.ruleId}: ${i.message}`).join("\n") || "Passes all rules";

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${STYLES[validation.status]}`}
    >
      {LABELS[validation.status]}
      {validation.issues.length > 0 && <span className="opacity-70">({validation.issues.length})</span>}
    </span>
  );
}
