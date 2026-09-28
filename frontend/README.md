# LocalPress — Revenue & Trust Platform (Frontend)
> **Nền tảng báo điện tử địa phương kết hợp Doanh thu tự chủ & Kiểm duyệt tin tức**  
> **Dự án tốt nghiệp / Đồ án:** SWP391 — Học kỳ FALL 2026 — Đại học FPT  
> **Nhóm thực hiện:** Nhóm 2 (Leader: SV4 - Huy)

---

## 1. GIỚI THIỆU TỔNG QUAN

LocalPress là frontend hoàn chỉnh, có tính tương tác cao (Interactive Mockup & Production-Ready Architecture) mô phỏng nền tảng báo điện tử địa phương (bối cảnh mẫu: Tỉnh Hà Tĩnh). Ứng dụng giải quyết bài toán tự chủ tài chính cho tòa soạn bằng mô hình doanh thu kép:
1. **B2C (Paywall nội dung chuyên sâu):** Đọc báo miễn phí, xem bản dùng thử và trả phí đọc phóng sự điều tra độc quyền (mua lẻ 15.000 ₫ hoặc đăng ký gói tháng/quý/năm).
2. **B2B (Quảng cáo doanh nghiệp tự phục vụ):** Cổng Doanh nghiệp tra cứu vị trí trống (Ad Slots), gửi yêu cầu booking, tải lên banner quảng cáo (Creatives), xem báo cáo minh bạch (Impressions, Clicks, CTR).
3. **Tòa soạn & Kiểm duyệt:** Quản lý bản thảo, phiên bản bài viết (version history), kiểm duyệt banner, kiểm duyệt bình luận và trợ lý AI hỗ trợ gợi ý tiêu đề/sapo.
4. **Tài chính & Đối soát:** Quản lý đơn hàng, xác nhận chuyển khoản ngân hàng thủ công, đối soát doanh thu theo kỳ (Reconciliation), quy trình hoàn tiền tuân thủ nguyên tắc 4 mắt (Four-Eyes Principle) và sổ quỹ kế toán kép (General Ledger).
5. **Nền tảng Quản trị:** Phân quyền RBAC, giám sát động cơ phân phối quảng cáo và nhật ký kiểm toán (Audit Logs).

---

## 2. CÔNG NGHỆ SỬ DỤNG

- **Framework:** React 19 + TypeScript strict + Vite 8
- **Điều hướng:** React Router v7 (`react-router-dom`)
- **Quản lý Server State & Caching:** TanStack Query (`@tanstack/react-query`)
- **Quản lý Form & Validation:** React Hook Form + Zod
- **Thiết kế & Styling:** Tailwind CSS 3.4 (Hệ màu Tòa soạn Báo chí: Xanh Navy `#1e3a8a`, Đỏ Trầm `#991b1b`, Vàng Hội Viên `#d97706`, Nền ngà báo giấy `#fafaf9`, Phông chữ Serif Merriweather & Sans Inter)
- **Biểu đồ:** Recharts
- **Icon:** Lucide React
- **Đơn vị tiền tệ & Thời gian:** Tiền tệ chuẩn Việt Nam Đồng (VND), ngày giờ múi giờ `Asia/Ho_Chi_Minh`
- **Kiểm thử nghiệp vụ:** Vitest (100% pass 10 test case domain cốt lõi)

---

## 3. CẤU TRÚC THƯ MỤC CHUẨN MỰC

