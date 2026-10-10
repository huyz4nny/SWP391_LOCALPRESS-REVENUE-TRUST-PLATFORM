# 🗺️ LOCALPRESS — CODING PLAN (Graph Visualization)
> **Dự án:** LocalPress — Revenue & Trust Platform  
> **Nhóm:** 2 (Leader: Huy — SV4) | **Môn:** SWP391 — FALL 2026  
> **Tài liệu chuẩn:** `project_tracking_group2.xlsx`, `AGENTS.md`, `SYSTEM_CONTEXT_AND_ARCHITECTURE.md`  
> **Phương pháp:** AI-Driven SDLC — Graph-based Coding Plan

---

## 1. TỔNG QUAN LỘ TRÌNH 4 ITERATION (Master Timeline)

```mermaid
flowchart LR
    subgraph I1["🔵 Iteration 1 (01/09 → 28/09)"]
        I1_DESC["Đóng khung tài liệu & Cấu trúc<br/>SRS, SDS, Git repo, Package layout"]
    end
    subgraph I2["🟢 Iteration 2 (29/09 → 18/10) ✦ ACTIVE"]
        I2_DESC["Khung sườn, Phân quyền & CRUD cơ bản<br/>Auth, RBAC, Master Data, Layout dùng chung"]
    end
    subgraph I3["🟠 Iteration 3 (19/10 → 08/11)"]
        I3_DESC["Luồng nghiệp vụ lõi<br/>Payment Gateway, Paywall, Booking, Review"]
    end
    subgraph I4["🔴 Iteration 4 (09/11 → 25/11)"]
        I4_DESC["Nâng cao, AI, Báo cáo & Hoàn thiện<br/>Đối soát, Refund, AI Editorial, Security"]
    end
    subgraph DEF["🏛️ Defense (26/11 → 05/12)"]
        DEF_DESC["Mock & Final Defense"]
    end

    I1 --> I2 --> I3 --> I4 --> DEF
```

---

## 2. GRAPH TỔNG HỢP 5 NHÁNH MAIN FLOW × 3 ĐỢT MÀN HÌNH

> Mỗi nhánh (path) = 1 Main Flow do 1 thành viên làm chủ end-to-end.  
> Các nút = Màn hình/Phân hệ. Mũi tên = thứ tự triển khai theo Activity Flow.

