import type { Language } from "@/lib/schemas/test-case";

/** Shared prompt fragments. Bump PROMPT_VERSION whenever wording changes. */

export const PROMPT_VERSION = "2026-08-01.1";

export function languageDirective(language: Language): string {
  switch (language) {
    case "en":
      return "Write all generated content in English.";
    case "vi":
      return "Write all generated content in Vietnamese (tiếng Việt). Keep field names, function codes and IDs in English.";
    default:
      return "Write the generated content in the same language as the requirement text (e.g. Vietnamese requirement → Vietnamese test cases). Keep field names, function codes and IDs in English.";
  }
}

/**
 * ISTQB-aligned quality bar. These directives are the prompt-side half of the
 * validation rules in lib/validation/rules — keep the two in sync.
 */
export const QUALITY_DIRECTIVES = `Quality requirements for every test case (ISTQB-aligned):
1. Traceability: "requirementRef" must name the requirement or acceptance criterion ID the case verifies (e.g. "REQ-1", "AC-2").
2. Title: unique, specific, 8-120 characters. Not just the feature name.
3. Preconditions: list the state/data that must exist before the steps. Use ["None"] when there are none.
4. Steps: ordered, concrete, imperative actions ("Enter \\"user@test.com\\" into the Email field"), never vague ("do the needful", "test the login", "etc.").
5. Test data: concrete literal values. Never placeholders like "<value>", "xxx", "TBD" or "sample".
6. Expected result: one observable outcome precise enough for a pass/fail verdict — exact message text, resulting state, returned value or HTTP status code. Never "works correctly" or "as expected".
7. Coverage: include positive (happy path), negative (invalid input / error path) and boundary cases. Apply boundary value analysis to every bounded field (min, max, min-1, max+1) and equivalence partitioning to avoid redundant cases.
8. Priority: High for core business flows and security, Medium for common alternates, Low for cosmetic/rare paths.
9. NEVER include execution results — no Passed/Failed status, no defect IDs, no execution dates. Generated cases are specifications, not test runs.`;
