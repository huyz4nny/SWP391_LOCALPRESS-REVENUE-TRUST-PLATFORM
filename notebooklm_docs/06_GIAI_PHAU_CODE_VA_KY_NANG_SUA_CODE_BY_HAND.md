# GIẢI PHẪU TOÀN DIỆN MÃ NGUỒN VÀ KỸ NĂNG SỬA CODE BẰNG TAY (LIVE CODING PLAYBOOK)
> **Dành cho:** Sinh viên 4 — Huy (Leader Luồng 4: Kế toán & Thanh toán)  
> **Môn:** SWP391 — Khóa FALL 2026 — ĐH FPT  
> **Mục tiêu:** Hiểu bản chất 100% từng dòng code, tự tin giải thích trước giảng viên và sửa code bằng tay không bị trượt môn.

---

## PHẦN 1: GIẢI PHẪU CODE BACKEND TỪ DÒNG ĐẦU ĐẾN DÒNG CUỐI

### 1. File `ManualBankTransferService.java` (File quan trọng nhất — Trái tim của Luồng 4)
*Đường dẫn:* `backend/src/main/java/com/localpress/finance/service/ManualBankTransferService.java`

Đây là file giảng viên chắc chắn sẽ bắt bạn mở ra đầu tiên và hỏi từng dòng. Dưới đây là giải phẫu chi tiết:

#### Đoạn 1: Khai báo Service và Dependency Injection (Dòng 38 - 45)
```java
@Slf4j
@Service
@RequiredArgsConstructor
public class ManualBankTransferService {

    private final TransactionRepository transactionRepository;
    private final ApplicationEventPublisher eventPublisher;
```
* **Ý nghĩa từng dòng:**
  * `@Slf4j`: Annotation của Lombok, tự động sinh biến `log` để ghi nhật ký hệ thống (`log.info`, `log.warn`, `log.error`).
  * `@Service`: Đánh dấu class này là một Spring Service Bean (tầng nghiệp vụ), Spring IoC Container sẽ tự động quản lý vòng đời của nó.
  * `@RequiredArgsConstructor`: Tự động sinh constructor chứa các trường có từ khóa `final`. Đây là chuẩn Constructor Injection hiện đại của Spring (thay vì dùng `@Autowired` trên từng field).
  * `private final TransactionRepository transactionRepository`: Tiêm Repository để thao tác dữ liệu với bảng `transactions`.
  * `private final ApplicationEventPublisher eventPublisher`: Tiêm bộ phát tán sự kiện nội bộ của Spring Framework. Dùng để bắn sự kiện sang SV1 và SV3.
* **Câu hỏi giảng viên:** *"Tại sao em không @Autowired thẳng AdvertisingService hay ReaderService vào đây để gọi hàm mở bài?"*
  * **Trả lời:** *"Thưa thầy, nếu em @Autowired trực tiếp Service của SV1/SV3 thì sẽ tạo ra sự phụ thuộc chặt chẽ (tight coupling), dễ bị vòng lặp (circular dependency) và xung đột Git khi các bạn sửa code. Em dùng `ApplicationEventPublisher` theo kiến trúc Event-Driven, em chỉ việc bắn sự kiện `PaymentSuccessEvent`, bên nào quan tâm thì tự bắt sự kiện đó để xử lý."*

---

#### Đoạn 2: Hàm `confirmTransfer` — Kế toán duyệt tiền (Dòng 86 - 140)
```java
    @Transactional
    public TransactionDetailResponse confirmTransfer(
            Long transactionId,
            Long accountantUserId,
            ManualTransferConfirmRequest request
    ) {
```
* **Ý nghĩa:**
  * `@Transactional`: Bắt buộc phải có! Nó đảm bảo tính toàn vẹn (ACID). Toàn bộ các câu lệnh bên trong (kiểm tra, cập nhật DB, bắn event) đều nằm trong một giao dịch cơ sở dữ liệu. Nếu có lỗi quăng ra ở bất kỳ dòng nào, database sẽ tự động Rollback về trạng thái ban đầu, không bị lưu dữ liệu rác.
  * Tham số: `transactionId` (ID đơn), `accountantUserId` (ID kế toán viên đang thao tác), `request` (chứa mã bút toán ngân hàng và ghi chú).

