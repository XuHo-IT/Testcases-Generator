import type { GenerateInput, NormalizedInput } from "@/lib/schemas/generation";
import { summarizeOpenApi } from "./parsers/openapi";

/** Reduces each input type to the common NormalizedInput handed to the prompt. */

export const MAX_BODY_CHARS = 20_000;

export function normalizeInput(input: GenerateInput): NormalizedInput {
  let normalized: NormalizedInput;

  switch (input.sourceType) {
    case "freeText": {
      const context = input.additionalContext?.trim();
      normalized = {
        sourceType: "freeText",
        title: input.useCaseName.trim(),
        body: context
          ? `Use case: ${input.useCaseName.trim()}\n\nAdditional context:\n${context}`
          : `Use case: ${input.useCaseName.trim()}`,
        warnings: [],
      };
      break;
    }

    case "userStory": {
      const story = input.story.trim();
      const acceptanceCriteria = input.acceptanceCriteria
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text, i) => ({ id: `AC-${i + 1}`, text }));
      normalized = {
        sourceType: "userStory",
        title: firstLine(story, 80),
        body: story,
        acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined,
        warnings: [],
      };
      break;
    }

    case "document": {
      normalized = {
        sourceType: "document",
        title: input.title?.trim() || input.fileName?.trim() || "Requirement document",
        body: input.text.trim(),
        warnings: [],
      };
      break;
    }

    case "apiSpec": {
      const { title, summary, warnings } = summarizeOpenApi(input.specText);
      normalized = { sourceType: "apiSpec", title, body: summary, warnings };
      break;
    }
  }

  if (normalized.body.length > MAX_BODY_CHARS) {
    normalized = {
      ...normalized,
      body: normalized.body.slice(0, MAX_BODY_CHARS),
      truncated: true,
      warnings: [
        ...normalized.warnings,
        `Input was truncated to ${MAX_BODY_CHARS.toLocaleString()} characters — split large documents into smaller requirements for full coverage.`,
      ],
    };
  }

  return normalized;
}

function firstLine(text: string, maxLen: number): string {
  const line = text.split("\n")[0].trim();
  return line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line;
}
