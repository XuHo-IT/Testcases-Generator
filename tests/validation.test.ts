import { describe, expect, it } from "vitest";
import { validateSuite } from "@/lib/validation/engine";
import {
  r1IdFormat,
  r2Title,
  r3Precondition,
  r4Steps,
  r5StepsConcrete,
  r6TestData,
  r7ExpectedResult,
  r9Traceability,
  r10NoFabricatedResults,
  r11CoverageNegative,
  r12CoverageBoundary,
  r13AcCoverage,
  r14NearDup,
} from "@/lib/validation/rules";
import { makeCase, makeSuite } from "./helpers";

describe("R1 ID format", () => {
  it("accepts TC-### ids", () => {
    expect(r1IdFormat.run(makeSuite())).toHaveLength(0);
  });

  it("rejects a malformed id", () => {
    const issues = r1IdFormat.run(makeSuite({ testCases: [makeCase({ id: "case-1" })] }));
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
  });

  it("rejects duplicate ids", () => {
    const suite = makeSuite({ testCases: [makeCase(), makeCase({ title: "Another distinct title here" })] });
    expect(r1IdFormat.run(suite).some((i) => i.message.includes("2 times"))).toBe(true);
  });
});

describe("R2 title", () => {
  it("rejects a too-short title", () => {
    expect(r2Title.run(makeSuite({ testCases: [makeCase({ title: "Login" })] }))).toHaveLength(1);
  });

  it("rejects duplicate titles case-insensitively", () => {
    const suite = makeSuite({
      testCases: [makeCase(), makeCase({ id: "TC-002", title: "LOGIN SUCCEEDS WITH VALID CREDENTIALS" })],
    });
    expect(r2Title.run(suite).some((i) => i.message.startsWith("Title duplicates"))).toBe(true);
  });
});

describe("R3 preconditions", () => {
  it("warns when preconditions are empty", () => {
    const issues = r3Precondition.run(makeSuite({ testCases: [makeCase({ preconditions: [] })] }));
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
  });

  it('accepts an explicit "None"', () => {
    expect(r3Precondition.run(makeSuite({ testCases: [makeCase({ preconditions: ["None"] })] }))).toHaveLength(0);
  });
});

describe("R4 steps", () => {
  it("rejects a case with no steps", () => {
    expect(r4Steps.run(makeSuite({ testCases: [makeCase({ steps: [] })] }))).toHaveLength(1);
  });

  it("rejects non-sequential ordering", () => {
    const suite = makeSuite({
      testCases: [makeCase({ steps: [{ order: 1, action: "Open the login page" }, { order: 5, action: "Click Sign In button" }] })],
    });
    expect(r4Steps.run(suite).some((i) => i.message.includes("numbering must be sequential"))).toBe(true);
  });

  it("rejects a one-word action", () => {
    const suite = makeSuite({ testCases: [makeCase({ steps: [{ order: 1, action: "Login" }] })] });
    expect(r4Steps.run(suite).some((i) => i.message.includes("too short"))).toBe(true);
  });
});

describe("R5 vague step phrases", () => {
  it.each(["Fill the form appropriately", "Enter values etc.", "Nhập dữ liệu nếu cần"])(
    "flags %s",
    (action) => {
      const suite = makeSuite({ testCases: [makeCase({ steps: [{ order: 1, action }] })] });
      expect(r5StepsConcrete.run(suite)).toHaveLength(1);
    }
  );

  it("passes a concrete action", () => {
    expect(r5StepsConcrete.run(makeSuite())).toHaveLength(0);
  });
});

describe("R6 test data", () => {
  it.each(["<value>", "TBD", "xxx", "{value}", "sample"])("rejects placeholder %s", (value) => {
    const suite = makeSuite({ testCases: [makeCase({ testData: [{ field: "email", value }] })] });
    expect(r6TestData.run(suite).some((i) => i.message.includes("placeholder"))).toBe(true);
  });

  it("requires test data when steps enter data", () => {
    const suite = makeSuite({
      testCases: [makeCase({ steps: [{ order: 1, action: "Enter the email address" }], testData: [] })],
    });
    expect(r6TestData.run(suite).some((i) => i.message.includes("test data table is empty"))).toBe(true);
  });

  it("accepts an empty-string value (a legitimate boundary case)", () => {
    const suite = makeSuite({ testCases: [makeCase({ testData: [{ field: "email", value: "" }] })] });
    expect(r6TestData.run(suite).filter((i) => i.message.includes("placeholder"))).toHaveLength(0);
  });
});

