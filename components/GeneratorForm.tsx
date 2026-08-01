"use client";

import { useState } from "react";
import type { GenerateInput } from "@/lib/schemas/generation";
import type { Language, TestSuite } from "@/lib/schemas/test-case";
import type { ValidationReport } from "@/lib/schemas/validation";
import { ModelPicker, type ModelSelection } from "./ModelPicker";
import { TestCasePreviewTable } from "./TestCasePreviewTable";
import { ExportMenu } from "./ExportMenu";

type TabId = GenerateInput["sourceType"];

const TABS: { id: TabId; label: string }[] = [
  { id: "freeText", label: "Use case text" },
  { id: "userStory", label: "User story + AC" },
  { id: "document", label: "Requirement file" },
  { id: "apiSpec", label: "API spec" },
];

const EXAMPLES = ["User Login", "Age Validation", "Payment Processing", "Email Validation", "Password Strength Check"];

const inputClass =
  "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";

export function GeneratorForm() {
  const [tab, setTab] = useState<TabId>("freeText");
  const [model, setModel] = useState<ModelSelection | null>(null);
  const [language, setLanguage] = useState<Language>("auto");
  const [includeBva, setIncludeBva] = useState(true);

  // Per-tab state
  const [useCaseName, setUseCaseName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [story, setStory] = useState("");
  const [criteria, setCriteria] = useState("");
  const [docText, setDocText] = useState("");
  const [docName, setDocName] = useState("");
  const [specText, setSpecText] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<{ suite: TestSuite; validation: ValidationReport } | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFile(file: File, target: "document" | "apiSpec") {
    setError(null);
    setStatus(`Reading ${file.name}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-file", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not read the file");
      if (target === "document") {
        setDocText(data.text);
        setDocName(data.fileName);
      } else {
        setSpecText(data.text);
      }
      setWarnings(data.warnings ?? []);
      setStatus(null);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Could not read the file");
    }
  }

  function buildInput(): GenerateInput | null {
    switch (tab) {
      case "freeText":
        if (!useCaseName.trim()) return null;
        return { sourceType: "freeText", useCaseName, additionalContext: additionalContext || undefined };
      case "userStory":
        if (!story.trim()) return null;
        return {
          sourceType: "userStory",
          story,
          acceptanceCriteria: criteria.split("\n").map((l) => l.trim()).filter(Boolean),
        };
      case "document":
        if (!docText.trim()) return null;
        return { sourceType: "document", text: docText, fileName: docName || undefined };
      case "apiSpec":
        if (!specText.trim()) return null;
        return { sourceType: "apiSpec", specText };
    }
  }

  async function generate() {
    const input = buildInput();
    if (!input) {
      setError("Fill in the input for the selected tab first.");
      return;
    }
    if (!model) {
      setError("Select an AI model first.");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    setWarnings([]);
    setStatus("Generating test cases… this can take 30-90 seconds.");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          providerId: model.providerId,
          modelId: model.modelId,
          options: { language, includeBva },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details?.join("; ") ?? data.error ?? "Generation failed");
      setResult({ suite: data.suite, validation: data.validation });
      setWarnings(data.warnings ?? []);
      setStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
        <div className="mb-4 flex flex-wrap gap-1 border-b border-black/10 dark:border-white/15">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                tab === t.id
                  ? "border-foreground font-medium"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "freeText" && (
          <div className="space-y-3">
            <div>
              <label htmlFor="ucName" className="mb-1 block text-sm font-medium">
                Use case name <span className="text-red-500">*</span>
              </label>
              <input
                id="ucName"
                value={useCaseName}
                onChange={(e) => setUseCaseName(e.target.value)}
                placeholder="e.g. User Login"
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setUseCaseName(ex)}
                  className="rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  {ex}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="ucContext" className="mb-1 block text-sm font-medium">
                Additional context
              </label>
              <textarea
                id="ucContext"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={4}
                placeholder="Business rules, field constraints, edge cases the model should know about…"
                className={inputClass}
              />
            </div>
          </div>
        )}

        {tab === "userStory" && (
          <div className="space-y-3">
            <div>
              <label htmlFor="story" className="mb-1 block text-sm font-medium">
                User story <span className="text-red-500">*</span>
              </label>
              <textarea
                id="story"
                value={story}
                onChange={(e) => setStory(e.target.value)}
                rows={4}
                placeholder="As a registered user, I want to reset my password so that I can regain access to my account."
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="ac" className="mb-1 block text-sm font-medium">
                Acceptance criteria — one per line
              </label>
              <textarea
                id="ac"
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                rows={5}
                placeholder={"Reset link expires after 30 minutes\nPassword must be 8-64 characters\nUser is notified by email"}
                className={inputClass}
              />
              <p className="mt-1 text-xs opacity-60">
                Each line becomes AC-1, AC-2… and every criterion is checked for test coverage (rule R13).
              </p>
            </div>
          </div>
        )}

        {tab === "document" && (
          <div className="space-y-3">
            <div>
              <label htmlFor="docFile" className="mb-1 block text-sm font-medium">
                Upload requirement file (.docx, .pdf, .md, .txt)
              </label>
              <input
                id="docFile"
                type="file"
                accept=".docx,.pdf,.md,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, "document");
                }}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-black/15 file:bg-transparent file:px-3 file:py-1.5 file:text-sm dark:file:border-white/20"
              />
            </div>
            <div>
              <label htmlFor="docText" className="mb-1 block text-sm font-medium">
                Requirement text <span className="text-red-500">*</span>
              </label>
              <textarea
                id="docText"
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                rows={10}
                placeholder="Upload a file above, or paste the requirement text here."
                className={`${inputClass} font-mono text-xs`}
              />
            </div>
          </div>
        )}

        {tab === "apiSpec" && (
          <div className="space-y-3">
            <div>
              <label htmlFor="specFile" className="mb-1 block text-sm font-medium">
                Upload OpenAPI/Swagger spec (.json, .yaml, .yml)
              </label>
              <input
                id="specFile"
                type="file"
                accept=".json,.yaml,.yml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, "apiSpec");
                }}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-black/15 file:bg-transparent file:px-3 file:py-1.5 file:text-sm dark:file:border-white/20"
              />
            </div>
            <div>
              <label htmlFor="specText" className="mb-1 block text-sm font-medium">
                Spec content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="specText"
                value={specText}
                onChange={(e) => setSpecText(e.target.value)}
                rows={10}
                placeholder="Paste an OpenAPI 3 / Swagger 2 document (JSON or YAML)."
                className={`${inputClass} font-mono text-xs`}
              />
              <p className="mt-1 text-xs opacity-60">
                Schema constraints (minimum, maximum, maxLength, enum) are carried into boundary value analysis.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-3 dark:border-white/15">
        <ModelPicker value={model} onChange={setModel} />

        <div className="space-y-1">
          <label htmlFor="lang" className="block text-sm font-medium">
            Output language
          </label>
          <select
            id="lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className={inputClass}
          >
            <option value="auto">Auto (match the requirement)</option>
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
        </div>

        <div className="space-y-1">
          <span className="block text-sm font-medium">Options</span>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeBva} onChange={(e) => setIncludeBva(e.target.checked)} />
            Add boundary value cases
          </label>
          <p className="text-xs opacity-60">Deterministic min / max / min-1 / max+1 coverage per bounded field.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate test cases"}
        </button>
        {status && <span className="text-sm opacity-70">{status}</span>}
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      {result && (
        <div className="space-y-5">
          <TestCasePreviewTable suite={result.suite} validation={result.validation} />
          <ExportMenu suite={result.suite} validation={result.validation} />
        </div>
      )}
    </div>
  );
}
