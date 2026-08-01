import { z } from "zod";
import { LANGUAGES } from "@/lib/schemas/test-case";
import { customRulesSchema } from "@/lib/schemas/custom-rule";
import { PROVIDER_IDS } from "@/lib/ai/models.config";

/**
 * Everything the app remembers between visits. Lives in the user's browser —
 * see lib/settings/storage.ts for why, and for the corrupt-data handling.
 */

export const apiKeysSchema = z.object(
  Object.fromEntries(PROVIDER_IDS.map((p) => [p, z.string().max(400).optional()])) as Record<
    (typeof PROVIDER_IDS)[number],
    z.ZodOptional<z.ZodString>
  >
);

export const settingsSchema = z.object({
  version: z.literal(1).default(1),
  apiKeys: apiKeysSchema.default({}),
  ollamaBaseUrl: z.string().max(400).optional(),
  defaults: z
    .object({
      providerId: z.string().optional(),
      modelId: z.string().optional(),
      language: z.enum(LANGUAGES).default("auto"),
      includeBva: z.boolean().default(true),
    })
    .default({ language: "auto", includeBva: true }),
  customRules: customRulesSchema.default([]),
  disabledRuleIds: z.array(z.string()).max(50).default([]),
});

export type Settings = z.infer<typeof settingsSchema>;
export type ApiKeys = z.infer<typeof apiKeysSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

/** Providers that need a secret the user can paste (Ollama takes a URL instead). */
export const KEYED_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type KeyedProvider = (typeof KEYED_PROVIDERS)[number];
