import { generateObject } from "ai";
import { z } from "zod";
import {
  CASE_TYPES,
  PRIORITIES,
  TECHNIQUES,
  generatedSuiteSchema,
  type CaseType,
  type GeneratedSuite,
  type GeneratedTestCase,
  type Priority,
  type Requirement,
  type Technique,
  type TestCase,
  type TestSuite,
} from "@/lib/schemas/test-case";
import { generatedUseCaseReportSchema, useCaseReportSchema, type UseCaseReport } from "@/lib/schemas/use-case-report";
import type { GenerateRequest, NormalizedInput } from "@/lib/schemas/generation";
import type { Language } from "@/lib/schemas/test-case";
import type { ValidationReport } from "@/lib/schemas/validation";
import { normalizeInput } from "@/lib/inputs/normalize";
import { getModel } from "@/lib/ai/registry";
import { withRetry } from "@/lib/ai/retry";
import { buildTestSuitePrompt } from "@/lib/prompts/test-suite";
import { buildRepairPrompt } from "@/lib/prompts/repair";
import { buildUseCaseReportPrompt } from "@/lib/prompts/use-case-report";
import { PROMPT_VERSION } from "@/lib/prompts/fragments";
import { validateSuite, invalidCaseIds } from "@/lib/validation/engine";
import { detectLanguage, synthesizeBvaCases } from "./bva";

/**
 * Generation pipeline:
 *   normalize → prompt → generateObject (retry) → deterministic assembly →
 *   optional BVA merge → validate → deterministic repair → validate →
 *   one AI repair round for what's left → final validation report.
 *
 * Cases that still fail after repair stay in the suite flagged `invalid`
 * (the UI shows a red badge; exports carry the flag) — nothing is silently
 * dropped or fabricated.
 */

export interface GenerationResult {
  suite: TestSuite;
  validation: ValidationReport;
  warnings: string[];
}

export async function generateTestSuite(request: GenerateRequest): Promise<GenerationResult> {
  const normalized = normalizeInput(request.input);
  const model = getModel(request.providerId, request.modelId);
  const prompt = buildTestSuitePrompt(normalized, request.options);

  const { object } = await withRetry(() =>
    generateObject({ model, schema: generatedSuiteSchema, prompt })
  );

  let suite = assembleSuite(object, normalized, request);

  if (request.options.includeBva) {
    // Deterministic cases have to read in the same language as the AI-written
    // ones; on "auto" that is only knowable from what the model produced.
    const lang =
      request.options.language === "auto"
        ? detectLanguage(
            [suite.requirement.title, suite.requirement.description, suite.testCases[0]?.title ?? ""].join(" ")
          )
        : request.options.language;
    const bvaCases = synthesizeBvaCases(suite, suite.testCases.length + 1, lang);
    suite = { ...suite, testCases: [...suite.testCases, ...bvaCases] };
  }

  const repairedIds = new Set<string>();
  let report = validateSuite(suite);

  if (invalidCaseIds(report).length > 0) {
    suite = applyDeterministicRepairs(suite, report, repairedIds);
    report = validateSuite(suite);
  }

  const stillInvalid = invalidCaseIds(report);
  if (stillInvalid.length > 0) {
    suite = await aiRepairPass(suite, report, model, repairedIds);
    report = validateSuite(suite);
  }

  // "repaired" only counts for cases that actually ended up valid.
  const finalReport = validateSuite(
    suite,
    new Set([...repairedIds].filter((id) => !invalidCaseIds(report).includes(id)))
  );

  return { suite, validation: finalReport, warnings: normalized.warnings };
}

export async function generateUseCaseReport(params: {
  useCaseName: string;
  additionalContext?: string;
  providerId: string;
  modelId: string;
  language: Language;
}): Promise<UseCaseReport> {
  const model = getModel(params.providerId, params.modelId);
  const prompt = buildUseCaseReportPrompt(params.useCaseName, params.additionalContext, params.language);
  const { object } = await withRetry(() =>
    generateObject({ model, schema: generatedUseCaseReportSchema, prompt })
  );
  return useCaseReportSchema.parse(object);
}

