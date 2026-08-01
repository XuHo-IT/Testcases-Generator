import { MockLanguageModelV4 } from "ai/test";
import type { LanguageModelV4CallOptions } from "@ai-sdk/provider";
import {
  cleanSuiteFixture,
  dirtySuiteFixture,
  repairedCasesFixture,
  useCaseReportFixture,
} from "./fixtures";

/**
 * Offline model backed by fixtures. Lets the whole UI → generate → validate →
 * repair → export flow run with zero API calls (dev, demos, CI).
 *
 * Fixture selection is keyed off marker strings that the prompt builders embed:
 *  - repair prompts contain "## Repair task"
 *  - use-case-report prompts contain "software requirements expert"
 *  - inputs mentioning "dirty" get the intentionally-broken suite (demo of the
 *    validation + repair pass)
 */

function promptText(options: LanguageModelV4CallOptions): string {
  return options.prompt
    .map((message) =>
      typeof message.content === "string"
        ? message.content
        : message.content
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("\n")
    )
    .join("\n");
}

function pickFixture(text: string): unknown {
  if (text.includes("## Repair task")) return { testCases: repairedCasesFixture };
  if (text.includes("software requirements expert")) return useCaseReportFixture;
  if (/dirty/i.test(text)) return dirtySuiteFixture;
  return cleanSuiteFixture;
}

export function createMockModel() {
  return new MockLanguageModelV4({
    provider: "mock",
    modelId: "fixture",
    doGenerate: async (options) => ({
      content: [{ type: "text" as const, text: JSON.stringify(pickFixture(promptText(options))) }],
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: {
        inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 0, text: 0, reasoning: 0 },
      },
      warnings: [],
    }),
  });
}
