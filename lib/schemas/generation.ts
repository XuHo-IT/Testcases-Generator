import { z } from "zod";
import { LANGUAGES, SOURCE_TYPES, type AcceptanceCriterion, type SourceType } from "./test-case";

/** Request/normalization shapes for the generation API. */

export const generateOptionsSchema = z.object({
  language: z.enum(LANGUAGES).default("auto"),
  includeBva: z.boolean().default(true),
  caseCountHint: z.number().int().min(1).max(50).optional(),
});

export const generateInputSchema = z.discriminatedUnion("sourceType", [
  z.object({
    sourceType: z.literal("freeText"),
    useCaseName: z.string().min(1, "useCaseName is required"),
    additionalContext: z.string().optional(),
  }),
  z.object({
    sourceType: z.literal("userStory"),
    story: z.string().min(1, "story is required"),
    // One criterion per entry; stable ids AC-1..n are assigned during normalization.
    acceptanceCriteria: z.array(z.string()).default([]),
  }),
  z.object({
    sourceType: z.literal("document"),
    text: z.string().min(1, "document text is required"),
    fileName: z.string().optional(),
    title: z.string().optional(),
  }),
  z.object({
    sourceType: z.literal("apiSpec"),
    specText: z.string().min(1, "spec text is required"),
  }),
]);

export const generateRequestSchema = z.object({
  input: generateInputSchema,
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  options: generateOptionsSchema.default({ language: "auto", includeBva: true }),
});

export type GenerateOptions = z.infer<typeof generateOptionsSchema>;
export type GenerateInput = z.infer<typeof generateInputSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/** Common shape every input type is reduced to before prompting. */
export interface NormalizedInput {
  sourceType: SourceType;
  /** Short human title for the thing under test. */
  title: string;
  /** Bounded text body handed to the model. */
  body: string;
  acceptanceCriteria?: AcceptanceCriterion[];
  /** True when the source text was cut to fit the size cap. */
  truncated?: boolean;
  warnings: string[];
}

export const SOURCE_TYPE_LABELS: Record<(typeof SOURCE_TYPES)[number], string> = {
  freeText: "Use case description",
  document: "Requirement document",
  userStory: "User story",
  apiSpec: "API specification",
};
