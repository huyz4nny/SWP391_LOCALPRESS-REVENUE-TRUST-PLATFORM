---
name: localpress-frontend
description: >-
  Comprehensive frontend development guide, design system specifications, component catalog,
  and implementation runbook for LocalPress (Báo điện tử địa phương: Doanh thu kép & Kiểm duyệt tin tức).
  Use this skill whenever creating, modifying, styling, or reviewing any React/TypeScript frontend page,
  component, form, modal, table, or API integration to ensure 100% UI consistency, adhere to the 4 layouts,
  enforce design tokens (Navy #1e3a8a, Crimson #991b1b, Gold #d97706, Paper #fafaf9), and respect team boundaries (SV1 - SV5).
---

# LocalPress Frontend Development Skill & UI Guidelines

Bộ hướng dẫn quy chuẩn giao diện và quy trình phát triển Frontend dành cho toàn bộ 5 thành viên nhóm 2 (SV1 - SV5) và AI Agents trong dự án **LocalPress — Revenue & Trust Platform**.

Tài liệu này đảm bảo toàn bộ 48 màn hình chức năng đạt tính đồng bộ tuyệt đối về mặt thị giác, kiến trúc mã nguồn sạch sẽ, không xung đột ranh giới và tuân thủ trọn vẹn **21 Quy tắc nghiệp vụ bất biến**.

---

## 1. TỔNG QUAN CÔNG NGHỆ & QUY TẮC CỐT LÕI

- **Stack chính:** React 19 + TypeScript (strict) + Vite 8 + Tailwind CSS 3.4.
- **Điều hướng & Định tuyến:** React Router v7 (`react-router-dom`).
- **Xác thực Form:** React Hook Form + Zod (`@hookform/resolvers/zod`).
- **Icon hệ thống:** Duy nhất `lucide-react`.
- **Định dạng chuẩn:** Tiền tệ `VND` và Ngày giờ múi giờ `Asia/Ho_Chi_Minh` qua `@/lib/format`.
- **Cơ chế API:** Hỗ trợ song song Mock Store (`mockStore`) và Backend Spring Boot thật qua switch `APP_CONFIG.useMockApi`.

---

## 2. QUY CHUẨN THIẾT KẾ NHANH (DESIGN SYSTEM CHEATSHEET)

Chi tiết đầy đủ xem tại: [Design System Reference](./references/design-system.md)

### 2.1. Bảng màu thương hiệu
- **Primary (Deep Navy - `#1e3a8a`):** `bg-primary-900`, `text-primary-900`, `hover:bg-primary-800` — Dành cho nút chính, liên kết quan trọng, header quản trị.
- **Crimson (News Red - `#991b1b`):** `bg-crimson`, `text-crimson-800` — Dành cho tin nóng (Breaking News), nút xóa/từ chối, cảnh báo lỗi.
- **Gold (VIP / Member - `#d97706`):** `bg-gold`, `text-amber-600` — Dành cho huy hiệu Hội viên Premium, gói VIP, icon Crown, thanh toán gói.
- **Editorial Paper (`#fafaf9`):** Nền báo giấy ngà thanh lịch cho trải nghiệm đọc báo công khai (`PublicLayout`).

### 2.2. Phông chữ (Typography)
- **`font-serif` (Merriweather, Georgia):** Dành cho Tên báo `LocalPress`, tiêu đề bài viết, đoạn Sapo tóm tắt, nội dung phóng sự.
- **`font-sans` (Inter, sans-serif):** Dành cho toàn bộ giao diện quản trị Backoffice, cổng B2B, bảng biểu, form, menu, nhãn trạng thái.

### 2.3. Định dạng bắt buộc (Không tự viết tay)
```typescript
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from '@/lib/format'

formatCurrency(15000)         // -> "15.000 ₫"
formatDate('2026-09-28')      // -> "28/09/2026"
formatDateTime(new Date())    // -> "28/09/2026 14:30"
formatRelativeTime(createdAt) // -> "5 phút trước" / "2 giờ trước"
```

---

## 3. MA TRẬN 4 LAYOUT & PHÂN BỔ RANH GIỚI

Toàn bộ ứng dụng được chia thành 4 khu vực giao diện rõ rệt:

| Layout | File mã nguồn | Đối tượng người dùng | Phong cách thị giác | Phân hệ trực thuộc |
| :--- | :--- | :--- | :--- | :--- |
| **Public** | `src/layouts/PublicLayout.tsx` | Khách vãng lai (`GUEST`), Độc giả đọc báo | Tinh giản, nền giấy ngà `#fafaf9`, phông Serif, thanh masthead thời tiết | SV3 (Hoàng) |
| **Reader Account** | `src/layouts/ReaderAccountLayout.tsx` | Độc giả đã đăng nhập | Nền xám nhạt, thẻ trắng, quản lý tủ sách, gói cước, 2 thiết bị | SV3 (Hoàng) |
| **Advertiser** | `src/layouts/AdvertiserLayout.tsx` | Doanh nghiệp quảng cáo B2B (`ADVERTISER`) | Slate sạch sẽ, chuyên nghiệp, tra cứu slot, booking, chiến dịch | SV1 (Tây) |
| **Backoffice** | `src/layouts/BackofficeLayout.tsx` | Tòa soạn, Kế toán, Quản trị hệ thống | Header tối `bg-slate-900`, Sidebar phân quyền linh hoạt, bảng dữ liệu chuẩn | SV2 (Phan), SV4 (Huy), SV5 (Tùng) |

Chi tiết nhiệm vụ 5 thành viên xem tại: [Feature Guidelines](./references/feature-guidelines.md)

---

## 4. DANH MỤC COMPONENT DÙNG CHUNG (BẮT BUỘC TÁI SỬ DỤNG)

Chi tiết cú pháp xem tại: [Component Patterns Reference](./references/component-patterns.md)

1. **`StatusBadge` (`@/components/shared/StatusBadge`):**
   - **BẮT BUỘC DÙNG** cho toàn bộ bảng và danh sách trạng thái.
   - Hỗ trợ 6 nhóm nghiệp vụ: `type="article"`, `type="booking"`, `type="payment"`, `type="delivery"`, `type="creative"`, `type="refund"`.
   - Tuyệt đối không tự tạo badge trạng thái riêng lẻ bằng mã hex khác biệt.
2. **`EmptyState` (`@/components/shared/EmptyState`):**
   - Hiển thị khi danh sách bài viết, booking, đơn hàng hoặc tìm kiếm trả về rỗng.
3. **`ConfirmDialog` (`@/components/shared/ConfirmDialog`):**
   - Hộp thoại xác nhận trước khi thực hiện hành động nhạy cảm: Xóa, hạ bài viết, dừng khẩn cấp quảng cáo, duyệt hoàn tiền.
4. **`Button` & `Badge` & `Card` & `Input` (`@/components/ui/...`):**
   - Sử dụng các component nguyên tử dựng sẵn, hỗ trợ đầy đủ variant (`primary`, `destructive`, `gold`, `outline`...).

---

## 5. QUY TRÌNH DỰNG MỘT MÀN HÌNH MỚI (STEP-BY-STEP RUNBOOK)

Khi thành viên hoặc AI agent triển khai một màn hình mới, phải tuân theo 6 bước chuẩn sau:

### Bước 1: Xác định đúng phân hệ & Ranh giới code (Rule 17)
- Kiểm tra xem màn hình thuộc trách nhiệm của ai:
  - SV1: `src/features/advertising`
  - SV2: `src/features/editorial`
  - SV3: `src/features/reader`
  - SV4: `src/features/finance`
  - SV5: `src/features/administration`
- Chỉ tạo hoặc sửa đổi file trong thư mục của mình.

### Bước 2: Khai báo Types & DTOs
- Định nghĩa kiểu dữ liệu trong `src/features/<module>/types/index.ts`.
- Đảm bảo kiểu dữ liệu khớp với 19 thực thể CSDL trong `AGENTS.md`.

### Bước 3: Định nghĩa hàm API (Dual-Mode)
- Viết hàm API trong `src/features/<module>/api/index.ts`.
- Sử dụng `APP_CONFIG.useMockApi` để lấy dữ liệu từ `mockStore` khi mock, hoặc gọi `httpClient` khi kết nối Backend Spring Boot.
- Tham khảo mẫu: [Form & API Patterns](./references/form-and-api-patterns.md).

### Bước 4: Xây dựng Giao diện theo Mẫu chuẩn
- Nếu là trang danh sách/quản trị: Bắt buộc có (1) Header tiêu đề + Nút thao tác, (2) Filter toolbar, (3) Bảng dữ liệu hoặc Thẻ kèm `StatusBadge`, (4) `EmptyState`.
- Xem mã mẫu hoàn chỉnh: [Backoffice Table Example](./examples/BackofficeTablePage.tsx).
- Nếu là Form nhập liệu: Dùng React Hook Form + Zod, hiển thị lỗi tiếng Việt bên dưới ô nhập, nút bấm có `isLoading`.
- Xem mã mẫu hoàn chỉnh: [Modal Form Example](./examples/ModalFormExample.tsx).
- Nếu là Thẻ bài viết công khai: Sử dụng phông Serif, huy hiệu danh mục, thời gian tương đối.
- Xem mã mẫu hoàn chỉnh: [Public Article Card Example](./examples/PublicArticleCard.tsx).

### Bước 5: Kiểm tra Quy tắc nghiệp vụ bất biến
- Đối chiếu với [Domain Invariants Reference](./references/domain-invariants.md):
  - Bài Free không bắt login (Rule 1).
  - Không lộ toàn văn bài Premium khi chưa mua (Rule 3).
  - Đảm bảo cách ly dữ liệu Doanh nghiệp B2B (Rule 14).
  - Đảm bảo giới hạn số tiền hoàn tiền $\le$ số tiền đơn gốc (Rule 11).

### Bước 6: Kiểm tra Linter, Build & Test
Chạy các lệnh kiểm thử sau tại thư mục `frontend`:
```bash
# Kiểm tra lỗi cú pháp và linter
npm run lint

# Kiểm tra biên dịch TypeScript & Vite
npm run build

# Chạy kiểm thử tự động
npm test
```

---

## 6. THƯ MỤC THAM CHIẾU (QUICK LINKS)

- **Hệ thống thiết kế & Bảng màu:** [design-system.md](./references/design-system.md)
- **Catalog Component tái sử dụng:** [component-patterns.md](./references/component-patterns.md)
- **Quy chuẩn Form Zod & API Layer:** [form-and-api-patterns.md](./references/form-and-api-patterns.md)
- **21 Quy tắc bất biến trên Frontend:** [domain-invariants.md](./references/domain-invariants.md)
- **Phân chia nhiệm vụ 5 thành viên (SV1 - SV5):** [feature-guidelines.md](./references/feature-guidelines.md)
- **Mã nguồn mẫu Bảng Quản trị:** [BackofficeTablePage.tsx](./examples/BackofficeTablePage.tsx)
- **Mã nguồn mẫu Hộp thoại Form Zod:** [ModalFormExample.tsx](./examples/ModalFormExample.tsx)
- **Mã nguồn mẫu Thẻ Báo chí Công khai:** [PublicArticleCard.tsx](./examples/PublicArticleCard.tsx)
