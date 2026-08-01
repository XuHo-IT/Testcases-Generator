import { MODEL_CATALOG, PROVIDER_IDS, PROVIDER_LABELS, type ProviderId } from "@/lib/ai/models.config";
import { PROVIDER_ENV_VARS, isProviderConfigured, probeOllama } from "@/lib/ai/registry";

export const runtime = "nodejs";

/**
 * Model catalog filtered by what this deployment can actually reach.
 * Never returns key material — only availability flags.
 */
export async function GET() {
  const ollamaReachable = process.env.OLLAMA_BASE_URL ? await probeOllama() : false;

  const providers = PROVIDER_IDS.map((providerId: ProviderId) => {
    const configured = isProviderConfigured(providerId);
    let available = configured;
    let reason: string | undefined;

    if (!configured) {
      reason =
        providerId === "mock"
          ? "Đặt ENABLE_MOCK_PROVIDER=1 để bật provider mock chạy offline"
          : `Đặt biến môi trường ${PROVIDER_ENV_VARS[providerId as Exclude<ProviderId, "mock">]}`;
    } else if (providerId === "ollama" && !ollamaReachable) {
      available = false;
      reason = `Không kết nối được Ollama tại ${process.env.OLLAMA_BASE_URL} — hãy khởi động Ollama hoặc bỏ biến OLLAMA_BASE_URL`;
    }

    return {
      providerId,
      label: PROVIDER_LABELS[providerId],
      available,
      reason,
      models: MODEL_CATALOG.filter((m) => m.providerId === providerId),
    };
  });

  return Response.json({ providers });
}