```java
        // BƯỚC 1: Kiểm tra đơn hàng có tồn tại không
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy giao dịch #" + transactionId,
                        HttpStatus.NOT_FOUND
                ));
```
* **Ý nghĩa:**
  * Dùng `transactionRepository.findById(transactionId)`. Hàm này trả về kiểu `Optional<Transaction>`.
  * `.orElseThrow(...)`: Nếu tìm thấy thì lấy ra đối tượng `tx`; nếu không có thì ném ra ngoại lệ `AppException` với mã lỗi `404 Not Found`.

```java
        // BƯỚC 2: Kiểm tra chống trùng mã bút toán (Idempotency)
        if (request.getBankReferenceCode() != null && !request.getBankReferenceCode().isBlank()) {
            String refCode = request.getBankReferenceCode().trim();
            transactionRepository.findByGatewayTransactionId(refCode)
                    .filter(existing -> !existing.getTransactionId().equals(transactionId))
                    .ifPresent(existing -> {
                        throw new AppException(
                                "Mã bút toán ngân hàng [" + refCode + "] đã được sử dụng cho giao dịch #" + existing.getTransactionId(),
                                HttpStatus.CONFLICT
                        );
                    });
        }
```
* **Ý nghĩa:**
  * Đây là chốt chặn chống gian lận. Kế toán nhập mã giao dịch ngân hàng (ví dụ: `FT2610078899`).
  * Hệ thống truy vấn DB xem mã này đã từng được gán cho một giao dịch khác chưa (`!existing.getTransactionId().equals(transactionId)`).
  * Nếu đã có một đơn hàng khác dùng mã này rồi $\rightarrow$ Ném lỗi `409 Conflict`. Ngăn chặn việc kế toán dùng 1 biên lai chuyển khoản để duyệt cho 2 đơn hàng khác nhau.

```java
        // BƯỚC 3: Thay đổi trạng thái Domain Entity và Lưu DB
        tx.confirmManualTransfer(accountantUserId, request.getBankReferenceCode(), request.getBankCode());
        Transaction savedTx = transactionRepository.save(tx);
```
* **Ý nghĩa:**
  * Gọi hàm miền `tx.confirmManualTransfer(...)` được đóng gói trong entity `Transaction`.
  * Hàm này kiểm tra: Nếu đơn đang không phải `PENDING` thì tung lỗi. Nếu đúng là `PENDING` thì gán `status = SUCCESS`, gán `paidAt = now()`, `reconciledAt = now()`, `reconciledBy = accountantUserId`.
  * Gọi `transactionRepository.save(tx)` để lưu thay đổi xuống bảng `transactions` trong MySQL.

```java
        // BƯỚC 4: Phát tán sự kiện miền (Domain Event)
        PaymentSuccessEvent event = PaymentSuccessEvent.builder()
                .transactionId(savedTx.getTransactionId())
                .userId(savedTx.getUserId())
                .transactionType(savedTx.getTransactionType().name())
                .targetId(savedTx.resolveTargetId())
                .amount(savedTx.getAmount())
                .currency(savedTx.getCurrency())
                .paymentMethod(savedTx.getPaymentMethod())
                .gatewayTransactionId(savedTx.getGatewayTransactionId())
                .paidAt(savedTx.getPaidAt())
                .build();

        eventPublisher.publishEvent(event);
        return TransactionDetailResponse.fromEntity(savedTx);
```
* **Ý nghĩa:**
  * Dùng Builder pattern tạo đối tượng sự kiện `PaymentSuccessEvent`.
  * `savedTx.resolveTargetId()`: Trả về chính xác ID cần mở (nếu mua bài thì trả về `purchaseId`, mua gói thì trả về `subscriptionId`, mua quảng cáo thì trả về `campaignId`).
  * `eventPublisher.publishEvent(event)`: Bắn sự kiện ra ngoài.
  * Cuối cùng chuyển entity sang DTO `TransactionDetailResponse` và trả về cho Controller.

