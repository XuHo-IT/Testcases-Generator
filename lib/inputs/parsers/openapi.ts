import { parse as parseYaml } from "yaml";

/**
 * Compacts an OpenAPI/Swagger spec (JSON or YAML) into prompt-friendly text.
 * Constraints (minimum/maximum/maxLength/enum) are kept because they feed the
 * model's InputField inference and the BVA module.
 */

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"] as const;
const MAX_ENDPOINTS = 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export interface OpenApiSummary {
  title: string;
  summary: string;
  warnings: string[];
}

export function summarizeOpenApi(specText: string): OpenApiSummary {
  let spec: AnyRecord;
  try {
    spec = parseYaml(specText) as AnyRecord;
  } catch (e) {
    throw new Error(`Could not parse the spec as JSON or YAML: ${e instanceof Error ? e.message : e}`);
  }
  if (!spec || typeof spec !== "object" || !spec.paths) {
    throw new Error("The document does not look like an OpenAPI/Swagger spec (no `paths` object).");
  }

  const warnings: string[] = [];
  const title: string = spec.info?.title ?? "API specification";
  const lines: string[] = [];
  if (spec.info?.description) lines.push(String(spec.info.description).trim());

  const entries = Object.entries(spec.paths as AnyRecord);
  let endpointCount = 0;

  for (const [path, pathItem] of entries) {
    if (!pathItem || typeof pathItem !== "object") continue;
    for (const method of HTTP_METHODS) {
      const op = (pathItem as AnyRecord)[method];
      if (!op) continue;
      if (endpointCount >= MAX_ENDPOINTS) {
        warnings.push(`Spec has more than ${MAX_ENDPOINTS} operations — the rest were skipped.`);
        return { title, summary: lines.join("\n"), warnings };
      }
      endpointCount++;
      lines.push(renderOperation(spec, method.toUpperCase(), path, op, pathItem as AnyRecord));
    }
  }

  if (endpointCount === 0) warnings.push("No operations found in the spec.");
  return { title, summary: lines.join("\n"), warnings };
}

function renderOperation(root: AnyRecord, method: string, path: string, op: AnyRecord, pathItem: AnyRecord): string {
  const out: string[] = [];
  const headline = [op.summary, op.description].filter(Boolean)[0];
  out.push(`\n${method} ${path}${headline ? ` — ${String(headline).trim().split("\n")[0]}` : ""}`);

  const params = [...(pathItem.parameters ?? []), ...(op.parameters ?? [])]
    .map((p: AnyRecord) => resolveRef(root, p))
    .filter((p): p is AnyRecord => Boolean(p));
  for (const p of params) {
    const schema = resolveRef(root, p.schema ?? {});
    out.push(`  param ${p.name} (${p.in}${p.required ? ", required" : ""}): ${renderSchemaInline(schema)}`);
  }

  const bodySchema = resolveRef(
    root,
    op.requestBody?.content?.["application/json"]?.schema ??
      op.requestBody?.content?.["application/x-www-form-urlencoded"]?.schema
  );
  if (bodySchema) {
    out.push(`  body:`);
    out.push(renderSchemaProperties(root, bodySchema, "    "));
  }

  const responses = op.responses ?? {};
  const codes = Object.keys(responses).slice(0, 8);
  if (codes.length > 0) {
    const rendered = codes
      .map((code) => `${code}${responses[code]?.description ? ` (${String(responses[code].description).split("\n")[0]})` : ""}`)
      .join(", ");
    out.push(`  responses: ${rendered}`);
  }

  return out.join("\n");
}

function resolveRef(root: AnyRecord, node: AnyRecord | undefined): AnyRecord | undefined {
  if (!node) return undefined;
  const ref = node.$ref;
  if (typeof ref === "string" && ref.startsWith("#/")) {
    const resolved = ref
      .slice(2)
      .split("/")
      .reduce<AnyRecord | undefined>((acc, key) => (acc ? acc[key] : undefined), root);
    return resolved ?? node;
  }
  return node;
}

function renderSchemaInline(schema: AnyRecord | undefined): string {
  if (!schema) return "unknown";
  const parts: string[] = [schema.type ?? (schema.enum ? "enum" : "object")];
  if (schema.format) parts.push(schema.format);
  if (schema.minimum !== undefined) parts.push(`min ${schema.minimum}`);
  if (schema.maximum !== undefined) parts.push(`max ${schema.maximum}`);
  if (schema.minLength !== undefined) parts.push(`minLength ${schema.minLength}`);
  if (schema.maxLength !== undefined) parts.push(`maxLength ${schema.maxLength}`);
  if (schema.pattern) parts.push(`pattern ${schema.pattern}`);
  if (schema.enum) parts.push(`one of [${(schema.enum as unknown[]).join(", ")}]`);
  return parts.join(", ");
}

function renderSchemaProperties(root: AnyRecord, schema: AnyRecord, indent: string): string {
  const resolved = resolveRef(root, schema) ?? schema;
  const props: AnyRecord = resolved.properties ?? {};
  const required: string[] = resolved.required ?? [];
  const lines = Object.entries(props)
    .slice(0, 30)
    .map(([name, prop]) => {
      const p = resolveRef(root, prop as AnyRecord) ?? (prop as AnyRecord);
      return `${indent}${name}${required.includes(name) ? " (required)" : ""}: ${renderSchemaInline(p)}`;
    });
  return lines.length > 0 ? lines.join("\n") : `${indent}${renderSchemaInline(resolved)}`;
}
