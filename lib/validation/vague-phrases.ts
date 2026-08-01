/**
 * Language-aware heuristics used by rules R5/R6/R7.
 * English + Vietnamese lists; extend per deployment as needed.
 */

/** Phrases that make a test step non-executable (R5). */
export const VAGUE_ACTION_PHRASES: RegExp[] = [
  /\betc\.?(\s|$)/i,
  /\band so on\b/i,
  /\bappropriately\b/i,
  /\bproperly\b/i,
  /\bas needed\b/i,
  /\bdo the needful\b/i,
  /\bsomehow\b/i,
  /\bif necessary\b/i,
  // Vietnamese
  /\bvân vân\b/i,
  /\bv\.v\.?(\s|$)/i,
  /\bmột cách (hợp lý|phù hợp|thích hợp)\b/i,
  /\bnếu cần\b/i,
  /\btùy ý\b/i,
];

/** Expected results that cannot produce a pass/fail verdict (R7). */
export const VAGUE_EXPECTED_PHRASES: RegExp[] = [
  /\bworks? (correctly|fine|well|properly)\b/i,
  /\bas expected\b/i,
  /\bshould work\b/i,
  /\bfunctions? (correctly|properly)\b/i,
  /\bno issues?\b/i,
  /\beverything is ok\b/i,
  // Vietnamese
  /\bhoạt động (đúng|tốt|bình thường|chính xác)\b/i,
  /\bnhư mong đợi\b/i,
  /\bđúng như kỳ vọng\b/i,
  /\bkhông có lỗi\b/i,
];

/**
 * Signals that an expected result references something observable (R7):
 * a message, state change, value, navigation target or status code.
 */
export const OBSERVABLE_HINTS: RegExp[] = [
  /"[^"]+"|'[^']+'|“[^”]+”/, // quoted literal (message text, value)
  /\b\d{3}\b/, // HTTP status code or other numeric observable
  /\b(message|error|warning|displayed?|display|shown|shows?|appears?|redirect(ed)?|returns?|status|code|saved?|created?|updated?|deleted?|locked|logged?|log|screen|page|state|value|highlighted|disabled|enabled|visible|hidden|email|notification|toast|alert|dialog|popup)\b/i,
  // Vietnamese
  /\b(thông báo|hiển thị|xuất hiện|chuyển (hướng|đến|sang)|trả về|trạng thái|mã lỗi|lưu|tạo|cập nhật|xóa|khóa|ghi log|màn hình|trang|giá trị|bật|tắt|ẩn|hiện|email|cảnh báo)\b/i,
];

/** Placeholder test-data values that are not real data (R6). */
export const PLACEHOLDER_VALUE_PATTERNS: RegExp[] = [
  /^<[^>]*>$/, // <value>, <email>
  /^\{[^}]*\}$/, // {value}
  /^\[[^\]]*\]$/, // [value]
  /^x{2,}$/i,
  /^(tbd|todo|n\/?a|none\?*|sample|placeholder|value|data|test|abc|\.{2,}|\?+)$/i,
  // Vietnamese
  /^(chưa có|đang cập nhật|giá trị|dữ liệu)$/i,
];

/** Step actions that imply data entry — used to require non-empty testData (R6). */
export const DATA_ENTRY_HINTS: RegExp =
  /\b(enter|input|type|fill|provide|upload|select|choose|nhập|điền|chọn|tải lên)\b/i;
