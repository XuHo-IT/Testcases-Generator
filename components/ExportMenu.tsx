"use client";

import { useState } from "react";
import type { TestSuite } from "@/lib/schemas/test-case";
import type { ValidationReport } from "@/lib/schemas/validation";
import { EXPORT_FORMATS, EXPORT_FORMAT_LABELS, type ExportFormat } from "@/lib/export";

interface Props {
  suite: TestSuite;
  validation: ValidationReport;
}

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
        throw new Error(data.error ?? "Export failed");
      }
      const blob = await res.blob();
      // Server owns the filename — read it from Content-Disposition.
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
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Export</h3>
      <div className="flex flex-wrap gap-2">
        {EXPORT_FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => download(format)}
            disabled={busy !== null}
            className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
          >
            {busy === format ? "Preparing…" : EXPORT_FORMAT_LABELS[format]}
          </button>
        ))}
      </div>
      {validation.summary.invalid > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {validation.summary.invalid} case(s) still fail validation — exports include them with a flag so you can
          fix them before handing the suite over.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
