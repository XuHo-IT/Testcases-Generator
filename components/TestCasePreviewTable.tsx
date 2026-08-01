"use client";

import { useState } from "react";
import type { TestSuite } from "@/lib/schemas/test-case";
import type { ValidationReport } from "@/lib/schemas/validation";
import { ValidationBadge } from "./ValidationBadge";

interface Props {
  suite: TestSuite;
  validation: ValidationReport;
}

const TYPE_LABELS: Record<string, string> = {
  positive: "Hợp lệ",
  negative: "Bất thường",
  boundary: "Biên",
};

const PRIORITY_LABELS: Record<string, string> = {
  High: "Cao",
  Medium: "Trung bình",
  Low: "Thấp",
};

function Stat({ value, label, tone }: { value: number; label: string; tone?: "ok" | "warn" | "danger" }) {
  const toneClass = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="px-4 py-3">
      <div className={`tabular text-xl leading-none ${toneClass}`}>{value}</div>
      <div className="mt-1.5 text-xs text-muted">{label}</div>
    </div>
  );
}

export function TestCasePreviewTable({ suite, validation }: Props) {
  const [expanded, setExpanded] = useState<string | null>(suite.testCases[0]?.id ?? null);
  const byId = new Map(validation.perCase.map((c) => [c.testCaseId, c]));

  return (
    <section className="rise space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-2xl leading-tight tracking-tight text-ink">
          {suite.functionName}
        </h2>
        <p className="text-xs text-muted">
          <span className="font-mono">{suite.functionCode}</span> · {suite.requirement.id} ·{" "}
          <span className="font-mono">{suite.meta.modelId}</span>
        </p>
      </div>

      <div className="card grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
        <Stat value={suite.testCases.length} label="Tổng test case" />
        <Stat value={validation.summary.valid} label="Đạt" tone="ok" />
        <Stat value={validation.summary.repaired} label="Đã tự sửa" tone={validation.summary.repaired > 0 ? "warn" : undefined} />
        <Stat value={validation.summary.invalid} label="Còn lỗi" tone={validation.summary.invalid > 0 ? "danger" : undefined} />
      </div>

      {validation.suiteIssues.length > 0 && (
        <div className="card border-l-2 border-l-warn p-4">
          <h3 className="text-sm font-medium text-ink">Cảnh báo mức bộ test</h3>
          <ul className="mt-2 space-y-1.5">
            {validation.suiteIssues.map((issue, i) => (
              <li key={`${issue.ruleId}-${i}`} className="text-sm text-muted">
                <span className="font-mono text-xs text-warn">{issue.ruleId}</span> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[5.5rem_1fr_7rem_7rem_6rem_6.5rem] gap-3 border-b border-line bg-sunken px-4 py-2.5 text-xs font-medium text-muted md:grid">
          <span>Mã</span>
          <span>Tiêu đề</span>
          <span>Loại</span>
          <span>Độ ưu tiên</span>
          <span>Truy vết</span>
          <span>Kiểm tra</span>
        </div>

        <ul className="divide-y divide-line">
          {suite.testCases.map((tc) => {
            const isOpen = expanded === tc.id;
            const v = byId.get(tc.id);
            return (
              <li key={tc.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : tc.id)}
                  aria-expanded={isOpen}
                  className="grid w-full grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-sunken md:grid-cols-[5.5rem_1fr_7rem_7rem_6rem_6.5rem]"
                >
                  <span className="font-mono text-xs text-muted">{tc.id}</span>
                  <span className="text-sm text-ink">{tc.title}</span>
                  <span className="col-start-2 flex items-center gap-2 md:col-start-auto">
                    <span className="text-xs text-muted">{TYPE_LABELS[tc.type] ?? tc.type}</span>
                    <span className="text-xs text-subtle md:hidden">·</span>
                    <span className="text-xs text-muted md:hidden">
                      {PRIORITY_LABELS[tc.priority] ?? tc.priority}
                    </span>
                  </span>
                  <span className="hidden text-xs text-muted md:block">
                    {PRIORITY_LABELS[tc.priority] ?? tc.priority}
                  </span>
                  <span className="hidden font-mono text-xs text-muted md:block">
                    {tc.requirementRef.requirementId}
                  </span>
                  <span className="col-start-2 md:col-start-auto">
                    <ValidationBadge validation={v} />
                  </span>
                </button>

                {isOpen && (
                  <div className="grid gap-5 border-t border-line bg-sunken px-4 py-4 text-sm md:grid-cols-2">
                    {tc.objective && (
                      <p className="text-muted md:col-span-2">{tc.objective}</p>
                    )}

                    <div>
                      <h4 className="text-xs font-medium tracking-wide text-subtle uppercase">
                        Điều kiện tiên quyết
                      </h4>
                      <ul className="mt-1.5 space-y-1 text-ink">
                        {tc.preconditions.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium tracking-wide text-subtle uppercase">
                        Dữ liệu test
                      </h4>
                      {tc.testData.length > 0 ? (
                        <ul className="mt-1.5 space-y-1">
                          {tc.testData.map((td, i) => (
                            <li key={i} className="font-mono text-xs text-ink">
                              {td.field} = {td.value === "" ? "(rỗng)" : td.value}
                              {td.note && <span className="text-muted"> — {td.note}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-muted">Không có</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <h4 className="text-xs font-medium tracking-wide text-subtle uppercase">
                        Các bước thực hiện
                      </h4>
                      <ol className="mt-1.5 space-y-1.5">
                        {tc.steps.map((s) => (
                          <li key={s.order} className="flex gap-3 text-ink">
                            <span className="tabular shrink-0 font-mono text-xs text-subtle">
                              {String(s.order).padStart(2, "0")}
                            </span>
                            <span>
                              {s.action}
                              {s.expectedResult && (
                                <span className="text-muted"> → {s.expectedResult}</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="md:col-span-2">
                      <h4 className="text-xs font-medium tracking-wide text-subtle uppercase">
                        Kết quả mong đợi
                      </h4>
                      <p className="mt-1.5 text-ink">{tc.expectedResult}</p>
                    </div>

                    {(v?.issues.length ?? 0) > 0 && (
                      <div className="md:col-span-2">
                        <h4 className="text-xs font-medium tracking-wide text-subtle uppercase">
                          Vấn đề phát hiện
                        </h4>
                        <ul className="mt-1.5 space-y-1">
                          {v!.issues.map((issue, i) => (
                            <li
                              key={i}
                              className={issue.severity === "error" ? "text-danger" : "text-muted"}
                            >
                              <span className="font-mono text-xs">{issue.ruleId}</span> {issue.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
