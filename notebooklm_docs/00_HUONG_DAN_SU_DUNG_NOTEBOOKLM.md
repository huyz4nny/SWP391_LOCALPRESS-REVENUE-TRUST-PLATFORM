# BỘ TÀI LIỆU CHUẨN BỊ CHO NOTEBOOKLM — DỰ ÁN LOCALPRESS
> **Dành cho:** Leader Huy (SV4) — Kế toán, Thanh toán & Đối soát  
> **Dự án:** LocalPress — Revenue & Trust Platform (FALL 2026 — Đại học FPT)  
> **Mục tiêu tối thượng:** Vượt qua Review cá nhân Iteration 1 (Chống trượt môn) & Hiểu sâu toàn diện dự án

---

## 1. DANH MỤC CÁC TÀI LIỆU TRONG THƯ MỤC NÀY

Thư mục `notebooklm_docs` được chuẩn bị sẵn sàng để tải lên Google NotebookLM:

| STT | Tên tài liệu | Định dạng | Mục đích & Nội dung chính |
| :---: | :--- | :---: | :--- |
| **0** | `00_HUONG_DAN_SU_DUNG_NOTEBOOKLM.md` | Markdown | Hướng dẫn tải lên và các câu hỏi mẫu tốt nhất cho NotebookLM |
| **1** | `01_TONG_QUAN_DU_AN_LOCALPRESS.md` | Markdown | Tổng quan dự án, bối cảnh Hải Phòng, mô hình Doanh thu kép, 11 vai trò, 21 quy tắc bất biến, 10 kịch bản demo bảo vệ đồ án |
| **2** | `02_CHUYEN_SAU_LUONG_4_KE_TOAN_THANH_TOAN_DOI_SOAT.md` | Markdown | Toàn bộ 25 tiêu chí (12 P0, 12 P1, 1 P2), 14 Use Cases (`UC047` - `UC060`), 8 màn hình (II.4.1 - II.4.8), Cổng VietQR dùng chung, Webhook Idempotency, Hoàn tiền 4 mắt, Sổ quỹ kép, Đối soát sao kê, MRR/ARR |
| **3** | `03_MA_TRAN_77_USECASES_48_MAN_HINH.md` | Markdown | Toàn bộ 77 Use Cases và 48 Màn hình chia theo 3 Iteration của cả 5 sinh viên, thể hiện sự liên kết giữa Luồng 4 và các luồng khác |
| **4** | `04_KIEN_TRUC_CSDL_19_BANG_VA_DATABASE_RULES.md` | Markdown | Kiến trúc 19 bảng CSDL, chi tiết bảng `transactions`, `refund_requests`, ràng buộc `chk_single_transaction_target` |
| **5** | `05_PHA_CUU_SINH_REVIEW_ITER1_LUONG_4.md` | Markdown | **CẨM NANG REVIEW ITERATION 1:** Kịch bản thuyết trình Swimlane, 3 UCs (`UC051`, `UC057`, `UC058`), giải thích màn hình II.4.1 & II.4.2, thiết kế DB và kiến trúc |
| **6** | `06_GIAI_PHAU_CODE_VA_KY_NANG_SUA_CODE_BY_HAND.md` | Markdown | **GIẢI THÍCH CODE TỪNG DÒNG & LIVE CODING:** Giải phẫu từng dòng Backend Java & Frontend React, bí kíp sửa code bằng tay trong 60 giây khi thầy giáo yêu cầu |
| **7** | `07_LocalPress_Danh_muc_chuc_nang.docx` | Word (.docx) | Văn bản gốc mô tả 125 tiêu chí nghiệp vụ của toàn bộ dự án |
| **8** | `08_project_tracking_group2.xlsx` | Excel (.xlsx) | Bảng theo dõi tiến độ chính thức: Use Cases & Màn hình CRUD 19 bảng |
| **9** | `09_LOCALPRESS_CODING_PLAN.docx` | Word (.docx) | Kế hoạch lập trình và triển khai theo Activity Flow |
| **10**| `10_SYSTEM_CONTEXT_AND_ARCHITECTURE.md` | Markdown | Đặc tả ngữ cảnh hệ thống và kiến trúc toàn diện master |
| **11**| `11_LOCALPRESS_MASTER_ROADMAP.md` | Markdown | Quản trị dự án & roadmap tổng thể cho developers |
| **12**| `12_AGENTS_RULES.md` | Markdown | Bộ quy tắc kiến trúc và vận hành bất biến của dự án |
| **13**| `swimlane_sv4_luong_ke_toan.png` | Ảnh PNG | Sơ đồ quy trình bơi (Swimlane diagram) của Luồng 4 SV4 |
| **14**| `LocalPress_ERD_Database.png` | Ảnh PNG | Sơ đồ quan hệ thực thể cơ sở dữ liệu (ERD) toàn hệ thống |

