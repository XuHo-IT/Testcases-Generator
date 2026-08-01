import type { GenerateOptions, NormalizedInput } from "@/lib/schemas/generation";
import { SOURCE_TYPE_LABELS } from "@/lib/schemas/generation";
import { languageDirective, QUALITY_DIRECTIVES } from "./fragments";

/**
 * Single prompt for test-suite generation. Replaces the two ~85%-duplicate
 * prompts from the legacy backend (CreatePrompt / CreateUseCaseTablePrompt in
 * GeminiService.cs) — structure is enforced by generateObject, so the JSON
 * skeleton and "Return ONLY the JSON" plumbing are gone.
 */
export function buildTestSuitePrompt(input: NormalizedInput, options: GenerateOptions): string {
  const sections: string[] = [];

  sections.push(
    `You are a senior software test engineer. Design an executable manual test suite for the ${SOURCE_TYPE_LABELS[input.sourceType]} below.`
  );

  sections.push(`## ${SOURCE_TYPE_LABELS[input.sourceType]}: ${input.title}\n\n${input.body}`);

  if (input.acceptanceCriteria?.length) {
    const list = input.acceptanceCriteria.map((ac) => `- ${ac.id}: ${ac.text}`).join("\n");
    sections.push(
      `## Acceptance criteria\n${list}\n\nEvery acceptance criterion must be covered by at least one test case, and those cases must set "requirementRef" to the criterion's ID.`
    );
  }

  sections.push(`## Analysis instructions
1. Identify the input fields involved and, for each, a realistic data type and constraints (min/max for numbers and dates, maxLength for strings, allowedValues for enums). Infer sensible values from the domain, e.g. age 10-18, salary 1000-100000, percentage 0-100.
2. Derive the possible outcomes as "returnConditions" — specific to this feature ("Login successful", "Account locked"), never generic.
3. Derive matching "logMessages" for success, error and validation scenarios ("Age must be at least 10").
4. Choose a short functionCode (e.g. "LOGIN", "AGE_VAL") and a descriptive functionName.
5. Use "REQ-1" as the requirement ID in requirementRef when no acceptance criteria are listed.`);

  const countHint = options.caseCountHint
    ? `Generate about ${options.caseCountHint} test cases.`
    : "Generate as many test cases as the requirement genuinely needs for solid coverage (typically 5-12).";
  sections.push(`## Test case design\n${countHint}\n\n${QUALITY_DIRECTIVES}`);

  sections.push(languageDirective(options.language));

  return sections.join("\n\n");
}
