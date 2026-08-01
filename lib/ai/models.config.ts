/**
 * Model catalog — the single file to edit when adding/removing AI models.
 *
 * A model shows up in the UI picker only when its provider is configured:
 *  - anthropic  → ANTHROPIC_API_KEY
 *  - openai     → OPENAI_API_KEY
 *  - google     → GOOGLE_GENERATIVE_AI_API_KEY
 *  - ollama     → OLLAMA_BASE_URL (+ the server must answer a health probe)
 *  - mock       → ENABLE_MOCK_PROVIDER=1 (offline dev/CI, no credits burned)
 */

export const PROVIDER_IDS = ["anthropic", "openai", "google", "ollama", "mock"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ModelEntry {
  providerId: ProviderId;
  modelId: string;
  label: string;
  /** Whether the model reliably follows JSON-schema constrained output. */
  supportsStructured: boolean;
  /** Free-form guidance shown in the picker. */
  notes?: string;
  /** Recommended default for its provider group. */
  recommended?: boolean;
}

export const MODEL_CATALOG: ModelEntry[] = [
  // --- Anthropic ---
  {
    providerId: "anthropic",
    modelId: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    supportsStructured: true,
    recommended: true,
    notes: "Cân bằng tốt nhất giữa tốc độ và chất lượng",
  },
  {
    providerId: "anthropic",
    modelId: "claude-opus-5",
    label: "Claude Opus 5",
    supportsStructured: true,
    notes: "Chất lượng cao nhất, chạy chậm hơn",
  },
  {
    providerId: "anthropic",
    modelId: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    supportsStructured: true,
    notes: "Nhanh và rẻ, hợp requirement đơn giản",
  },

  // --- OpenAI ---
  {
    providerId: "openai",
    modelId: "gpt-5-mini",
    label: "GPT-5 mini",
    supportsStructured: true,
    recommended: true,
  },
  {
    providerId: "openai",
    modelId: "gpt-4.1",
    label: "GPT-4.1",
    supportsStructured: true,
  },

  // --- Google ---
  {
    providerId: "google",
    modelId: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    supportsStructured: true,
    recommended: true,
    notes: "Chính là model bản cũ đang dùng",
  },
  {
    providerId: "google",
    modelId: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    supportsStructured: true,
  },

  // --- Ollama (local) ---
  {
    providerId: "ollama",
    modelId: "llama3.1:8b",
    label: "Llama 3.1 8B (nội bộ)",
    supportsStructured: false,
    recommended: true,
    notes: "Chạy nội bộ, thử nghiệm — chất lượng phụ thuộc máy; nên dùng model từ 7B trở lên",
  },
  {
    providerId: "ollama",
    modelId: "qwen2.5-coder:7b",
    label: "Qwen 2.5 Coder 7B (nội bộ)",
    supportsStructured: false,
    notes: "Chạy nội bộ, thử nghiệm — dữ liệu không ra khỏi mạng",
  },

  // --- Mock (offline dev/CI) ---
  {
    providerId: "mock",
    modelId: "fixture",
    label: "Mock (dữ liệu mẫu, offline)",
    supportsStructured: true,
    notes: "Trả dữ liệu mẫu — không gọi API, không tốn chi phí",
  },
];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic Claude",
  openai: "OpenAI",
  google: "Google Gemini",
  ollama: "Ollama (chạy nội bộ)",
  mock: "Mock (offline)",
};

export function findModel(providerId: string, modelId: string): ModelEntry | undefined {
  return MODEL_CATALOG.find((m) => m.providerId === providerId && m.modelId === modelId);
}
