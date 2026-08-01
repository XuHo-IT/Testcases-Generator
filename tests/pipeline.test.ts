import { beforeAll, describe, expect, it } from "vitest";
import { generateTestSuite } from "@/lib/generation/pipeline";
import { isRetryableError, withRetry } from "@/lib/ai/retry";

/**
 * End-to-end pipeline coverage against the mock provider — no API calls,
 * no credits.
 */
beforeAll(() => {
  process.env.ENABLE_MOCK_PROVIDER = "1";
});

const baseRequest = {
  providerId: "mock",
  modelId: "fixture",
  options: { language: "en" as const, includeBva: false },
};

describe("generateTestSuite (mock provider)", () => {
  it("produces a validated suite from free text", async () => {
    const { suite, validation } = await generateTestSuite({
      ...baseRequest,
      input: { sourceType: "freeText", useCaseName: "User Login" },
    });

    expect(suite.functionCode).toBe("LOGIN");
    expect(suite.testCases.length).toBeGreaterThan(0);
    expect(suite.testCases[0].id).toBe("TC-001");
    expect(validation.summary.invalid).toBe(0);
  });

  it("never carries execution-result fields on generated cases", async () => {
    const { suite } = await generateTestSuite({
      ...baseRequest,
      input: { sourceType: "freeText", useCaseName: "User Login" },
    });
    for (const tc of suite.testCases) {
      expect(tc).not.toHaveProperty("status");
      expect(tc).not.toHaveProperty("defectId");
      expect(tc).not.toHaveProperty("executedDate");
    }
  });

  it("merges BVA cases when enabled", async () => {
    const withoutBva = await generateTestSuite({
      ...baseRequest,
      input: { sourceType: "freeText", useCaseName: "User Login" },
    });
    const withBva = await generateTestSuite({
      ...baseRequest,
      options: { ...baseRequest.options, includeBva: true },
      input: { sourceType: "freeText", useCaseName: "User Login" },
    });

    expect(withBva.suite.testCases.length).toBeGreaterThan(withoutBva.suite.testCases.length);
    expect(withBva.suite.testCases.some((tc) => tc.technique === "BVA")).toBe(true);
  });

  it("repairs the intentionally-broken fixture", async () => {
    // The mock returns dirtySuiteFixture when the prompt mentions "dirty".
    const { suite, validation } = await generateTestSuite({
      ...baseRequest,
      input: { sourceType: "freeText", useCaseName: "dirty login flow" },
    });

    expect(suite.testCases.length).toBe(3);
    // Deterministic + AI repair should clear the seeded R6/R7/R10 errors.
    expect(validation.summary.repaired).toBeGreaterThan(0);
    expect(validation.summary.invalid).toBe(0);
    expect(suite.testCases.every((tc) => !/DF-\d+|Result: Passed/i.test(tc.expectedResult))).toBe(true);
  });

  it("carries acceptance criteria into the requirement for traceability", async () => {
    const { suite } = await generateTestSuite({
      ...baseRequest,
      input: {
        sourceType: "userStory",
        story: "As a user I want to log in",
        acceptanceCriteria: ["Valid credentials sign the user in"],
      },
    });
    expect(suite.requirement.acceptanceCriteria).toEqual([
      { id: "AC-1", text: "Valid credentials sign the user in" },
    ]);
  });
});

describe("retry", () => {
  it("classifies transient provider errors as retryable", () => {
    expect(isRetryableError(new Error("Model is overloaded"))).toBe(true);
    expect(isRetryableError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isRetryableError(new Error("Invalid API key"))).toBe(false);
  });

  it("retries a retryable failure and then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 2) throw new Error("503 UNAVAILABLE");
        return "ok";
      },
      { baseDelayMs: 1 }
    );
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  it("does not retry a permanent failure", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error("Invalid API key");
        },
        { baseDelayMs: 1 }
      )
    ).rejects.toThrow("Invalid API key");
    expect(calls).toBe(1);
  });
});
