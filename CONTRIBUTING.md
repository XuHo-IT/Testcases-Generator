# Đóng góp cho TestCaseGenerator

Cảm ơn bạn đã quan tâm. Dự án này dành cho tester, nên đóng góp có giá trị nhất thường đến từ chính người làm QA: rule kiểm tra còn thiếu, định dạng export mà công ty bạn đang dùng, hoặc một prompt cho ra test case tốt hơn.

Bạn không cần xin phép trước cho việc nhỏ (sửa lỗi chính tả, sửa bug rõ ràng, thêm test) — cứ mở PR. Với thay đổi lớn, mở issue bàn trước để khỏi mất công.

## Chuẩn bị môi trường

Cần Node.js 20 trở lên.

```bash
git clone https://github.com/XuHo-IT/Testcases-Generator.git
cd Testcases-Generator
npm install
cp .env.example .env.local
```

**Không cần API key để phát triển.** Đặt `ENABLE_MOCK_PROVIDER=1` trong `.env.local` rồi chọn model *Mock (dữ liệu mẫu, offline)* — toàn bộ luồng sinh → validate → sửa → export chạy offline bằng dữ liệu mẫu, không gọi API và không tốn tiền.

```bash
npm run dev     # http://localhost:3000
npm test        # unit test, không gọi mạng
npm run lint
npm run build   # kiểm tra TypeScript + build production
```

## Trước khi mở PR

Chạy đủ ba lệnh sau và đảm bảo đều sạch:

```bash
npm run lint && npm test && npm run build
```

CI cũng chạy đúng ba lệnh này trên Node 20 và 22, nên nếu máy bạn xanh thì CI cũng xanh.

## Vài quy ước của repo

- **Zod là nguồn chân lý duy nhất.** Schema trong `lib/schemas/` sinh ra cả structured output cho AI, cả rule validate, cả TypeScript type. Sửa hình dạng dữ liệu thì sửa schema trước.
- **Test case là đặc tả, không phải kết quả chạy.** Schema cố ý không có `status`, `passedFailed`, `executedDate`, `defectId`; rule R10 chặn những nội dung này lọt vào. Đừng thêm lại — bản cũ của công cụ từng bịa kết quả Passed/Failed và đó là lý do dự án này được viết lại.
- **Không log request body.** Body có thể chứa API key người dùng dán vào. Khi log lỗi, dùng `errorMessage()` trong `lib/ai/redact.ts`.
- **Rule validate là hàm thuần** `(suite) => issues[]`, đồng bộ, không gọi mạng — nhờ vậy test được từng rule một cách độc lập.
- **Comment giải thích *tại sao*, không mô tả lại code.** Code nói *cái gì* rồi.
- Giao diện dùng token màu ở đầu `app/globals.css`, không hardcode mã màu trong component.

## Thêm tính năng theo từng loại

### Thêm một AI model

Sửa đúng **một file**: `lib/ai/models.config.ts`. Thêm một dòng vào `MODEL_CATALOG`:

```ts
{ providerId: "anthropic", modelId: "claude-opus-5", label: "Claude Opus 5", supportsStructured: true }
```

Nếu là **provider mới** thì thêm vào `PROVIDER_IDS`, `PROVIDER_LABELS`, khai báo env var trong `PROVIDER_ENV_VARS` và thêm một nhánh `case` trong `getModel()` (`lib/ai/registry.ts`). Ưu tiên provider có sẵn adapter cho Vercel AI SDK.

### Thêm một rule validate

1. Viết rule trong `lib/validation/rules.ts` (hàm thuần, trả `ValidationIssue[]`).
2. Thêm vào mảng `ALL_RULES`.
3. Thêm metadata tiếng Việt vào `lib/validation/rule-catalog.ts` — **bắt buộc**, có test khẳng định catalogue và `ALL_RULES` khớp 1-1.
4. Viết test trong `tests/validation.test.ts` cho cả trường hợp đạt và không đạt.

Cân nhắc: rule mới nên là `error` hay `warning`? Chỉ dùng `error` khi test case thực sự không dùng được.

### Thêm một định dạng export

Thêm file trong `lib/export/`, khai báo trong `EXPORT_FORMATS` và bảng dispatch ở `lib/export/index.ts`, thêm nhãn tiếng Việt trong `components/ExportMenu.tsx`, và viết test trong `tests/export.test.ts` (mở lại file vừa tạo rồi assert nội dung, đừng chỉ so sánh số byte).

### Sửa prompt

Prompt nằm trong `lib/prompts/`. Khi sửa nội dung, **tăng `PROMPT_VERSION`** trong `lib/prompts/fragments.ts` — giá trị này được ghi vào `suite.meta` nên truy ngược được bộ test case cũ sinh bằng prompt nào.

Nhớ rằng model mock chọn fixture dựa trên vài chuỗi mốc trong prompt (`## Repair task`, `software requirements expert`); đổi những chuỗi đó thì sửa `lib/ai/mock-provider.ts` theo.

## Test

Vitest chạy trong môi trường **node**, không có jsdom — nên hiện chưa test được component. Test tập trung vào tầng `lib/`, nơi chứa phần lớn logic. Nếu bạn muốn thêm test component, cần bổ sung jsdom và `@testing-library/react`; hãy mở issue bàn trước.

Test không được gọi mạng thật. Provider mock (`lib/ai/mock-provider.ts`) và fixture (`lib/ai/fixtures.ts`) là chỗ để mô phỏng phản hồi AI.

## Cấu hình repo cũng nằm trong repo

Ô About và branch protection của `main` là **settings** của GitHub chứ không phải file, nên bình thường git không ghi lại chúng đáng lẽ phải là gì — và một lần reset, chuyển chủ sở hữu hay fork là mất sạch mà không có diff nào cho thấy đã mất gì. Hai script không phụ thuộc gì ngoài `gh` giữ chúng lại ở đây:

```bash
node .github/apply-about.mjs               # chạy thử: hiện tại vs mong muốn
node .github/apply-about.mjs --apply
node .github/apply-protection.mjs --apply
```

Cả hai cần GitHub CLI đã đăng nhập với scope `repo`, và chỉ maintainer mới dùng tới. Nếu bạn đổi `name:` của job hoặc đổi ma trận Node trong `ci.yml`, hãy sửa luôn danh sách `contexts` trong `apply-protection.mjs` trong cùng PR — job bị đổi tên sẽ **âm thầm** thôi là check bắt buộc.

## Báo lỗi bảo mật

Đừng mở issue công khai — xem [SECURITY.md](SECURITY.md).

## Giấy phép

Khi gửi PR, bạn đồng ý rằng phần đóng góp của mình được phát hành theo [giấy phép MIT](LICENSE) của dự án.
