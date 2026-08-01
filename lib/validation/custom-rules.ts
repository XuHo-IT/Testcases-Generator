import type { TestCase, TestSuite } from "@/lib/schemas/test-case";
import type { CustomRule, CustomRuleCheck, RuleTarget } from "@/lib/schemas/custom-rule";
import { COUNT_TARGETS } from "@/lib/schemas/custom-rule";
import type { ValidationIssue } from "@/lib/schemas/validation";
import type { Rule } from "./rules";

/**
 * Turns declarative user rules into the same `Rule` shape the built-in rules
 * use, so the engine runs one code path and exports reflect custom rules too.
 */

/** Bound on the text a single check inspects — keeps a bad regex from stalling. */
const MAX_TEXT_CHARS = 20_000;

function textOf(tc: TestCase, target: RuleTarget): string {
  switch (target) {
    case "title":
      return tc.title;
    case "objective":
      return tc.objective ?? "";
    case "expectedResult":
      return tc.expectedResult;
    case "preconditions":
      return tc.preconditions.join("\n");
    case "steps":
      return tc.steps.map((s) => `${s.action} ${s.expectedResult ?? ""}`).join("\n");
    case "testData":
      return tc.testData.map((td) => `${td.field}=${td.value} ${td.note ?? ""}`).join("\n");
    case "anyText":
      return [
        tc.title,
        tc.objective ?? "",
        tc.preconditions.join("\n"),
        tc.steps.map((s) => `${s.action} ${s.expectedResult ?? ""}`).join("\n"),
        tc.testData.map((td) => `${td.field}=${td.value} ${td.note ?? ""}`).join("\n"),
        tc.expectedResult,
      ].join("\n");
  }
}

function countOf(tc: TestCase, target: RuleTarget): number {
  switch (target) {
    case "preconditions":
      return tc.preconditions.length;
    case "steps":
      return tc.steps.length;
    case "testData":
      return tc.testData.length;
    default:
      // Count checks are restricted to list targets in the UI; for anything
      // else fall back to "one item" so the rule stays predictable.
      return textOf(tc, target).trim() ? 1 : 0;
  }
}

/** Returns true when the case SATISFIES the check. */
function passes(tc: TestCase, target: RuleTarget, check: CustomRuleCheck): boolean {
  if (check.type === "minCount") return countOf(tc, target) >= check.value;
  if (check.type === "maxCount") return countOf(tc, target) <= check.value;

  const text = textOf(tc, target).slice(0, MAX_TEXT_CHARS);

  switch (check.type) {
    case "minLength":
      return text.trim().length >= check.value;
    case "maxLength":
      return text.trim().length <= check.value;
    case "mustContain":
    case "mustNotContain": {
      const haystack = check.ignoreCase ? text.toLowerCase() : text;
      const needle = check.ignoreCase ? check.value.toLowerCase() : check.value;
      const found = haystack.includes(needle);
      return check.type === "mustContain" ? found : !found;
    }
    case "matches":
    case "notMatches": {
      let re: RegExp;
      try {
        re = new RegExp(check.pattern, check.ignoreCase ? "iu" : "u");
      } catch {
        try {
          // Some patterns are only valid without the unicode flag.
          re = new RegExp(check.pattern, check.ignoreCase ? "i" : "");
        } catch {
          // An uncompilable pattern is a broken rule, not a failing test case —
          // treat it as satisfied so it cannot mass-fail a whole suite.
          return true;
        }
      }
      const found = re.test(text);
      return check.type === "matches" ? found : !found;
    }
  }
}

export function compileCustomRule(rule: CustomRule): Rule {
  return {
    id: rule.id,
    title: rule.name,
    description: rule.message,
    severity: rule.severity,
    scope: "case",
    isCustom: true,
    run(suite: TestSuite): ValidationIssue[] {
      return suite.testCases
        .filter((tc) => !passes(tc, rule.target, rule.check))
        .map((tc) => ({
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.message,
          field: rule.target === "anyText" ? undefined : rule.target,
          testCaseId: tc.id,
        }));
    },
  };
}

export function compileCustomRules(rules: readonly CustomRule[] = []): Rule[] {
  return rules.filter((r) => r.enabled).map(compileCustomRule);
}

/** True when a count check makes sense for the chosen target (used by the UI). */
export function supportsCountCheck(target: RuleTarget): boolean {
  return COUNT_TARGETS.includes(target);
}
