"use client";

import { useState } from "react";
import type { GenerateInput } from "@/lib/schemas/generation";
import type { Language, TestSuite } from "@/lib/schemas/test-case";
import type { ValidationReport } from "@/lib/schemas/validation";
import { ModelPicker, type ModelSelection } from "./ModelPicker";
import { TestCasePreviewTable } from "./TestCasePreviewTable";
import { ExportMenu } from "./ExportMenu";

type TabId = GenerateInput["sourceType"];

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: "freeText", label: "Mô tả use case", hint: "Gõ tên use case và ngữ cảnh" },
  { id: "userStory", label: "User story", hint: "Story + acceptance criteria kiểu Jira" },
  { id: "document", label: "Tài liệu", hint: "Upload .docx, .pdf, .md, .txt" },
  { id: "apiSpec", label: "API spec", hint: "OpenAPI / Swagger, JSON hoặc YAML" },
];

const EXAMPLES = ["Đăng nhập người dùng", "Kiểm tra độ tuổi", "Xử lý thanh toán", "Kiểm tra email"];

export function GeneratorForm() {
  const [tab, setTab] = useState<TabId>("freeText");
  const [model, setModel] = useState<ModelSelection | null>(null);
  const [language, setLanguage] = useState<Language>("auto");
  const [includeBva, setIncludeBva] = useState(true);

  // State theo từng tab
  const [useCaseName, setUseCaseName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [story, setStory] = useState("");
  const [criteria, setCriteria] = useState("");
  const [docText, setDocText] = useState("");
  const [docName, setDocName] = useState("");
  const [specText, setSpecText] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<{ suite: TestSuite; validation: ValidationReport } | null>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFile(file: File, target: "document" | "apiSpec") {
    setError(null);
    setStatus(`Đang đọc ${file.name}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-file", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không đọc được file");
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
      setError(e instanceof Error ? e.message : "Không đọc được file");
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
      setFieldError(`Nhập nội dung cho tab "${TABS.find((t) => t.id === tab)!.label}" trước đã.`);
      return;
    }
    if (!model) {
      setFieldError("Chọn một model AI trước đã.");
      return;
    }

    setFieldError(null);
    setBusy(true);
    setError(null);
    setResult(null);
    setWarnings([]);
    setStatus("Đang sinh test case — thường mất 30–90 giây.");

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
      if (!res.ok) throw new Error(data.details?.join("; ") ?? data.error ?? "Sinh test case thất bại");
      setResult({ suite: data.suite, validation: data.validation });
      setWarnings(data.warnings ?? []);
      setStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sinh test case thất bại");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <nav
          aria-label="Loại đầu vào"
          className="flex flex-wrap gap-x-1 border-b border-line bg-sunken px-2 pt-2"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`-mb-px rounded-t border border-b-0 px-3.5 py-2 text-sm transition-colors ${
                tab === t.id
                  ? "border-line bg-surface font-medium text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-5">
          <p className="hint mb-4">{activeTab.hint}</p>

          {tab === "freeText" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ucName" className="label">
                  Tên use case <span className="text-danger">*</span>
                </label>
                <input
                  id="ucName"
                  value={useCaseName}
                  onChange={(e) => setUseCaseName(e.target.value)}
                  placeholder="ví dụ: Đăng nhập người dùng"
                  className="field"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} type="button" onClick={() => setUseCaseName(ex)} className="chip">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="ucContext" className="label">
                  Ngữ cảnh bổ sung
                </label>
                <textarea
                  id="ucContext"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  rows={4}
                  placeholder="Business rule, ràng buộc field, các trường hợp biên cần lưu ý…"
                  className="field"
                />
              </div>
            </div>
          )}

          {tab === "userStory" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="story" className="label">
                  User story <span className="text-danger">*</span>
                </label>
                <textarea
                  id="story"
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  rows={4}
                  placeholder="Là người dùng đã đăng ký, tôi muốn đặt lại mật khẩu để lấy lại quyền truy cập tài khoản."
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="ac" className="label">
                  Acceptance criteria — mỗi dòng một tiêu chí
                </label>
                <textarea
                  id="ac"
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  rows={5}
                  placeholder={"Link đặt lại mật khẩu hết hạn sau 30 phút\nMật khẩu dài 8–64 ký tự\nNgười dùng nhận được email thông báo"}
                  className="field"
                />
                <p className="hint mt-1.5">
                  Mỗi dòng thành AC-1, AC-2… và được rule R13 kiểm tra xem đã có test case phủ chưa.
                </p>
              </div>
            </div>
          )}

          {tab === "document" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="docFile" className="label">
                  Upload tài liệu requirement
                </label>
                <input
                  id="docFile"
                  type="file"
                  accept=".docx,.pdf,.md,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file, "document");
                  }}
                  className="field cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-sunken file:px-3 file:py-1 file:text-sm file:text-ink"
                />
                {docName && <p className="hint mt-1.5">Đã đọc: {docName}</p>}
              </div>
              <div>
                <label htmlFor="docText" className="label">
                  Nội dung requirement <span className="text-danger">*</span>
                </label>
                <textarea
                  id="docText"
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  rows={10}
                  placeholder="Upload file ở trên, hoặc dán trực tiếp nội dung requirement vào đây."
                  className="field font-mono text-xs"
                />
              </div>
            </div>
          )}

          {tab === "apiSpec" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="specFile" className="label">
                  Upload OpenAPI / Swagger spec
                </label>
                <input
                  id="specFile"
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file, "apiSpec");
                  }}
                  className="field cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-sunken file:px-3 file:py-1 file:text-sm file:text-ink"
                />
              </div>
              <div>
                <label htmlFor="specText" className="label">
                  Nội dung spec <span className="text-danger">*</span>
                </label>
                <textarea
                  id="specText"
                  value={specText}
                  onChange={(e) => setSpecText(e.target.value)}
                  rows={10}
                  placeholder="Dán tài liệu OpenAPI 3 hoặc Swagger 2 (JSON hoặc YAML)."
                  className="field font-mono text-xs"
                />
                <p className="hint mt-1.5">
                  Ràng buộc trong schema (minimum, maximum, maxLength, enum) được đưa thẳng vào phân tích
                  giá trị biên.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card grid gap-5 p-5 sm:grid-cols-3">
        <ModelPicker value={model} onChange={setModel} />

        <div>
          <label htmlFor="lang" className="label">
            Ngôn ngữ đầu ra
          </label>
          <select
            id="lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="field"
          >
            <option value="auto">Tự động theo requirement</option>
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>

        <div>
          <span className="label">Tùy chọn</span>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={includeBva}
              onChange={(e) => setIncludeBva(e.target.checked)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span>
              Thêm test case giá trị biên
              <span className="hint mt-0.5 block">
                Sinh tất định min, max, min−1, max+1 cho mỗi field có ràng buộc.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={generate} disabled={busy} className="btn btn-primary">
          {busy ? "Đang sinh test case…" : "Sinh test case"}
        </button>
        {status && <span className="text-sm text-muted">{status}</span>}
        {fieldError && !status && <span className="text-sm text-danger">{fieldError}</span>}
      </div>

      {error && (
        <div className="card border-l-2 border-l-danger p-4">
          <h3 className="text-sm font-medium text-danger">Không sinh được test case</h3>
          <p className="mt-1 text-sm text-muted">{error}</p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="card border-l-2 border-l-warn p-4">
          <h3 className="text-sm font-medium text-ink">Lưu ý</h3>
          <ul className="mt-1 space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm text-muted">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {busy && <GeneratingSkeleton />}

      {!busy && !result && !error && <EmptyState />}

      {result && (
        <div className="space-y-8">
          <TestCasePreviewTable suite={result.suite} validation={result.validation} />
          <ExportMenu suite={result.suite} validation={result.validation} />
        </div>
      )}
    </div>
  );
}

function GeneratingSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="card grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-4 sm:divide-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="skeleton h-5 w-10" />
            <div className="skeleton mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="card divide-y divide-line">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="skeleton h-3 w-16 shrink-0" />
            <div className="skeleton h-3 flex-1" style={{ maxWidth: `${70 - i * 8}%` }} />
            <div className="skeleton h-4 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card px-6 py-12 text-center">
      <h3 className="font-display text-xl tracking-tight text-ink">Chưa có test case nào</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
        Chọn loại đầu vào ở trên, nhập requirement rồi bấm <span className="text-ink">Sinh test case</span>.
        Kết quả hiện ngay tại đây kèm kết quả kiểm tra từng rule trước khi bạn xuất file.
      </p>
    </div>
  );
}
