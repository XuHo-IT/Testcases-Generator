import type { Language } from "@/lib/schemas/test-case";
import { languageDirective } from "./fragments";

/**
 * Use-case report prompt, ported from CreateUseCaseReportPrompt in the legacy
 * GeminiService.cs (structure now enforced by generateObject).
 * Note: the "software requirements expert" persona doubles as the fixture
 * selector marker in the mock provider — keep it if you rephrase.
 */
export function buildUseCaseReportPrompt(
  useCaseName: string,
  additionalContext: string | undefined,
  language: Language
): string {
  const contextPart = additionalContext?.trim()
    ? `\n\nAdditional context:\n${additionalContext.trim()}`
    : "";

  return `You are a software requirements expert. Write a comprehensive use case report for the use case: "${useCaseName}".${contextPart}

Requirements:
1. Analyze the use case and produce a complete, professional specification.
2. Generate realistic actors, trigger and flows for this domain.
3. Normal flow: 3-6 numbered steps describing the main success scenario.
4. Include 1-2 alternative flows when applicable (flowId like "1.1").
5. Include relevant exceptions with error handling (exceptionId like "1.E1").
6. Set priority and frequencyOfUse (High/Medium/Low) appropriate to the use case type.
7. List realistic business rules and assumptions.
8. Use "UC-1" as ucId unless the context implies otherwise, and today's date in DD/MM/YYYY format for dateCreated.

Examples of good analysis:
- "User Login": primary actor User; trigger: user wants to access the system; flow: navigate to login → enter credentials → submit → validate → redirect.
- "Payment Processing": primary actor Customer; trigger: user wants to pay; flow: enter payment details → validate → process → confirm.

${languageDirective(language)}`;
}
