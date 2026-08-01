import { generateText } from "ai";
import { z } from "zod";
import { getModel, ProviderNotConfiguredError } from "@/lib/ai/registry";
import { credentialsSchema } from "@/lib/schemas/generation";
import { errorMessage } from "@/lib/ai/redact";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Smallest possible round-trip to a provider, so a tester can tell a bad key
 * from a bad prompt before paying for a full generation.
 */
const bodySchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  credentials: credentialsSchema.optional(),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Thiếu provider hoặc model" }, { status: 400 });
  }

  const { providerId, modelId, credentials } = parsed.data;

  try {
    const model = getModel(providerId, modelId, credentials);
    const { text } = await generateText({
      model,
      prompt: 'Reply with the single word "ok".',
      maxOutputTokens: 8,
    });
    return Response.json({ ok: true, reply: text.trim().slice(0, 40) });
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      return Response.json({ ok: false, error: error.message });
    }
    console.error("[test-connection]", errorMessage(error, "connection failed"));
    return Response.json({ ok: false, error: errorMessage(error, "Không kết nối được tới provider") });
  }
}
