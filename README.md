# TestCaseGenerator

[![CI](https://github.com/XuHo-IT/Testcases-Generator/actions/workflows/ci.yml/badge.svg)](https://github.com/XuHo-IT/Testcases-Generator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-1F3B63.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-1F3B63.svg)](CONTRIBUTING.md)

Sinh test case cho tester từ requirement, kèm **rule validate chuẩn doanh nghiệp (ISTQB)** và **cấu hình được nhiều AI model** (Claude, GPT, Gemini, Ollama local).

Repo này gộp và viết lại hai repo cũ (frontend Next.js và backend .NET) thành một ứng dụng full-stack Next.js duy nhất.

> Dự án mã nguồn mở, hoan nghênh PR. Muốn thử ngay mà không cần API key: đặt `ENABLE_MOCK_PROVIDER=1` rồi chọn model *Mock (offline)*.

## Tính năng

| Nhóm | Nội dung |
|---|---|
| **Input** | Text mô tả use case · User story + acceptance criteria · Upload file requirement (.docx/.pdf/.md/.txt) · OpenAPI/Swagger spec (JSON/YAML) |
| **AI models** | Anthropic Claude · OpenAI GPT · Google Gemini · Ollama (local, on-prem) · Mock (offline, không tốn credit) |
| **Validate** | 14 rule ISTQB (R1–R14) chạy tự động, kèm một vòng tự sửa (deterministic + AI) |
| **Export** | Excel ISTQB · Excel UTCID matrix · CSV · JSON · Markdown · Gherkin (.feature) |

Ngoài ra có luồng sinh **Use Case Report** kiểu IEEE (`POST /api/generate-use-case-report`) và export ra Excel 2 cột.

## Chạy nhanh

```bash
npm install
cp .env.example .env.local     # điền ít nhất 1 API key, hoặc ENABLE_MOCK_PROVIDER=1
npm run dev                    # http://localhost:3000
```

Muốn thử ngay mà không tốn credit: đặt `ENABLE_MOCK_PROVIDER=1` rồi chọn model **Mock (fixtures, offline)** — toàn bộ luồng generate → validate → repair → export chạy offline.

```bash
npm test          # 110 unit test, không gọi API thật
npm run build     # kiểm tra type + build production
```

## Trang cài đặt (`/cai-dat`)

Mọi thiết lập lưu trong **localStorage của trình duyệt**, không nằm trên máy chủ.

**API key của bạn (BYOK).** Dán key Claude / GPT / Gemini hoặc địa chỉ Ollama, bấm *Kiểm tra kết nối* để biết key chạy được chưa. Key chỉ rời trình duyệt khi bạn thực sự bấm sinh test case, và chỉ gửi key của đúng provider đang chọn. Máy chủ dùng xong là bỏ — không lưu, không ghi log; thông báo lỗi trả về đã được lọc bỏ chuỗi giống API key. Key của bạn **đè** biến môi trường, nên deploy chung cho cả nhóm mà mỗi người vẫn dùng key riêng được.

> localStorage đọc được bởi mọi thứ chạy trong trình duyệt đó — đừng nhập key trên máy dùng chung. Có sẵn nút xóa toàn bộ key.

**Mặc định khi sinh test case.** Nhớ model, ngôn ngữ và tùy chọn case biên cho lần sau.

**14 rule ISTQB.** Xem đầy đủ mã, mức độ, phạm vi và giải thích tiếng Việt của từng rule; bật/tắt rule nào không hợp quy ước của đội.

**Rule riêng.** Chọn trường cần kiểm (tiêu đề, các bước, kết quả mong đợi, dữ liệu test…) + điều kiện (phải chứa / không được chứa / khớp regex / độ dài / số lượng) + thông báo khi vi phạm. Rule đang bật được **đưa luôn vào yêu cầu gửi cho AI** để model tuân thủ ngay từ lần sinh đầu, đồng thời dùng để chấm lại sau khi sinh. Regex giới hạn 200 ký tự và bị chặn ngay lúc nhập nếu không hợp lệ.

Sau khi sửa rule, bấm **Kiểm tra lại theo rule hiện tại** ở trang chủ để chấm lại bộ test case đang có — chạy cục bộ qua `POST /api/validate`, **không gọi AI, không tốn chi phí**.

## Cấu hình AI model

Toàn bộ danh mục model nằm trong **một file duy nhất**: `lib/ai/models.config.ts`. Thêm model mới = thêm một dòng:

```ts
{ providerId: "anthropic", modelId: "claude-sonnet-5", label: "Claude Sonnet 5", supportsStructured: true }
```

Model dùng được khi provider đã có env var trên server **hoặc** bạn đã dán key riêng trong `/cai-dat` — provider dùng key riêng hiện nhãn "key của bạn". `GET /api/models` chỉ báo trạng thái env var và probe Ollama trong 1.5 giây, không bao giờ trả key xuống trình duyệt.

| Provider | Env var |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Ollama | `OLLAMA_BASE_URL` (vd `http://localhost:11434`) |
| Mock | `ENABLE_MOCK_PROVIDER=1` |

> Model local (Ollama) được đánh dấu *experimental*: model nhỏ hay vi phạm schema. Khuyến nghị dùng model ≥7B; pipeline đã có schema lỏng + repair pass để hấp thụ phần lỗi còn lại.

## Rule validate (ISTQB)

Định nghĩa tại `lib/validation/rules.ts`, mỗi rule là một hàm thuần `(suite) => issues[]` nên dễ unit test và dễ thêm rule mới.

| ID | Mức | Nội dung |
|---|---|---|
| R1 | error | Test case ID đúng format `TC-###`, không trùng |
| R2 | error | Title 8–120 ký tự, không trùng |
| R3 | warn | Có precondition, hoặc ghi rõ "None" |
| R4 | error | Có ít nhất 1 step, đánh số tuần tự, mỗi action tối thiểu 3 từ |
| R5 | warn | Step không chứa cụm mơ hồ ("etc", "appropriately", "nếu cần"…) |
| R6 | error | Test data cụ thể, không phải placeholder (`<value>`, "TBD"…) |
| R7 | error | Expected result nêu được observable (message, state, HTTP code); cấm "works correctly" |
| R8 | error | Priority và Type đúng enum |
| R9 | error | `requirementRef` trỏ đúng requirement hoặc acceptance criterion |
| R10 | error | **Không chứa kết quả thực thi giả** (Passed/Failed, `DF-xxx`, ngày execute) |
| R11 | warn | Suite có ít nhất 1 case negative |
| R12 | warn | Field numeric có đủ biên min, max, min−1, max+1 |
| R13 | warn | Mỗi acceptance criterion được ít nhất 1 case tham chiếu |
| R14 | info | Phát hiện case gần trùng nhau |

Case còn lỗi sau repair **vẫn nằm trong suite** với badge đỏ và cột "Validation" trong file export — không âm thầm bỏ đi.

Rule R5, R6 và R7 có danh sách cụm từ cho cả tiếng Anh và tiếng Việt (`lib/validation/vague-phrases.ts`).

## Điểm khác biệt so với hai repo cũ

| Vấn đề cũ | Xử lý ở repo này |
|---|---|
| API key Gemini bị commit công khai | Chỉ commit `.env.example`; `.gitignore` chặn mọi `.env*` khác; key người dùng nằm trong trình duyệt, không đưa lên máy chủ. Key từng bị lộ ở repo cũ cần được thu hồi ở phía Google |
| Chỉ hỗ trợ Gemini, model dính liền URL | 4 provider + mock, catalog gói trong 1 file, key chỉ ở phía server |
| Parse JSON bằng cách "cạo" giữa `{...}` | `generateObject` + zod schema — loại bỏ hẳn lớp bug này |
| Không có validation nào | 14 rule ISTQB + repair pass |
| Excel bịa Passed/Failed, Defect ID random, ngày = `DateTime.Now` | Các ô này **để trống** cho tester điền; summary báo Untested = tổng số case |
| Marker ● chỉ đánh được UTCID01 và UTCID02 | Mỗi test case một cột, marker đánh đủ mọi cột |
| Số test case = số input field | Số case theo số giá trị biên thực tế |
| min/max kiểu `int` làm hỏng field string | BVA theo từng kiểu: int, decimal, string (theo độ dài), date, enum, bool |
| Test suite không build được | 110 test chạy sạch với mock provider |
| Chỉ export được Excel | 6 định dạng, cộng Use Case Report |

## Triển khai

**Vercel (cloud):** deploy thẳng, set các env var cần dùng. Route generate đặt `maxDuration = 300` (cần Pro/fluid compute; gói Hobby giới hạn thấp hơn). Ollama không dùng được trên Vercel — picker tự ẩn.

**On-prem (Docker + Ollama):** dữ liệu requirement không ra khỏi mạng nội bộ.

```bash
docker compose up -d
docker compose exec ollama ollama pull llama3.1:8b
# http://localhost:3000
```

## Cấu trúc

```
app/
  layout.tsx                   khung chung: header + nav + SettingsProvider + footer
  page.tsx                     trang sinh test case
  cai-dat/page.tsx             trang cài đặt
  api/{generate,generate-use-case-report,parse-file,export,models,validate,test-connection}/route.ts
lib/
  schemas/     zod — nguồn chân lý cho AI output, validation, custom rule và TS types
  settings/    schema.ts · storage.ts · store.ts (localStorage qua useSyncExternalStore)
  ai/          models.config.ts (catalog) · registry.ts · mock-provider.ts · retry.ts · redact.ts
  prompts/     test-suite · use-case-report · repair · fragments (en/vi)
  inputs/      normalize.ts + parsers/ (docx, pdf, openapi)
  generation/  pipeline.ts · bva.ts
  validation/  engine.ts · rules.ts · rule-catalog.ts · custom-rules.ts · vague-phrases.ts
  export/      excel-istqb · excel-utcid · excel-usecase · text-formats · index.ts
components/    GeneratorForm · ModelPicker · TestCasePreviewTable · ValidationBadge · ExportMenu
               SettingsProvider · SiteNav · settings/ (4 section)
tests/         110 unit test (validation, custom rules, settings, BVA, export, inputs, pipeline)
```

## Giao diện

Bảng màu học thuật, một màu nhấn duy nhất là **navy đậm (`#1F3B63`)** trên nền bone ấm (`#F7F6F3`) — dễ đọc khi ngồi review lâu, không gradient, không màu chói. Có dark mode tự động theo hệ điều hành.

- Chữ hiển thị: **Lora** (serif) cho tiêu đề, **Be Vietnam Pro** cho nội dung — hỗ trợ đầy đủ dấu tiếng Việt.
- Số liệu và mã test case dùng font monospace, bật `tabular-nums` để các cột thẳng hàng.
- Đủ trạng thái: hover, active, focus ring cho bàn phím, skeleton khi đang sinh, và màn hình rỗng có hướng dẫn.
- Tôn trọng `prefers-reduced-motion`; có link "bỏ qua đến nội dung chính" cho người dùng bàn phím.

Toàn bộ token màu nằm ở đầu `app/globals.css` — đổi màu chủ đạo của trường chỉ cần sửa biến `--accent`.

## Lưu ý khi vận hành

- **Document lớn:** input bị cắt ở 20.000 ký tự kèm cảnh báo rõ ràng — nên chia nhỏ requirement để phủ hết.
- **PDF scan ảnh:** không trích được text; hệ thống báo lỗi rõ thay vì trả kết quả rỗng.
- **Chi phí:** mỗi lần generate là 1 lệnh gọi model, cộng tối đa 1 lệnh gọi repair. Dùng mock provider cho demo và CI.

## Đóng góp

Rất hoan nghênh PR — nhất là từ người làm QA: rule kiểm tra còn thiếu, định dạng export mà công ty bạn đang dùng, hay prompt cho ra test case tốt hơn.

Đọc [CONTRIBUTING.md](CONTRIBUTING.md) để biết cách chạy dự án và hướng dẫn cụ thể cho từng loại đóng góp (thêm model, thêm rule, thêm định dạng export). Không cần API key để phát triển — mock provider chạy offline hoàn toàn.

Trước khi mở PR, chạy `npm run lint && npm test && npm run build`. CI chạy đúng ba lệnh này trên Node 20 và 22.

Tham gia dự án đồng nghĩa với việc bạn đồng ý tuân thủ [Quy tắc ứng xử](CODE_OF_CONDUCT.md). Lỗi bảo mật xin báo riêng theo [SECURITY.md](SECURITY.md), đừng mở issue công khai.

## Giấy phép

[MIT](LICENSE) © Ngo Tran Xuan Hoa