```mermaid
flowchart TD
    START(("🚀 START"))

    %% ===== ITERATION 1 (11 screens) =====
    subgraph ITER1["ĐỢT 1 — Đầu quy trình (11 màn hình)"]
        direction LR
        subgraph SV1_I1["SV1 Tây"]
            S1_1["Company Profile"]
            S1_2["Ad Slot Catalog"]
        end
        subgraph SV2_I1["SV2 Phan"]
            S2_1["Article Review & Publishing"]
            S2_2["Content Policy & Moderation"]
        end
        subgraph SV3_I1["SV3 Hoàng"]
            S3_1["Homepage & Article Search"]
            S3_2["Article Reader"]
            S3_3["Authentication"]
        end
        subgraph SV4_I1["SV4 Huy"]
            S4_1["Financial Documents & Ledger"]
            S4_2["Manual Bank Transfer Confirm"]
        end
        subgraph SV5_I1["SV5 Tùng"]
            S5_1["Article Editor"]
            S5_2["Article Metadata & Media"]
        end
    end

    %% ===== ITERATION 2 (17 screens) =====
    subgraph ITER2["ĐỢT 2 — Giữa quy trình (17 màn hình)"]
        direction LR
        subgraph SV1_I2["SV1 Tây"]
            S1_3["Campaign Booking"]
            S1_4["Quotation Confirmation"]
            S1_5["Advertising Payment"]
            S1_6["Creative Submission & Preview"]
        end
        subgraph SV2_I2["SV2 Phan"]
            S2_3["Pending Booking Queue"]
            S2_4["Advertising Inventory Calendar"]
            S2_5["Quotation Management"]
            S2_6["Creative Review"]
        end
        subgraph SV3_I2["SV3 Hoàng"]
            S3_4["Premium Checkout"]
            S3_5["Premium Article Reader"]
            S3_6["Personal Bookshelf"]
            S3_7["Comments & Reports"]
        end
        subgraph SV4_I2["SV4 Huy"]
            S4_3["Payment Processing"]
            S4_4["Advertiser Receivables"]
        end
        subgraph SV5_I2["SV5 Tùng"]
            S5_3["Article Version History"]
            S5_4["Article Submission & Revision"]
            S5_5["Content Access & Paywall"]
        end
    end

    %% ===== ITERATION 3 (20 screens) =====
    subgraph ITER3["ĐỢT 3 — Cuối quy trình (20 màn hình)"]
        direction LR
        subgraph SV1_I3["SV1 Tây"]
            S1_7["Advertising Dashboard"]
            S1_8["Creative Replacement"]
            S1_9["Requests & Business Notifs"]
            S1_10["Contracts & Documents"]
        end
        subgraph SV2_I3["SV2 Phan"]
            S2_7["Campaign Eligibility Check"]
            S2_8["Campaign Control"]
            S2_9["Advertising Contract Mgmt"]
            S2_10["Business Operation Dashboard"]
        end
        subgraph SV3_I3["SV3 Hoàng"]
            S3_8["Followed Content"]
            S3_9["Devices & Sessions"]
            S3_10["Subscription, Txn & Support"]
        end
        subgraph SV4_I3["SV4 Huy"]
            S4_5["Cash Flow Dashboard"]
            S4_6["Payment Reconciliation"]
            S4_7["Refund & Rights Mgmt"]
            S4_8["Financial Reports & Alerts"]
        end
        subgraph SV5_I3["SV5 Tùng"]
            S5_6["AI Editorial Assistant"]
            S5_7["Ad Slot Configuration"]
            S5_8["Ad Delivery & Tracking"]
            S5_9["Ad URL Monitoring"]
            S5_10["System Admin Console"]
        end
    end

    START --> ITER1 --> ITER2 --> ITER3

    %% Internal Flow: SV1 path
    S1_1 --> S1_2 --> S1_3 --> S1_4 --> S1_5 --> S1_6 --> S1_7 --> S1_8 --> S1_9 --> S1_10

    %% Internal Flow: SV2 path
    S2_1 --> S2_2 --> S2_3 --> S2_4 --> S2_5 --> S2_6 --> S2_7 --> S2_8 --> S2_9 --> S2_10

    %% Internal Flow: SV3 path
    S3_1 --> S3_2 --> S3_3 --> S3_4 --> S3_5 --> S3_6 --> S3_7 --> S3_8 --> S3_9 --> S3_10

    %% Internal Flow: SV4 path
    S4_1 --> S4_2 --> S4_3 --> S4_4 --> S4_5 --> S4_6 --> S4_7 --> S4_8

    %% Internal Flow: SV5 path
    S5_1 --> S5_2 --> S5_3 --> S5_4 --> S5_5 --> S5_6 --> S5_7 --> S5_8 --> S5_9 --> S5_10
```

---

## 3. NHÁNH CHI TIẾT TỪNG MAIN FLOW (Path per Flow)

### 3.1. PATH SV1 — Doanh nghiệp & Quảng cáo B2B (Tây)
> 14 Use Cases: `UC001` → `UC014` | 10 Màn hình | 25 Tiêu chí (16 P0, 9 P1)

```mermaid
flowchart LR
    subgraph Đợt_1["Đợt 1: Setup"]
        A1["Company Profile<br/><i>UC002</i>"]
        A2["Ad Slot Catalog<br/><i>UC003</i>"]
    end
    subgraph Đợt_2["Đợt 2: Giao dịch lõi"]
        A3["Campaign Booking<br/><i>UC004, UC005</i>"]
        A4["Quotation Confirm<br/><i>UC006</i>"]
        A5["Advertising Payment<br/><i>UC007</i>"]
        A6["Creative Submit<br/><i>UC008</i>"]
    end
    subgraph Đợt_3["Đợt 3: Báo cáo & Quản lý"]
        A7["Ad Dashboard<br/><i>UC001, UC011</i>"]
        A8["Creative Replace<br/><i>UC009</i>"]
        A9["Notifications<br/><i>UC010, UC014</i>"]
        A10["Contracts & Docs<br/><i>UC012, UC013</i>"]
    end

    A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7 --> A8 --> A9 --> A10

    %% Cross-module dependencies
    A5 -.->|"Gọi Payment API SV4"| SV4_PAY(("SV4: POST /finance/orders"))
    A6 -.->|"Chờ duyệt banner"| SV2_REV(("SV2: Creative Review"))
```

