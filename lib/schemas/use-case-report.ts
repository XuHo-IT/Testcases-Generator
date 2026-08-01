import { z } from "zod";
import { PRIORITIES } from "./test-case";

/**
 * IEEE-style use case report. Field list ported 1:1 from the old C# model
 * (TestCasseGenerator_API/Models/UseCaseReport.cs).
 */

export const flowStepSchema = z.object({
  step: z.string(),
  description: z.string(),
});

export const alternativeFlowSchema = z.object({
  flowId: z.string(),
  flowName: z.string(),
  steps: z.array(flowStepSchema),
});

export const exceptionFlowSchema = z.object({
  exceptionId: z.string(),
  exceptionName: z.string(),
  descriptions: z.array(z.string()),
});

// TS port of the old SecondaryActorsConverter: LLMs sometimes return a string,
// sometimes an array. Accept both, normalize to a comma-joined string.
const stringOrJoinedArray = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v.join(", ") : v));

export const useCaseReportSchema = z.object({
  ucId: z.string(),
  ucName: z.string(),
  createdBy: z.string(),
  dateCreated: z.string(),
  primaryActor: z.string(),
  secondaryActors: stringOrJoinedArray,
  trigger: z.string(),
  description: z.string(),
  preconditions: z.array(z.string()),
  postconditions: z.array(z.string()),
  normalFlow: z.array(flowStepSchema),
  alternativeFlows: z.array(alternativeFlowSchema),
  exceptions: z.array(exceptionFlowSchema),
  priority: z.enum(PRIORITIES),
  frequencyOfUse: z.string(),
  businessRules: z.string(),
  otherInformation: z.array(z.string()),
  assumptions: z.array(z.string()),
});

export type FlowStep = z.infer<typeof flowStepSchema>;
export type AlternativeFlow = z.infer<typeof alternativeFlowSchema>;
export type ExceptionFlow = z.infer<typeof exceptionFlowSchema>;
export type UseCaseReport = z.infer<typeof useCaseReportSchema>;

// Generation variant: no unions/transforms (safest across provider JSON-schema
// conversions); secondaryActors as a plain string ("None" when absent).
export const generatedUseCaseReportSchema = z.object({
  ucId: z.string().describe("Use case ID, e.g. 'UC-1'"),
  ucName: z.string(),
  createdBy: z.string(),
  dateCreated: z.string().describe("Date in DD/MM/YYYY format"),
  primaryActor: z.string(),
  secondaryActors: z.string().describe("Comma-separated secondary actors, or 'None'"),
  trigger: z.string(),
  description: z.string(),
  preconditions: z.array(z.string()),
  postconditions: z.array(z.string()),
  normalFlow: z.array(flowStepSchema).describe("3-6 numbered steps"),
  alternativeFlows: z.array(alternativeFlowSchema).describe("1-2 alternative flows if applicable"),
  exceptions: z.array(exceptionFlowSchema),
  priority: z.enum(PRIORITIES),
  frequencyOfUse: z.string().describe("High, Medium or Low"),
  businessRules: z.string(),
  otherInformation: z.array(z.string()),
  assumptions: z.array(z.string()),
});