---

### 2. File `Transaction.java` (Entity CSDL)
*Đường dẫn:* `backend/src/main/java/com/localpress/finance/model/Transaction.java`

* **Dòng 46 - 75: Thiết kế Scalar Foreign Keys:**
  ```java
  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "subscription_id")
  private Long subscriptionId;

  @Column(name = "purchase_id")
  private Long purchaseId;

  @Column(name = "campaign_id")
  private Long campaignId;
  ```
  * **Tại sao không dùng `@ManyToOne User user`?**  
    Vì đây là kiến trúc tách biệt module. Việc lưu kiểu `Long` giúp module Finance hoàn toàn độc lập, không cần phụ thuộc vào class `User` của người khác. Khi chạy câu lệnh SQL join thì join bình thường qua ID.
* **Dòng 87 - 88: Số tiền:**
  ```java
  @Column(name = "amount", nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;
  ```
  * **Tại sao dùng `BigDecimal`?**  
    Vì tiền tệ không được phép dùng `double` hay `float`. Kiểu `double` sử dụng chuẩn nhị phân IEEE 754 dẫn đến sai số trôi dấu phẩy động (ví dụ: `0.1 + 0.2 = 0.30000000000000004`), gây lệch sổ sách kế toán. `BigDecimal` tính toán chính xác 100%.

---

## PHẦN 2: GIẢI PHẪU CODE FRONTEND TỪ DÒNG ĐẦU ĐẾN DÒNG CUỐI

### 1. File `OrderDetailPage.tsx` (Màn hình Kế toán duyệt đơn)
*Đường dẫn:* `frontend/src/features/finance/pages/OrderDetailPage.tsx`

#### Đoạn 1: Xử lý gọi API duyệt tiền (Dòng 44 - 56)
```typescript
  const handleVerifyBankTransfer = async () => {
    if (!order) return
    setIsVerifying(true)
    try {
      await financeApi.verifyBankTransfer(order.id)
      alert(`Đã xác nhận thanh toán thành công đơn hàng ${order.orderCode}! Quyền lợi đã được cấp cho tài khoản.`)
      loadOrder(order.id)
    } catch (err: any) {
      alert(err.message || 'Lỗi xác nhận thanh toán')
    } finally {
      setIsVerifying(false)
    }
  }
```
* **Ý nghĩa:**
  * `if (!order) return`: Bảo vệ (Guard clause), nếu chưa tải xong thông tin đơn hàng thì không làm gì cả.
  * `setIsVerifying(true)`: Kích hoạt trạng thái đang xử lý (nút bấm sẽ hiện icon xoay tròn, không cho bấm lần 2 để chống click đúp).
  * `await financeApi.verifyBankTransfer(order.id)`: Gọi hàm API gửi request `POST /api/v1/finance/manual-transfers/{id}/confirm` về backend Spring Boot.
  * Khi thành công: Bật popup `alert` thông báo và gọi lại `loadOrder(order.id)` để giao diện lập tức cập nhật trạng thái mới nhất từ `PROCESSING` sang `PAID` (hoặc `SUCCESS`).
  * `finally { setIsVerifying(false) }`: Dù thành công hay lỗi thì cuối cùng cũng tắt trạng thái loading.

#### Đoạn 2: Khung điều kiện hiển thị hộp xác minh (Dòng 102 - 115)
```typescript
{order.paymentStatus === 'PROCESSING' && latestAttempt?.receiptImageUrl && (
  <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-300 ...">
     ...
     <Button onClick={handleVerifyBankTransfer} isLoading={isVerifying}>
        Xác nhận tiền đã vào tài khoản (Duyệt PAID)
     </Button>
  </div>
)}
```
* **Ý nghĩa:**
  * Đây là Render có điều kiện (Conditional Rendering). Khung duyệt chuyển khoản màu vàng này **chỉ xuất hiện** khi đơn hàng đang ở trạng thái `PROCESSING` (chờ xác minh) **VÀ** khách hàng đã nộp mã tham chiếu / ảnh biên lai.
  * Nếu đơn hàng đã là `PAID` hoặc `FAILED` thì khung này tự động ẩn đi, kế toán không thể duyệt lại được nữa.

