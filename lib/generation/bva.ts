import type { CaseType, InputField, TestCase, TestSuite } from "@/lib/schemas/test-case";

/**
 * Deterministic boundary value analysis.
 *
 * Port of the *concept* behind the legacy ExcelService.GenerateTestValues,
 * with its known bugs fixed: values are type-aware (the old code forced every
 * field through int arithmetic), the number of cases follows the number of
 * interesting values (not the number of fields), and no execution results are
 * fabricated.
 */

export interface BvaValue {
  /** Value serialized as a string, ready for the testData table. */
  value: string;
  /** Human label, e.g. "minimum boundary". */
  label: string;
  kind: CaseType;
}

export function bvaValuesForField(field: InputField): BvaValue[] {
  switch (field.dataType) {
    case "int":
    case "decimal": {
      const min = Number(field.min);
      const max = Number(field.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return [];
      const isInt = field.dataType === "int";
      const fmt = (n: number) => (isInt ? String(Math.round(n)) : String(Number(n.toFixed(2))));
      const step = isInt ? 1 : 0.01;
      const values: BvaValue[] = [
        { value: fmt(min), label: "minimum boundary", kind: "boundary" },
        { value: fmt(max), label: "maximum boundary", kind: "boundary" },
        { value: fmt(min - step), label: "just below minimum (invalid)", kind: "negative" },
        { value: fmt(max + step), label: "just above maximum (invalid)", kind: "negative" },
      ];
      if (max - min > step) {
        values.push({ value: fmt(min + (max - min) / 2), label: "mid-range value", kind: "positive" });
      }
      return values;
    }

    case "string": {
      const maxLength = typeof field.maxLength === "number" ? field.maxLength : undefined;
      const minLength = Number.isFinite(Number(field.min)) ? Number(field.min) : undefined;
      const values: BvaValue[] = [];
      if (field.required) {
        values.push({ value: "", label: "empty value (invalid for required field)", kind: "negative" });
      }
      if (minLength && minLength > 0) {
        values.push(
          { value: "a".repeat(minLength), label: `minimum length (${minLength})`, kind: "boundary" },
          { value: "a".repeat(Math.max(0, minLength - 1)), label: `below minimum length (${minLength - 1}, invalid)`, kind: "negative" }
        );
      } else {
        values.push({ value: "a", label: "single character", kind: "boundary" });
      }
      if (maxLength && maxLength > 0) {
        values.push(
          { value: "a".repeat(maxLength), label: `maximum length (${maxLength})`, kind: "boundary" },
          { value: "a".repeat(maxLength + 1), label: `above maximum length (${maxLength + 1}, invalid)`, kind: "negative" }
        );
      }
      return values;
    }

    case "date": {
      const min = parseDate(field.min);
      const max = parseDate(field.max);
      if (!min || !max) return [];
      const dayMs = 24 * 60 * 60 * 1000;
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      return [
        { value: iso(min), label: "earliest allowed date", kind: "boundary" },
        { value: iso(max), label: "latest allowed date", kind: "boundary" },
        { value: iso(new Date(min.getTime() - dayMs)), label: "one day before earliest (invalid)", kind: "negative" },
        { value: iso(new Date(max.getTime() + dayMs)), label: "one day after latest (invalid)", kind: "negative" },
      ];
    }

    case "enum": {
      const allowed = field.allowedValues ?? [];
      if (allowed.length === 0) return [];
      return [
        ...allowed.map<BvaValue>((v) => ({ value: v, label: `allowed value "${v}"`, kind: "positive" })),
        { value: `__INVALID_${field.name.toUpperCase()}__`, label: "value outside the allowed set (invalid)", kind: "negative" },
      ];
    }

    case "bool":
      return [
        { value: "true", label: "true", kind: "positive" },
        { value: "false", label: "false", kind: "positive" },
      ];
  }
}

/**
 * Human-readable stand-in for a value inside titles and step text. Long
 * length-boundary strings would otherwise blow past the 120-character title
 * limit (rule R2); the full value still lives in the test data table.
 */
const MAX_INLINE_VALUE_CHARS = 40;

function describeValue(value: string): string {
  if (value === "") return "(empty)";
  if (value.length <= MAX_INLINE_VALUE_CHARS) return value;
  const sample = value.slice(0, 12);
  return `"${sample}…" (${value.length} characters)`;
}

function parseDate(v: string | number | undefined): Date | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Builds one test case per interesting value, continuing the suite's ID
 * numbering from `startIndex` (1-based sequence number of the next case).
 */
export function synthesizeBvaCases(suite: TestSuite, startIndex: number): TestCase[] {
  const cases: TestCase[] = [];
  let seq = startIndex;

  const alreadyCovered = new Set(
    suite.testCases.flatMap((tc) => tc.testData.map((td) => `${td.field}=${td.value}`))
  );

  for (const field of suite.fields) {
    for (const bva of bvaValuesForField(field)) {
      if (alreadyCovered.has(`${field.name}=${bva.value}`)) continue;
      alreadyCovered.add(`${field.name}=${bva.value}`);

      const displayValue = describeValue(bva.value);
      const invalid = bva.kind === "negative";
      cases.push({
        id: `TC-${String(seq++).padStart(3, "0")}`,
        title: `BVA: ${field.name} = ${displayValue} (${bva.label})`,
        objective: `Boundary value analysis for field "${field.name}"`,
        requirementRef: { requirementId: suite.requirement.id },
        preconditions: [`${suite.functionName} is reachable and all other inputs are set to known valid values`],
        steps: [
          {
            order: 1,
            action: `Set every input except "${field.name}" to a known valid value`,
          },
          {
            order: 2,
            action: `Enter "${displayValue}" into the "${field.name}" field`,
          },
          {
            order: 3,
            action: `Submit the input to ${suite.functionName}`,
          },
        ],
        testData: [{ field: field.name, value: bva.value, note: bva.label }],
        expectedResult: invalid
          ? `The value is rejected: a validation error message for "${field.name}" is displayed and processing does not continue`
          : `The value is accepted: no validation error is displayed for "${field.name}" and processing continues normally`,
        priority: invalid ? "High" : "Medium",
        type: bva.kind,
        technique: "BVA",
      });
    }
  }

  return cases;
}
