import type { TestSuite } from "@/lib/schemas/test-case";
import type { CustomRule } from "@/lib/schemas/custom-rule";
import type { CaseValidation, ValidationIssue, ValidationReport } from "@/lib/schemas/validation";
import { ALL_RULES, type Rule } from "./rules";
import { compileCustomRules } from "./custom-rules";

export interface ValidateOptions {
  /** Cases repaired earlier in the pipeline — reported as "repaired" once they pass. */
  repairedIds?: ReadonlySet<string>;
  /** User-defined rules, evaluated alongside the built-in ones. */
  customRules?: readonly CustomRule[];
  /** Built-in rule ids the user switched off in settings. */
  disabledRuleIds?: readonly string[];
}

/** The rules that will actually run for a given set of options. */
export function activeRules(options: ValidateOptions = {}): Rule[] {
  const disabled = new Set(options.disabledRuleIds ?? []);
  return [...ALL_RULES.filter((r) => !disabled.has(r.id)), ...compileCustomRules(options.customRules)];
}

/** Runs all active rules and aggregates a ValidationReport. Pure and synchronous. */
export function validateSuite(suite: TestSuite, options: ValidateOptions = {}): ValidationReport {
  const repairedIds = options.repairedIds ?? new Set<string>();
  const issues: ValidationIssue[] = activeRules(options).flatMap((rule) => rule.run(suite));

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
