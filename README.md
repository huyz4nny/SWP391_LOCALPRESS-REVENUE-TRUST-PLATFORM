# LocalPress — Revenue & Trust Platform

> **Nền tảng báo điện tử địa phương kết hợp Doanh thu tự chủ & Kiểm duyệt tin tức**  
> **Dự án:** SWP391 — Học kỳ FALL 2026 — Đại học FPT  
> **Nhóm thực hiện:** Nhóm 2 (Leader: SV4 — Huy)

---

## 1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)

LocalPress là giải pháp toàn diện cho tòa soạn báo điện tử địa phương (mô hình mẫu: Hà Tĩnh) nhằm xây dựng nguồn thu độc lập và đảm bảo độ tin cậy thông tin:
1. **B2C (Paywall nội dung chuyên sâu):** Đọc báo miễn phí, bản dùng thử (preview) và trả phí mua bài phóng sự điều tra (15.000 ₫/bài) hoặc gói hội viên định kỳ (tháng/quý/năm).
2. **B2B (Quảng cáo doanh nghiệp tự phục vụ):** Doanh nghiệp tự kiểm tra vị trí hiển thị (Ad Slots), đặt lịch chiến dịch, tải lên banner quảng cáo và theo dõi chỉ số minh bạch (Impressions, Clicks, CTR).
3. **Tòa soạn & Kiểm duyệt:** Quản lý vòng đời bài viết, kiểm duyệt nội dung, kiểm duyệt banner quảng cáo, kiểm duyệt bình luận và trợ lý AI hỗ trợ gợi ý tiêu đề/sapo.
4. **Tài chính & Đối soát:** Quản lý đơn hàng, đối soát doanh thu, luồng thanh toán VietQR / Thẻ, hoàn tiền theo nguyên tắc 4 mắt (Four-Eyes Principle) và sổ quỹ kép (General Ledger).
5. **Nền tảng Quản trị (Admin):** Quản lý người dùng, phân quyền RBAC và nhật ký kiểm toán (Audit Logs).

---

## 2. PHÂN CÔNG THÀNH VIÊN (TEAM RACI)

- **SV4 (Leader - Huy):** Tài chính, Kế toán, Thanh toán, Đối soát & Cổng QR / Webhook.
- **SV1 (Tây):** Cổng Doanh nghiệp & Quảng cáo B2B (Booking, Banner, Báo cáo CTR).
- **SV2 (Trọng Phan):** Tòa soạn, CMS Báo chí & Kiểm duyệt bài viết.
- **SV3 (Thành viên 3):** Độc giả, Nội dung công khai & Trải nghiệm Đọc báo B2C.
- **SV5 (Thành viên 5):** Quản trị hệ thống (Admin), Phân quyền RBAC & Nhật ký kiểm toán.

---

## 3. CẤU TRÚC DỰ ÁN (MONOREPO ARCHITECTURE)

```text
LocalPress/
├── backend/                               # Spring Boot 3 & MySQL
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/localpress/
│       │   │   ├── LocalPressApplication.java
│       │   │   ├── identity/              # Quản lý người dùng & phân quyền
│       │   │   ├── reader/                # Nghiệp vụ tài khoản độc giả
│       │   │   ├── content/               # Quản lý nội dung bài báo & chuyên mục
│       │   │   ├── editorial/             # Quy trình biên tập, duyệt bài
│       │   │   ├── advertising/           # Quản lý chiến dịch quảng cáo B2B
│       │   │   ├── finance/               # Thanh toán, hóa đơn, hoàn tiền, đối soát
│       │   │   ├── delivery/              # Phân phối banner quảng cáo & tracking
│       │   │   ├── administration/        # Quản trị hệ thống, audit log
│       │   │   └── shared/                # Dùng chung (config, security, response, util...)
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-dev.yml
│       │       └── db/migration/
│       │           ├── V1__create_tables.sql
│       │           └── V2__insert_seed_data.sql
│       └── test/java/com/localpress/
│
└── frontend/                              # React 19 + TypeScript + Vite + Tailwind CSS
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── app/                           # Router, Providers & Config
        ├── layouts/                       # Public, Reader, Advertiser, Backoffice Layouts
        ├── components/                    # Atomic UI & Shared components
        ├── features/                      # Domain features (Identity, Reader, Editorial, Advertising, Finance, Admin)
        ├── lib/                           # HTTP client, formatters, utilities
        ├── mocks/                         # Mock data & in-memory handlers
        ├── types/                         # TypeScript interfaces
        └── tests/                         # Vitest unit & domain tests
```

---

## 4. HƯỚNG DẪN CÀI ĐẶT & CHẠY ỨNG DỤNG

### 4.1. Frontend (React 19 + Vite)
```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Khởi động môi trường phát triển (Dev server)
npm run dev

# 4. Kiểm thử nghiệp vụ
npm run test
```
Truy cập: `http://localhost:5173`

### 4.2. Backend (Spring Boot 3 + Java 17/21)
```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Khởi chạy với Maven
./mvnw spring-boot:run
# Hoặc với máy đã cài sẵn Maven:
mvn spring-boot:run
```
API Endpoint mặc định: `http://localhost:8080/api/v1`

---

## 5. TÀI LIỆU QUẢN TRỊ DỰ ÁN
- Xem chi tiết tại [LOCALPRESS_MASTER_ROADMAP.md](LOCALPRESS_MASTER_ROADMAP.md) để nắm rõ từng Use Case, kiến trúc API, Database Schema và kịch bản bảo vệ trước hội đồng.