describe("R7 expected result", () => {
  it.each(["It works correctly", "As expected", "Hoạt động đúng"])("rejects vague result %s", (expectedResult) => {
    const suite = makeSuite({ testCases: [makeCase({ expectedResult })] });
    expect(r7ExpectedResult.run(suite)).toHaveLength(1);
  });

  it("accepts a result with an observable outcome", () => {
    expect(r7ExpectedResult.run(makeSuite())).toHaveLength(0);
  });

  it("accepts an HTTP status code as the observable", () => {
    const suite = makeSuite({ testCases: [makeCase({ expectedResult: "The API returns 401" })] });
    expect(r7ExpectedResult.run(suite)).toHaveLength(0);
  });
});

describe("R9 traceability", () => {
  it("rejects a requirementRef that matches nothing", () => {
    const suite = makeSuite({ testCases: [makeCase({ requirementRef: { requirementId: "REQ-99" } })] });
    expect(r9Traceability.run(suite)).toHaveLength(1);
  });

  it("accepts an acceptance criterion id", () => {
    const suite = makeSuite({
      requirement: {
        id: "REQ-1",
        title: "t",
        description: "d",
        acceptanceCriteria: [{ id: "AC-1", text: "criterion" }],
      },
      testCases: [makeCase({ requirementRef: { requirementId: "AC-1" } })],
    });
    expect(r9Traceability.run(suite)).toHaveLength(0);
  });
});

describe("R10 fabricated execution results", () => {
  it.each([
    "Result: Passed",
    "Defect DF-123 was raised",
    "Test passed on 2025-01-01",
    "Executed on 2025-01-01 by QA",
  ])("flags %s", (expectedResult) => {
    const suite = makeSuite({ testCases: [makeCase({ expectedResult })] });
    expect(r10NoFabricatedResults.run(suite)).toHaveLength(1);
  });

  it("passes a clean spec", () => {
    expect(r10NoFabricatedResults.run(makeSuite())).toHaveLength(0);
  });
});

describe("suite-level coverage rules", () => {
  it("R11 warns when there is no negative case", () => {
    const suite = makeSuite({ testCases: [makeCase()] });
    expect(r11CoverageNegative.run(suite)).toHaveLength(1);
  });

  it("R12 reports missing numeric boundary values", () => {
    const suite = makeSuite({
      fields: [{ name: "age", dataType: "int", min: 10, max: 18, required: true }],
      testCases: [makeCase({ testData: [{ field: "age", value: "10" }] })],
    });
    const issues = r12CoverageBoundary.run(suite);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("18");
  });

  it("R12 is satisfied when all four boundaries appear", () => {
    const values = ["10", "18", "9", "19"];
    const suite = makeSuite({
      fields: [{ name: "age", dataType: "int", min: 10, max: 18, required: true }],
      testCases: values.map((v, i) =>
        makeCase({ id: `TC-00${i + 1}`, title: `Age boundary case ${v}`, testData: [{ field: "age", value: v }] })
      ),
    });
    expect(r12CoverageBoundary.run(suite)).toHaveLength(0);
  });

  it("R13 flags an uncovered acceptance criterion", () => {
    const suite = makeSuite({
      requirement: {
        id: "REQ-1",
        title: "t",
        description: "d",
        acceptanceCriteria: [
          { id: "AC-1", text: "covered" },
          { id: "AC-2", text: "not covered" },
        ],
      },
      testCases: [makeCase({ requirementRef: { requirementId: "AC-1" } })],
    });
    const issues = r13AcCoverage.run(suite);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("AC-2");
  });

  it("R14 reports near-duplicate cases as info", () => {
    const suite = makeSuite({ testCases: [makeCase(), makeCase({ id: "TC-002" })] });
    const issues = r14NearDup.run(suite);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("info");
  });
});

describe("engine aggregation", () => {
  it("marks a case invalid when it has an error and valid otherwise", () => {
    const suite = makeSuite({
      testCases: [makeCase(), makeCase({ id: "TC-002", title: "Bad", type: "negative" })],
    });
    const report = validateSuite(suite);
    expect(report.perCase.find((c) => c.testCaseId === "TC-001")!.status).toBe("valid");
    expect(report.perCase.find((c) => c.testCaseId === "TC-002")!.status).toBe("invalid");
    expect(report.summary.errors).toBeGreaterThan(0);
  });

  it("marks a case repaired when it passes and was repaired", () => {
    const report = validateSuite(makeSuite(), { repairedIds: new Set(["TC-001"]) });
    expect(report.perCase.find((c) => c.testCaseId === "TC-001")!.status).toBe("repaired");
  });

  it("keeps suite-level issues out of the per-case buckets", () => {
    const report = validateSuite(makeSuite({ testCases: [makeCase()] }));
    expect(report.suiteIssues.some((i) => i.ruleId === "R11-COV-NEGATIVE")).toBe(true);
    expect(report.perCase[0].issues.every((i) => i.testCaseId === "TC-001")).toBe(true);
  });
});
