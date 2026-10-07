# LocalPress 21 Domain Invariants in Frontend Implementation

Tài liệu hướng dẫn cách thức thể hiện và bảo vệ 21 Quy tắc bất biến (Invariant Rules) của dự án LocalPress trên tầng giao diện người dùng (Frontend).

---

## 1. CÁC QUY TẮC CỐT LÕI TÁC ĐỘNG TRỰC TIẾP TỚI FRONTEND

### Rule 1: Đọc Free 100% không bắt đăng nhập
- Khách vãng lai (`GUEST`) truy cập trang chủ, xem danh mục, đọc toàn bộ bài Free, tìm kiếm tin tức và xem các bình luận đã duyệt mà **TUYỆT ĐỐI KHÔNG** bị bật modal ép đăng nhập.
- Nút đăng nhập/đăng ký chỉ nằm ở thanh masthead trên cùng để người dùng chủ động bấm khi muốn.

### Rule 3: Paywall thực thi ở tầng Server-side (Chống F12 Inspect)
- Khi bài viết có `isPremium: true` và người đọc chưa có quyền đọc:
  - Giao diện **CHỈ** nhận trường `previewContent` (khoảng 30% nội dung).
  - Khung `PaywallPrompt` hiển thị bên dưới mời mua bài lẻ (15.000 ₫) hoặc mua gói năm/tháng.
  - **CẤM TUYỆT ĐỐI:** Không bao giờ load toàn bộ nội dung `content` vào HTML rồi dùng CSS `filter: blur(...)` hay `opacity-0` để che giấu, vì độc giả bấm `F12 Inspect` là đọc được ngay.

### Rule 8: Phiên bản hóa Banner Quảng cáo (Creative Versioning)
- Khi doanh nghiệp đổi ảnh banner cho chiến dịch đang chạy:
  - Banner v1 hiện tại vẫn đang phát (`LIVE`).
  - Bản upload mới hiển thị ở trạng thái v2 (`IN_REVIEW` - Chờ duyệt banner).
  - Tòa soạn (SV2) vào duyệt v2 thành `APPROVED` thì hệ thống mới thay thế banner phát trên trang báo.

### Rule 9: Điều kiện phát sóng quảng cáo (Ad Serving Gate)
- Huy hiệu `LIVE` màu xanh lá nhấp nháy chỉ được hiển thị khi thỏa mãn **ĐỦ 5 điều kiện**:
  1. Ngày hiện tại nằm trong khoảng `[startDate, endDate]`.
  2. Vị trí `AdSlot` đang ở trạng thái kích hoạt.
  3. Banner `creative.status === 'APPROVED'`.
  4. Đơn hàng/chiến dịch đã thanh toán (`paymentStatus === 'PAID'`).
  5. Không bị thư ký tòa soạn bấm dừng khẩn cấp (`!isPaused`).
- Nếu thiếu bất kỳ điều kiện nào, trạng thái hiển thị phải là `NOT_STARTED`, `ELIGIBLE` hoặc `PAUSED`.

### Rule 11: Giới hạn số tiền hoàn (Refund Cap)
- Form hoàn tiền của Kế toán viên (SV4) phải validate trường số tiền hoàn: `refundAmount <= originalOrderAmount - alreadyRefundedAmount`.
- Nút duyệt hoàn tiền của Kế toán trưởng phải hiển thị rõ số tiền thực tế và cảnh báo nếu vượt hạn mức.

### Rule 12: Bình luận sau khi sửa phải kiểm duyệt lại
- Khi độc giả chỉnh sửa bình luận đã được duyệt hiển thị, trạng thái bình luận đó lập tức quay về `PENDING`.
- Bình luận đó sẽ tạm ẩn khỏi bài viết cho đến khi Thư ký tòa soạn (SV2) duyệt lại.

### Rule 14: Cách ly dữ liệu đa người thuê (Multi-tenant B2B Isolation)
- Cổng doanh nghiệp (`/advertiser`): Toàn bộ danh sách Booking, Chiến dịch, Hóa đơn **BẮT BUỘC** lọc theo ID của doanh nghiệp đăng nhập hiện tại (`currentUser.companyId` hoặc `currentUser.id`).
- Không hiển thị số liệu của doanh nghiệp khác kể cả khi thay đổi tham số ID trên URL.

### Rule 17: Phân định ranh giới & Code Ownership (SV1 - SV5)
- Mỗi thành viên làm việc tập trung trong thư mục phân hệ của mình:
  - **SV1 (Tây):** `src/features/advertising` & `src/layouts/AdvertiserLayout.tsx`
  - **SV2 (Trọng Phan):** `src/features/editorial`
  - **SV3 (Hoàng):** `src/features/reader` & `src/layouts/PublicLayout.tsx` & `src/layouts/ReaderAccountLayout.tsx`
  - **SV4 (Huy - Leader):** `src/features/finance` & Quản trị Tầng dùng chung (`src/components/`, `src/lib/`, `src/app/`)
  - **SV5 (Tùng):** `src/features/administration`
- Không được can thiệp hoặc sửa đổi code thuộc phân hệ của thành viên khác trừ khi thảo luận qua Leader Huy.

### Rule 20: Điều hướng sau đăng nhập chuẩn xác
- Sau khi đăng nhập thành công, điều hướng người dùng bằng `PERMISSION_CHECKERS.getDefaultBackofficeRoute(user.role)`.
- Không gán cứng URL chuyển hướng đến một trang cá nhân cụ thể.