### 3.2. PATH SV2 — Tòa soạn, Vận hành & Phê duyệt (Trọng Phan)
> 14 Use Cases: `UC015` → `UC028` | 10 Màn hình | 25 Tiêu chí (14 P0, 8 P1, 3 P2)

```mermaid
flowchart LR
    subgraph Đợt_1["Đợt 1: Nền tảng duyệt"]
        B1["Article Review<br/><i>UC025</i>"]
        B2["Content Policy<br/><i>UC026, UC027</i>"]
    end
    subgraph Đợt_2["Đợt 2: Duyệt quảng cáo"]
        B3["Pending Booking<br/><i>UC016</i>"]
        B4["Inventory Calendar<br/><i>UC017</i>"]
        B5["Quotation Mgmt<br/><i>UC018</i>"]
        B6["Creative Review<br/><i>UC020, UC021, UC022</i>"]
    end
    subgraph Đợt_3["Đợt 3: Vận hành & Dashboard"]
        B7["Eligibility Check<br/><i>UC023</i>"]
        B8["Campaign Control<br/><i>UC024</i>"]
        B9["Contract Mgmt<br/><i>UC019</i>"]
        B10["Biz Dashboard<br/><i>UC015, UC028</i>"]
    end

    B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7 --> B8 --> B9 --> B10

    %% Cross-module
    B6 -.->|"Banner từ SV1"| SV1_CR(("SV1: Creative Submit"))
    B1 -.->|"Bài từ SV5"| SV5_SUB(("SV5: Article Submission"))
```

### 3.3. PATH SV3 — Khách & Độc giả (Hoàng)
> 18 Use Cases: `UC029` → `UC046` | 10 Màn hình | 25 Tiêu chí (18 P0, 6 P1, 1 P2)

```mermaid
flowchart LR
    subgraph Đợt_1["Đợt 1: Đọc Free & Auth"]
        C1["Homepage & Search<br/><i>UC029, UC030</i>"]
        C2["Article Reader<br/><i>UC031, UC032</i>"]
        C3["Authentication<br/><i>UC033</i>"]
    end
    subgraph Đợt_2["Đợt 2: Premium & Tương tác"]
        C4["Premium Checkout<br/><i>UC034, UC035</i>"]
        C5["Premium Reader<br/><i>UC036</i>"]
        C6["Personal Bookshelf<br/><i>UC037, UC038, UC039</i>"]
        C7["Comments & Reports<br/><i>UC041, UC042</i>"]
    end
    subgraph Đợt_3["Đợt 3: Cá nhân hóa"]
        C8["Followed Content<br/><i>UC040</i>"]
        C9["Devices & Sessions<br/><i>UC043</i>"]
        C10["Sub, Txn & Support<br/><i>UC044, UC045, UC046</i>"]
    end

    C1 --> C2 --> C3 --> C4 --> C5 --> C6 --> C7 --> C8 --> C9 --> C10

    %% Cross-module
    C4 -.->|"Gọi Payment API SV4"| SV4_PAY2(("SV4: POST /finance/orders"))
    C5 -.->|"Kiểm quyền Paywall"| SV5_PW(("SV5: PaywallEngine"))
    C7 -.->|"Chờ duyệt comment"| SV2_MOD(("SV2: Comment Moderation"))
```

### 3.4. PATH SV4 — Kế toán, Thanh toán & Đối soát (Huy — Leader)
> 14 Use Cases: `UC047` → `UC060` | 8 Màn hình | 25 Tiêu chí (12 P0, 12 P1, 1 P2)

