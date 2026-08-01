import { describe, expect, it } from "vitest";
import { compileCustomRule, compileCustomRules } from "@/lib/validation/custom-rules";
import { validateSuite, activeRules } from "@/lib/validation/engine";
import {
  MAX_PATTERN_LENGTH,
  customRuleSchema,
  describeCheck,
  newCustomRuleId,
  type CustomRule,
} from "@/lib/schemas/custom-rule";
import { RULE_CATALOG } from "@/lib/validation/rule-catalog";
import { ALL_RULES } from "@/lib/validation/rules";
import { makeCase, makeSuite } from "./helpers";

const rule = (overrides: Partial<CustomRule> = {}): CustomRule =>
  customRuleSchema.parse({
    id: "CR-1",
    name: "Kết quả mong đợi phải có mã HTTP",
    enabled: true,
    severity: "error",
    target: "expectedResult",
    check: { type: "matches", pattern: "\\b\\d{3}\\b" },
    message: "Kết quả mong đợi phải nêu mã HTTP cụ thể.",
    ...overrides,
  });

describe("custom rule checks", () => {
  it("flags a case that fails a regex check and passes one that satisfies it", () => {
    const compiled = compileCustomRule(rule());
    const failing = makeSuite({
      testCases: [makeCase({ expectedResult: "Người dùng được chuyển tới trang chủ" })],
    });
    const passing = makeSuite({
      testCases: [makeCase({ expectedResult: "API trả về 401 và thông báo lỗi" })],
    });

    expect(compiled.run(failing)).toHaveLength(1);
    expect(compiled.run(failing)[0]).toMatchObject({ ruleId: "CR-1", severity: "error", testCaseId: "TC-001" });
    expect(compiled.run(passing)).toHaveLength(0);
  });

  it("supports mustContain and mustNotContain, honouring ignoreCase", () => {
    const suite = makeSuite({ testCases: [makeCase({ title: "Login trên STAGING" })] });

    const mustNot = compileCustomRule(
      rule({ id: "CR-2", target: "title", check: { type: "mustNotContain", value: "staging", ignoreCase: true } })
    );
    expect(mustNot.run(suite)).toHaveLength(1);

    const caseSensitive = compileCustomRule(
      rule({ id: "CR-3", target: "title", check: { type: "mustNotContain", value: "staging", ignoreCase: false } })
    );
    expect(caseSensitive.run(suite)).toHaveLength(0);
  });

  it("counts list items for minCount and maxCount", () => {
    const suite = makeSuite({
      testCases: [makeCase({ steps: [{ order: 1, action: "Mở trang đăng nhập" }] })],
    });

    const minThree = compileCustomRule(
      rule({ id: "CR-4", target: "steps", check: { type: "minCount", value: 3 } })
    );
    expect(minThree.run(suite)).toHaveLength(1);

    const maxFive = compileCustomRule(
      rule({ id: "CR-5", target: "steps", check: { type: "maxCount", value: 5 } })
    );
    expect(maxFive.run(suite)).toHaveLength(0);
  });

  it("measures length on the resolved text", () => {
    const suite = makeSuite({ testCases: [makeCase({ title: "Ngắn" })] });
    const minLen = compileCustomRule(
      rule({ id: "CR-6", target: "title", check: { type: "minLength", value: 20 } })
    );
    expect(minLen.run(suite)).toHaveLength(1);
  });

  it("searches every field when the target is anyText", () => {
    const suite = makeSuite({
      testCases: [makeCase({ testData: [{ field: "email", value: "admin@staging.local" }] })],
    });
    const compiled = compileCustomRule(
      rule({ id: "CR-7", target: "anyText", check: { type: "mustNotContain", value: "staging", ignoreCase: true } })
    );
    expect(compiled.run(suite)).toHaveLength(1);
  });

  it("skips disabled rules when compiling", () => {
    expect(compileCustomRules([rule({ enabled: false })])).toHaveLength(0);
    expect(compileCustomRules([rule()])).toHaveLength(1);
  });

  it("treats an uncompilable pattern as satisfied instead of failing every case", () => {
    // The schema blocks this at edit time; the compiler must not mass-fail a
    // suite if a bad pattern ever reaches it from stored settings.
    const compiled = compileCustomRule({ ...rule(), check: { type: "matches", pattern: "([", ignoreCase: true } });
    expect(compiled.run(makeSuite())).toHaveLength(0);
  });
});

