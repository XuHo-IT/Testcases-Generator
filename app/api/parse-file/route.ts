import { MAX_UPLOAD_BYTES, parseUploadedFile } from "@/lib/inputs/parsers/files";

export const runtime = "nodejs";
export const maxDuration = 60;

/** multipart upload → extracted plain text for the document/apiSpec tabs. */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected a multipart/form-data upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: 'No file found in the "file" field' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB` },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseUploadedFile(file.name, buffer);
    return Response.json({ ...parsed, fileName: file.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the file";
    return Response.json({ error: message }, { status: 400 });
  }
}
