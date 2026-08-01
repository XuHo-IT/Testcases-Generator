## Thay đổi gì

<!-- Mô tả ngắn gọn. Nếu sửa lỗi, nêu cả nguyên nhân gốc chứ không chỉ triệu chứng. -->

Liên quan issue: <!-- #123, hoặc ghi "không có" -->

## Đã kiểm chứng thế nào

<!-- Bạn chạy gì để biết thay đổi này đúng? Có thử trên trình duyệt không? -->

- [ ] `npm run lint` sạch
- [ ] `npm test` xanh
- [ ] `npm run build` thành công

## Tự kiểm

- [ ] Không commit API key hay `.env` nào (chỉ `.env.example` được phép)
- [ ] Không thêm log ghi ra request body (có thể chứa key người dùng)
- [ ] Nếu thêm/sửa rule validate: đã cập nhật `lib/validation/rule-catalog.ts` và viết test
- [ ] Nếu sửa nội dung prompt: đã tăng `PROMPT_VERSION` trong `lib/prompts/fragments.ts`
- [ ] Nếu đổi hình dạng dữ liệu: đã sửa zod schema trước, không hardcode type riêng

## Ảnh chụp màn hình

<!-- Bắt buộc nếu thay đổi giao diện. Có dark mode thì chụp cả hai. -->