```mermaid
flowchart LR
    subgraph Đợt_1["Đợt 1: Sổ sách & Chuyển khoản"]
        D1["Financial Docs & Ledger<br/><i>UC057, UC058</i>"]
        D2["Manual Bank Transfer<br/><i>UC051</i>"]
    end
    subgraph Đợt_2["Đợt 2: Cổng thanh toán"]
        D3["Payment Processing<br/><i>UC047, UC048, UC049, UC050</i>"]
        D4["Advertiser Receivables<br/><i>UC053</i>"]
    end
    subgraph Đợt_3["Đợt 3: Đối soát & Hoàn tiền"]
        D5["Cash Flow Dashboard<br/><i>UC052</i>"]
        D6["Reconciliation<br/><i>UC054</i>"]
        D7["Refund & Rights<br/><i>UC055, UC056</i>"]
        D8["Reports & Alerts<br/><i>UC059, UC060</i>"]
    end

    D1 --> D2 --> D3 --> D4 --> D5 --> D6 --> D7 --> D8

    %% Cross-module inputs
    SV1_IN(("SV1: Ad Payment")) -.->|"Tạo đơn"| D3
    SV3_IN(("SV3: Premium Checkout")) -.->|"Tạo đơn"| D3
    D3 -.->|"Webhook IPN"| GW(("VNPay / MoMo / VietQR"))
```

### 3.5. PATH SV5 — Hệ thống, Paywall, Ad Serving & AI (Tùng)
> 17 Use Cases: `UC061` → `UC077` | 10 Màn hình | 25 Tiêu chí (17 P0, 7 P1, 1 P2)

```mermaid
flowchart LR
    subgraph Đợt_1["Đợt 1: CMS cơ bản"]
        E1["Article Editor<br/><i>UC061</i>"]
        E2["Metadata & Media<br/><i>UC063, UC064</i>"]
    end
    subgraph Đợt_2["Đợt 2: Version & Paywall"]
        E3["Version History<br/><i>UC062</i>"]
        E4["Submit & Revision<br/><i>UC066, UC067</i>"]
        E5["Content Access & Paywall<br/><i>UC068, UC069</i>"]
    end
    subgraph Đợt_3["Đợt 3: AI, Ad Engine & Admin"]
        E6["AI Editorial<br/><i>UC065</i>"]
        E7["Ad Slot Config<br/><i>UC070</i>"]
        E8["Ad Delivery & Tracking<br/><i>UC071, UC072</i>"]
        E9["Ad URL Monitor<br/><i>UC073</i>"]
        E10["System Admin<br/><i>UC074, UC075, UC076, UC077</i>"]
    end

    E1 --> E2 --> E3 --> E4 --> E5 --> E6 --> E7 --> E8 --> E9 --> E10

    %% Cross-module
    E4 -.->|"Nộp duyệt bài"| SV2_ART(("SV2: Article Review"))
    E5 -.->|"Cấp quyền từ SV4"| SV4_ENT(("SV4: PaymentSuccessEvent"))
    E8 -.->|"Banner đã duyệt"| SV2_ADR(("SV2: Creative APPROVED"))
```

---

## 4. GRAPH LIÊN KẾT GIỮA CÁC NHÁNH (Inter-Module Dependency Graph)

> Thể hiện các Shared Service Contracts & Cross-module Events.

```mermaid
flowchart TD
    subgraph SV1_FLOW["🟦 SV1: Advertiser Portal"]
        SV1_PAY["Advertising Payment"]
        SV1_CREATIVE["Creative Submit"]
        SV1_REPORT["Campaign Report"]
    end

    subgraph SV2_FLOW["🟩 SV2: Editorial & Ops"]
        SV2_REVIEW_AD["Creative Review"]
        SV2_REVIEW_ART["Article Review"]
        SV2_MOD_CMT["Comment Moderation"]
        SV2_GATE["Ad Serving Gatekeeper"]
    end

    subgraph SV3_FLOW["🟨 SV3: Reader Experience"]
        SV3_CHECKOUT["Premium Checkout"]
        SV3_READ["Premium Reader"]
        SV3_COMMENT["Submit Comment"]
    end

    subgraph SV4_FLOW["🟥 SV4: Finance"]
        SV4_ORDER["POST /finance/orders"]
        SV4_WEBHOOK["Webhook IPN Handler"]
        SV4_REFUND["Refund 4-Eyes"]
        SV4_EVENT["PaymentSuccessEvent"]
    end

    subgraph SV5_FLOW["🟪 SV5: System & Delivery"]
        SV5_PAYWALL["PaywallEngine.checkAccess"]
        SV5_SERVE["Ad Serve API"]
        SV5_SUBMIT["Article Submission"]
        SV5_STATS["Ad Stats Aggregation"]
    end

    subgraph EXT["☁️ External"]
        GW["VNPay / MoMo / VietQR"]
        AI_API["Gemini API"]
        CDN["Cloudinary / MinIO"]
    end

    %% Payment flow
    SV1_PAY -->|"createOrder"| SV4_ORDER
    SV3_CHECKOUT -->|"createOrder"| SV4_ORDER
    SV4_ORDER -->|"redirect QR"| GW
    GW -->|"IPN callback"| SV4_WEBHOOK
    SV4_WEBHOOK -->|"emit"| SV4_EVENT
    SV4_EVENT -->|"unlock bài"| SV5_PAYWALL
    SV4_EVENT -->|"activate campaign"| SV2_GATE

    %% Content flow
    SV5_SUBMIT -->|"nộp duyệt"| SV2_REVIEW_ART
    SV1_CREATIVE -->|"nộp banner"| SV2_REVIEW_AD
    SV2_REVIEW_AD -->|"APPROVED"| SV5_SERVE
    SV3_READ -->|"checkAccess"| SV5_PAYWALL
    SV3_COMMENT -->|"PENDING"| SV2_MOD_CMT

    %% Ad delivery
    SV2_GATE -->|"5 điều kiện OK"| SV5_SERVE
    SV5_SERVE -->|"impression/click"| SV5_STATS
    SV5_STATS -->|"data"| SV1_REPORT

    %% Refund
    SV4_REFUND -->|"thu hồi quyền"| SV5_PAYWALL
```

