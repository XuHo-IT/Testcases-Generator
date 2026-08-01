/**
 * Human-readable catalogue of the built-in rules, in Vietnamese.
 *
 * Deliberately dependency-free plain data so the settings page can import it
 * without pulling zod and every rule implementation into the client bundle.
 * `tests/validation.test.ts` asserts it stays 1:1 with ALL_RULES.
 */

export type RuleSeverity = "error" | "warning" | "info";
export type RuleScope = "case" | "suite";

export interface RuleMeta {
  id: string;
  title: string;
  description: string;
  severity: RuleSeverity;
  scope: RuleScope;
}

export const RULE_CATALOG: RuleMeta[] = [
  {
    id: "R1-ID-FORMAT",
    title: "Mã test case đúng định dạng và không trùng",
    description:
      "Mỗi test case phải có mã dạng TC-001 (cho phép tiền tố như LOGIN-TC-001) và không được trùng nhau trong cùng một bộ test.",
    severity: "error",
    scope: "case",
  },
  {
    id: "R2-TITLE",
    title: "Tiêu đề rõ ràng, dài 8–120 ký tự, không trùng",
    description:
      "Tiêu đề phải nói được test case kiểm tra điều gì, không phải chỉ nhắc lại tên chức năng. Hai test case không được cùng tiêu đề.",
    severity: "error",
    scope: "case",
  },
  {
    id: "R3-PRECONDITION",
    title: "Có điều kiện tiên quyết",
    description:
      'Phải nêu trạng thái hoặc dữ liệu cần có trước khi chạy các bước. Nếu thực sự không cần gì, ghi rõ "None" thay vì để trống.',
    severity: "warning",
    scope: "case",
  },
  {
    id: "R4-STEPS",
    title: "Các bước đánh số tuần tự và thực thi được",
    description:
      "Phải có ít nhất một bước, đánh số liên tục từ 1, và mỗi hành động dài tối thiểu 3 từ để người khác đọc là làm theo được.",
    severity: "error",
    scope: "case",
  },
  {
    id: "R5-STEPS-CONCRETE",
    title: "Bước thực hiện không dùng từ mơ hồ",
    description:
      'Phát hiện các cụm như "etc", "appropriately", "nếu cần", "tùy ý" — người chạy test sẽ không biết chính xác phải làm gì.',
    severity: "warning",
    scope: "case",
  },
  {
    id: "R6-TESTDATA",
    title: "Dữ liệu test là giá trị cụ thể",
    description:
      'Không chấp nhận placeholder như "<value>", "TBD", "xxx". Nếu các bước có nhập liệu thì bảng dữ liệu test không được để trống.',
    severity: "error",
    scope: "case",
  },
  {
    id: "R7-EXPECTED",
    title: "Kết quả mong đợi kiểm chứng được",
    description:
      'Phải nêu thứ quan sát được: nội dung thông báo, trạng thái, giá trị trả về, mã HTTP hay điều hướng. Cấm các câu chung chung như "hoạt động đúng".',
    severity: "error",
    scope: "case",
  },
  {
    id: "R8-ENUMS",
    title: "Độ ưu tiên và loại test case hợp lệ",
    description:
      "Độ ưu tiên phải là High/Medium/Low và loại phải là positive/negative/boundary — đảm bảo lọc và thống kê không bị sai.",
    severity: "error",
    scope: "case",
  },
  {
    id: "R9-TRACE",
    title: "Truy vết được về requirement",
    description:
      "Mỗi test case phải trỏ tới mã requirement hoặc mã acceptance criterion có thật, để biết nó đang phủ yêu cầu nào.",
    severity: "error",
    scope: "case",
  },
  {
    id: "R10-NO-FAB-RESULTS",
    title: "Không chứa kết quả chạy thật bịa ra",
    description:
      "Test case là đặc tả, không phải kết quả thực thi. Chặn các nội dung như Passed/Failed, mã lỗi DF-123 hay ngày đã chạy.",
    severity: "error",
    scope: "case",
  },
  {
    id: "R11-COV-NEGATIVE",
    title: "Bộ test có ít nhất một case bất thường",
    description:
      "Nếu chỉ có luồng hợp lệ thì đường lỗi và dữ liệu sai chưa được kiểm tra lần nào.",
    severity: "warning",
    scope: "suite",
  },
  {
    id: "R12-COV-BOUNDARY",
    title: "Phủ đủ giá trị biên cho field có ràng buộc",
    description:
      "Với mỗi field số có min/max, bộ test cần có đủ bốn giá trị min, max, min−1 và max+1.",
    severity: "warning",
    scope: "suite",
  },
  {
    id: "R13-AC-COVERAGE",
    title: "Mỗi acceptance criterion có test case phủ",
    description:
      "Khi đầu vào là user story, từng tiêu chí AC-1, AC-2… phải được ít nhất một test case tham chiếu tới.",
    severity: "warning",
    scope: "suite",
  },
  {
    id: "R14-NEAR-DUP",
    title: "Phát hiện test case gần trùng nhau",
    description:
      "Cảnh báo khi hai test case có cùng tiêu đề và cùng các bước — thường là dư thừa, tốn công chạy lại.",
    severity: "info",
    scope: "case",
  },
];

export const RULE_META_BY_ID: Record<string, RuleMeta> = Object.fromEntries(
  RULE_CATALOG.map((r) => [r.id, r])
);

export const SEVERITY_LABELS: Record<RuleSeverity, string> = {
  error: "Lỗi",
  warning: "Cảnh báo",
  info: "Thông tin",
};

export const SCOPE_LABELS: Record<RuleScope, string> = {
  case: "Từng test case",
  suite: "Cả bộ test",
};
