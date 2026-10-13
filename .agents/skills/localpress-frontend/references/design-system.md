# LocalPress Design System & Visual Guidelines

Tài liệu quy chuẩn hệ thống thiết kế giao diện (Design System) cho dự án LocalPress. Toàn bộ 5 thành viên (SV1 - SV5) và AI Agents phải tuân thủ nghiêm ngặt các quy tắc dưới đây để đảm bảo giao diện đồng bộ 100%, mang đậm phong cách báo điện tử địa phương uy tín và hiện đại.

---

## 1. BẢNG MÀU CHUẨN (COLOR PALETTE & DESIGN TOKENS)

Hệ màu được cấu hình sẵn trong `frontend/tailwind.config.js` và `frontend/src/styles/globals.css`. Tuyệt đối không tự ý dùng các mã màu Hex tùy tiện ngoài hệ thống quy chuẩn này.

### 1.1. Màu thương hiệu & Nhận diện (Brand Accents)

| Nhóm màu | Class Tailwind mẫu | Mã Hex tiêu chuẩn | Ý nghĩa & Bối cảnh sử dụng |
| :--- | :--- | :--- | :--- |
| **Primary (Deep Navy)** | `bg-primary-900`, `text-primary-900`, `hover:bg-primary-800` | `#1e3a8a` | Màu chủ đạo toàn hệ thống: Header backoffice, nút bấm chính (Primary Action), link quan trọng, tiêu đề mục. |
| **Crimson (News Red)** | `bg-crimson`, `text-crimson-800`, `bg-red-50 text-red-700` | `#991b1b` | Nhãn tin nóng (Breaking News), huy hiệu thời sự đặc biệt, cảnh báo nguy hiểm, nút hủy/xóa/từ chối. |
| **Gold (VIP / Member)** | `bg-gold`, `text-amber-600`, `bg-amber-50 text-amber-800` | `#d97706` | Huy hiệu hội viên Premium, gói VIP, icon vương miện Crown, quyền lợi trả phí, điểm nhấn doanh nghiệp B2B. |
| **Editorial Paper** | `bg-[#fafaf9]`, `bg-[#fdfbf7]`, `border-[#e7e5e4]` | `#fafaf9` | Nền báo giấy ngà cao cấp cho trang độc giả công khai (`PublicLayout`). Giúp mắt thư giãn khi đọc bài dài. |
| **Slate Dark (Backoffice)** | `bg-slate-900`, `bg-slate-800`, `text-slate-100` | `#0f172a` | Thanh điều hướng, Sidebar quản trị Tòa soạn & Kế toán, Header Backoffice. |
| **Slate Clean (Surface)** | `bg-slate-50`, `bg-white`, `border-slate-200` | `#f8fafc` | Nền các khối bảng biểu, form nhập liệu, danh sách và thẻ thẻ nghiệp vụ. |

### 1.2. Màu trạng thái nghiệp vụ (Semantic Status Colors)

Khi hiển thị trạng thái (Status Badge / Chips), phải tuân theo chuẩn tương phản:

- **Thành công / Hoạt động / Đã duyệt / Đã thanh toán:**
  `bg-emerald-50 text-emerald-700 border-emerald-200`
- **Chờ duyệt / Đang xử lý / Cần chú ý / Chờ thanh toán:**
  `bg-amber-50 text-amber-800 border-amber-200`
- **Thông tin / Đã duyệt sơ bộ / Bản tin:**
  `bg-sky-50 text-sky-700 border-sky-200`
- **Thất bại / Từ chối / Đã hủy / Đã hoàn tiền:**
  `bg-red-50 text-red-700 border-red-200`
- **Bản nháp / Vô hiệu hóa / Chưa kích hoạt:**
  `bg-slate-100 text-slate-700 border-slate-200`

---

## 2. NGUYÊN TẮC TYPOGRAPHY (PHÔNG CHỮ & THỨ BẬC)

Dự án phối hợp 2 họ phông chữ chính:
1. **`font-serif` (Merriweather, Noto Serif, Georgia):** Dành riêng cho trải nghiệm báo chí — Tiêu đề bài viết, Sapo, nội dung phóng sự chuyên sâu, tên báo LocalPress.
2. **`font-sans` (Inter, Roboto, sans-serif):** Dành cho toàn bộ giao diện quản trị (Backoffice), cổng B2B (Advertiser), bảng biểu, form, menu, nhãn trạng thái và số liệu.

