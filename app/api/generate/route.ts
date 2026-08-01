import { generateRequestSchema } from "@/lib/schemas/generation";
import { generateTestSuite } from "@/lib/generation/pipeline";
import { ProviderNotConfiguredError } from "@/lib/ai/registry";

export const runtime = "nodejs";
// Generation with thinking models can take minutes (Vercel Pro/fluid needed
// for the full 300s; Hobby caps lower).
export const maxDuration = 300;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }

  try {
    const result = await generateTestSuite(parsed.data);
    return Response.json(result);
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("[generate]", error);
    return Response.json({ error: message }, { status: 502 });
  }
}