// ---------------------------------------------------------------------------
// Assembly: loose generated shapes → strict domain shapes
// ---------------------------------------------------------------------------

function assembleSuite(gen: GeneratedSuite, normalized: NormalizedInput, request: GenerateRequest): TestSuite {
  const requirement: Requirement = {
    id: "REQ-1",
    title: gen.requirementTitle?.trim() || normalized.title,
    description: gen.requirementSummary?.trim() || normalized.body.slice(0, 2000),
    acceptanceCriteria: normalized.acceptanceCriteria,
  };

  return {
    id: `TS-${Date.now().toString(36).toUpperCase()}`,
    name: gen.functionName?.trim() || normalized.title,
    sourceType: normalized.sourceType,
    requirement,
    functionCode: sanitizeFunctionCode(gen.functionCode),
    functionName: gen.functionName?.trim() || normalized.title,
    fields: gen.fields.map((f) => ({
      name: f.name,
      dataType: f.dataType,
      min: f.min ?? undefined,
      max: f.max ?? undefined,
      maxLength: f.maxLength ?? undefined,
      allowedValues: f.allowedValues ?? undefined,
      required: f.required,
      description: f.description ?? undefined,
    })),
    returnConditions: gen.returnConditions.filter((c) => c.trim()),
    logMessages: gen.logMessages.filter((m) => m.trim()),
    testCases: gen.testCases.map((tc, i) => assembleCase(tc, caseId(i + 1))),
    meta: {
      providerId: request.providerId,
      modelId: request.modelId,
      generatedAt: new Date().toISOString(),
      promptVersion: PROMPT_VERSION,
      language: request.options.language,
    },
  };
}

const caseId = (seq: number) => `TC-${String(seq).padStart(3, "0")}`;

function assembleCase(gen: GeneratedTestCase, id: string): TestCase {
  return {
    id,
    title: gen.title.trim(),
    objective: gen.objective?.trim() || undefined,
    requirementRef: { requirementId: gen.requirementRef.trim() || "REQ-1" },
    preconditions: gen.preconditions.map((p) => p.trim()).filter(Boolean),
    steps: gen.steps.map((s, i) => ({
      order: i + 1,
      action: s.action.trim(),
      expectedResult: s.expectedResult?.trim() || undefined,
    })),
    testData: gen.testData.map((td) => ({
      field: td.field.trim(),
      value: td.value,
      note: td.note?.trim() || undefined,
    })),
    expectedResult: gen.expectedResult.trim(),
    priority: coerceEnum<Priority>(gen.priority, PRIORITIES, "Medium"),
    type: coerceEnum<CaseType>(gen.type, CASE_TYPES, "positive"),
    technique: gen.technique ? coerceEnum<Technique>(gen.technique, TECHNIQUES, "EP") : undefined,
  };
}

function coerceEnum<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  const match = allowed.find((a) => a.toLowerCase() === String(value).trim().toLowerCase());
  return match ?? fallback;
}

function sanitizeFunctionCode(code: string): string {
  const cleaned = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return cleaned || "FUNC";
}

// ---------------------------------------------------------------------------
// Repair passes
// ---------------------------------------------------------------------------

