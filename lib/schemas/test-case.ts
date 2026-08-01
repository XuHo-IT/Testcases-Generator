import { z } from "zod";

/**
 * Single source of truth for the test-case domain model.
 *
 * Two schema tiers exist for every AI-generated shape:
 *  - "generated*" schemas: passed to `generateObject`. Loose on purpose — no
 *    regex, no length bounds, `.nullable()` instead of `.optional()` (OpenAI
 *    strict structured output requires every property to be present).
 *  - strict schemas: what the rest of the app (validation engine, exporters,
 *    API routes) consumes. Deterministic post-processing bridges the two.
 */

export const PRIORITIES = ["High", "Medium", "Low"] as const;
export const CASE_TYPES = ["positive", "negative", "boundary"] as const;
export const TECHNIQUES = [
  "BVA",
  "EP",
  "decision-table",
  "state-transition",
  "use-case",
  "error-guessing",
] as const;
export const DATA_TYPES = ["int", "decimal", "string", "date", "bool", "enum"] as const;
export const SOURCE_TYPES = ["freeText", "document", "userStory", "apiSpec"] as const;
export const LANGUAGES = ["auto", "en", "vi"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type CaseType = (typeof CASE_TYPES)[number];
export type Technique = (typeof TECHNIQUES)[number];
export type DataType = (typeof DATA_TYPES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];
export type Language = (typeof LANGUAGES)[number];

// ---------------------------------------------------------------------------
// Strict schemas
// ---------------------------------------------------------------------------

export const testStepSchema = z.object({
  order: z.number().int().min(1),
  action: z.string().min(1),
  expectedResult: z.string().optional(),
});

export const testDataSchema = z.object({
  field: z.string().min(1),
  // Always a string so "abc", "2025-01-01", "-1" and "" are all representable.
  // (The old C# model typed min/max as int and silently broke string fields.)
  value: z.string(),
  note: z.string().optional(),
});

export const requirementRefSchema = z.object({
  requirementId: z.string().min(1),
  excerpt: z.string().optional(),
});

export const TEST_CASE_ID_PATTERN = /^(?:[A-Z][A-Z0-9]*-)?TC-\d{3,}$/;

export const testCaseSchema = z.object({
  id: z.string().regex(TEST_CASE_ID_PATTERN),
  title: z.string(),
  objective: z.string().optional(),
  requirementRef: requirementRefSchema,
  preconditions: z.array(z.string()),
  steps: z.array(testStepSchema).min(1),
  testData: z.array(testDataSchema),
  expectedResult: z.string(),
  priority: z.enum(PRIORITIES),
  type: z.enum(CASE_TYPES),
  technique: z.enum(TECHNIQUES).optional(),
  // Deliberately absent: status / passed-failed / executedDate / defectId.
  // Execution results belong to test RUNS, never to generated specs.
});

export const inputFieldSchema = z.object({
  name: z.string().min(1),
  dataType: z.enum(DATA_TYPES),
  min: z.union([z.string(), z.number()]).optional(),
  max: z.union([z.string(), z.number()]).optional(),
  maxLength: z.number().int().optional(),
  allowedValues: z.array(z.string()).optional(),
  required: z.boolean(),
  description: z.string().optional(),
});

export const acceptanceCriterionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const requirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(acceptanceCriterionSchema).optional(),
});

export const suiteMetaSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
  generatedAt: z.string(),
  promptVersion: z.string(),
  language: z.enum(LANGUAGES),
});

export const testSuiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceType: z.enum(SOURCE_TYPES),
  requirement: requirementSchema,
  functionCode: z.string(),
  functionName: z.string(),
  createdBy: z.string().optional(),
  fields: z.array(inputFieldSchema),
  returnConditions: z.array(z.string()),
  logMessages: z.array(z.string()),
  testCases: z.array(testCaseSchema),
  meta: suiteMetaSchema,
});

export type TestStep = z.infer<typeof testStepSchema>;
export type TestData = z.infer<typeof testDataSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type InputField = z.infer<typeof inputFieldSchema>;
export type AcceptanceCriterion = z.infer<typeof acceptanceCriterionSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type SuiteMeta = z.infer<typeof suiteMetaSchema>;
export type TestSuite = z.infer<typeof testSuiteSchema>;

// ---------------------------------------------------------------------------
// Generation schemas (fed to generateObject)
// ---------------------------------------------------------------------------

export const generatedStepSchema = z.object({
  action: z
    .string()
    .describe("One concrete, imperative action, e.g. 'Enter \"user@test.com\" into the Email field'"),
  expectedResult: z
    .string()
    .nullable()
    .describe("Observable outcome of this step, or null if only the final result matters"),
});

export const generatedTestDataSchema = z.object({
  field: z.string().describe("Input field name"),
  value: z.string().describe("Concrete value as a string, e.g. '17', 'abc@mail.com', '' for empty"),
  note: z.string().nullable(),
});

export const generatedTestCaseSchema = z.object({
  title: z.string().describe("Short, unique summary of what this case verifies (8-120 chars)"),
  objective: z.string().nullable(),
  requirementRef: z
    .string()
    .describe("ID of the requirement or acceptance criterion this case traces to, e.g. 'REQ-1' or 'AC-2'"),
  preconditions: z
    .array(z.string())
    .describe("State/data that must exist before running the steps. Use ['None'] if there are none."),
  steps: z.array(generatedStepSchema).min(1),
  testData: z.array(generatedTestDataSchema),
  expectedResult: z
    .string()
    .describe(
      "Final observable outcome precise enough for a pass/fail verdict: exact message text, resulting state, returned value or HTTP status"
    ),
  priority: z.enum(PRIORITIES),
  type: z.enum(CASE_TYPES).describe("positive = valid/happy path, negative = invalid input or error path, boundary = at/around limits"),
  technique: z.enum(TECHNIQUES).nullable(),
});

export const generatedInputFieldSchema = z.object({
  name: z.string(),
  dataType: z.enum(DATA_TYPES),
  min: z.union([z.string(), z.number()]).nullable().describe("Minimum value (numbers/dates) if bounded"),
  max: z.union([z.string(), z.number()]).nullable().describe("Maximum value (numbers/dates) if bounded"),
  maxLength: z.number().int().nullable().describe("Maximum length for string fields, if bounded"),
  allowedValues: z.array(z.string()).nullable().describe("Allowed values for enum fields"),
  required: z.boolean(),
  description: z.string().nullable(),
});

export const generatedSuiteSchema = z.object({
  functionCode: z.string().describe("Short code for the function under test, e.g. 'LOGIN' or 'AGE_VAL'"),
  functionName: z.string().describe("Descriptive name of the function under test"),
  requirementTitle: z.string().describe("One-line title of the requirement being covered"),
  requirementSummary: z.string().describe("Concise restatement of the requirement the cases trace to"),
  fields: z.array(generatedInputFieldSchema).describe("Input fields relevant for testing"),
  returnConditions: z
    .array(z.string())
    .describe("Possible outcomes/return conditions, e.g. 'Login successful', 'Account locked'"),
  logMessages: z
    .array(z.string())
    .describe("Log/UI messages emitted per scenario, e.g. 'Age must be at least 10'"),
  testCases: z.array(generatedTestCaseSchema).min(1),
});

export type GeneratedSuite = z.infer<typeof generatedSuiteSchema>;
export type GeneratedTestCase = z.infer<typeof generatedTestCaseSchema>;