```text
frontend/
├── src/
│   ├── app/                    # Cấu hình app, router, providers
│   │   ├── config.ts           # App constants, roles, mock/real switch
│   │   ├── providers.tsx       # QueryClientProvider & Contexts
│   │   └── router.tsx          # 4 khu vực điều hướng & route guards
│   ├── layouts/                # 4 Layout chính
│   │   ├── PublicLayout.tsx    # Giao diện đọc báo công khai cho độc giả & khách
│   │   ├── ReaderAccountLayout.tsx # Cổng tài khoản cá nhân của độc giả
│   │   ├── AdvertiserLayout.tsx    # Cổng đối tác doanh nghiệp đặt quảng cáo B2B
│   │   └── BackofficeLayout.tsx   # Cổng điều hành nội bộ Tòa soạn - Kế toán - Admin
│   ├── components/
│   │   ├── ui/                 # Component nguyên tử (Button, Badge, Card, Input, Label, Dialog...)
│   │   └── shared/             # Dùng chung (StatusBadge, EmptyState, ConfirmDialog, RoleSwitcherBar, AdSlotBanner)
│   ├── features/               # Tổ chức theo miền nghiệp vụ (Domain Feature)
│   │   ├── identity/           # Đăng nhập, đăng ký, quên mật khẩu
│   │   ├── reader/             # Trang chủ báo, chuyên mục, chi tiết bài viết, Paywall, tủ sách, giỏ hàng
│   │   ├── advertising/        # Dashboard B2B, tra cứu slot, booking mới, chi tiết hợp đồng, duyệt creative
│   │   ├── editorial/          # Bài viết tòa soạn, CMS soạn bài, AI Copilot, duyệt báo giá, duyệt banner, comment
│   │   ├── finance/            # Dashboard kế toán, danh sách đơn, đối chiếu ủy nhiệm chi, hoàn tiền, đối soát kỳ, sổ quỹ
│   │   └── administration/     # Quản lý tài khoản, ma trận RBAC, cấu hình Paywall & giới hạn 2 máy, Ad delivery monitor, audit logs
│   ├── lib/
│   │   ├── format/             # Định dạng tiền tệ VND, ngày giờ Asia/Ho_Chi_Minh
│   │   ├── http/               # HTTP client chuẩn hóa, lỗi chuẩn ApiErrorResponse
│   │   └── utils.ts            # Helper cn merge Tailwind classes
│   ├── mocks/
│   │   ├── data/seed.ts        # Bộ dữ liệu mẫu nhất quán & phong phú (12 bài, 4 booking, 8 đơn hàng, 3 hoàn tiền...)
│   │   ├── handlers/index.ts   # Bộ xử lý Mock REST API trả về đúng chuẩn DTO
│   │   └── store.ts            # Stateful Reactive Store lưu trữ trạng thái có tính bền vững (localStorage)
│   ├── tests/
│   │   └── domain.test.ts      # Kiểm thử nghiệp vụ tự động (Vitest)
│   └── styles/
│       └── globals.css         # Typography, custom scrollbar, root tokens
├── package.json
└── README.md
```

---

## 4. HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### Yêu cầu môi trường
- Node.js version 18.x trở lên (đã kiểm thử ổn định trên Node v26).
- npm version 9.x trở lên.

### Các lệnh thực thi
```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các gói thư viện
npm install

# 3. Khởi động môi trường phát triển (Dev server)
npm run dev

# 4. Chạy bộ kiểm thử tự động
npm test

# 5. Build mã nguồn xuất xưởng (Production build)
npm run build
```

---

## 5. TÀI KHOẢN VÀ VAI TRÒ DEMO (MOCK PERSONAS)

Ứng dụng tích hợp sẵn thanh **Role Switcher Bar** ở góc dưới màn hình (chỉ hiển thị khi bật chế độ Mock). Bạn có thể đổi vai trò tức thì với 1 cú click:

