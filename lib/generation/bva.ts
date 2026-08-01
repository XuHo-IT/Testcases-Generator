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

/** Language the generated case text is written in. */
export type BvaLanguage = "en" | "vi";

export interface BvaValue {
  /** Value serialized as a string, ready for the testData table. */
  value: string;
  /** Label key resolved through COPY, e.g. "min". */
  labelKey: LabelKey;
  /** Interpolation argument for labels that mention a bound. */
  labelArg?: string | number;
  kind: CaseType;
}

type LabelKey =
  | "min"
  | "max"
  | "belowMin"
  | "aboveMax"
  | "mid"
  | "emptyRequired"
  | "minLength"
  | "belowMinLength"
  | "maxLength"
  | "aboveMaxLength"
  | "singleChar"
  | "earliestDate"
  | "latestDate"
  | "beforeEarliest"
  | "afterLatest"
  | "allowedValue"
  | "outsideAllowed"
  | "boolTrue"
  | "boolFalse";

/**
 * All generated prose lives here so deterministic cases match the language the
 * AI-generated cases were written in.
 */
const COPY: Record<BvaLanguage, {
  labels: Record<LabelKey, (arg?: string | number) => string>;
  title: (field: string, value: string, label: string) => string;
  objective: (field: string) => string;
  precondition: (fn: string) => string;
  stepOthersValid: (field: string) => string;
  stepEnter: (field: string, value: string) => string;
  stepSubmit: (fn: string) => string;
  expectedInvalid: (field: string) => string;
  expectedValid: (field: string) => string;
  empty: string;
  charsSuffix: (n: number) => string;
}> = {
  en: {
    labels: {
      min: () => "minimum boundary",
      max: () => "maximum boundary",
      belowMin: () => "just below minimum (invalid)",
      aboveMax: () => "just above maximum (invalid)",
      mid: () => "mid-range value",
      emptyRequired: () => "empty value (invalid for required field)",
      minLength: (n) => `minimum length (${n})`,
      belowMinLength: (n) => `below minimum length (${n}, invalid)`,
      maxLength: (n) => `maximum length (${n})`,
      aboveMaxLength: (n) => `above maximum length (${n}, invalid)`,
      singleChar: () => "single character",
      earliestDate: () => "earliest allowed date",
      latestDate: () => "latest allowed date",
      beforeEarliest: () => "one day before earliest (invalid)",
      afterLatest: () => "one day after latest (invalid)",
      allowedValue: (v) => `allowed value "${v}"`,
      outsideAllowed: () => "value outside the allowed set (invalid)",
      boolTrue: () => "true",
      boolFalse: () => "false",
    },
    title: (field, value, label) => `BVA: ${field} = ${value} (${label})`,
    objective: (field) => `Boundary value analysis for field "${field}"`,
    precondition: (fn) =>
      `${fn} is reachable and all other inputs are set to known valid values`,
    stepOthersValid: (field) => `Set every input except "${field}" to a known valid value`,
    stepEnter: (field, value) => `Enter "${value}" into the "${field}" field`,
    stepSubmit: (fn) => `Submit the input to ${fn}`,
    expectedInvalid: (field) =>
      `The value is rejected: a validation error message for "${field}" is displayed and processing does not continue`,
    expectedValid: (field) =>
      `The value is accepted: no validation error is displayed for "${field}" and processing continues normally`,
    empty: "(empty)",
    charsSuffix: (n) => `${n} characters`,
  },
  vi: {
    labels: {
      min: () => "giá trị biên nhỏ nhất",
      max: () => "giá trị biên lớn nhất",
      belowMin: () => "nhỏ hơn giá trị nhỏ nhất 1 đơn vị (không hợp lệ)",
      aboveMax: () => "lớn hơn giá trị lớn nhất 1 đơn vị (không hợp lệ)",
      mid: () => "giá trị giữa khoảng",
      emptyRequired: () => "để trống (không hợp lệ với field bắt buộc)",
      minLength: (n) => `độ dài nhỏ nhất (${n} ký tự)`,
      belowMinLength: (n) => `ngắn hơn độ dài nhỏ nhất (${n} ký tự, không hợp lệ)`,
      maxLength: (n) => `độ dài lớn nhất (${n} ký tự)`,
      aboveMaxLength: (n) => `vượt độ dài lớn nhất (${n} ký tự, không hợp lệ)`,
      singleChar: () => "một ký tự",
      earliestDate: () => "ngày sớm nhất được phép",
      latestDate: () => "ngày muộn nhất được phép",
      beforeEarliest: () => "trước ngày sớm nhất 1 ngày (không hợp lệ)",
      afterLatest: () => "sau ngày muộn nhất 1 ngày (không hợp lệ)",
      allowedValue: (v) => `giá trị hợp lệ "${v}"`,
      outsideAllowed: () => "giá trị ngoài danh sách cho phép (không hợp lệ)",
      boolTrue: () => "true",
      boolFalse: () => "false",
    },
    title: (field, value, label) => `Biên: ${field} = ${value} (${label})`,
    objective: (field) => `Phân tích giá trị biên cho field "${field}"`,
    precondition: (fn) =>
      `Chức năng ${fn} truy cập được và mọi input khác đã đặt giá trị hợp lệ đã biết`,
    stepOthersValid: (field) => `Đặt mọi input trừ "${field}" về giá trị hợp lệ đã biết`,
    stepEnter: (field, value) => `Nhập "${value}" vào field "${field}"`,
    stepSubmit: (fn) => `Gửi dữ liệu tới chức năng ${fn}`,
    expectedInvalid: (field) =>
      `Giá trị bị từ chối: hiển thị thông báo lỗi kiểm tra dữ liệu cho field "${field}" và không xử lý tiếp`,
    expectedValid: (field) =>
      `Giá trị được chấp nhận: không hiển thị lỗi kiểm tra dữ liệu cho field "${field}" và tiếp tục xử lý bình thường`,
    empty: "(rỗng)",
    charsSuffix: (n) => `${n} ký tự`,
  },
};

