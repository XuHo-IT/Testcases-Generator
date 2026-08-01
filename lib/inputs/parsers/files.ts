import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

/** File → text extraction for the parse-file API route. */

export type ParsedFileKind = "docx" | "pdf" | "markdown" | "text" | "spec";

export interface ParsedFile {
  text: string;
  kind: ParsedFileKind;
  warnings: string[];
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function parseUploadedFile(fileName: string, buffer: Buffer): Promise<ParsedFile> {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();

  switch (ext) {
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value.trim(),
        kind: "docx",
        warnings: result.messages.map((m) => m.message),
      };
    }
    case "pdf": {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      const trimmed = String(text).trim();
      const warnings: string[] = [];
      if (!trimmed) {
        warnings.push(
          "No extractable text found — the PDF is probably a scanned image. Use a text-based PDF or paste the content manually."
        );
      }
      return { text: trimmed, kind: "pdf", warnings };
    }
    case "md":
    case "markdown":
      return { text: buffer.toString("utf-8").trim(), kind: "markdown", warnings: [] };
    case "yaml":
    case "yml":
    case "json":
      return { text: buffer.toString("utf-8").trim(), kind: "spec", warnings: [] };
    case "txt":
    case "":
      return { text: buffer.toString("utf-8").trim(), kind: "text", warnings: [] };
    default:
      throw new Error(`Unsupported file type ".${ext}". Supported: .docx, .pdf, .md, .txt, .yaml, .json`);
  }
}
