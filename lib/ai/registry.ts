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

export function getModel(providerId: string, modelId: string): LanguageModel {
  const entry = findModel(providerId, modelId);
  if (!entry) {
    throw new ProviderNotConfiguredError(
      providerId,
      `unknown model "${modelId}" — add it to lib/ai/models.config.ts`
    );
  }

  switch (entry.providerId) {
    case "anthropic": {
      requireEnv("anthropic");
      return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(modelId);
    }
    case "openai": {
      requireEnv("openai");
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(modelId);
    }
    case "google": {
      requireEnv("google");
      return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })(modelId);
    }
    case "ollama": {
      requireEnv("ollama");
      const baseURL = `${process.env.OLLAMA_BASE_URL!.replace(/\/$/, "")}/v1`;
      // Ollama exposes an OpenAI-compatible endpoint at /v1 (JSON-schema
      // constrained output included).
      return createOpenAICompatible({ name: "ollama", baseURL })(modelId);
    }
    case "mock": {
      if (process.env.ENABLE_MOCK_PROVIDER !== "1") {
        throw new ProviderNotConfiguredError("mock", "set ENABLE_MOCK_PROVIDER=1 to use it");
      }
      return createMockModel();
    }
  }
}

function requireEnv(providerId: Exclude<ProviderId, "mock">): void {
  const envVar = PROVIDER_ENV_VARS[providerId];
  if (!process.env[envVar]) {
    throw new ProviderNotConfiguredError(providerId, `missing env var ${envVar}`);
  }
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