---

## 2. HƯỚNG DẪN 3 BƯỚC ĐƯA VÀO NOTEBOOKLM

1. **Bước 1:** Mở trình duyệt truy cập: [https://notebooklm.google.com/](https://notebooklm.google.com/)
2. **Bước 2:** Bấm **"New Notebook"** (Tạo sổ tay mới), đặt tên ví dụ: `LocalPress - Luồng 4 Review Master`.
3. **Bước 3:** Bấm **"Add Sources"** $\rightarrow$ chọn **"Upload files"**, chọn các tệp tin trong thư mục `notebooklm_docs` (đặc biệt là các file `01`, `02`, `05`, `06`, `10`).

---

## 3. PROMPT TẠO AUDIO OVERVIEW (DEEP DIVE PODCAST) TRÊN NOTEBOOKLM

Trong NotebookLM, tại mục **Studio** $\rightarrow$ bấm nút **Customize** của **Audio Overview** $\rightarrow$ dán prompt sau rồi bấm **Generate**:

```text
Hãy tạo một tập podcast Audio Overview thật sâu sắc, thực tế và dễ hiểu giữa 2 chuyên gia kỹ thuật phần mềm (1 Host và 1 Tech Lead) để hướng dẫn cho sinh viên Huy (Leader - SV4) chuẩn bị cho buổi Review cá nhân đồ án SWP391 Đại học FPT.

Quy định buổi Review cực kỳ khắt khe: "Hai lần fail là trượt môn", do đó cuộc trò chuyện phải tập trung 100% vào Luồng 4 — Phân hệ Kế toán, Thanh toán & Đối soát, đặc biệt là phạm vi Iteration 1 (Sổ cái tài chính và Duyệt chuyển khoản thủ công) dựa trên tài liệu "05_PHA_CUU_SINH_REVIEW_ITER1_LUONG_4.md" và "06_GIAI_PHAU_CODE_VA_KY_NANG_SUA_CODE_BY_HAND.md".

Cuộc trò chuyện cần đi qua đủ 5 phần trọng tâm:
1. Giải thích luồng nghiệp vụ thông qua sơ đồ Swimlane: 4 làn trách nhiệm (Khách hàng -> Hệ thống -> Kế toán SV4 -> Tự động hóa sự kiện).
2. Đi sâu vào 3 Use Cases của Iteration 1 (UC051 Xác nhận chuyển khoản thủ công, UC058 Xem sổ cái, UC057 Xuất chứng từ) và 2 màn hình II.4.1 và II.4.2.
3. Giải thích bản chất logic code từ dòng đầu đến dòng cuối:
   - Backend Spring Boot: Entity Transaction (tại sao dùng BigDecimal, Scalar Foreign Key kiểu Long thay vì @ManyToOne), TransactionRepository (tại sao gateway_transaction_id phải UNIQUE để đảm bảo Idempotent), ManualBankTransferService (hàm confirmTransfer kiểm tra mã trùng thế nào, phát sự kiện PaymentSuccessEvent qua ApplicationEventPublisher ra sao để không can thiệp code module khác).
   - Frontend React: GeneralLedgerPage (cách tính Reactive Credit/Debit/Net Balance), OrderDetailPage (khung cảnh báo xác minh ủy nhiệm chi và gọi API verifyBankTransfer).
4. Giải thích quyết định thiết kế kiến trúc: Mô hình phân tầng Layered Architecture và Decoupled Domain Events.
5. Cảnh báo các câu hỏi bẫy và yêu cầu sửa code trực tiếp (Live coding) mà giảng viên ĐH FPT thường đưa ra và hướng dẫn Huy cách xử lý bình tĩnh.
```