---

### 2. File `GeneralLedgerPage.tsx` (Màn hình Sổ quỹ kép)
*Đường dẫn:* `frontend/src/features/finance/pages/GeneralLedgerPage.tsx`

```typescript
  const totalCredit = entries.filter((e) => e.entryType === 'CREDIT').reduce((acc, e) => acc + e.amount, 0)
  const totalDebit = entries.filter((e) => e.entryType === 'DEBIT').reduce((acc, e) => acc + e.amount, 0)
  const netBalance = totalCredit - totalDebit
```
* **Ý nghĩa:**
  * `filter((e) => e.entryType === 'CREDIT')`: Lọc ra tất cả các dòng thu tiền vào tài khoản.
  * `.reduce((acc, e) => acc + e.amount, 0)`: Cộng dồn toàn bộ số tiền của các dòng đó lại với giá trị khởi tạo ban đầu là 0.
  * `totalDebit`: Lọc và cộng dồn các dòng hoàn tiền / chi tiền ra.
  * `netBalance = totalCredit - totalDebit`: Số dư ròng thực tế của tòa soạn. Khi có bất kỳ bút toán nào thay đổi, React sẽ tự động render lại 3 con số này ngay lập tức.

---

## PHẦN 3: BÍ KÍP "SỬA CODE BẰNG TAY TRONG 60 GIÂY" NẾU GIẢNG VIÊN YÊU CẦU

Giảng viên FPT thường yêu cầu bạn sửa một yêu cầu nhỏ trực tiếp trên IDE để chứng minh bạn tự viết code. Dưới đây là 4 dạng bài tập chắc chắn 90% sẽ gặp:

### DẠNG 1: Thêm điều kiện chặn logic (Validation Rule)
👉 **Yêu cầu của thầy:** *"Bây giờ em sửa code sao cho chỉ duyệt được các đơn hàng có số tiền từ 50.000 VNĐ trở lên, nếu dưới 50.000 VNĐ thì báo lỗi."*
* **Bước 1:** Mở file `ManualBankTransferService.java`.
* **Bước 2:** Tìm đến hàm `confirmTransfer`, ngay sau đoạn tìm thấy `Transaction tx`, chèn 3 dòng này vào:
```java
if (tx.getAmount().compareTo(new BigDecimal("50000")) < 0) {
    throw new AppException("Số tiền chuyển khoản tối thiểu phải từ 50.000 VNĐ trở lên", HttpStatus.BAD_REQUEST);
}
```
* **Giải thích cho thầy:** *"Em dùng method `.compareTo()` của BigDecimal. Nếu `tx.getAmount()` nhỏ hơn 50.000 thì nó trả về `-1` (< 0), hệ thống sẽ ném ra `AppException` mã lỗi 400 Bad Request ngay lập tức ạ."*

---

### DẠNG 2: Bắt buộc Kế toán phải nhập ghi chú khi từ chối đơn
👉 **Yêu cầu của thầy:** *"Khi kế toán bấm từ chối đơn hàng, em hãy kiểm tra lý do từ chối không được để trống hoặc dưới 10 ký tự."*
* **Bước 1:** Mở file `ManualBankTransferService.java`, tìm hàm `rejectTransfer`.
* **Bước 2:** Chèn đoạn kiểm tra này vào đầu hàm:
```java
if (request.getRejectionReason() == null || request.getRejectionReason().trim().length() < 10) {
    throw new AppException("Lý do từ chối phải có độ dài tối thiểu 10 ký tự", HttpStatus.BAD_REQUEST);
}
```

---

### DẠNG 3: Thay đổi dữ liệu bắn ra Event
👉 **Yêu cầu của thầy:** *"Trong PaymentSuccessEvent em đang gửi những thông tin gì? Thêm cho tôi trường email của người mua vào Event để module sau gửi mail cảm ơn."*
* **Bước 1:** Mở file `PaymentSuccessEvent.java` trong `com.localpress.shared.event`. Thêm dòng:
```java
private String userEmail;
```
* **Bước 2:** Mở file `ManualBankTransferService.java`, tại đoạn `PaymentSuccessEvent.builder()`, thêm:
```java
.userEmail("user" + savedTx.getUserId() + "@localpress.vn") // hoặc lấy email thật
```

