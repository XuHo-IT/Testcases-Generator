import { TEST_CASE_ID_PATTERN, PRIORITIES, CASE_TYPES, type TestCase, type TestSuite } from "@/lib/schemas/test-case";
import type { ValidationIssue } from "@/lib/schemas/validation";
import {
  DATA_ENTRY_HINTS,
  OBSERVABLE_HINTS,
  PLACEHOLDER_VALUE_PATTERNS,
  VAGUE_ACTION_PHRASES,
  VAGUE_EXPECTED_PHRASES,
} from "./vague-phrases";

/**
 * Enterprise (ISTQB-aligned) validation rules R1-R14.
 * Every rule is a pure function (suite) => issues, so each is unit-testable
 * in isolation and the whole engine stays synchronous and deterministic.
 */

export interface Rule {
  id: string;
  run(suite: TestSuite): ValidationIssue[];
}

const issue = (
  ruleId: string,
  severity: ValidationIssue["severity"],
  message: string,
  extra: Partial<Pick<ValidationIssue, "field" | "testCaseId">> = {}
): ValidationIssue => ({ ruleId, severity, message, ...extra });

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

// R1 — ID format and uniqueness
export const r1IdFormat: Rule = {
  id: "R1-ID-FORMAT",
  run(suite) {
    const issues: ValidationIssue[] = [];
    const seen = new Map<string, number>();
    for (const tc of suite.testCases) {
      if (!TEST_CASE_ID_PATTERN.test(tc.id)) {
        issues.push(
          issue("R1-ID-FORMAT", "error", `ID "${tc.id}" does not match the TC-### pattern`, {
            testCaseId: tc.id,
            field: "id",
          })
        );
      }
      seen.set(tc.id, (seen.get(tc.id) ?? 0) + 1);
    }
    for (const [id, count] of seen) {
      if (count > 1) {
        issues.push(issue("R1-ID-FORMAT", "error", `ID "${id}" is used ${count} times`, { testCaseId: id, field: "id" }));
      }
    }
    return issues;
  },
};

// R2 — Title length and uniqueness
export const r2Title: Rule = {
  id: "R2-TITLE",
  run(suite) {
    const issues: ValidationIssue[] = [];
    const seen = new Map<string, string>();
    for (const tc of suite.testCases) {
      const title = tc.title.trim();
      if (title.length < 8 || title.length > 120) {
        issues.push(
          issue("R2-TITLE", "error", `Title must be 8-120 characters (got ${title.length})`, {
            testCaseId: tc.id,
            field: "title",
          })
        );
      }
      const key = title.toLowerCase();
      const firstId = seen.get(key);
      if (firstId) {
        issues.push(
          issue("R2-TITLE", "error", `Title duplicates ${firstId}: "${title}"`, { testCaseId: tc.id, field: "title" })
        );
      } else {
        seen.set(key, tc.id);
      }
    }
    return issues;
  },
};

// R3 — Preconditions present or explicit "None"
export const r3Precondition: Rule = {
  id: "R3-PRECONDITION",
  run(suite) {
    return suite.testCases
      .filter((tc) => tc.preconditions.filter((p) => p.trim()).length === 0)
      .map((tc) =>
        issue("R3-PRECONDITION", "warning", 'No preconditions — add at least one, or an explicit "None"', {
          testCaseId: tc.id,
          field: "preconditions",
        })
      );
  },
};

// R4 — Steps: present, sequentially numbered, concrete actions
export const r4Steps: Rule = {
  id: "R4-STEPS",
  run(suite) {
    const issues: ValidationIssue[] = [];
    for (const tc of suite.testCases) {
      if (tc.steps.length === 0) {
        issues.push(issue("R4-STEPS", "error", "Test case has no steps", { testCaseId: tc.id, field: "steps" }));
        continue;
      }
      tc.steps.forEach((step, i) => {
        if (step.order !== i + 1) {
          issues.push(
            issue("R4-STEPS", "error", `Step ${i + 1} has order ${step.order} — numbering must be sequential`, {
              testCaseId: tc.id,
              field: `steps[${i}].order`,
            })
          );
        }
        if (wordCount(step.action) < 3) {
          issues.push(
            issue("R4-STEPS", "error", `Step ${i + 1} action "${step.action}" is too short to be executable (min 3 words)`, {
              testCaseId: tc.id,
              field: `steps[${i}].action`,
            })
          );
        }
      });
    }
    return issues;
  },
};

