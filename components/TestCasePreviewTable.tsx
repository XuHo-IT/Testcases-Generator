"use client";

import { useState } from "react";
import type { TestSuite } from "@/lib/schemas/test-case";
import type { ValidationReport } from "@/lib/schemas/validation";
import { ValidationBadge } from "./ValidationBadge";

interface Props {
  suite: TestSuite;
  validation: ValidationReport;
}

export function TestCasePreviewTable({ suite, validation }: Props) {
  const [expanded, setExpanded] = useState<string | null>(suite.testCases[0]?.id ?? null);
  const byId = new Map(validation.perCase.map((c) => [c.testCaseId, c]));

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {suite.testCases.length} test cases — {suite.functionName}
        </h2>
        <p className="text-sm opacity-70">
          {validation.summary.valid} valid · {validation.summary.repaired} repaired ·{" "}
          {validation.summary.invalid} invalid · {validation.summary.errors} errors ·{" "}
          {validation.summary.warnings} warnings
        </p>
      </header>

      {validation.suiteIssues.length > 0 && (
        <ul className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {validation.suiteIssues.map((issue, i) => (
            <li key={`${issue.ruleId}-${i}`}>
              <span className="font-mono text-xs">{issue.ruleId}</span> — {issue.message}
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-black/5 dark:bg-white/10">
            <tr>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Traces to</th>
              <th className="px-3 py-2 font-medium">Validation</th>
            </tr>
          </thead>
          <tbody>
            {suite.testCases.map((tc) => {
              const isOpen = expanded === tc.id;
              return (
                <tr key={tc.id} className="border-t border-black/10 align-top dark:border-white/10">
                  <td colSpan={6} className="p-0">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : tc.id)}
                      className="grid w-full grid-cols-[6rem_1fr_6rem_6rem_7rem_7rem] items-center gap-2 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <span className="font-mono text-xs">{tc.id}</span>
                      <span>{tc.title}</span>
                      <span className="text-xs opacity-70">{tc.type}</span>
                      <span className="text-xs opacity-70">{tc.priority}</span>
                      <span className="font-mono text-xs opacity-70">{tc.requirementRef.requirementId}</span>
                      <ValidationBadge validation={byId.get(tc.id)} />
                    </button>

                    {isOpen && (
                      <div className="space-y-3 border-t border-black/10 bg-black/[0.02] px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                        {tc.objective && <p className="opacity-80">{tc.objective}</p>}

                        <div>
                          <h4 className="font-medium">Preconditions</h4>
                          <ul className="list-disc pl-5 opacity-90">
                            {tc.preconditions.map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium">Steps</h4>
                          <ol className="list-decimal pl-5 opacity-90">
                            {tc.steps.map((s) => (
                              <li key={s.order}>
                                {s.action}
                                {s.expectedResult && <span className="opacity-70"> → {s.expectedResult}</span>}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {tc.testData.length > 0 && (
                          <div>
                            <h4 className="font-medium">Test data</h4>
                            <ul className="pl-1 font-mono text-xs opacity-90">
                              {tc.testData.map((td, i) => (
                                <li key={i}>
                                  {td.field} = {td.value === "" ? "(empty)" : td.value}
                                  {td.note && <span className="opacity-70"> — {td.note}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium">Expected result</h4>
                          <p className="opacity-90">{tc.expectedResult}</p>
                        </div>

                        {(byId.get(tc.id)?.issues.length ?? 0) > 0 && (
                          <div>
                            <h4 className="font-medium">Validation issues</h4>
                            <ul className="list-disc pl-5">
                              {byId.get(tc.id)!.issues.map((issue, i) => (
                                <li
                                  key={i}
                                  className={issue.severity === "error" ? "text-red-600 dark:text-red-400" : "opacity-80"}
                                >
                                  <span className="font-mono text-xs">{issue.ruleId}</span> — {issue.message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
