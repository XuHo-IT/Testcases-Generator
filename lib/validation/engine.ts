import type { TestSuite } from "@/lib/schemas/test-case";
import type { CaseValidation, ValidationIssue, ValidationReport } from "@/lib/schemas/validation";
import { ALL_RULES } from "./rules";

/** Runs all rules and aggregates a ValidationReport. Pure and synchronous. */
export function validateSuite(suite: TestSuite, repairedIds: ReadonlySet<string> = new Set()): ValidationReport {
  const issues: ValidationIssue[] = ALL_RULES.flatMap((rule) => rule.run(suite));

  const perCase: CaseValidation[] = suite.testCases.map((tc) => {
    const caseIssues = issues.filter((i) => i.testCaseId === tc.id);
    const hasErrors = caseIssues.some((i) => i.severity === "error");
    const status: CaseValidation["status"] = hasErrors
      ? "invalid"
      : repairedIds.has(tc.id)
        ? "repaired"
        : "valid";
    return { testCaseId: tc.id, status, issues: caseIssues };
  });

  const suiteIssues = issues.filter((i) => !i.testCaseId);

  const count = (severity: ValidationIssue["severity"]) => issues.filter((i) => i.severity === severity).length;
  const countStatus = (status: CaseValidation["status"]) => perCase.filter((c) => c.status === status).length;

  return {
    suiteIssues,
    perCase,
    summary: {
      errors: count("error"),
      warnings: count("warning"),
      infos: count("info"),
      valid: countStatus("valid"),
      repaired: countStatus("repaired"),
      invalid: countStatus("invalid"),
    },
  };
}

export function invalidCaseIds(report: ValidationReport): string[] {
  return report.perCase.filter((c) => c.status === "invalid").map((c) => c.testCaseId);
}
