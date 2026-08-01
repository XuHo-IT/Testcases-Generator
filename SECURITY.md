# Chính sách bảo mật

## Báo lỗi bảo mật

**Đừng mở issue công khai cho lỗi bảo mật.**

Gửi email tới **ngotranxuanhoa09062004@gmail.com** với tiêu đề bắt đầu bằng `[SECURITY]`, hoặc dùng [GitHub Security Advisory](https://github.com/XuHo-IT/TestcaseGenerator/security/advisories/new) để báo riêng.

Trong báo cáo, nếu được, hãy nêu: loại lỗi, file/endpoint liên quan, các bước tái hiện, và mức ảnh hưởng bạn đánh giá. Đây là dự án làm ngoài giờ nên không cam kết thời gian phản hồi cố định, nhưng tôi sẽ trả lời sớm nhất có thể.

## API key được xử lý như thế nào

Đây là phần nhạy cảm nhất của dự án, nên nói rõ để bạn tự đánh giá rủi ro:

- Key người dùng dán vào **được lưu trong `localStorage` của trình duyệt**, không lưu trên máy chủ.
- Key chỉ rời trình duyệt khi người dùng thực sự bấm sinh test case hoặc kiểm tra kết nối, và chỉ gửi key của **đúng provider đang chọn**.
- Máy chủ dùng key cho đúng request đó rồi bỏ — không ghi ra đĩa, không đưa vào log.
- Thông báo lỗi được lọc qua `lib/ai/redact.ts` để cắt bỏ chuỗi có hình dạng giống API key trước khi trả về client hoặc ghi log.
- Máy chủ không bao giờ gửi key xuống trình duyệt; `GET /api/models` chỉ báo provider nào đã cấu hình, không kèm giá trị key.

**Giới hạn cần biết:** `localStorage` đọc được bởi mọi mã JavaScript chạy trong profile trình duyệt đó, bao gồm cả extension và mã chèn qua lỗ hổng XSS. Vì vậy:

- Không nên nhập API key trên máy dùng chung. Giao diện có sẵn nút xóa toàn bộ key.
- Nếu bạn tự deploy bản này cho cả nhóm, hãy chạy trên HTTPS.
- Nếu nghi ngờ key đã lộ, hãy thu hồi key ở phía provider — đó là biện pháp duy nhất chắc chắn.

## Rule tự định nghĩa và regex

Rule riêng do người dùng tạo là **khai báo**, không phải mã JavaScript, nên không có chuyện chạy code tùy ý trên máy chủ.

Regex do người dùng nhập được giới hạn 200 ký tự và bị từ chối ngay lúc nhập nếu không biên dịch được. Dù vậy, một biểu thức phức tạp vẫn có thể làm chậm bước kiểm tra (catastrophic backtracking). Nếu bạn mở dịch vụ này cho người ngoài, hãy tính tới việc đặt thêm giới hạn tài nguyên ở tầng hạ tầng.

## Phạm vi

Repo này là ứng dụng bạn tự chạy. Không có máy chủ nào do dự án vận hành, không có dữ liệu người dùng nào được thu thập. Khi bạn tự deploy, việc bảo vệ hạ tầng, giới hạn truy cập và quản lý API key thuộc trách nhiệm của bạn.
