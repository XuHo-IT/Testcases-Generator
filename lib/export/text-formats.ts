import type { TestSuite } from "@/lib/schemas/test-case";
import type { ValidationReport } from "@/lib/schemas/validation";
import { formatSteps, formatTestData } from "./excel-helpers";

/** CSV / JSON / Markdown / Gherkin exporters. */

const CSV_COLUMNS = [
  "Test Case ID",
  "Title",
  "Requirement",
  "Precondition",
  "Test Steps",
  "Test Data",
  "Expected Result",
  "Priority",
  "Type",
  "Technique",
] as const;

/** RFC 4180 quoting: wrap in quotes when needed, double any embedded quote. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportCsv(suite: TestSuite): string {
  const rows = [
    CSV_COLUMNS.join(","),
    ...suite.testCases.map((tc) =>
      [
        tc.id,
        tc.title,
        tc.requirementRef.requirementId,
        tc.preconditions.join("; "),
        formatSteps(tc.steps),
        formatTestData(tc.testData),
        tc.expectedResult,
        tc.priority,
        tc.type,
        tc.technique ?? "",
      ]
        .map(csvCell)
        .join(",")
    ),
  ];
  // Leading BOM so Excel opens UTF-8 (Vietnamese) correctly.
  return `﻿${rows.join("\r\n")}\r\n`;
}

export function exportJson(suite: TestSuite, validation?: ValidationReport): string {
  return JSON.stringify({ suite, validation }, null, 2);
}

export function exportMarkdown(suite: TestSuite, validation?: ValidationReport): string {
  const out: string[] = [];
  out.push(`# Test suite: ${suite.functionName}`);
  out.push("");
  out.push(`- **Function code:** ${suite.functionCode}`);
  out.push(`- **Requirement:** ${suite.requirement.id} — ${suite.requirement.title}`);
  out.push(`- **Source:** ${suite.sourceType}`);
  out.push(`- **Generated:** ${suite.meta.generatedAt} by ${suite.meta.providerId}/${suite.meta.modelId}`);
  if (validation) {
    out.push(
      `- **Validation:** ${validation.summary.valid} valid, ${validation.summary.repaired} repaired, ${validation.summary.invalid} invalid (${validation.summary.errors} errors, ${validation.summary.warnings} warnings)`
    );
  }
  out.push("");

  out.push("## Summary");
  out.push("");
  out.push("| ID | Title | Type | Priority | Requirement |");
  out.push("| --- | --- | --- | --- | --- |");
  for (const tc of suite.testCases) {
    out.push(
      `| ${tc.id} | ${escapePipes(tc.title)} | ${tc.type} | ${tc.priority} | ${tc.requirementRef.requirementId} |`
    );
  }
  out.push("");

  const statusById = new Map(validation?.perCase.map((c) => [c.testCaseId, c]) ?? []);
  for (const tc of suite.testCases) {
    const v = statusById.get(tc.id);
    out.push(`## ${tc.id} — ${tc.title}`);
    out.push("");
    if (tc.objective) out.push(`**Objective:** ${tc.objective}`);
    out.push(`**Traces to:** ${tc.requirementRef.requirementId} · **Priority:** ${tc.priority} · **Type:** ${tc.type}${tc.technique ? ` · **Technique:** ${tc.technique}` : ""}`);
    if (v && v.status !== "valid") {
      out.push("");
      out.push(`> **Validation ${v.status}:** ${v.issues.map((i) => `${i.ruleId} — ${i.message}`).join("; ")}`);
    }
    out.push("");
    out.push("**Preconditions:**");
    for (const p of tc.preconditions) out.push(`- ${p}`);
    out.push("");
    out.push("**Steps:**");
    for (const s of tc.steps) out.push(`${s.order}. ${s.action}${s.expectedResult ? ` → ${s.expectedResult}` : ""}`);
    out.push("");
    if (tc.testData.length > 0) {
      out.push("**Test data:**");
      for (const td of tc.testData) {
        out.push(`- \`${td.field}\` = \`${td.value === "" ? "(empty)" : td.value}\`${td.note ? ` — ${td.note}` : ""}`);
      }
      out.push("");
    }
    out.push(`**Expected result:** ${tc.expectedResult}`);
    out.push("");
  }

  return out.join("\n");
}

export function exportGherkin(suite: TestSuite): string {
  const out: string[] = [];
  out.push(`Feature: ${suite.functionName}`);
  out.push(`  ${suite.requirement.title}`);
  out.push("");

  for (const tc of suite.testCases) {
    out.push(`  @${tc.type} @${tc.priority.toLowerCase()} @${tc.requirementRef.requirementId}`);
    out.push(`  Scenario: ${tc.id} — ${tc.title}`);

    const givens = tc.preconditions.filter((p) => p.trim() && p.trim().toLowerCase() !== "none");
    givens.forEach((p, i) => out.push(`    ${i === 0 ? "Given" : "And"} ${stripLeadingKeyword(p)}`));

    if (tc.testData.length > 0) {
      const keyword = givens.length > 0 ? "And" : "Given";
      out.push(
        `    ${keyword} the following test data:`,
        "      | field | value |",
        ...tc.testData.map((td) => `      | ${td.field} | ${td.value === "" ? "" : td.value} |`)
      );
    }

    tc.steps.forEach((s, i) => out.push(`    ${i === 0 ? "When" : "And"} ${stripLeadingKeyword(s.action)}`));
    out.push(`    Then ${stripLeadingKeyword(tc.expectedResult)}`);
    out.push("");
  }

  return out.join("\n");
}

const escapePipes = (s: string) => s.replace(/\|/g, "\\|");

/** Avoids "Given Given ..." when the source text already starts with a keyword. */
function stripLeadingKeyword(text: string): string {
  const t = text.trim();
  return t.replace(/^(given|when|then|and|but)\s+/i, "");
}
