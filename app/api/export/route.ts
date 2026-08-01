import { z } from "zod";
import { testSuiteSchema } from "@/lib/schemas/test-case";
import { useCaseReportSchema } from "@/lib/schemas/use-case-report";
import { validationReportSchema } from "@/lib/schemas/validation";
import { EXPORT_FORMATS, exportSuite, exportUseCaseReport } from "@/lib/export";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Stateless export: the client posts back the suite it already has, so any
 * format can be re-exported without paying for another generation.
 */
const bodySchema = z.union([
  z.object({
    kind: z.literal("suite").default("suite"),
    suite: testSuiteSchema,
    validation: validationReportSchema.optional(),
    format: z.enum(EXPORT_FORMATS),
  }),
  z.object({
    kind: z.literal("useCaseReport"),
    report: useCaseReportSchema,
  }),
]);

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }

  try {
    const result =
      parsed.data.kind === "useCaseReport"
        ? await exportUseCaseReport(parsed.data.report)
        : await exportSuite(parsed.data.suite, parsed.data.format, parsed.data.validation);

    return new Response(new Uint8Array(result.body), {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": String(result.body.byteLength),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    console.error("[export]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
