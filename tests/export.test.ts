import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { exportIstqbExcel } from "@/lib/export/excel-istqb";
import { exportUtcidExcel } from "@/lib/export/excel-utcid";
import { exportUseCaseReportExcel } from "@/lib/export/excel-usecase";
import { exportCsv, exportGherkin, exportJson, exportMarkdown } from "@/lib/export/text-formats";
import { useCaseReportSchema } from "@/lib/schemas/use-case-report";
import { useCaseReportFixture } from "@/lib/ai/fixtures";
import { validateSuite } from "@/lib/validation/engine";
import { makeCase, makeSuite } from "./helpers";

async function openSheet(buffer: Buffer, name: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`Worksheet "${name}" missing`);
  return ws;
}

const suiteWithFields = makeSuite({
  fields: [{ name: "age", dataType: "int", min: 10, max: 18, required: true }],
  testCases: [
    makeCase({ id: "TC-001", testData: [{ field: "age", value: "10" }] }),
    makeCase({ id: "TC-002", title: "Age below minimum is rejected", type: "negative", testData: [{ field: "age", value: "9" }] }),
    makeCase({ id: "TC-003", title: "Age at the upper boundary is accepted", type: "boundary", testData: [{ field: "age", value: "18" }] }),
  ],
});

describe("ISTQB Excel export", () => {
  it("writes one row per test case under the standard headers", async () => {
    const ws = await openSheet(await exportIstqbExcel(suiteWithFields), "Test Cases");
    const headerRow = ws.getRow(4);
    expect(headerRow.getCell(1).value).toBe("Test Case ID");
    expect(headerRow.getCell(7).value).toBe("Expected Result");
    expect(ws.getCell(5, 1).value).toBe("TC-001");
    expect(ws.getCell(7, 1).value).toBe("TC-003");
  });

  it("includes the validation status column", async () => {
    const validation = validateSuite(suiteWithFields);
    const ws = await openSheet(await exportIstqbExcel(suiteWithFields, validation), "Test Cases");
    expect(String(ws.getCell(5, 11).value)).toMatch(/OK|INVALID|REPAIRED/);
  });
});

describe("UTCID Excel export", () => {
  it("creates one UTCID column per test case", async () => {
    const ws = await openSheet(await exportUtcidExcel(suiteWithFields), "Test Cases");
    const headerRow = 8; // 3 info rows + blank + 2 summary rows + blank
    expect(ws.getCell(headerRow, 1).value).toBe("Condition");
    expect(ws.getCell(headerRow, 3).value).toBe("UTCID01");
    expect(ws.getCell(headerRow, 4).value).toBe("UTCID02");
    expect(ws.getCell(headerRow, 5).value).toBe("UTCID03");
  });

  it("places ● markers beyond the first two columns", async () => {
    // The legacy exporter hardcoded UTCID01/UTCID02, leaving later columns blank.
    const ws = await openSheet(await exportUtcidExcel(suiteWithFields), "Test Cases");
    let markersInThirdCase = 0;
    ws.eachRow((row) => {
      if (row.getCell(5).value === "●") markersInThirdCase++;
    });
    expect(markersInThirdCase).toBeGreaterThan(0);
  });

  it("leaves Passed/Failed, Executed Date and Defect ID blank", async () => {
    const ws = await openSheet(await exportUtcidExcel(suiteWithFields), "Test Cases");
    const labels = ["Passed/Failed", "Executed Date", "Defect ID"];
    for (const label of labels) {
      let found = false;
      ws.eachRow((row) => {
        if (row.getCell(2).value === label) {
          found = true;
          for (let col = 3; col <= 5; col++) {
            const v = row.getCell(col).value;
            expect(v === null || v === "" || v === undefined).toBe(true);
          }
        }
      });
      expect(found).toBe(true);
    }
  });

  it("reports every case as untested in the summary", async () => {
    const ws = await openSheet(await exportUtcidExcel(suiteWithFields), "Test Cases");
    const summaryRow = 6;
    expect(ws.getCell(summaryRow, 1).value).toBe(0); // Passed
    expect(ws.getCell(summaryRow, 2).value).toBe(0); // Failed
    expect(ws.getCell(summaryRow, 3).value).toBe(3); // Untested
    expect(ws.getCell(summaryRow, 7).value).toBe(3); // Total
  });
});

describe("Use case report Excel export", () => {
  it("uses the PRE-n / POST-n numbering from the legacy template", async () => {
    const report = useCaseReportSchema.parse(useCaseReportFixture);
    const ws = await openSheet(await exportUseCaseReportExcel(report), "Use Case Report");
    expect(ws.getCell(1, 1).value).toBe("II. Requirement Specifications");
    const values: string[] = [];
    ws.eachRow((row) => values.push(String(row.getCell(2).value ?? "")));
    expect(values.some((v) => v.startsWith("PRE-1:"))).toBe(true);
    expect(values.some((v) => v.startsWith("POST-1:"))).toBe(true);
  });
});

describe("text exports", () => {
  it("CSV quotes embedded newlines and commas per RFC 4180", () => {
    const suite = makeSuite({
      testCases: [makeCase({ title: 'Login, with a "quoted" phrase' })],
    });
    const csv = exportCsv(suite);
    expect(csv).toContain('"Login, with a ""quoted"" phrase"');
    expect(csv.split("\r\n")[0]).toContain("Test Case ID");
  });

  it("JSON round-trips the suite and validation report", () => {
    const validation = validateSuite(suiteWithFields);
    const parsed = JSON.parse(exportJson(suiteWithFields, validation));
    expect(parsed.suite.testCases).toHaveLength(3);
    expect(parsed.validation.summary).toBeDefined();
  });

  it("Markdown includes a summary table and a section per case", () => {
    const md = exportMarkdown(suiteWithFields, validateSuite(suiteWithFields));
    expect(md).toContain("| ID | Title | Type | Priority | Requirement |");
    expect(md).toContain("## TC-001");
  });

  it("Gherkin maps preconditions to Given, steps to When and expected to Then", () => {
    const feature = exportGherkin(suiteWithFields);
    expect(feature).toContain("Feature: User Login");
    expect(feature).toMatch(/Given User account user@test\.com exists/);
    expect(feature).toMatch(/When Navigate to the \/login page/);
    expect(feature).toMatch(/Then The user is redirected/);
  });

  it("Gherkin does not stack duplicate keywords", () => {
    const suite = makeSuite({
      testCases: [makeCase({ preconditions: ["Given the user is logged out"], expectedResult: "Then the dashboard is displayed" })],
    });
    expect(exportGherkin(suite)).not.toMatch(/Given Given|Then Then/);
  });
});
