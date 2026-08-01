import { z } from "zod";

/** Validation report shapes produced by the rule engine. */

export const SEVERITIES = ["error", "warning", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const validationIssueSchema = z.object({
  ruleId: z.string(),
  severity: z.enum(SEVERITIES),
  message: z.string(),
  /** Field the issue anchors to, e.g. "steps[2].action". */
  field: z.string().optional(),
  /** Present for per-case issues; absent for suite-level ones. */
  testCaseId: z.string().optional(),
});

export const caseValidationSchema = z.object({
  testCaseId: z.string(),
  status: z.enum(["valid", "repaired", "invalid"]),
  issues: z.array(validationIssueSchema),
});

export const validationReportSchema = z.object({
  suiteIssues: z.array(validationIssueSchema),
  perCase: z.array(caseValidationSchema),
  summary: z.object({
    errors: z.number().int(),
    warnings: z.number().int(),
    infos: z.number().int(),
    valid: z.number().int(),
    repaired: z.number().int(),
    invalid: z.number().int(),
  }),
});

export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type CaseValidation = z.infer<typeof caseValidationSchema>;
export type ValidationReport = z.infer<typeof validationReportSchema>;
