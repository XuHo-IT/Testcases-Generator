"use client";

import { useState } from "react";
import type { TestSuite } from "@/lib/schemas/test-case";
import type { ValidationReport } from "@/lib/schemas/validation";
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/export";

interface Props {
  suite: TestSuite;
  validation: ValidationReport;
}

const FORMAT_LABELS: Record<ExportFormat, { name: string; note: string }> = {
  "excel-istqb": { name: "Excel — ISTQB", note: "Bảng ngang chuẩn, mỗi dòng một test case" },
  "excel-utcid": { name: "Excel — UTCID", note: "Ma trận UTCID kiểu unit test spec" },
  csv: { name: "CSV", note: "Import vào TestRail, Xray, Zephyr" },
  json: { name: "JSON", note: "Kèm cả báo cáo kiểm tra chất lượng" },
  markdown: { name: "Markdown", note: "Đọc nhanh, review trên Git" },
  gherkin: { name: "Gherkin", note: "Given–When–Then cho automation" },
};

export function ExportMenu({ suite, validation }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(format: ExportFormat) {
    setBusy(format);
    setError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "suite", suite, validation, format }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error ?? "Xuất file thất bại");
      }
      const blob = await res.blob();
      // Tên file do server quyết định — đọc từ Content-Disposition.
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `testcases.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xuất file thất bại");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rise space-y-3">
      <h3 className="font-display text-xl leading-tight tracking-tight text-ink">Xuất file</h3>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => download(format)}
            disabled={busy !== null}
            className="card px-4 py-3 text-left transition-colors hover:border-line-strong hover:bg-sunken disabled:opacity-50"
          >
            <span className="block text-sm font-medium text-ink">
              {busy === format ? "Đang tạo file…" : FORMAT_LABELS[format].name}
            </span>
            <span className="hint mt-0.5 block">{FORMAT_LABELS[format].note}</span>
          </button>
        ))}
      </div>

      {validation.summary.invalid > 0 && (
        <p className="hint">
          Còn <span className="tabular text-danger">{validation.summary.invalid}</span> test case chưa đạt
          rule. File xuất ra vẫn chứa chúng kèm cột đánh dấu để bạn sửa trước khi bàn giao.
        </p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
