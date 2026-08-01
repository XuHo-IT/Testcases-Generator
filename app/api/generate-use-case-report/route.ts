import { z } from "zod";
import { LANGUAGES } from "@/lib/schemas/test-case";
import { generateUseCaseReport } from "@/lib/generation/pipeline";
import { ProviderNotConfiguredError } from "@/lib/ai/registry";
import { errorMessage } from "@/lib/ai/redact";
import { credentialsSchema } from "@/lib/schemas/generation";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  useCaseName: z.string().min(1),
  additionalContext: z.string().optional(),
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  language: z.enum(LANGUAGES).default("auto"),
  credentials: credentialsSchema.optional(),
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

  try {
    const report = await generateUseCaseReport(parsed.data);
    return Response.json({ report });
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("[generate-use-case-report]", errorMessage(error, "Generation failed"));
    return Response.json({ error: errorMessage(error, "Sinh báo cáo thất bại") }, { status: 502 });
  }
}