/** Vietnamese-specific letters — enough to tell the two languages apart. */
const VIETNAMESE_PATTERN =
  /[ăâđêôơưĂÂĐÊÔƠƯáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/;

export function detectLanguage(text: string): BvaLanguage {
  return VIETNAMESE_PATTERN.test(text) ? "vi" : "en";
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
        { value: fmt(min), labelKey: "min", kind: "boundary" },
        { value: fmt(max), labelKey: "max", kind: "boundary" },
        { value: fmt(min - step), labelKey: "belowMin", kind: "negative" },
        { value: fmt(max + step), labelKey: "aboveMax", kind: "negative" },
      ];
      if (max - min > step) {
        values.push({ value: fmt(min + (max - min) / 2), labelKey: "mid", kind: "positive" });
      }
      return values;
    }

    case "string": {
      const maxLength = typeof field.maxLength === "number" ? field.maxLength : undefined;
      const minLength = Number.isFinite(Number(field.min)) ? Number(field.min) : undefined;
      const values: BvaValue[] = [];
      if (field.required) {
        values.push({ value: "", labelKey: "emptyRequired", kind: "negative" });
      }
      if (minLength && minLength > 0) {
        values.push(
          { value: "a".repeat(minLength), labelKey: "minLength", labelArg: minLength, kind: "boundary" },
          {
            value: "a".repeat(Math.max(0, minLength - 1)),
            labelKey: "belowMinLength",
            labelArg: minLength - 1,
            kind: "negative",
          }
        );
      } else {
        values.push({ value: "a", labelKey: "singleChar", kind: "boundary" });
      }
      if (maxLength && maxLength > 0) {
        values.push(
          { value: "a".repeat(maxLength), labelKey: "maxLength", labelArg: maxLength, kind: "boundary" },
          {
            value: "a".repeat(maxLength + 1),
            labelKey: "aboveMaxLength",
            labelArg: maxLength + 1,
            kind: "negative",
          }
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
        { value: iso(min), labelKey: "earliestDate", kind: "boundary" },
        { value: iso(max), labelKey: "latestDate", kind: "boundary" },
        { value: iso(new Date(min.getTime() - dayMs)), labelKey: "beforeEarliest", kind: "negative" },
        { value: iso(new Date(max.getTime() + dayMs)), labelKey: "afterLatest", kind: "negative" },
      ];
    }

    case "enum": {
      const allowed = field.allowedValues ?? [];
      if (allowed.length === 0) return [];
      return [
        ...allowed.map<BvaValue>((v) => ({
          value: v,
          labelKey: "allowedValue" as const,
          labelArg: v,
          kind: "positive" as const,
        })),
        {
          value: `__INVALID_${field.name.toUpperCase()}__`,
          labelKey: "outsideAllowed",
          kind: "negative",
        },
      ];
    }

    case "bool":
      return [
        { value: "true", labelKey: "boolTrue", kind: "positive" },
        { value: "false", labelKey: "boolFalse", kind: "positive" },
      ];
  }
}

/** Resolves a value's label into the requested language. */
export function bvaLabel(bva: BvaValue, lang: BvaLanguage): string {
  return COPY[lang].labels[bva.labelKey](bva.labelArg);
}

/**
 * Human-readable stand-in for a value inside titles and step text. Long
 * length-boundary strings would otherwise blow past the 120-character title
 * limit (rule R2); the full value still lives in the test data table.
 */
const MAX_INLINE_VALUE_CHARS = 40;

function describeValue(value: string, lang: BvaLanguage): string {
  const copy = COPY[lang];
  if (value === "") return copy.empty;
  if (value.length <= MAX_INLINE_VALUE_CHARS) return value;
  const sample = value.slice(0, 12);
  return `"${sample}…" (${copy.charsSuffix(value.length)})`;
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
export function synthesizeBvaCases(
  suite: TestSuite,
  startIndex: number,
  lang: BvaLanguage = "en"
): TestCase[] {
  const cases: TestCase[] = [];
  const copy = COPY[lang];
  let seq = startIndex;

  const alreadyCovered = new Set(
    suite.testCases.flatMap((tc) => tc.testData.map((td) => `${td.field}=${td.value}`))
  );

  for (const field of suite.fields) {
    for (const bva of bvaValuesForField(field)) {
      if (alreadyCovered.has(`${field.name}=${bva.value}`)) continue;
      alreadyCovered.add(`${field.name}=${bva.value}`);

      const displayValue = describeValue(bva.value, lang);
      const label = bvaLabel(bva, lang);
      const invalid = bva.kind === "negative";
      cases.push({
        id: `TC-${String(seq++).padStart(3, "0")}`,
        title: copy.title(field.name, displayValue, label),
        objective: copy.objective(field.name),
        requirementRef: { requirementId: suite.requirement.id },
        preconditions: [copy.precondition(suite.functionName)],
        steps: [
          { order: 1, action: copy.stepOthersValid(field.name) },
          { order: 2, action: copy.stepEnter(field.name, displayValue) },
          { order: 3, action: copy.stepSubmit(suite.functionName) },
        ],
        testData: [{ field: field.name, value: bva.value, note: label }],
        expectedResult: invalid
          ? copy.expectedInvalid(field.name)
          : copy.expectedValid(field.name),
        priority: invalid ? "High" : "Medium",
        type: bva.kind,
        technique: "BVA",
      });
    }
  }

  return cases;
}
