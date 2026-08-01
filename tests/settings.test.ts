import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, settingsSchema } from "@/lib/settings/schema";
import { parseSettings, withoutSecrets } from "@/lib/settings/storage";

describe("settings schema", () => {
  it("fills in defaults for an empty object", () => {
    expect(DEFAULT_SETTINGS.defaults.language).toBe("auto");
    expect(DEFAULT_SETTINGS.defaults.includeBva).toBe(true);
    expect(DEFAULT_SETTINGS.customRules).toEqual([]);
    expect(DEFAULT_SETTINGS.disabledRuleIds).toEqual([]);
  });

  it("keeps a valid stored payload", () => {
    const stored = {
      version: 1,
      apiKeys: { anthropic: "sk-ant-test" },
      defaults: { providerId: "anthropic", modelId: "claude-sonnet-5", language: "vi", includeBva: false },
      customRules: [],
      disabledRuleIds: ["R11-COV-NEGATIVE"],
    };
    const parsed = settingsSchema.parse(stored);
    expect(parsed.apiKeys.anthropic).toBe("sk-ant-test");
    expect(parsed.defaults.language).toBe("vi");
    expect(parsed.disabledRuleIds).toEqual(["R11-COV-NEGATIVE"]);
  });
});

describe("parseSettings", () => {
  it("returns defaults for missing storage", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults for unparseable JSON rather than throwing", () => {
    expect(parseSettings("{not json")).toEqual(DEFAULT_SETTINGS);
  });

  it("returns defaults when the stored shape no longer matches the schema", () => {
    expect(parseSettings(JSON.stringify({ version: 99, apiKeys: "nope" }))).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips a payload it wrote itself", () => {
    const settings = settingsSchema.parse({
      apiKeys: { google: "AIza-test" },
      disabledRuleIds: ["R14-NEAR-DUP"],
    });
    expect(parseSettings(JSON.stringify(settings))).toEqual(settings);
  });
});

describe("withoutSecrets", () => {
  it("wipes keys but keeps rules and preferences", () => {
    const settings = settingsSchema.parse({
      apiKeys: { anthropic: "sk-ant-test", openai: "sk-test" },
      ollamaBaseUrl: "http://localhost:11434",
      disabledRuleIds: ["R3-PRECONDITION"],
      defaults: { language: "vi", includeBva: false },
    });

    const cleaned = withoutSecrets(settings);
    expect(cleaned.apiKeys).toEqual({});
    expect(cleaned.ollamaBaseUrl).toBeUndefined();
    expect(cleaned.disabledRuleIds).toEqual(["R3-PRECONDITION"]);
    expect(cleaned.defaults.language).toBe("vi");
  });
});