---

## 5. BẢNG TỔNG HỢP: ITERATION × THÀNH VIÊN × USE CASES × MÀN HÌNH

| Đợt | SV1: Tây (Advertiser) | SV2: Phan (Editorial) | SV3: Hoàng (Reader) | SV4: Huy (Finance) | SV5: Tùng (System) |
|:---:|:---|:---|:---|:---|:---|
| **1** | Company Profile, Ad Slot Catalog | Article Review, Content Policy | Homepage, Article Reader, Auth | Financial Ledger, Bank Transfer | Article Editor, Metadata |
| **2** | Campaign Booking, Quotation, Payment, Creative | Booking Queue, Inventory, Quotation Mgmt, Creative Review | Checkout, Premium Reader, Bookshelf, Comments | Payment Processing, Receivables | Version History, Submit/Revise, Paywall |
| **3** | Dashboard, Creative Replace, Notifs, Contracts | Eligibility, Campaign Control, Contract Mgmt, Biz Dashboard | Followed, Devices, Sub/Txn/Support | Cash Flow, Reconciliation, Refund, Reports | AI, Ad Config, Ad Delivery, URL Monitor, Admin |
| **UCs** | UC001–UC014 (14) | UC015–UC028 (14) | UC029–UC046 (18) | UC047–UC060 (14) | UC061–UC077 (17) |
| **Screens** | 10 | 10 | 10 | 8 | 10 |
| **Criteria** | 25 (16P0, 9P1) | 25 (14P0, 8P1, 3P2) | 25 (18P0, 6P1, 1P2) | 25 (12P0, 12P1, 1P2) | 25 (17P0, 7P1, 1P2) |

---

## 6. TECH STACK & SHARED CONSTRAINTS

| Layer | Technology | Convention |
|:---|:---|:---|
| Frontend | Next.js 14 / React / TypeScript | PascalCase components, `useXxx` hooks, `xxxApi.ts` |
| State | Zustand | Shared auth/token state |
| Styling | TailwindCSS | Responsive, Dark Mode |
| Backend | Spring Boot 3 / Java 17 | Package: `com.localpress.*` |
| Security | JWT + Spring Security | 1 file `SecurityConfig.java` duy nhất (SV4 quản lý) |
| DB | MySQL 8.0 / utf8mb4 | Flyway migrations `V1__create_tables.sql` |
| Payment | VietQR / MoMo / VNPay Sandbox | Webhook HMAC SHA512, Idempotent |
| AI | Gemini API | Human-in-the-Loop only |
| Media | Cloudinary / MinIO | Banner + Article images |
| Password | BCrypt | Default seed: `password` |

> [!IMPORTANT]
> - `application-dev.yml` mật khẩu MySQL: `password` — cấm commit mật khẩu cá nhân.  
> - Login redirect bắt buộc dùng `PERMISSION_CHECKERS.getDefaultBackofficeRoute(user.role)`.