| STT | Tài khoản Demo | Tên hiển thị | Vai trò hệ thống | Chức năng chính thử nghiệm |
|:---:|:---|:---|:---|:---|
| 1 | `user-guest` | Khách vãng lai | `GUEST` | Đọc tin Free, xem thử trích đoạn Paywall 120 từ |
| 2 | `user-reader-free` | Nguyễn Văn An | `READER` (Free) | Độc giả thường, có bookmark/lịch sử, chưa mua VIP |
| 3 | `user-reader-premium` | Trần Thị Mai | `READER` (VIP) | Độc giả sở hữu Gói Năm & 2 bài phóng sự độc quyền |
| 4 | `user-adv-1` | Đặng Quang Huy | `ADVERTISER` | Đại diện Công ty CP Nông sản Sạch Hà Tĩnh (ADV-001) |
| 5 | `user-adv-2` | Lê Hồng Phong | `ADVERTISER` | Đại diện Bất động sản Đất Sen Hồng (ADV-002) |
| 6 | `user-editor` | Nguyễn Văn Biên Tập | `EDITOR` | Phóng viên soạn bài, lưu bản nháp, nộp duyệt |
| 7 | `user-reviewer` | Trần Thị Thư Ký | `REVIEWER` | Thư ký tòa soạn: Duyệt bài, duyệt banner quảng cáo |
| 8 | `user-fin-staff` | Lê Thị Thu Ngân | `FINANCE_STAFF` | Kế toán viên: Đối soát biên lai ngân hàng, lập đề xuất hoàn tiền |
| 9 | `user-fin-mgr` | Phạm Trưởng Phòng | `FINANCE_MANAGER` | Kế toán trưởng: Duyệt hoàn tiền (4 mắt), đóng kỳ đối soát |
| 10 | `user-admin` | Vũ Quản Trị | `SYSTEM_ADMIN` | Quản trị viên: Phân quyền, cấu hình Paywall, audit log |

> **Nút Reset Dữ Liệu:** Nằm ngay trên thanh Switcher Bar ("Reset"). Bấm nút này sẽ khôi phục toàn bộ Mock Store về trạng thái ban đầu mà không cần xóa cache thủ công.

---

## 6. CHUYỂN ĐỔI MOCK API VÀ BACKEND THẬT (SPRING BOOT SWITCH)

