import type { TestCase } from "@/lib/schemas/test-case";
import type { ValidationIssue } from "@/lib/schemas/validation";
import { QUALITY_DIRECTIVES } from "./fragments";

/**
 * Prompt for the single AI repair pass: only the still-invalid cases are sent,
 * together with the concrete rule violations, and the model returns fixed
 * replacements in the same order.
 * The "## Repair task" heading is the fixture selector marker for the mock
 * provider — keep it if you rephrase.
 */
export function buildRepairPrompt(
  invalidCases: TestCase[],
  issuesByCaseId: Map<string, ValidationIssue[]>
): string {
  const blocks = invalidCases
    .map((tc) => {
      const issues = (issuesByCaseId.get(tc.id) ?? [])
        .map((i) => `- [${i.ruleId}] ${i.message}`)
        .join("\n");
      return `### ${tc.id}\nIssues:\n${issues}\n\nCurrent case:\n${JSON.stringify(tc, null, 2)}`;
    })
    .join("\n\n");

  return `You are a senior software test engineer reviewing generated test cases that failed quality validation.

## Repair task
Fix each test case below so that every listed issue is resolved. Keep the intent of the case; change only what the issues require. Return the fixed cases in the SAME ORDER as listed — one replacement per input case. Do not add or remove cases.

${QUALITY_DIRECTIVES}

## Cases to repair
${blocks}`;
}
