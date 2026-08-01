import type { TestSuite } from "@/lib/schemas/test-case";
import type { UseCaseReport } from "@/lib/schemas/use-case-report";
import type { ValidationReport } from "@/lib/schemas/validation";
import { exportIstqbExcel } from "./excel-istqb";
import { exportUtcidExcel } from "./excel-utcid";
import { exportUseCaseReportExcel } from "./excel-usecase";
import { exportCsv, exportGherkin, exportJson, exportMarkdown } from "./text-formats";
import { timestampedFileName } from "./excel-helpers";

/** format → exporter dispatch used by the /api/export route and the UI menu. */

export const EXPORT_FORMATS = [
  "excel-istqb",
  "excel-utcid",
  "csv",
  "json",
  "markdown",
  "gherkin",
] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  "excel-istqb": "Excel — ISTQB standard",
  "excel-utcid": "Excel — UTCID matrix",
  csv: "CSV",
  json: "JSON",
  markdown: "Markdown",
  gherkin: "Gherkin (.feature)",
};

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface ExportResult {
  body: Buffer;
  contentType: string;
  fileName: string;
}

export async function exportSuite(
  suite: TestSuite,
  format: ExportFormat,
  validation?: ValidationReport
): Promise<ExportResult> {
  const key = suite.functionCode || suite.functionName;

  switch (format) {
    case "excel-istqb":
      return {
        body: await exportIstqbExcel(suite, validation),
        contentType: XLSX_MIME,
        fileName: timestampedFileName("testcases_istqb", key, "xlsx"),
      };
    case "excel-utcid":
      return {
        body: await exportUtcidExcel(suite),
        contentType: XLSX_MIME,
        fileName: timestampedFileName("testcases_utcid", key, "xlsx"),
      };
    case "csv":
      return {
        body: Buffer.from(exportCsv(suite), "utf-8"),
        contentType: "text/csv; charset=utf-8",
        fileName: timestampedFileName("testcases", key, "csv"),
      };
    case "json":
      return {
        body: Buffer.from(exportJson(suite, validation), "utf-8"),
        contentType: "application/json; charset=utf-8",
        fileName: timestampedFileName("testcases", key, "json"),
      };
    case "markdown":
      return {
        body: Buffer.from(exportMarkdown(suite, validation), "utf-8"),
        contentType: "text/markdown; charset=utf-8",
        fileName: timestampedFileName("testcases", key, "md"),
      };
    case "gherkin":
      return {
        body: Buffer.from(exportGherkin(suite), "utf-8"),
        contentType: "text/plain; charset=utf-8",
        fileName: timestampedFileName("testcases", key, "feature"),
      };
  }
}

export async function exportUseCaseReport(report: UseCaseReport): Promise<ExportResult> {
  return {
    body: await exportUseCaseReportExcel(report),
    contentType: XLSX_MIME,
    fileName: timestampedFileName("usecase_report", report.ucId, "xlsx"),
  };
}

export { exportCsv, exportGherkin, exportJson, exportMarkdown };