### Thứ bậc Typography:

| Cấp bậc | Class gợi ý | Font | Ứng dụng thực tế |
| :--- | :--- | :--- | :--- |
| **Masthead Brand** | `text-2xl font-serif font-black tracking-tight` | Serif | Logo `LocalPress` trên Header trang báo |
| **Hero Article Title** | `text-2xl lg:text-3xl font-serif font-bold leading-tight` | Serif | Tiêu đề bài viết tâm điểm trên Trang chủ / Chi tiết bài |
| **Section Title** | `text-lg font-bold text-slate-900 tracking-tight` | Sans | Tiêu đề khối chuyên mục, tiêu đề bảng quản trị |
| **Backoffice Page Title** | `text-xl sm:text-2xl font-bold text-slate-900` | Sans | Đầu mỗi trang quản trị / Cổng Doanh nghiệp |
| **Sapo / Lead Text** | `text-base font-serif text-stone-700 italic leading-relaxed` | Serif | Đoạn mở đầu tóm tắt bài báo (Sapo) |
| **Article Body** | `text-base font-serif text-stone-900 leading-relaxed space-y-4` | Serif | Toàn văn bài viết độc giả đọc |
| **Table Header** | `text-[11px] font-semibold text-slate-600 uppercase tracking-wider` | Sans | Cột tiêu đề của bảng dữ liệu |
| **Table Cell Text** | `text-xs text-slate-800 font-medium` | Sans | Nội dung hàng trong bảng dữ liệu |
| **Monospace Identifiers**| `font-mono text-xs font-bold text-slate-900` | Mono | Mã đơn (`LP-2026-001`), Mã chiến dịch (`CAMP-001`), Mã slot |

---

## 3. QUY CHUẨN ĐỊNH DẠNG DỮ LIỆU (CURRENCY & DATETIME)

Tất cả thành viên **BẮT BUỘC** gọi hàm tiện ích từ `@/lib/format`, **TUYỆT ĐỐI KHÔNG** tự viết chuỗi thủ công:

```typescript
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from '@/lib/format'
```

- **Tiền tệ (VND):**
  - Cú pháp: `formatCurrency(amount)`
  - Kết quả: `150000` $\rightarrow$ `150.000 ₫`, `0` $\rightarrow$ `0 ₫`
  - Đơn vị tính: Việt Nam Đồng (VND), không hiển thị USD hay ký hiệu lạ.
- **Ngày tháng:**
  - Cú pháp: `formatDate(dateInput)` $\rightarrow$ `28/09/2026`
- **Ngày giờ:**
  - Cú pháp: `formatDateTime(dateInput)` $\rightarrow$ `28/09/2026 14:30` (Chuẩn múi giờ `Asia/Ho_Chi_Minh`)
- **Thời gian tương đối:**
  - Cú pháp: `formatRelativeTime(dateInput)` $\rightarrow$ `Vừa xong`, `5 phút trước`, `2 giờ trước`, `3 ngày trước`.

---

## 4. BIỂU TƯỢNG (ICONS) & KÍCH THƯỚC

Chỉ sử dụng thư viện `lucide-react`. Kích thước icon chuẩn:
- **Icon nhãn / Badge:** `w-3 h-3 mr-1` hoặc `w-3.5 h-3.5 mr-1`
- **Icon nút bấm / Menu item:** `w-4 h-4 mr-2`
- **Icon thẻ thống kê / Card metric:** `w-5 h-5` hoặc `w-6 h-6`
- **Icon trạng thái rỗng (Empty state):** `w-12 h-12 text-slate-300 mx-auto mb-3`
- **Icon cảnh báo lỗi / 403 Forbidden:** `w-16 h-16`

---

## 5. THẺ & ĐỘ BO GÓC (CARDS & BORDER RADIUS)

- **Bo góc khung chứa chính (Containers/Cards):** `rounded-xl`
- **Bo góc nút bấm & Input:** `rounded-md`
- **Bo góc Huy hiệu / Badge:** `rounded-full`
- **Đổ bóng (Shadows):**
  - Bảng biểu & Khối chức năng: `shadow-2xs` hoặc `shadow-xs border border-slate-200`
  - Modal hộp thoại nổi: `shadow-2xl border border-slate-200`
  - Tránh dùng `shadow-2xl` quá đậm cho các thẻ thông thường làm nặng nề giao diện báo chí.
