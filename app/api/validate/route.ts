import { z } from "zod";
import { testSuiteSchema } from "@/lib/schemas/test-case";
import { customRulesSchema } from "@/lib/schemas/custom-rule";
import { validateSuite } from "@/lib/validation/engine";

export const runtime = "nodejs";

/**
 * Re-checks a suite the client already has against the current rule settings.
 * Pure and local — changing a rule costs nothing because no model is called.
 */
const bodySchema = z.object({
  suite: testSuiteSchema,
  customRules: customRulesSchema.default([]),
  disabledRuleIds: z.array(z.string()).max(50).default([]),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }

  const { suite, customRules, disabledRuleIds } = parsed.data;
  return Response.json({ validation: validateSuite(suite, { customRules, disabledRuleIds }) });
}
