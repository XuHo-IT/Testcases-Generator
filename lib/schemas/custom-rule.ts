import { z } from "zod";
import { SEVERITIES } from "./validation";

/**
 * User-defined validation rules.
 *
 * Declarative on purpose: testers describe the check by picking a target and a
 * comparison instead of writing code, so rules can live in localStorage and be
 * evaluated on the server without ever running user-supplied JavaScript.
 */

export const RULE_TARGETS = [
  "title",
  "objective",
  "expectedResult",
  "preconditions",
  "steps",
  "testData",
  "anyText",
] as const;
export type RuleTarget = (typeof RULE_TARGETS)[number];

export const RULE_TARGET_LABELS: Record<RuleTarget, string> = {
  title: "Tiêu đề",
  objective: "Mục tiêu",
  expectedResult: "Kết quả mong đợi",
  preconditions: "Điều kiện tiên quyết",
  steps: "Các bước thực hiện",
  testData: "Dữ liệu test",
  anyText: "Toàn bộ nội dung test case",
};

export const CHECK_TYPES = [
  "mustContain",
  "mustNotContain",
  "matches",
  "notMatches",
  "minLength",
  "maxLength",
  "minCount",
  "maxCount",
] as const;
export type CheckType = (typeof CHECK_TYPES)[number];

export const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  mustContain: "Phải chứa",
  mustNotContain: "Không được chứa",
  matches: "Phải khớp regex",
  notMatches: "Không được khớp regex",
  minLength: "Độ dài tối thiểu",
  maxLength: "Độ dài tối đa",
  minCount: "Số lượng tối thiểu",
  maxCount: "Số lượng tối đa",
};

/** Count checks only make sense on list-shaped targets. */
export const COUNT_TARGETS: RuleTarget[] = ["preconditions", "steps", "testData"];

/**
 * A hostile regex can hang the evaluating thread, and rules are shared inside a
 * team. Cap the pattern length and reject anything that does not compile, so a
 * broken rule fails at edit time rather than at validation time.
 */
export const MAX_PATTERN_LENGTH = 200;

const patternSchema = z
  .string()
  .min(1, "Chưa nhập biểu thức")
  .max(MAX_PATTERN_LENGTH, `Biểu thức tối đa ${MAX_PATTERN_LENGTH} ký tự`)
  .superRefine((pattern, ctx) => {
    try {
      new RegExp(pattern);
    } catch {
      ctx.addIssue({ code: "custom", message: "Biểu thức chính quy không hợp lệ" });
    }
  });

export const checkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mustContain"), value: z.string().min(1), ignoreCase: z.boolean().default(true) }),
  z.object({ type: z.literal("mustNotContain"), value: z.string().min(1), ignoreCase: z.boolean().default(true) }),
  z.object({ type: z.literal("matches"), pattern: patternSchema, ignoreCase: z.boolean().default(true) }),
  z.object({ type: z.literal("notMatches"), pattern: patternSchema, ignoreCase: z.boolean().default(true) }),
  z.object({ type: z.literal("minLength"), value: z.number().int().min(0).max(100000) }),
  z.object({ type: z.literal("maxLength"), value: z.number().int().min(1).max(100000) }),
  z.object({ type: z.literal("minCount"), value: z.number().int().min(0).max(1000) }),
  z.object({ type: z.literal("maxCount"), value: z.number().int().min(0).max(1000) }),
]);

export const CUSTOM_RULE_ID_PREFIX = "CR-";

export const customRuleSchema = z.object({
  id: z.string().regex(/^CR-[A-Za-z0-9]+$/, "Mã rule phải có dạng CR-…"),
  name: z.string().min(3, "Tên rule tối thiểu 3 ký tự").max(80),
  enabled: z.boolean().default(true),
  severity: z.enum(SEVERITIES).default("warning"),
  target: z.enum(RULE_TARGETS),
  check: checkSchema,
  /** Message shown to the tester when the rule is violated. */
  message: z.string().min(3, "Thông báo tối thiểu 3 ký tự").max(300),
});

export type CustomRuleCheck = z.infer<typeof checkSchema>;
export type CustomRule = z.infer<typeof customRuleSchema>;

export const customRulesSchema = z.array(customRuleSchema).max(50);

/** Stable-enough id without pulling in a uuid dependency. */
export function newCustomRuleId(existing: readonly CustomRule[]): string {
  let n = existing.length + 1;
  const taken = new Set(existing.map((r) => r.id));
  while (taken.has(`${CUSTOM_RULE_ID_PREFIX}${n}`)) n++;
  return `${CUSTOM_RULE_ID_PREFIX}${n}`;
}

export function describeCheck(check: CustomRuleCheck): string {
  switch (check.type) {
    case "mustContain":
    case "mustNotContain":
      return `${CHECK_TYPE_LABELS[check.type]} "${check.value}"`;
    case "matches":
    case "notMatches":
      return `${CHECK_TYPE_LABELS[check.type]} /${check.pattern}/`;
    case "minLength":
    case "maxLength":
      return `${CHECK_TYPE_LABELS[check.type]} ${check.value} ký tự`;
    case "minCount":
    case "maxCount":
      return `${CHECK_TYPE_LABELS[check.type]} ${check.value} mục`;
  }
}