describe("custom rule schema", () => {
  it("rejects an invalid regex at edit time", () => {
    const result = customRuleSchema.safeParse({ ...rule(), check: { type: "matches", pattern: "([" } });
    expect(result.success).toBe(false);
  });

  it("rejects a pattern longer than the cap", () => {
    const result = customRuleSchema.safeParse({
      ...rule(),
      check: { type: "matches", pattern: "a".repeat(MAX_PATTERN_LENGTH + 1) },
    });
    expect(result.success).toBe(false);
  });

  it("requires a usable name and message", () => {
    expect(customRuleSchema.safeParse({ ...rule(), name: "ab" }).success).toBe(false);
    expect(customRuleSchema.safeParse({ ...rule(), message: "x" }).success).toBe(false);
  });

  it("hands out ids that do not collide", () => {
    expect(newCustomRuleId([])).toBe("CR-1");
    expect(newCustomRuleId([rule()])).toBe("CR-2");
  });

  it("describes a check in Vietnamese for the UI", () => {
    expect(describeCheck({ type: "minCount", value: 3 })).toContain("3 mục");
    expect(describeCheck({ type: "mustContain", value: "mã lỗi", ignoreCase: true })).toContain("mã lỗi");
  });
});

describe("engine integration", () => {
  it("runs custom rules alongside the built-in ones", () => {
    const suite = makeSuite({
      testCases: [makeCase({ expectedResult: "Người dùng thấy trang chủ", type: "negative" })],
    });
    const report = validateSuite(suite, { customRules: [rule()] });
    expect(report.perCase[0].issues.some((i) => i.ruleId === "CR-1")).toBe(true);
    expect(report.perCase[0].status).toBe("invalid");
  });

  it("drops a built-in rule that the user switched off", () => {
    const suite = makeSuite({ testCases: [makeCase()] });
    expect(validateSuite(suite).suiteIssues.some((i) => i.ruleId === "R11-COV-NEGATIVE")).toBe(true);
    expect(
      validateSuite(suite, { disabledRuleIds: ["R11-COV-NEGATIVE"] }).suiteIssues.some(
        (i) => i.ruleId === "R11-COV-NEGATIVE"
      )
    ).toBe(false);
  });

  it("reports the active rule set", () => {
    expect(activeRules()).toHaveLength(ALL_RULES.length);
    expect(activeRules({ disabledRuleIds: ["R1-ID-FORMAT"] })).toHaveLength(ALL_RULES.length - 1);
    expect(activeRules({ customRules: [rule()] })).toHaveLength(ALL_RULES.length + 1);
  });
});

describe("rule catalogue", () => {
  it("documents every built-in rule exactly once", () => {
    expect(RULE_CATALOG.map((r) => r.id).sort()).toEqual(ALL_RULES.map((r) => r.id).sort());
  });

  it("gives every rule Vietnamese display metadata", () => {
    for (const rule of ALL_RULES) {
      expect(rule.title, `${rule.id} thiếu tiêu đề`).toBeTruthy();
      expect(rule.description, `${rule.id} thiếu mô tả`).toBeTruthy();
      expect(rule.severity, `${rule.id} thiếu mức độ`).toBeTruthy();
    }
  });

  it("declares the severity each rule actually emits", () => {
    // Guards against the catalogue drifting from the implementation: rule ids
    // are typed as literals at each emit site, so they can fall out of sync.
    const dirty = makeSuite({
      testCases: [
        makeCase({ id: "bad-id", title: "x", steps: [], testData: [], expectedResult: "" }),
        makeCase({ id: "bad-id", title: "x", preconditions: [] }),
      ],
      fields: [{ name: "age", dataType: "int", min: 10, max: 18, required: true }],
      requirement: {
        id: "REQ-1",
        title: "t",
        description: "d",
        acceptanceCriteria: [{ id: "AC-9", text: "chưa phủ" }],
      },
    });

    const known = new Set(ALL_RULES.map((r) => r.id));
    for (const rule of ALL_RULES) {
      for (const issue of rule.run(dirty)) {
        expect(known.has(issue.ruleId), `${issue.ruleId} không có trong ALL_RULES`).toBe(true);
        expect(issue.ruleId, `${rule.id} phát ra id khác chính nó`).toBe(rule.id);
        expect(issue.severity, `${rule.id} phát ra mức độ khác catalogue`).toBe(rule.severity);
      }
    }
  });
});
