import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { findModel, type ProviderId } from "./models.config";
import { createMockModel } from "./mock-provider";

/**
 * providerId + modelId → AI SDK LanguageModel.
 * API keys are read from server-side env vars only — never sent to the client.
 */

export class ProviderNotConfiguredError extends Error {
  constructor(public providerId: string, public reason: string) {
    super(`Provider "${providerId}" is not configured: ${reason}`);
    this.name = "ProviderNotConfiguredError";
  }
}

export const PROVIDER_ENV_VARS: Record<Exclude<ProviderId, "mock">, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  ollama: "OLLAMA_BASE_URL",
};

export function isProviderConfigured(providerId: ProviderId): boolean {
  if (providerId === "mock") return process.env.ENABLE_MOCK_PROVIDER === "1";
  return Boolean(process.env[PROVIDER_ENV_VARS[providerId]]);
}

/**
 * Credentials supplied by the user for this request (BYOK). They are used for
 * the single call and never persisted, logged or echoed back.
 */
export interface ProviderCredentials {
  apiKey?: string;
  /** Ollama only — where the local server lives. */
  baseUrl?: string;
}

export function getModel(
  providerId: string,
  modelId: string,
  credentials?: ProviderCredentials
): LanguageModel {
  const entry = findModel(providerId, modelId);
  if (!entry) {
    throw new ProviderNotConfiguredError(
      providerId,
      `unknown model "${modelId}" — add it to lib/ai/models.config.ts`
    );
  }

  switch (entry.providerId) {
    case "anthropic":
      return createAnthropic({ apiKey: resolveKey("anthropic", credentials) })(modelId);
    case "openai":
      return createOpenAI({ apiKey: resolveKey("openai", credentials) })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey: resolveKey("google", credentials) })(modelId);
    case "ollama": {
      const base = credentials?.baseUrl?.trim() || process.env.OLLAMA_BASE_URL;
      if (!base) {
        throw new ProviderNotConfiguredError(
          "ollama",
          "chưa có địa chỉ Ollama — nhập trong Cài đặt hoặc đặt biến môi trường OLLAMA_BASE_URL"
        );
      }
      // Ollama exposes an OpenAI-compatible endpoint at /v1 (JSON-schema
      // constrained output included).
      return createOpenAICompatible({ name: "ollama", baseURL: `${base.replace(/\/$/, "")}/v1` })(modelId);
    }
    case "mock": {
      if (process.env.ENABLE_MOCK_PROVIDER !== "1") {
        throw new ProviderNotConfiguredError("mock", "đặt ENABLE_MOCK_PROVIDER=1 để dùng provider mock");
      }
      return createMockModel();
    }
  }
}

/** A key pasted by the user wins over the deployment-wide env var. */
function resolveKey(
  providerId: Exclude<ProviderId, "mock" | "ollama">,
  credentials?: ProviderCredentials
): string {
  const key = credentials?.apiKey?.trim() || process.env[PROVIDER_ENV_VARS[providerId]];
  if (!key) {
    throw new ProviderNotConfiguredError(
      providerId,
      `chưa có API key — nhập trong Cài đặt hoặc đặt biến môi trường ${PROVIDER_ENV_VARS[providerId]}`
    );
  }
  return key;
}

/** 1.5s probe of the Ollama server so the picker can grey it out when down. */
export async function probeOllama(): Promise<boolean> {
  const base = process.env.OLLAMA_BASE_URL;
  if (!base) return false;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}