---

### DẠNG 4: Frontend — Thêm một nút lọc mới trên giao diện
👉 **Yêu cầu của thầy:** *"Trên màn hình danh sách đơn hàng OrderListPage, em hãy thêm một bộ lọc chỉ hiển thị các đơn có số tiền lớn hơn 100.000 VNĐ."*
* **Bước 1:** Mở file `OrderListPage.tsx`.
* **Bước 2:** Khai báo một state mới ở dòng 17:
```typescript
const [filterBigAmount, setFilterBigAmount] = useState(false);
```
* **Bước 3:** Trong hàm `filteredOrders`, thêm điều kiện lọc:
```typescript
if (filterBigAmount && o.finalAmount <= 100000) return false;
```
* **Bước 4:** Thêm 1 nút bấm nhỏ ở phần giao diện:
```tsx
<button 
  onClick={() => setFilterBigAmount(!filterBigAmount)}
  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${filterBigAmount ? 'bg-primary-900 text-white' : 'bg-slate-100 text-slate-700'}`}
>
  Đơn trên 100k
</button>
```

---

## PHẦN 4: HƯỚNG DẪN TỰ QUAY VIDEO WALKTHROUGH GIẢI THÍCH CODE

Nếu bạn muốn tự quay một video màn hình để nộp hoặc xem đi xem lại:
1. **Bố cục màn hình quay:**
   - Dùng OBS Studio hoặc phím tắt `Windows + Alt + R` (Xbox Game Bar).
   - Chia màn hình làm 2 nửa:
     * Nửa trái: Trình duyệt mở `localhost:5173` đăng nhập tài khoản Kế toán (`ketoan@localpress.vn`).
     * Nửa phải: Mở VS Code / IntelliJ trỏ vào file `ManualBankTransferService.java` và `OrderDetailPage.tsx`.
2. **Kịch bản nói theo từng phút (Thời lượng 5 phút):**
   * **Phút 0 - 1:** Mở trang Đơn hàng $\rightarrow$ Chỉ vào đơn hàng có trạng thái `PROCESSING`. Giải thích: *"Đây là màn hình II.4.2 của em. Khách hàng đã chuyển tiền và nộp mã tham chiếu. Tiền chưa được cấp tự động vì đây là chuyển khoản thủ công."*
   * **Phút 1 - 2.5:** Chuyển sang màn hình code `ManualBankTransferService.java`. Chỉ chuột vào hàm `confirmTransfer`. Nói: *"Khi kế toán bấm Xác nhận, backend sẽ chạy vào hàm confirmTransfer này. Dòng 96 kiểm tra đơn tồn tại. Dòng 104 kiểm tra mã bút toán ngân hàng có bị trùng với đơn khác không để chống gian lận. Dòng 116 chuyển status thành SUCCESS và lưu DB. Dòng 135 phát sự kiện PaymentSuccessEvent để các module khác kích hoạt quyền."*
   * **Phút 2.5 - 3.5:** Quay lại trình duyệt bấm nút **"Xác nhận tiền đã vào tài khoản"**. Hiện thông báo thành công $\rightarrow$ F5 trang thấy đơn chuyển sang `PAID`.
   * **Phút 3.5 - 4.5:** Mở màn hình Sổ quỹ (`GeneralLedgerPage.tsx`). Giải thích: *"Bút toán vừa rồi đã ngay lập tức được ghi nhận vào cột Credit (Phát sinh thu). Số dư Net Balance tự động cộng thêm số tiền này."*
   * **Phút 4.5 - 5.0:** Kết luận: *"Luồng 4 của em đảm bảo tính toàn vẹn tài chính, tuân thủ nguyên tắc Idempotent và phân định ranh giới độc lập giữa các thành viên."*