// R5 — No vague phrases in step actions
export const r5StepsConcrete: Rule = {
  id: "R5-STEPS-CONCRETE",
  run(suite) {
    const issues: ValidationIssue[] = [];
    for (const tc of suite.testCases) {
      tc.steps.forEach((step, i) => {
        const hit = VAGUE_ACTION_PHRASES.find((p) => p.test(step.action));
        if (hit) {
          issues.push(
            issue("R5-STEPS-CONCRETE", "warning", `Step ${i + 1} contains a vague phrase (${hit}) — spell out the exact action`, {
              testCaseId: tc.id,
              field: `steps[${i}].action`,
            })
          );
        }
      });
    }
    return issues;
  },
};

// R6 — Concrete test data, no placeholders
export const r6TestData: Rule = {
  id: "R6-TESTDATA",
  run(suite) {
    const issues: ValidationIssue[] = [];
    for (const tc of suite.testCases) {
      tc.testData.forEach((td, i) => {
        const value = td.value.trim();
        if (value && PLACEHOLDER_VALUE_PATTERNS.some((p) => p.test(value))) {
          issues.push(
            issue("R6-TESTDATA", "error", `Test data "${td.field}" has placeholder value "${td.value}" — use a concrete value`, {
              testCaseId: tc.id,
              field: `testData[${i}].value`,
            })
          );
        }
      });
      const mentionsDataEntry = tc.steps.some((s) => DATA_ENTRY_HINTS.test(s.action));
      if (mentionsDataEntry && tc.testData.length === 0) {
        issues.push(
          issue("R6-TESTDATA", "error", "Steps enter data but the test data table is empty", {
            testCaseId: tc.id,
            field: "testData",
          })
        );
      }
    }
    return issues;
  },
};

// R7 — Expected result must be verifiable (observable, no vague wording)
export const r7ExpectedResult: Rule = {
  id: "R7-EXPECTED",
  run(suite) {
    const issues: ValidationIssue[] = [];
    for (const tc of suite.testCases) {
      const expected = tc.expectedResult.trim();
      if (!expected) {
        issues.push(issue("R7-EXPECTED", "error", "Expected result is empty", { testCaseId: tc.id, field: "expectedResult" }));
        continue;
      }
      const vague = VAGUE_EXPECTED_PHRASES.find((p) => p.test(expected));
      if (vague) {
        issues.push(
          issue("R7-EXPECTED", "error", `Expected result "${expected}" is not verifiable — state the exact observable outcome`, {
            testCaseId: tc.id,
            field: "expectedResult",
          })
        );
        continue;
      }
      if (!OBSERVABLE_HINTS.some((p) => p.test(expected))) {
        issues.push(
          issue(
            "R7-EXPECTED",
            "error",
            "Expected result does not reference an observable outcome (message text, state, value, redirect or status code)",
            { testCaseId: tc.id, field: "expectedResult" }
          )
        );
      }
    }
    return issues;
  },
};

// R8 — Enum sanity (belt-and-braces after zod coercion)
export const r8Enums: Rule = {
  id: "R8-ENUMS",
  run(suite) {
    const issues: ValidationIssue[] = [];
    for (const tc of suite.testCases) {
      if (!(PRIORITIES as readonly string[]).includes(tc.priority)) {
        issues.push(issue("R8-ENUMS", "error", `Invalid priority "${tc.priority}"`, { testCaseId: tc.id, field: "priority" }));
      }
      if (!(CASE_TYPES as readonly string[]).includes(tc.type)) {
        issues.push(issue("R8-ENUMS", "error", `Invalid type "${tc.type}"`, { testCaseId: tc.id, field: "type" }));
      }
    }
    return issues;
  },
};

// R9 — Traceability to the requirement or an acceptance criterion
export const r9Traceability: Rule = {
  id: "R9-TRACE",
  run(suite) {
    const validIds = new Set<string>([
      suite.requirement.id,
      ...(suite.requirement.acceptanceCriteria ?? []).map((ac) => ac.id),
    ]);
    return suite.testCases
      .filter((tc) => !validIds.has(tc.requirementRef.requirementId))
      .map((tc) =>
        issue(
          "R9-TRACE",
          "error",
          `requirementRef "${tc.requirementRef.requirementId}" does not match the requirement (${suite.requirement.id}) or any acceptance criterion`,
          { testCaseId: tc.id, field: "requirementRef" }
        )
      );
  },
};