/** Mechanical fixes that never need a model call. */
function applyDeterministicRepairs(
  suite: TestSuite,
  report: ValidationReport,
  repairedIds: Set<string>
): TestSuite {
  const invalid = new Set(invalidCaseIds(report));
  const validRefIds = new Set([suite.requirement.id, ...(suite.requirement.acceptanceCriteria ?? []).map((ac) => ac.id)]);
  const seenTitles = new Map<string, string>();

  const testCases = suite.testCases.map((tc) => {
    let fixed = tc;
    const touch = (changes: Partial<TestCase>) => {
      fixed = { ...fixed, ...changes };
      if (invalid.has(tc.id)) repairedIds.add(tc.id);
    };

    // R4: renumber steps sequentially.
    if (fixed.steps.some((s, i) => s.order !== i + 1)) {
      touch({ steps: fixed.steps.map((s, i) => ({ ...s, order: i + 1 })) });
    }
    // R3: explicit "None" beats an empty list.
    if (fixed.preconditions.length === 0) {
      touch({ preconditions: ["None"] });
    }
    // R2: pad too-short titles, dedupe repeats.
    let title = fixed.title;
    if (title.trim().length < 8) title = `${title} — ${suite.functionName} scenario`;
    const key = title.trim().toLowerCase();
    if (seenTitles.has(key)) title = `${title} (${fixed.id})`;
    seenTitles.set(title.trim().toLowerCase(), fixed.id);
    if (title !== fixed.title) touch({ title: title.slice(0, 120) });
    // R9: unknown requirement refs fall back to the requirement itself.
    if (!validRefIds.has(fixed.requirementRef.requirementId)) {
      touch({ requirementRef: { ...fixed.requirementRef, requirementId: suite.requirement.id } });
    }
    return fixed;
  });

  return { ...suite, testCases };
}

const repairResponseSchema = z.object({
  testCases: z.array(z.any()),
});

/** One AI round over the still-invalid cases only. Failures stay flagged. */
async function aiRepairPass(
  suite: TestSuite,
  report: ValidationReport,
  model: Parameters<typeof generateObject>[0]["model"],
  repairedIds: Set<string>
): Promise<TestSuite> {
  const invalidIds = invalidCaseIds(report);
  const invalidCases = suite.testCases.filter((tc) => invalidIds.includes(tc.id));
  if (invalidCases.length === 0) return suite;

  const issuesByCaseId = new Map(
    report.perCase.map((c) => [c.testCaseId, c.issues.filter((i) => i.severity === "error")])
  );

  let replacements: GeneratedTestCase[];
  try {
    const { object } = await withRetry(() =>
      generateObject({
        model,
        schema: repairResponseSchema,
        prompt: buildRepairPrompt(invalidCases, issuesByCaseId),
      })
    );
    const parsed = z.array(z.unknown()).parse(object.testCases);
    replacements = parsed.map((raw) => normalizeGeneratedCase(raw));
  } catch {
    // Repair is best-effort: on any failure keep the flagged originals.
    return suite;
  }

  const replacementByIndex = new Map<string, GeneratedTestCase>();
  invalidCases.forEach((tc, i) => {
    if (replacements[i]) replacementByIndex.set(tc.id, replacements[i]);
  });

  const testCases = suite.testCases.map((tc) => {
    const replacement = replacementByIndex.get(tc.id);
    if (!replacement) return tc;
    repairedIds.add(tc.id);
    return assembleCase(replacement, tc.id);
  });

  return { ...suite, testCases };
}

/**
 * Defensive re-shape of a repair response entry. The repair schema is
 * intentionally untyped (models sometimes echo ids, reorder keys, or nest
 * requirementRef), so every field is read tolerantly here.
 */
function normalizeGeneratedCase(raw: unknown): GeneratedTestCase {
  const rec = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const r = rec(raw);
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
  const nullable = (v: unknown): string | null => (typeof v === "string" ? v : null);

  const ref = r.requirementRef;
  return {
    title: str(r.title),
    objective: nullable(r.objective),
    requirementRef: typeof ref === "string" ? ref : str(rec(ref).requirementId, "REQ-1"),
    preconditions: list(r.preconditions).map((p) => str(p)),
    steps: list(r.steps).map((s) => ({
      action: str(rec(s).action),
      expectedResult: nullable(rec(s).expectedResult),
    })),
    testData: list(r.testData).map((td) => ({
      field: str(rec(td).field),
      value: str(rec(td).value),
      note: nullable(rec(td).note),
    })),
    expectedResult: str(r.expectedResult),
    priority: coerceEnum<Priority>(str(r.priority), PRIORITIES, "Medium"),
    type: coerceEnum<CaseType>(str(r.type), CASE_TYPES, "positive"),
    technique: typeof r.technique === "string" ? coerceEnum<Technique>(r.technique, TECHNIQUES, "EP") : null,
  };
}
