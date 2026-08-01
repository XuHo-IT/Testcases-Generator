import type { TestCase, TestSuite } from "@/lib/schemas/test-case";

/** Minimal valid suite/case factories so each test only states what it varies. */

export function makeCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: "TC-001",
    title: "Login succeeds with valid credentials",
    objective: undefined,
    requirementRef: { requirementId: "REQ-1" },
    preconditions: ["User account user@test.com exists"],
    steps: [
      { order: 1, action: "Navigate to the /login page" },
      { order: 2, action: 'Enter "user@test.com" into the Email field' },
    ],
    testData: [{ field: "email", value: "user@test.com" }],
    expectedResult: 'The user is redirected to /dashboard and the message "Welcome" is displayed',
    priority: "High",
    type: "positive",
    technique: undefined,
    ...overrides,
  };
}

export function makeSuite(overrides: Partial<TestSuite> = {}): TestSuite {
  return {
    id: "TS-TEST",
    name: "User Login",
    sourceType: "freeText",
    requirement: { id: "REQ-1", title: "User login", description: "Users can sign in." },
    functionCode: "LOGIN",
    functionName: "User Login",
    createdBy: undefined,
    fields: [],
    returnConditions: ["Login successful"],
    logMessages: ["User logged in successfully"],
    testCases: [makeCase(), makeCase({ id: "TC-002", title: "Login fails with a wrong password", type: "negative" })],
    meta: {
      providerId: "mock",
      modelId: "fixture",
      generatedAt: "2026-01-01T00:00:00.000Z",
      promptVersion: "test",
      language: "en",
    },
    ...overrides,
  };
}
