import type { Cell, Worksheet } from "exceljs";

/**
 * Shared exceljs styling. Values mirror the ClosedXML defaults the legacy
 * .NET exporter produced so the sheets look the same in Excel:
 * XLColor.LightGray → ARGB FFD3D3D3, thin borders, Calibri 11.
 */

export const HEADER_FILL_ARGB = "FFD3D3D3";
export const MARKER = "●";

export function styleHeaderCell(cell: Cell): Cell {
  cell.font = { bold: true };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL_ARGB } };
  return cell;
}

export function setHeaderCell(ws: Worksheet, row: number, col: number, value: string): Cell {
  const cell = ws.getCell(row, col);
  cell.value = value;
  return styleHeaderCell(cell);
}

export function setCell(ws: Worksheet, row: number, col: number, value: string | number): Cell {
  const cell = ws.getCell(row, col);
  cell.value = value;
  return cell;
}

export function setMarker(ws: Worksheet, row: number, col: number): Cell {
  const cell = ws.getCell(row, col);
  cell.value = MARKER;
  cell.alignment = { horizontal: "center", vertical: "middle" };
  return cell;
}

export function applyBorders(ws: Worksheet, lastRow: number, lastCol: number): void {
  const thin = { style: "thin" as const };
  for (let r = 1; r <= lastRow; r++) {
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(r, c);
      cell.border = { top: thin, left: thin, bottom: thin, right: thin };
      cell.alignment = { ...(cell.alignment ?? {}), vertical: "middle" };
    }
  }
}

/**
 * exceljs has no equivalent of ClosedXML's AdjustToContents, so widths are
 * computed from the longest cell value per column.
 */
export function autoFitColumns(ws: Worksheet, opts: { min?: number; max?: number } = {}): void {
  const min = opts.min ?? 8;
  const max = opts.max ?? 60;
  ws.columns.forEach((column) => {
    let longest = min;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const lines = String(cell.value ?? "").split("\n");
      for (const line of lines) longest = Math.max(longest, line.length + 2);
    });
    column.width = Math.min(max, longest);
  });
}

export function formatSteps(steps: { order: number; action: string; expectedResult?: string }[]): string {
  return steps
    .map((s) => `${s.order}. ${s.action}${s.expectedResult ? ` → ${s.expectedResult}` : ""}`)
    .join("\n");
}

export function formatTestData(testData: { field: string; value: string; note?: string }[]): string {
  return testData
    .map((td) => `${td.field} = ${td.value === "" ? "(empty)" : td.value}${td.note ? ` (${td.note})` : ""}`)
    .join("\n");
}

export function timestampedFileName(prefix: string, key: string, ext: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const safeKey = key.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 40) || "export";
  return `${prefix}_${safeKey}_${stamp}.${ext}`;
}
