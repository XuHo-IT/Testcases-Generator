import ExcelJS from "exceljs";
import type { UseCaseReport } from "@/lib/schemas/use-case-report";
import { applyBorders, setCell, setHeaderCell } from "./excel-helpers";

/**
 * Two-column IEEE-style use case report, ported from
 * ExcelService.ExportUseCaseReportToExcel (PRE-n / POST-n numbering, bullets).
 */
export async function exportUseCaseReportExcel(report: UseCaseReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TestcaseForge";
  const ws = wb.addWorksheet("Use Case Report");

  let row = 1;
  const title = setCell(ws, row, 1, "II. Requirement Specifications");
  title.font = { bold: true, size: 14 };
  row++;

  const labelled = (label: string, value: string) => {
    setHeaderCell(ws, row, 1, label);
    setCell(ws, row, 2, value);
    row++;
  };

  labelled("UC ID and Name:", `${report.ucId}: ${report.ucName}`);
  labelled("Created By:", report.createdBy);
  labelled("Date Created:", report.dateCreated);
  labelled("Primary Actor:", report.primaryActor);
  labelled("Secondary Actors:", report.secondaryActors || "None");
  labelled("Trigger:", report.trigger);
  labelled("Description:", report.description);

  setHeaderCell(ws, row, 1, "Preconditions:");
  row++;
  report.preconditions.forEach((p, i) => {
    setCell(ws, row, 2, `PRE-${i + 1}: ${p}`);
    row++;
  });

  setHeaderCell(ws, row, 1, "Postconditions:");
  row++;
  report.postconditions.forEach((p, i) => {
    setCell(ws, row, 2, `POST-${i + 1}: ${p}`);
    row++;
  });

  setHeaderCell(ws, row, 1, "Normal Flow:");
  row++;
  for (const step of report.normalFlow) {
    setCell(ws, row, 2, `${step.step}. ${step.description}`);
    row++;
  }

  if (report.alternativeFlows.length > 0) {
    setHeaderCell(ws, row, 1, "Alternative Flows:");
    row++;
    for (const flow of report.alternativeFlows) {
      setCell(ws, row, 2, `${flow.flowId}. ${flow.flowName}`).font = { bold: true };
      row++;
      for (const step of flow.steps) {
        setCell(ws, row, 2, `${step.step}. ${step.description}`);
        row++;
      }
    }
  }

  if (report.exceptions.length > 0) {
    setHeaderCell(ws, row, 1, "Exceptions:");
    row++;
    for (const ex of report.exceptions) {
      setCell(ws, row, 2, `${ex.exceptionId}: ${ex.exceptionName}`).font = { bold: true };
      row++;
      for (const description of ex.descriptions) {
        setCell(ws, row, 2, `• ${description}`);
        row++;
      }
    }
  }

  labelled("Priority:", report.priority);
  labelled("Frequency of Use:", report.frequencyOfUse);
  labelled("Business Rules:", report.businessRules || "None");

  if (report.otherInformation.length > 0) {
    setHeaderCell(ws, row, 1, "Other Information:");
    row++;
    for (const info of report.otherInformation) {
      setCell(ws, row, 2, `• ${info}`);
      row++;
    }
  }

  if (report.assumptions.length > 0) {
    setHeaderCell(ws, row, 1, "Assumptions:");
    row++;
    for (const assumption of report.assumptions) {
      setCell(ws, row, 2, `• ${assumption}`);
      row++;
    }
  }

  applyBorders(ws, row - 1, 2);
  ws.getColumn(1).width = 20;
  ws.getColumn(2).width = 80;
  ws.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