Tại file [src/app/config.ts](file:///e:/FPTU/FALL26/SWP391/frontend/src/app/config.ts):
```typescript
export const APP_CONFIG = {
  // Đặt useMockApi = false khi kết nối với backend Spring Boot thật
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== 'false',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
}
```
- Khi `useMockApi: true`: Mọi cuộc gọi qua `httpClient` được định tuyến đến `src/mocks/handlers/index.ts` và thực thi trên `mockStore`.
- Khi `useMockApi: false`: `httpClient` thực hiện HTTP `fetch()` thật tới `apiBaseUrl` kèm header `Authorization: Bearer <JWT>` và `Content-Type: application/json`.
- **Tuyệt đối không sửa code component**: Các page/component chỉ gọi qua `api` module nên giao diện giữ nguyên 100% khi chuyển backend.

---

## 7. BẢNG HỢP ĐỒNG API ĐỀ XUẤT CHO BACKEND SPRING BOOT

Tất cả endpoint trả về DTO tiêu chuẩn, không trả nguyên Entity JPA của Hibernate:

### A. Nhóm Xác thực & Người dùng (Identity)
- `POST /api/v1/auth/login`: Nhận `{ email, password }` $\rightarrow$ Trả về JWT token + `UserDTO`.
- `POST /api/v1/auth/register`: Nhận thông tin đăng ký độc giả.
- `GET /api/v1/auth/me`: Thông tin người dùng đăng nhập hiện tại.

### B. Nhóm Độc giả & Paywall (Reader & Paywall)
- `GET /api/v1/articles`: Lọc theo `category`, `search`, `isPremium`.
- `GET /api/v1/articles/{slug}`:
  - Nếu là bài `PREMIUM` và độc giả **chưa có quyền**: Backend chỉ trả về `previewContent`, trường `content` phải là `null` hoặc bỏ trống (bảo mật tầng server).
  - Nếu độc giả **đã có quyền**: Backend trả về đầy đủ `content`.
- `GET /api/v1/reader/entitlements`: Trả về quyền đọc của user (gói VIP, danh sách ID bài đã mua, danh sách bookmark, thiết bị đang hoạt động).
- `POST /api/v1/reader/bookmarks/{articleId}`: Đánh dấu bài viết.
- `GET /api/v1/reader/comments/{articleId}` & `POST /api/v1/reader/comments`: Ý kiến bạn đọc.

### C. Nhóm Quảng cáo Doanh nghiệp (Advertising)
- `GET /api/v1/ad-slots`: Danh sách vị trí quảng cáo, kích thước và đơn giá.
- `GET /api/v1/advertiser/bookings`: Danh sách booking của doanh nghiệp (ràng buộc chỉ xem đơn của chính công ty mình).
- `POST /api/v1/advertiser/bookings`: Đặt chỗ vị trí quảng cáo mới.
- `POST /api/v1/advertiser/bookings/{id}/accept-quote`: Doanh nghiệp chấp nhận báo giá từ tòa soạn.
- `POST /api/v1/advertiser/campaigns/{id}/creatives`: Tải banner mới $\rightarrow$ Sinh version mới trạng thái `IN_REVIEW`.
- `GET /api/v1/advertiser/campaigns/{id}`: Thống kê Impressions, Clicks, CTR theo ngày.

### D. Nhóm Vận hành Tòa soạn (Editorial)
- `GET /api/v1/editorial/articles` & `POST /api/v1/editorial/articles`: Quản lý bài viết.
- `PUT /api/v1/editorial/articles/{id}`: Cập nhật bài viết và lưu `article_versions`.
- `POST /api/v1/editorial/articles/{id}/status`: Đổi trạng thái bài viết (`DRAFT` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `PUBLISHED`).
- `POST /api/v1/editorial/bookings/{id}/quote`: Tòa soạn ban hành báo giá và chiết khấu.
- `POST /api/v1/editorial/creatives/{id}/review-creative`: Duyệt hoặc yêu cầu sửa banner quảng cáo.

### E. Nhóm Tài chính & Đối soát (Finance)
- `GET /api/v1/finance/orders`: Danh sách đơn hàng.
- `POST /api/v1/finance/checkout`: Khởi tạo đơn hàng thanh toán (`SUBSCRIPTION`, `ARTICLE_PURCHASE`, `AD_CAMPAIGN`).
- `POST /api/v1/finance/orders/{id}/pay`: Gửi thông tin thanh toán (VietQR hoặc Biên lai chuyển khoản ngân hàng).
- `POST /api/v1/finance/orders/{id}/verify-bank-transfer`: Kế toán viên đối chiếu sao kê và duyệt `PAID`.
- `POST /api/v1/finance/refunds/propose`: Kế toán viên lập đề xuất hoàn tiền.
- `POST /api/v1/finance/refunds/{id}/review-refund`: Kế toán trưởng phê duyệt/từ chối hoàn tiền (Four-Eyes check).
- `GET /api/v1/finance/reconciliation`: Dữ liệu đối soát kỳ và các khoản lệch (Discrepancies).
- `POST /api/v1/finance/reconciliation/close`: Đóng kỳ đối soát (Khóa sổ).
- `GET /api/v1/finance/ledger`: Sổ quỹ kế toán ghi nhận bút toán Nợ/Có.

---

## 8. KẾT QUẢ NGHIỆM THU 7 HÀNH TRÌNH NGHIỆP VỤ

| Số | Hành trình nghiệm thu | Kết quả thực tế trên ứng dụng | Trạng thái |
|:---:|:---|:---|:---:|
| 1 | **Guest đọc preview $\rightarrow$ mua bài $\rightarrow$ đọc toàn văn:** | Khách đọc bài Sơn Dương chỉ thấy trích đoạn $\rightarrow$ Đăng nhập $\rightarrow$ Bấm mua lẻ 15.000 ₫ $\rightarrow$ Quét VietQR $\rightarrow$ Cấp quyền đọc $\rightarrow$ Mở toàn văn ngay lập tức và lưu vào tủ sách cá nhân. | **ĐẠT (PASS)** |
| 2 | **Thanh toán thất bại / chưa xác minh:** | Đơn hàng chuyển khoản thủ công giữ trạng thái `PROCESSING` $\rightarrow$ Chưa được mở bài $\rightarrow$ Kế toán kiểm tra biên lai và bấm xác nhận thì mới chuyển sang `PAID`. | **ĐẠT (PASS)** |
| 3 | **Advertiser gửi booking $\rightarrow$ Duyệt $\rightarrow$ LIVE:** | Doanh nghiệp gửi booking `SUBMITTED` $\rightarrow$ Tòa soạn gửi báo giá `QUOTED` $\rightarrow$ Doanh nghiệp chấp nhận & thanh toán $\rightarrow$ Banner duyệt thành công mới kích hoạt `LIVE`. | **ĐẠT (PASS)** |
| 4 | **Editor gửi bài $\rightarrow$ Duyệt $\rightarrow$ Xuất bản:** | Phóng viên viết bài $\rightarrow$ Nộp duyệt $\rightarrow$ Thư ký tòa soạn yêu cầu sửa $\rightarrow$ Phóng viên tạo version 2 kèm changelog $\rightarrow$ Thư ký duyệt $\rightarrow$ Xuất bản công khai trên trang chủ. | **ĐẠT (PASS)** |
| 5 | **Đề xuất hoàn tiền (Four-Eyes Principle):** | Kế toán viên (Lê Thị Thu Ngân) lập đề xuất $\rightarrow$ Không thể tự duyệt đề xuất của chính mình $\rightarrow$ Kế toán trưởng (Phạm Trưởng Phòng) phê duyệt $\rightarrow$ Sổ quỹ ghi bút toán Debit và thu hồi quyền lợi tương ứng. | **ĐẠT (PASS)** |
| 6 | **Thay banner đang chạy (Creative Versioning):** | Doanh nghiệp tải banner v2 mới $\rightarrow$ Banner v2 ở trạng thái `IN_REVIEW`, banner v1 vẫn đang phát sóng trực tiếp $\rightarrow$ Sau khi Thư ký tòa soạn duyệt v2 thì hệ thống mới chuyển sang phát v2. | **ĐẠT (PASS)** |
| 7 | **Bảo mật và Phân quyền (RBAC & Isolation):** | Đăng nhập tài khoản Độc giả truy cập `/backoffice` trả về màn hình 403 Forbidden. Doanh nghiệp A không thể nhìn thấy báo cáo hay hợp đồng của Doanh nghiệp B. | **ĐẠT (PASS)** |

---

## 9. PHÂN CÔNG THAM CHIẾU 5 THÀNH VIÊN NHÓM 2 SWP391

- **Tây (SV1):** Luồng Doanh nghiệp & Quảng cáo (Advertiser Portal, Quản lý Booking, Tải Banner, Báo cáo CTR).
- **Trọng Phan (SV2):** Luồng Tòa soạn & Kiểm duyệt (Ban biên tập, Duyệt bài viết, Duyệt banner quảng cáo, Duyệt ý kiến bạn đọc).
- **Hoàng (SV3):** Luồng Độc giả & Paywall (Trải nghiệm đọc báo công khai, Mua gói/bài lẻ, Tủ sách cá nhân, Quản lý phiên 2 thiết bị).
- **Huy (SV4 - Leader):** Luồng Kế toán, Thanh toán & Đối soát (Cổng VietQR/MoMo, Đối chiếu chuyển khoản, Quản lý hoàn tiền, Kỳ đối soát chênh lệch, Sổ cái).
- **Tùng (SV5):** Luồng Nền tảng CMS, Paywall Engine, Ad Serving & AI (Trợ lý AI tòa soạn, Cấu hình máy chủ Paywall, Giám sát Ad Delivery, Nhật ký Audit Logs).
