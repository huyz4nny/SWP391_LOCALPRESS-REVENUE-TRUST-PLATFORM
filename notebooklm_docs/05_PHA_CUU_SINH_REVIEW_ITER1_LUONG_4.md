# PHAO CỨU SINH REVIEW ITERATION 1 — LUỒNG 4: KẾ TOÁN, THANH TOÁN & ĐỐI SOÁT
> **Người thực hiện:** Sinh viên 4 — Huy (Leader)  
> **Dự án:** LocalPress — Revenue & Trust Platform (SWP391 — FALL 2026 — ĐH FPT)  
> **Tài liệu phục vụ:** Ôn luyện trực tiếp theo 5 yêu cầu Review cá nhân (Chống trượt môn) & Nạp vào NotebookLM

---

## MỤC LỤC
1. [Yêu cầu 1: Giải thích luồng nghiệp vụ qua Swimlane](#1-yêu-cầu-1-giải-thích-luồng-nghiệp-vụ-qua-swimlane)
2. [Yêu cầu 2: Giải thích chi tiết các Use Cases Iteration 1 (UC051, UC057, UC058)](#2-yêu-cầu-2-giải-thích-chi-tiết-các-use-cases-iteration-1)
3. [Yêu cầu 3: Giải thích chi tiết mã nguồn từ dòng đầu đến dòng cuối (Line-by-line Walkthrough)](#3-yêu-cầu-3-giải-thích-mã-nguồn-từ-dòng-đầu-đến-dòng-cuối)
   - [3.1. Backend: Entity `Transaction.java`](#31-backend-entity-transactionjava)
   - [3.2. Backend: `TransactionRepository.java`](#32-backend-transactionrepositoryjava)
   - [3.3. Backend: `ManualBankTransferController.java` & `ManualBankTransferService.java`](#33-backend-manualbanktransfercontrollerservice)
   - [3.4. Backend: `FinanceLedgerController.java` & `FinanceLedgerService.java`](#34-backend-financeledgercontrollerservice)
   - [3.5. Frontend: `GeneralLedgerPage.tsx`](#35-frontend-generalledgerpagetsx)
   - [3.6. Frontend: `OrderListPage.tsx` & `OrderDetailPage.tsx`](#36-frontend-orderlistpage--orderdetailpage)
4. [Yêu cầu 4: Giải thích cách thiết kế (Database & Architecture Pattern)](#4-yêu-cầu-4-giải-thích-cách-thiết-kế-db--code)
5. [Yêu cầu 5: Kịch bản chỉnh sửa code trực tiếp (Live Coding Challenges)](#5-yêu-cầu-5-kịch-bản-chỉnh-sửa-code-trực-tiếp)

---

## 1. YÊU CẦU 1: GIẢI THÍCH LUỒNG NGHIỆP VỤ QUA SWIMLANE

### 1.1. Bối cảnh Swimlane của SV4 trong Iteration 1
Trong Iteration 1, luồng nghiệp vụ của SV4 tập trung vào **Quy trình Xác nhận Chuyển khoản Thủ công (Manual Bank Transfer)** và **Ghi nhận Sổ cái / Chứng từ Tài chính (Ledger & Financial Documents)**:

```
+---------------------------------------------------------------------------------------------------------+
|                               SWIMLANE QUY TRÌNH DUYỆT CHUYỂN KHOẢN THỦ CÔNG (SV4)                       |
+---------------------------------------------------------------------------------------------------------+
| [LÀN 1: KHÁCH HÀNG / ĐỘC GIẢ / DOANH NGHIỆP]                                                            |
|  (1) Chọn phương thức "Chuyển khoản ngân hàng" -> Nhận thông tin STK, Nội dung cú pháp                  |
|  (2) Mở App Ngân hàng chuyển tiền -> Chụp ảnh biên lai / sao chép Mã giao dịch ngân hàng                |
|  (3) Nộp mã tham chiếu ngân hàng (Bank Ref) & ảnh biên lai lên hệ thống                                  |
|         │                                                                                               |
+---------┼-----------------------------------------------------------------------------------------------+
| [LÀN 2: HỆ THỐNG LOCALPRESS (FRONTEND & BACKEND CORE)]                                                   |
|         ▼                                                                                               |
|  (4) Tạo đơn hàng `transactions` trạng thái `PENDING` (chưa cấp quyền)                                 |
|  (5) Đưa giao dịch vào hàng đợi chuyển khoản chờ duyệt (`/manual-transfers/pending`)                     |
|         │                                                                                               |
+---------┼-----------------------------------------------------------------------------------------------+
| [LÀN 3: KẾ TOÁN VIÊN (FINANCE STAFF - SV4)]                                                             |
|         ▼                                                                                               |
|  (6) Mở màn hình II.4.2 (Order Details / Manual Transfer Verification)                                   |
|  (7) Xem mã đơn, số tiền cần thu, mã tham chiếu ngân hàng khách nộp và ảnh biên lai                     |
|  (8) Mở App / Web Ngân hàng của Tòa soạn đối chiếu sao kê tài khoản thực tế:                            |
|         ├── [KHÔNG THẤY TIỀN VỀ / SAI SỐ TIỀN / SAI CÚ PHÁP] ──> Bấm "TỪ CHỐI" (Reject) ──────────────┐ |
|         └── [TIỀN ĐÃ VÀO TÀI KHOẢN ĐỦ 100%] ──> Nhập mã bút toán thật ──> Bấm "XÁC NHẬN" (Confirm) ──┐ │ |
|                                                                                                       │ │
+-------------------------------------------------------------------------------------------------------┼─┼
| [LÀN 4: HỆ THỐNG XỬ LÝ TÀI CHÍNH & PHÁT TÁN SỰ KIỆN]                                                  │ │
|                                                                                                       ▼ ▼
|  (9) Trường hợp TỪ CHỐI: Transaction chuyển sang `FAILED` -> Lưu vết lý do từ chối.                   │
|  (10) Trường hợp XÁC NHẬN:                                                                            │
|      - Kiểm tra Idempotency (mã bút toán chưa từng dùng trên đơn khác).                                │
|      - Cập nhật Transaction: `status = SUCCESS`, `paid_at = now()`, `reconciled_by = accountantId`.    │
|      - Ghi nhận bút toán Nợ/Có vào Sổ cái (`General Ledger`).                                          │
|      - Phát tán `PaymentSuccessEvent` (Domain Event) qua Spring ApplicationEventPublisher:             │
|          + SV1 (Quảng cáo): Bắt event -> Chuyển chiến dịch sang đủ điều kiện chạy.                     │
|          + SV3 (Độc giả): Bắt event -> Mở khóa bài viết Premium hoặc kích hoạt Subscription.           │
+---------------------------------------------------------------------------------------------------------+
```

### 1.2. Kịch bản thuyết trình (Script nói trước Giảng viên):
> *"Thưa thầy, sơ đồ Swimlane của em phân định rõ 4 làn trách nhiệm:*  
> *1. **Làn Khách hàng:** Khách hàng không thể tự động nhận quyền chỉ bằng cách tải ảnh biên lai lên. Ảnh biên lai chỉ là tài liệu tham chiếu.*  
> *2. **Làn Hệ thống:** Khởi tạo đơn ở trạng thái PENDING và đưa vào hàng đợi đối soát riêng biệt.*  
> *3. **Làn Kế toán (SV4):** Kế toán là chốt chặn kiểm soát gian lận. Kế toán phải mở biến động số dư thực tế của ngân hàng tòa soạn để đối chiếu. Nếu khớp đúng mã đơn và số tiền, kế toán mới bấm Xác nhận.*  
> *4. **Làn Tự động hóa sự kiện:** Khi kế toán xác nhận, hệ thống đảm bảo tính Idempotent (chống trùng mã bút toán), cập nhật sổ cái và bắn `PaymentSuccessEvent` để module SV1 và SV3 tự động kích hoạt quyền lợi cho khách hàng mà không vi phạm nguyên tắc ranh giới code giữa các thành viên."*

---

## 2. YÊU CẦU 2: GIẢI THÍCH CHI TIẾT CÁC USE CASES ITERATION 1

Iteration 1 của SV4 gồm **3 Use Cases** và **2 Màn hình** theo bảng theo dõi `project_tracking_group2.xlsx`:

### 2.1. Use Case 1: `UC051 - Confirm Manual Bank Transfer`
* **Màn hình giao diện:** `II.4.2 Manual Bank Transfer Confirmation` (tích hợp trong `OrderListPage.tsx` và `OrderDetailPage.tsx`).
* **Tác nhân (Actor):** Kế toán viên (`ROLE_FINANCE`, `ROLE_STAFF`).
* **Tiền điều kiện (Preconditions):**
  * Giao dịch `Transaction` tồn tại trong hệ thống với `status = 'PENDING'`.
  * `payment_method` thuộc nhóm chuyển khoản ngân hàng (`BANK_TRANSFER` hoặc `MANUAL_BANK_TRANSFER`).
  * Kế toán viên đã đăng nhập và có quyền truy cập Backoffice.
* **Luồng chính (Main Flow):**
  1. Kế toán viên mở danh sách đơn hàng chờ xác minh (`/api/v1/finance/manual-transfers/pending`).
  2. Hệ thống hiển thị: Mã đơn, tên khách, số tiền phải thanh toán, mã tham chiếu ngân hàng do khách gửi và ảnh biên lai.
  3. Kế toán đối chiếu với biến động số dư trên tài khoản ngân hàng thực tế của tòa soạn.
  4. Kế toán nhập mã bút toán ngân hàng chuẩn (Bank Reference Code) và chọn ngân hàng nhận tiền.
  5. Kế toán bấm **"Xác nhận tiền đã vào tài khoản"**.
  6. Hệ thống kiểm tra Idempotency: Mã bút toán này chưa từng được dùng cho bất kỳ giao dịch thành công nào khác.
  7. Hệ thống chuyển `status = SUCCESS`, gán `paid_at = now()`, `reconciled_by = currentUserId`.
  8. Hệ thống phát tán `PaymentSuccessEvent` đến các module nghiệp vụ liên quan.
  9. Hệ thống thông báo thành công và cập nhật lại giao diện.
* **Luồng thay thế / Ngoại lệ (Alternative & Exception Flows):**
  * *Ngoại lệ 1 (Trùng mã bút toán):* Nếu mã bút toán ngân hàng đã tồn tại trên một đơn hàng khác $\rightarrow$ Hệ thống tung lỗi `409 Conflict: Mã bút toán đã được sử dụng`, ngăn chặn hành vi kế toán duyệt trùng một khoản tiền cho 2 đơn khác nhau.
  * *Ngoại lệ 2 (Đơn hàng không ở trạng thái PENDING):* Nếu đơn hàng đã bị hủy hoặc đã được duyệt trước đó $\rightarrow$ Tung lỗi `409 Conflict: Giao dịch không ở trạng thái chờ duyệt`.
  * *Luồng thay thế (Từ chối đơn):* Kế toán kiểm tra tài khoản không thấy tiền về $\rightarrow$ Bấm **"Từ chối"** kèm nhập lý do $\rightarrow$ Hệ thống chuyển đơn sang `status = FAILED`, lưu vết `reconciled_by` và lý do từ chối.
* **Hậu điều kiện (Postconditions):**
  * Số dư doanh thu trên Sổ cái tăng lên tương ứng.
  * Quyền đọc bài Premium hoặc chiến dịch quảng cáo được kích hoạt.
  * Lưu vết kiểm toán an ninh (`audit_logs`).
* **Business Rules áp dụng:** Invariant Rule 4 (Không tin ảnh chụp client, chỉ tin tiền thực tế), Invariant Rule 5 (Idempotency chống duyệt trùng tiền).

---

### 2.2. Use Case 2: `UC058 - View Financial Ledger`
* **Màn hình giao diện:** `II.4.1 Financial Documents and Ledger` (`GeneralLedgerPage.tsx`).
* **Tác nhân:** Kế toán viên, Kế toán trưởng, Ban giám đốc.
* **Mục tiêu:** Giám sát nhật ký biến động dòng tiền toàn hệ thống theo nguyên tắc Sổ cái kép (General Ledger).
* **Luồng chính:**
  1. Người dùng truy cập menu Sổ quỹ & Bút toán (`/backoffice/finance/ledger`).
  2. Hệ thống gọi API `GET /api/v1/finance/ledger/summary` và `GET /api/v1/finance/ledger`.
  3. Hệ thống hiển thị 3 thẻ KPI tài chính:
     * **Tổng phát sinh Thu (Credit):** Tổng tiền thu từ các đơn hàng thành công (`SUCCESS`).
     * **Tổng phát sinh Hoàn (Debit):** Tổng tiền hoàn trả cho khách hàng (`REFUND`).
     * **Số dư thực tế ròng (Net Balance):** $\text{Credit} - \text{Debit}$.
  4. Bảng danh sách hiển thị chi tiết từng bút toán: Mã bút toán, Thời gian ghi sổ, Mã tham chiếu giao dịch, Diễn giải nội dung, Cột phát sinh Thu (xanh lá), Cột phát sinh Hoàn (đỏ) và Người ghi nhận.
* **Business Rules áp dụng:** Invariant Rule 16 (Nhất quán định nghĩa chỉ số), Invariant Rule 21 (Bút toán đảo bổ sung, không ghi đè dữ liệu cũ).

---

### 2.3. Use Case 3: `UC057 - Generate Financial Documents`
* **Màn hình giao diện:** `II.4.1 Financial Documents and Ledger` (`OrderDetailPage.tsx`).
* **Tác nhân:** Kế toán viên, Đại diện doanh nghiệp quảng cáo.
* **Mục tiêu:** Xuất hóa đơn VAT điện tử hoặc biên nhận thanh toán chuẩn hóa cho đơn hàng đã thanh toán thành công.
* **Luồng chính:**
  1. Kế toán mở chi tiết một đơn hàng đã ở trạng thái `SUCCESS` (hoặc `PAID`).
  2. Hệ thống hiển thị đầy đủ thông tin: Mã đơn hàng, tên khách hàng/doanh nghiệp, mã số thuế, loại dịch vụ (Gói đọc / Bài lẻ / Quảng cáo), số tiền trước thuế, thuế VAT (theo cấu hình), tổng tiền thanh toán và mã bút toán ngân hàng.
  3. Người dùng bấm nút **"Xuất chứng từ / In biên nhận"**.
  4. Hệ thống tạo tài liệu chứng từ có gắn số serial chứng từ, thời điểm ký điện tử và mã tra cứu giao dịch.

---

## 3. YÊU CẦU 3: GIẢI THÍCH MÃ NGUỒN TỪ DÒNG ĐẦU ĐẾN DÒNG CUỐI

### 3.1. Backend: Entity `Transaction.java`
*File path:* `backend/src/main/java/com/localpress/finance/model/Transaction.java`

* **Dòng 1 - 10:** Khai báo package `com.localpress.finance.model` và import các thư viện JPA (`jakarta.persistence.*`), Lombok (`@Getter`, `@Setter`, `@Builder`), Java Time (`LocalDateTime`), `BigDecimal` để tính tiền chính xác (không dùng `double` để tránh lỗi trôi dấu phẩy động).
* **Dòng 25 - 32:** Các annotation của entity:
  * `@Entity`: Đánh dấu đây là một JPA Entity được quản lý bởi Hibernate.
  * `@Table(name = "transactions")`: Ánh xạ tới bảng vật lý `transactions` trong MySQL.
  * `@Getter, @Setter, @NoArgsConstructor, @AllArgsConstructor, @Builder`: Sử dụng Lombok sinh mã tự động cho getter/setter và Builder pattern.
* **Dòng 37 - 40:** Khóa chính `transactionId`, sử dụng `@GeneratedValue(strategy = GenerationType.IDENTITY)` tương ứng cột `AUTO_INCREMENT` trong MySQL.
* **Dòng 46 - 47:** `private Long userId`: **ĐÂY LÀ ĐIỂM SÁNG KIẾN TRÚC!** Không dùng `@ManyToOne private User user;` mà dùng kiểu `Long` nguyên thủy (Scalar Foreign Key). Lý do: Để module Finance của SV4 hoàn toàn tự chủ (Autonomous), không phụ thuộc vào code của SV5, tránh xung đột Git khi các bạn sửa entity `User`.
* **Dòng 53 - 75:** Tương tự, `subscriptionId`, `purchaseId`, `campaignId` cũng lưu dưới dạng `Long` để trỏ logic sang các bảng của SV3 và SV1.
* **Dòng 80 - 82:** `private TransactionType transactionType`: Enum xác định loại giao dịch (`SUBSCRIPTION`, `ARTICLE`, `AD`, `REFUND`). Dùng `@Enumerated(EnumType.STRING)` để lưu chuỗi chữ vào DB, dễ đọc trong SQL.
* **Dòng 87 - 88:** `private BigDecimal amount`: Số tiền giao dịch, định dạng `precision = 12, scale = 2` chuẩn tiền tệ.
* **Dòng 107 - 108:** `private String gatewayTransactionId`: Mã bút toán ngân hàng hoặc cổng thanh toán. Cột này có ràng buộc `unique = true` trong database để đảm bảo nguyên tắc **Idempotent** — không bao giờ có 2 đơn hàng khác nhau dùng chung một mã chuyển khoản ngân hàng.
* **Dòng 119 - 123:** `private TransactionStatus status`: Trạng thái giao dịch (`PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`), mặc định ban đầu là `PENDING`.
* **Dòng 127 - 140:** Các trường audit thời gian và người duyệt: `paidAt` (thời điểm tiền về), `reconciledAt` (thời điểm kế toán duyệt), `reconciledBy` (ID tài khoản kế toán viên).
* **Dòng 160 - 180:** Hàm nghiệp vụ `confirmManualTransfer(accountantUserId, bankRef, actualBankCode)`:
  * Dòng 161 - 166: Kiểm tra tiền điều kiện: Nếu đơn không ở trạng thái `PENDING` thì quăng lỗi `AppException` mã `409 Conflict`.
  * Dòng 168 - 172: Đổi trạng thái `status = TransactionStatus.SUCCESS`, gán thời gian hiện tại cho `paidAt` và `reconciledAt`, gán `reconciledBy = accountantUserId`.
  * Dòng 174 - 179: Cập nhật mã bút toán ngân hàng và mã ngân hàng (nếu có).
* **Dòng 187 - 199:** Hàm nghiệp vụ `rejectManualTransfer(accountantUserId)`:
  * Kiểm tra trạng thái `PENDING`, đổi `status = TransactionStatus.FAILED`, lưu thời gian và người từ chối.
* **Dòng 204 - 212:** Hàm `resolveTargetId()`: Dùng cú pháp `switch-case expression` mới của Java 17/21 để trả về ID đối tượng cần cấp quyền tương ứng (mua gói thì trả `subscriptionId`, mua bài thì trả `purchaseId`, mua ad thì trả `campaignId`).

---

### 3.2. Backend: `TransactionRepository.java`
*File path:* `backend/src/main/java/com/localpress/finance/repository/TransactionRepository.java`

* **Dòng 30:** `public interface TransactionRepository extends JpaRepository<Transaction, Long>`: Kế thừa Spring Data JPA để có sẵn các hàm CRUD cơ bản (`save`, `findById`, `findAll`).
* **Dòng 35:** `Optional<Transaction> findByGatewayTransactionId(String gatewayTransactionId)`: Truy vấn giao dịch theo mã bút toán ngân hàng. Dùng `Optional` để xử lý an toàn tránh lỗi `NullPointerException`.
* **Dòng 40 - 44:** `Page<Transaction> findByStatusAndPaymentMethodIn(...)`: Phục vụ màn hình duyệt chuyển khoản thủ công. Lấy các giao dịch có trạng thái `PENDING` và phương thức thanh toán là `BANK_TRANSFER` hoặc `MANUAL_BANK_TRANSFER`, trả về dạng phân trang (`Pageable`).
* **Dòng 49 - 71:** `@Query(""" SELECT t FROM Transaction t ... """) searchLedger(...)`:
  * Sử dụng JPQL đa tiêu chí linh hoạt (Dynamic filtering):
  * Dòng 51 - 55: Các điều kiện `(:param IS NULL OR t.field = :param)` giúp người dùng không truyền tham số nào thì tự động bỏ qua điều kiện lọc đó mà không cần viết nhiều câu lệnh if-else phức tạp.
  * Dòng 56 - 60: Tìm kiếm từ khóa (`keyword`) theo cả ID giao dịch, mã bút toán ngân hàng hoặc ID người dùng.
* **Dòng 76 - 82:** `calculateTotalGrossRevenue()`: Tính tổng doanh thu gộp bằng hàm `SUM(t.amount)` với điều kiện `status = 'SUCCESS'` và `transactionType != 'REFUND'`. Dùng `COALESCE(SUM(...), 0)` để nếu database chưa có đơn nào thì trả về số 0 thay vì trả về `null`.
* **Dòng 87 - 93:** `calculateTotalRefundedAmount()`: Tính tổng tiền hoàn bằng hàm `SUM(t.amount)` với điều kiện `status = 'SUCCESS'` và `transactionType = 'REFUND'`.

---

### 3.3. Backend: `ManualBankTransferController.java` & `ManualBankTransferService.java`

#### Trong `ManualBankTransferController.java`:
* **Dòng 28 - 31:** `@RestController`, `@RequestMapping("/api/v1/finance/manual-transfers")`: Đăng ký Controller RESTful phục vụ duyệt chuyển khoản thủ công.
* **Dòng 38 - 46:** `GET /pending`: Lấy danh sách hàng đợi các đơn chờ duyệt. Đọc tham số `page` và `size`, gọi sang service và đóng gói kết quả trong `ApiResponse.ok(...)`.
* **Dòng 56 - 70:** `POST /{transactionId}/confirm`:
  * `@PathVariable Long transactionId`: Lấy ID giao dịch trên URL.
  * `@RequestHeader(value = "X-User-Id", defaultValue = "2") Long accountantUserId`: Lấy định danh của Kế toán viên đang thực hiện duyệt đơn từ Header JWT / Gateway.
  * `@Valid @RequestBody ManualTransferConfirmRequest request`: Nhận và validate dữ liệu mã bút toán ngân hàng.
* **Dòng 79 - 93:** `POST /{transactionId}/reject`: Kế toán từ chối đơn chuyển khoản kèm lý do từ chối.

#### Trong `ManualBankTransferService.java`:
* **Dòng 61 - 76:** `getPendingQueue(page, size)`:
  * Dòng 63 - 65: Chuẩn hóa tham số phân trang (`page >= 0`, `size` tối đa 100 để chống tấn công DoS tải quá nhiều bản ghi), sắp xếp theo thứ tự `createdAt ASC` (đơn nào gửi trước thì duyệt trước - FIFO).
  * Dòng 69 - 75: Gọi repository tìm các đơn `PENDING` chuyển khoản thủ công và chuyển đổi (map) sang DTO `TransactionLedgerResponse`.
* **Dòng 86 - 140:** `confirmTransfer(...)` — **TRỌNG TÂM NGHIỆP VỤ CỐT LÕI:**
  * Dòng 86: `@Transactional`: Bao bọc toàn bộ phương thức trong 1 Database Transaction. Nếu có bất kỳ lỗi nào xảy ra thì tự động Rollback toàn bộ, đảm bảo tính toàn vẹn dữ liệu.
  * Dòng 96 - 100: Tìm giao dịch theo `transactionId`, nếu không có thì ném lỗi 404 Not Found.
  * Dòng 102 - 113: **Cơ chế Idempotency chống duyệt trùng tiền:** Kiểm tra xem `bankReferenceCode` mà kế toán nhập đã từng xuất hiện ở một giao dịch khác chưa. Nếu đã có đơn khác dùng mã này rồi $\rightarrow$ Lập tức ném `409 Conflict`, chặn đứng gian lận.
  * Dòng 116 - 117: Gọi hàm nghiệp vụ miền `tx.confirmManualTransfer(...)` và lưu xuống database qua `transactionRepository.save(tx)`.
  * Dòng 123 - 135: **Kiến trúc Decoupled Event (Điểm sáng kỹ thuật):** Khởi tạo đối tượng `PaymentSuccessEvent` chứa đầy đủ thông tin: mã giao dịch, số tiền, loại giao dịch, targetId cần cấp quyền. Gọi `eventPublisher.publishEvent(event)` để bắn sự kiện trong Spring context. Module SV1 và SV3 sẽ tự động nhận event này để cấp quyền mà SV4 không cần gọi trực tiếp service của họ.

---

### 3.4. Backend: `FinanceLedgerController.java` & `FinanceLedgerService.java`
* **Controller (`FinanceLedgerController.java`):**
  * `GET /api/v1/finance/ledger`: Nhận bộ lọc `LedgerFilterRequest` (`status`, `transactionType`, `paymentMethod`, `fromDate`, `toDate`, `keyword`) để xuất ra danh sách chứng từ Sổ cái.
  * `GET /api/v1/finance/ledger/{transactionId}`: Trả về chi tiết chứng từ gồm: người mua, sản phẩm, số tiền, trạng thái, thời gian tạo, thời gian kế toán duyệt.
  * `GET /api/v1/finance/ledger/summary`: Trả về tổng quan Sổ cái (`totalGrossRevenue`, `totalRefundedAmount`, `netRevenue`).
* **Service (`FinanceLedgerService.java`):**
  * Dòng 107 - 109: Tính doanh thu thuần: `netRevenue = grossRevenue.subtract(refundedAmount)`. Sử dụng method `.subtract()` của `BigDecimal` để tính toán số học chuẩn xác.
  * Dòng 111 - 117: Đếm số lượng đơn theo từng trạng thái (`PENDING`, `SUCCESS`, `FAILED`) và số đơn chuyển khoản thủ công đang chờ duyệt (`pendingManualTransfersCount`).

---

### 3.5. Frontend: `GeneralLedgerPage.tsx`
*File path:* `frontend/src/features/finance/pages/GeneralLedgerPage.tsx`

* **Dòng 8 - 13:** Sử dụng React Hooks: `useState` quản lý danh sách `entries` và cờ `loading`; `useEffect` gọi hàm `loadLedger()` ngay khi component được render lần đầu.
* **Dòng 25 - 27:** Tính toán trực tiếp trên Client State (Reactive Computation):
  * `totalCredit`: Lọc các bút toán có `entryType === 'CREDIT'` và tính tổng tiền bằng hàm `.reduce()`.
  * `totalDebit`: Lọc các bút toán có `entryType === 'DEBIT'` và tính tổng tiền hoàn.
  * `netBalance`: Lấy `totalCredit - totalDebit` ra số dư thực tế.
* **Dòng 41 - 65:** Hiển thị 3 thẻ KPI theo chuẩn Design System của dự án:
  * Thẻ Credit dùng màu xanh lá `text-emerald-700`.
  * Thẻ Debit dùng màu đỏ thương hiệu `text-crimson` (`#991b1b`).
  * Thẻ Net Balance dùng màu Deep Navy `text-primary-900` (`#1e3a8a`).
  * Tất cả các số tiền đều được định dạng qua hàm dùng chung `formatCurrency(amount)` hiển thị định dạng chuẩn Việt Nam Đồng (vd: `150.000 ₫`).
* **Dòng 68 - 99:** Bảng Sổ cái hiển thị danh sách bút toán:
  * Cột Phát sinh Thu hiển thị số tiền màu xanh lá nếu là `CREDIT`, ngược lại hiển thị dấu gạch ngang `—`.
  * Cột Phát sinh Hoàn hiển thị số tiền màu đỏ nếu là `DEBIT`.
  * Ngày giờ được chuẩn hóa qua hàm `formatDateTime(item.timestamp)` hiển thị giờ Việt Nam.

---

### 3.6. Frontend: `OrderListPage.tsx` & `OrderDetailPage.tsx`

#### Trong `OrderListPage.tsx`:
* **Dòng 14 - 16:** Quản lý state bộ lọc: `typeFilter` (tất cả / gói cước / bài lẻ / quảng cáo), `statusFilter` (tất cả / chờ thanh toán / đang xử lý / đã thanh toán / thất bại / đã hoàn), `search` (từ khóa).
* **Dòng 32 - 44:** Thuật toán lọc đơn hàng mượt mà ngay trên Client: Kiểm tra đồng thời cả 3 điều kiện loại dịch vụ, trạng thái và từ khóa tìm kiếm.
* **Dòng 153:** Sử dụng component tái sử dụng `StatusBadge` theo chuẩn Skill frontend: `<StatusBadge type="payment" status={o.paymentStatus} />`.
* **Dòng 156 - 167:** Cột hành động thông minh: Nếu đơn hàng ở trạng thái `PROCESSING` (chờ kế toán duyệt chuyển khoản), nút hành động hiển thị màu vàng nổi bật **"Xác minh ngay"**, bấm vào sẽ chuyển thẳng đến màn hình chi tiết đơn hàng.

#### Trong `OrderDetailPage.tsx`:
* **Dòng 44 - 56:** Hàm `handleVerifyBankTransfer()`:
  * Khi kế toán bấm duyệt: Bật cờ `isVerifying = true` (hiển thị spinner loading trên nút), gọi API `financeApi.verifyBankTransfer(order.id)`.
  * Nhận kết quả thành công $\rightarrow$ Hiển thị thông báo `alert` và tự động gọi lại `loadOrder(order.id)` để reload dữ liệu mới nhất.
* **Dòng 103 - 160:** Khung cảnh báo nổi bật **"Xác thực ủy nhiệm chi chuyển khoản thủ công"**:
  * Chỉ xuất hiện khi đơn hàng đang ở trạng thái `PROCESSING` và khách đã nộp ảnh biên lai.
  * Hiển thị cảnh báo nghiệp vụ: *"Khách hàng đã nộp mã tham chiếu và hình ảnh biên lai. Theo quy định kiểm soát tài chính, việc nộp ảnh không tự động biến đơn hàng thành PAID. Bạn cần đối chiếu với sao kê tài khoản ngân hàng của tòa soạn trước khi bấm xác nhận."*
  * Hiển thị mã tham chiếu ngân hàng, số tiền cần đối chiếu và khung xem ảnh biên lai phóng to.
  * Nút bấm màu xanh lá **"Xác nhận tiền đã vào tài khoản (Duyệt PAID)"** với icon `CheckCircle2`.

---

## 4. YÊU CẦU 4: GIẢI THÍCH CÁCH THIẾT KẾ (DB & CODE ARCHITECTURE)

### 4.1. Thiết kế Cơ sở Dữ liệu (Database Design)
* **Bảng `transactions`:**
  * Tại sao trường `amount` dùng `DECIMAL(12, 2)` thay vì `FLOAT/DOUBLE`?  
    $\rightarrow$ Tránh lỗi sai số dấu phẩy động trong tính toán tài chính.
  * Tại sao cột `gateway_transaction_id` có ràng buộc `UNIQUE`?  
    $\rightarrow$ Đảm bảo tính **Idempotent** ở tầng CSDL. Ngăn chặn triệt để tình huống cùng một mã giao dịch ngân hàng bị dùng để duyệt 2 lần.
  * Tại sao dùng Scalar Foreign Key (`userId`, `subscriptionId`, `campaignId`) thay vì Hibernate `@ManyToOne`?  
    $\rightarrow$ Phân tách độc lập ranh giới module (Bounded Context) theo mô hình DDD (Domain-Driven Design). Module Finance của SV4 không bị chết khi các bạn khác sửa code entity của họ.

### 4.2. Thiết kế Kiến trúc Code (Software Architecture)
* **Mô hình Layered Architecture chuẩn Enterprise:**
  * `Controller` $\rightarrow$ Nhận HTTP Request, validate dữ liệu đầu vào (`@Valid`), trả về JSON chuẩn `ApiResponse<T>`.
  * `Service` $\rightarrow$ Nơi chứa toàn bộ nghiệp vụ miền (Business Logic), quản trị Database Transaction (`@Transactional`).
  * `Repository` $\rightarrow$ Tầng tương tác CSDL qua Spring Data JPA và JPQL.
  * `Domain Model` $\rightarrow$ Đóng gói logic thay đổi trạng thái ngay trong Entity (`tx.confirmManualTransfer`), không để logic phân tán lung tung.
* **Mô hình Decoupled Domain Events:**
  * Thay vì SV4 phải autowire `ReaderService` hay `AdvertisingService` để gọi hàm kích hoạt quyền (gây phụ thuộc chéo và dễ xung đột code), SV4 chỉ cần phát tán `PaymentSuccessEvent`. Các module kia tự viết `@EventListener` để xử lý việc của họ.

---

## 5. YÊU CẦU 5: KỊCH BẢN CHỈNH SỬA CODE TRỰC TIẾP (LIVE CODING CHALLENGES)

Giảng viên thường yêu cầu chỉnh sửa code ngay tại chỗ để kiểm tra xem sinh viên có tự viết code hay không. Dưới đây là 3 kịch bản phổ biến nhất và cách giải quyết:

### Kịch bản 1: "Thêm validation không cho kế toán duyệt đơn nếu số tiền nhỏ hơn 10.000 VNĐ"
* **Cách sửa (File `ManualBankTransferService.java`, hàm `confirmTransfer`):**
  Thêm đoạn code sau vào trước dòng gọi `tx.confirmManualTransfer`:
  ```java
  if (tx.getAmount().compareTo(new BigDecimal("10000")) < 0) {
      throw new AppException("Không thể duyệt giao dịch có số tiền dưới 10.000 VNĐ", HttpStatus.BAD_REQUEST);
  }
  ```

### Kịch bản 2: "Thêm trường ghi chú (note) của kế toán khi bấm từ chối đơn hàng"
* **Cách sửa:**
  1. Trong `Transaction.java`: Thêm trường `private String rejectionReason;` kèm getter/setter.
  2. Trong hàm `rejectManualTransfer`: Nhận thêm `String reason` và gán `this.rejectionReason = reason;`.
  3. Trong `ManualBankTransferService.java`: Truyền `request.getRejectionReason()` vào hàm trên.

### Kịch bản 3: "Thêm một nút lọc các giao dịch có số tiền trên 1 triệu đồng ở giao diện Frontend"
* **Cách sửa (File `OrderListPage.tsx`):**
  Thêm điều kiện vào hàm `filteredOrders`:
  ```typescript
  if (filterAboveOneMillion && o.finalAmount < 1000000) return false;
  ```
