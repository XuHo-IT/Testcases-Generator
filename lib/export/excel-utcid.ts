import ExcelJS from "exceljs";
import type { TestSuite } from "@/lib/schemas/test-case";
import { applyBorders, autoFitColumns, setCell, setHeaderCell, setMarker } from "./excel-helpers";

/**
 * UTCID matrix — the unit-test-spec layout the legacy .NET exporter produced
 * (FPT/Japanese style), ported from ExcelService.ExportToExcel.
 *
 * Fixed vs the original:
 *  - one UTCID column per test case (was: one per input field, capped at 2)
 *  - ● markers land in every column (the old code hardcoded UTCID01/UTCID02)
 *  - Passed/Failed, Executed Date and Defect ID are left BLANK for the tester
 *    to fill in; the old version fabricated results and random defect IDs
 *  - summary counts Untested = total, since nothing has been executed
 */
export async function exportUtcidExcel(suite: TestSuite): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TestcaseForge";
  const ws = wb.addWorksheet("Test Cases");

  const cases = suite.testCases;
  const utcidStartCol = 3;
  const lastCol = Math.max(utcidStartCol + cases.length - 1, 7);
  const colOf = (i: number) => utcidStartCol + i;
  let row = 1;

  // ---- Header info -------------------------------------------------------
  setHeaderCell(ws, row, 1, "Function Code");
  setCell(ws, row, 2, suite.functionCode);
  setHeaderCell(ws, row, 3, "Function Name");
  setCell(ws, row, 4, suite.functionName);
  row++;

  setHeaderCell(ws, row, 1, "Created By");
  setCell(ws, row, 2, suite.createdBy ?? "TestcaseForge");
  setHeaderCell(ws, row, 3, "Executed By");
  setCell(ws, row, 4, "");
  row++;

  setHeaderCell(ws, row, 1, "Lines of code");
  setCell(ws, row, 2, "");
  setHeaderCell(ws, row, 3, "Test requirement");
  setCell(ws, row, 4, suite.requirement.title);
  row += 2;

  // ---- Summary -----------------------------------------------------------
  const labels = ["Passed", "Failed", "Untested", "Normal", "Abnormal", "Boundary", "Total Test Cases"];
  labels.forEach((label, i) => setHeaderCell(ws, row, i + 1, label));
  row++;

  const normal = cases.filter((c) => c.type === "positive").length;
  const abnormal = cases.filter((c) => c.type === "negative").length;
  const boundary = cases.filter((c) => c.type === "boundary").length;
  // Nothing has been executed yet: passed/failed stay 0, everything is untested.
  [0, 0, cases.length, normal, abnormal, boundary, cases.length].forEach((v, i) =>
    setCell(ws, row, i + 1, v)
  );
  row += 2;

  // ---- Matrix header -----------------------------------------------------
  setHeaderCell(ws, row, 1, "Condition");
  setHeaderCell(ws, row, 2, "Precondition");
  cases.forEach((tc, i) => {
    const cell = setHeaderCell(ws, row, colOf(i), utcid(i));
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  row++;

  // ---- Input condition ---------------------------------------------------
  setCell(ws, row, 1, "Input").font = { bold: true };
  setCell(ws, row, 2, "Input condition").font = { bold: true };
  row++;

  for (const field of suite.fields) {
    setCell(ws, row, 2, `Input \`${field.name}\`:`).font = { bold: true };
    row++;

    // Distinct values this field takes across the suite, in first-seen order.
    const values: string[] = [];
    for (const tc of cases) {
      for (const td of tc.testData) {
        if (td.field === field.name && !values.includes(td.value)) values.push(td.value);
      }
    }
    for (const value of values) {
      setCell(ws, row, 2, value === "" ? "(empty)" : value);
      cases.forEach((tc, i) => {
        if (tc.testData.some((td) => td.field === field.name && td.value === value)) {
          setMarker(ws, row, colOf(i));
        }
      });
      row++;
    }
  }

  // ---- Confirm -----------------------------------------------------------
  setCell(ws, row, 1, "Confirm").font = { bold: true };
  setCell(ws, row, 2, "Return").font = { bold: true };
  row++;

  for (const condition of suite.returnConditions) {
    setCell(ws, row, 2, condition);
    cases.forEach((tc, i) => {
      if (mentions(tc.expectedResult, condition)) setMarker(ws, row, colOf(i));
    });
    row++;
  }

  setCell(ws, row, 2, "Exception").font = { bold: true };
  row++;
  for (const tc of cases.filter((c) => c.type === "negative")) {
    setCell(ws, row, 2, tc.expectedResult);
    setMarker(ws, row, colOf(cases.indexOf(tc)));
    row++;
  }

  setCell(ws, row, 2, "Log message").font = { bold: true };
  row++;
  for (const message of suite.logMessages) {
    setCell(ws, row, 2, message);
    cases.forEach((tc, i) => {
      if (mentions(tc.expectedResult, message)) setMarker(ws, row, colOf(i));
    });
    row++;
  }

  // ---- Result (left blank — filled in during execution) -------------------
  setCell(ws, row, 1, "Result").font = { bold: true };
  setCell(ws, row, 2, "Type(N : Normal, A : Abnormal, B : Boundary)");
  cases.forEach((tc, i) => {
    const cell = setCell(ws, row, colOf(i), typeLetter(tc.type));
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  row++;

  for (const label of ["Passed/Failed", "Executed Date", "Defect ID"]) {
    setCell(ws, row, 2, label);
    cases.forEach((_, i) => setCell(ws, row, colOf(i), ""));
    row++;
  }

  applyBorders(ws, row - 1, lastCol);
  autoFitColumns(ws, { max: 45 });
  ws.getColumn(2).width = 45;
  for (let i = 0; i < cases.length; i++) ws.getColumn(colOf(i)).width = 10;

  return Buffer.from(await wb.xlsx.writeBuffer());
}

const utcid = (i: number) => `UTCID${String(i + 1).padStart(2, "0")}`;

const typeLetter = (t: string) => (t === "positive" ? "N" : t === "negative" ? "A" : "B");

/** Loose containment check used to place ● markers against conditions/messages. */
function mentions(haystack: string, needle: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9à-ỹ ]+/gi, " ").replace(/\s+/g, " ").trim();
  const h = norm(haystack);
  const n = norm(needle);
  if (!n) return false;
  if (h.includes(n)) return true;
  const words = n.split(" ").filter((w) => w.length > 3);
  return words.length > 0 && words.every((w) => h.includes(w));
}