// R10 — No fabricated execution results in a generated spec
const FABRICATION_PATTERNS: RegExp[] = [
  /result\s*:\s*(passed|failed)/i,
  /\b(test|case)\s+(passed|failed)\b/i,
  /\b(passed|failed)\s+on\s+\d/i,
  /\bDF-\d+\b/,
  /\bdefect\s*(id|#|no\.?)\b/i,
  /\bexecuted\s+(on|date|at)\b/i,
  /\bkết quả\s*:\s*(đạt|không đạt|pass|fail)/i,
];

export const r10NoFabricatedResults: Rule = {
  id: "R10-NO-FAB-RESULTS",
  run(suite) {
    const issues: ValidationIssue[] = [];
    for (const tc of suite.testCases) {
      const texts = [
        tc.title,
        tc.objective ?? "",
        tc.expectedResult,
        ...tc.steps.map((s) => `${s.action} ${s.expectedResult ?? ""}`),
        ...tc.testData.map((td) => `${td.value} ${td.note ?? ""}`),
      ];
      const hit = texts.find((t) => FABRICATION_PATTERNS.some((p) => p.test(t)));
      if (hit) {
        issues.push(
          issue(
            "R10-NO-FAB-RESULTS",
            "error",
            `Contains a fabricated execution result ("${hit.trim().slice(0, 60)}...") — generated cases are specs, not runs`,
            { testCaseId: tc.id }
          )
        );
      }
    }
    return issues;
  },
};

// R11 — Suite has at least one negative case
export const r11CoverageNegative: Rule = {
  id: "R11-COV-NEGATIVE",
  run(suite) {
    if (suite.testCases.length > 0 && !suite.testCases.some((tc) => tc.type === "negative")) {
      return [issue("R11-COV-NEGATIVE", "warning", "Suite has no negative test case — invalid input/error paths are untested")];
    }
    return [];
  },
};

// R12 — Boundary coverage for numeric bounded fields
export const r12CoverageBoundary: Rule = {
  id: "R12-COV-BOUNDARY",
  run(suite) {
    const issues: ValidationIssue[] = [];
    for (const field of suite.fields) {
      if (field.dataType !== "int" && field.dataType !== "decimal") continue;
      const min = Number(field.min);
      const max = Number(field.max);
      if (!Number.isFinite(min) || !Number.isFinite(max)) continue;

      const used = new Set<number>();
      for (const tc of suite.testCases) {
        for (const td of tc.testData) {
          if (td.field === field.name) {
            const n = Number(td.value);
            if (Number.isFinite(n)) used.add(n);
          }
        }
      }
      const wanted = [min, max, min - 1, max + 1];
      const missing = wanted.filter((v) => !used.has(v));
      if (missing.length > 0) {
        issues.push(
          issue(
            "R12-COV-BOUNDARY",
            "warning",
            `Field "${field.name}" (${min}..${max}) is missing boundary values: ${missing.join(", ")}`
          )
        );
      }
    }
    return issues;
  },
};

// R13 — Every acceptance criterion is covered
export const r13AcCoverage: Rule = {
  id: "R13-AC-COVERAGE",
  run(suite) {
    const acs = suite.requirement.acceptanceCriteria ?? [];
    if (acs.length === 0) return [];
    const referenced = new Set(suite.testCases.map((tc) => tc.requirementRef.requirementId));
    return acs
      .filter((ac) => !referenced.has(ac.id))
      .map((ac) => issue("R13-AC-COVERAGE", "warning", `Acceptance criterion ${ac.id} ("${ac.text.slice(0, 60)}") has no test case`));
  },
};

// R14 — Near-duplicate detection
export const r14NearDup: Rule = {
  id: "R14-NEAR-DUP",
  run(suite) {
    const normalize = (tc: TestCase) =>
      [tc.title, ...tc.steps.map((s) => s.action)]
        .join("|")
        .toLowerCase()
        .replace(/[^a-z0-9à-ỹ|]+/gi, "");
    const seen = new Map<string, string>();
    const issues: ValidationIssue[] = [];
    for (const tc of suite.testCases) {
      const key = normalize(tc);
      const firstId = seen.get(key);
      if (firstId) {
        issues.push(
          issue("R14-NEAR-DUP", "info", `Near-duplicate of ${firstId} (same title and steps)`, { testCaseId: tc.id })
        );
      } else {
        seen.set(key, tc.id);
      }
    }
    return issues;
  },
};

export const ALL_RULES: Rule[] = [
  r1IdFormat,
  r2Title,
  r3Precondition,
  r4Steps,
  r5StepsConcrete,
  r6TestData,
  r7ExpectedResult,
  r8Enums,
  r9Traceability,
  r10NoFabricatedResults,
  r11CoverageNegative,
  r12CoverageBoundary,
  r13AcCoverage,
  r14NearDup,
];
