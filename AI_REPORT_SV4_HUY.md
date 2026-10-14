# SWP391 PROJECT REPORT
AI Usage Report Iteration 1

LocalPress Revenue and Trust Platform  
Nguyen Quang Huy — SV4 (Leader)  

October 2026

---

## I. Mục đích của báo cáo
Tôi báo cáo việc sử dụng AI trong Iteration 1 của LocalPress, tập trung Screen 28 và 29: UC051, UC057, UC058 (cùng việc thiết lập tầng Shared, SecurityConfig và quản trị kiến trúc chung cho toàn đội). AI được dùng thường xuyên để soạn tài liệu đặc tả, gợi ý cấu trúc code, phân tích ngoại lệ và tối ưu quy trình kiểm thử. Tôi cung cấp yêu cầu nghiệp vụ kế toán, quy tắc bất biến về an toàn tài chính (Invariant Rules), chạy thử trên máy và yêu cầu chỉnh sửa những kết quả không phù hợp. Tôi không coi việc áp dụng code AI là tự viết code hoàn toàn.

---

## II. Báo cáo sử dụng AI

### Phần 0 Thông tin chung

| Mục | Nội dung |
| :--- | :--- |
| **Nhóm / sinh viên** | Nhóm 2 — Nguyen Quang Huy — SV4 (Leader) |
| **Công cụ AI đã dùng** | Antigravity AI Assistant (Claude 3.5 Sonnet / Gemini 1.5 Pro) trong IDE; Google NotebookLM hỗ trợ rà soát domain tài chính; GitHub Copilot hỗ trợ gợi ý cú pháp. |
| **Phạm vi báo cáo** | SV4 Iteration 1: Screen 28, 29; UC051, UC057, UC058; chuẩn hóa Master `SecurityConfig` và Granular RBAC tầng Shared. |
| **Hình thức lưu log** | File `AGENTS.md`, nhật ký prompt `ai-log.md`, commit hash và git diff trên nhánh SV4; không có share link trong báo cáo này. |
| **Chiến lược tổng thể** | Thiết lập file `AGENTS.md` lưu 21 quy tắc bất biến để giữ context xuyên suốt; yêu cầu AI đọc mã nguồn, đối chiếu bảng phân công 48 màn hình, cấm tự đoán logic tài chính và tuyệt đối không can thiệp trực tiếp vào module của thành viên khác. |

---

### Phần 1 Báo cáo theo từng giai đoạn
Giữ cách phân loại A/B/C/D của template. Các artifact do AI tạo và tiếp tục sửa theo yêu cầu vẫn được khai A nếu không có bằng chứng tôi tự chỉnh đáng kể nội dung. B và C không được gán chỉ vì tôi đưa prompt hoặc bấm chạy. Số lượng dưới đây đếm nhóm artifact, không đếm file, dòng code hay tỷ lệ tác quyền.

| Mức | Ý nghĩa |
| :---: | :--- |
| **A - AI tạo, SV giữ nguyên** | AI tạo ra gần như hoàn chỉnh, SV review và chấp nhận không sửa nội dung (chỉ format). |
| **B - AI tạo khung, SV chỉnh nội dung** | AI tạo cấu trúc/khung ban đầu, SV sửa đổi đáng kể nội dung (business logic, số liệu, quyết định thiết kế). |
| **C - SV tạo, AI hỗ trợ hoàn thiện** | SV tự viết ý tưởng/bản thảo trước, AI giúp diễn đạt/format/bổ sung chi tiết. |
| **D - SV tự làm hoàn toàn** | Không dùng AI cho phần này. |

---

### 1.1 Phân tích yêu cầu

#### 1.1.1 Bảng phân công AI và sinh viên

| Artifact / Mục | Mức | Đóng góp và giới hạn minh chứng |
| :--- | :---: | :--- |
| **Phạm vi UC051, UC057, UC058** | **B** | AI đối chiếu bảng phân công 48 màn hình; tôi yêu cầu giới hạn đúng phạm vi Iteration 1 (Screen 28, 29), không làm lấn sang đối soát tự động của Iteration 3. |
| **Đặc tả ba UC theo template** | **B** | AI soạn bảng flow, pre/postcondition và BR; tôi cung cấp yêu cầu bắt buộc kế toán đối chiếu số dư thực tế, cấm tự động duyệt bằng ảnh chụp biên lai (Quy tắc 4). |
| **Quy định ranh giới và vai trò Kế toán** | **B** | AI diễn giải vai trò của Kế toán viên (`ROLE_FINANCE`, `ROLE_STAFF`); tôi xác lập luồng duyệt đơn thủ công độc lập, không cho phép khách hàng tự kích hoạt dịch vụ. |

#### 1.1.2 Ví dụ prompt tiêu biểu
* **Prompt nguyên văn:** `Bây giờ hãy đặc tả UC của iter 1 luồng SV4 theo form bảng nhé, gồm UC051, UC057, UC058. Lưu ý khách chuyển khoản ngân hàng thì kế toán phải làm gì để chống bill giả?`
* **Output trích nguyên văn, rút gọn:** `“Kế toán viên mở danh sách đơn chờ duyệt tại Screen 29, đối chiếu mã tham chiếu và số tiền với sao kê ngân hàng thực tế của tòa soạn. Khách tải ảnh biên lai chỉ để tham khảo, không duyệt nếu tài khoản chưa nhận đủ 100% tiền.”`
* **Nhận xét:** Đặc tả được dùng làm tài liệu review cá nhân. Tôi yêu cầu bám sát Invariant Rule 4 (Backend xác minh thanh toán độc lập, không tin client) và phân định rõ giữa biên nhận thu tiền với hóa đơn VAT hợp lệ.

#### 1.1.3 Thay đổi so với output và lý do
Không có artifact mức B/C trong nhóm này ngoài các tài liệu đã khai. Các lần tôi yêu cầu chỉnh sửa yêu cầu (loại bỏ cơ chế OCR tự động duyệt qua ảnh bill) được AI viết lại; tôi không khai những lần đó thành tài liệu do mình tự viết hoàn toàn.

#### 1.1.4 Vấn đề đã phát hiện

| Tình huống | AI đề xuất / giới hạn | Vì sao không phù hợp | Cách xử lý |
| :--- | :--- | :--- | :--- |
| **Tự động duyệt chuyển khoản bằng OCR** | AI đề xuất dùng thư viện OCR quét ảnh biên lai khách tải lên để hệ thống tự duyệt đơn. | Biên lai chuyển khoản ngân hàng rất dễ bị làm giả bằng web tạo bill ảo; nếu tự duyệt sẽ gây thất thoát tiền bạc nghiêm trọng. | Tôi bác bỏ hoàn toàn OCR tự duyệt; yêu cầu kế toán viên phải đăng nhập app ngân hàng tòa soạn đối chiếu biến động số dư thực tế mới được xác nhận. |
| **Cho phép sửa/xóa dòng Sổ cái** | AI đề xuất cho phép kế toán xóa hoặc sửa dòng bút toán nếu nhập nhầm thông tin. | Vi phạm nguyên tắc Sổ cái kế toán bất biến (Audit Immutability). Kế toán không bao giờ được xóa đè lịch sử dòng tiền. | Tôi yêu cầu Sổ cái là dạng dữ liệu chỉ ghi (Append-Only); nếu có sai sót phải điều chỉnh bằng bút toán đảo bổ sung (Reversal Entry) theo Quy tắc 21. |

#### 1.1.5 Tự đánh giá hiểu bài
1. **Vì sao trong UC051, ảnh biên lai của khách chỉ là tham khảo mà kế toán bắt buộc phải đối chiếu số dư thực tế?**  
   *Trả lời của sinh viên:* Vì ảnh chụp màn hình chuyển khoản rất dễ bị làm giả bằng các công cụ Photoshop hoặc web fake bill online. Nếu hệ thống tự động tin client và mở quyền, kẻ xấu có thể đọc miễn phí bài điều tra Premium hoặc chạy banner quảng cáo mà tòa soạn không nhận được tiền. Kế toán là chốt chặn tài chính, bắt buộc phải thấy tiền thực tế nổi trong tài khoản ngân hàng của tòa soạn.
2. **UC057 và UC058 khác nhau ở mục tiêu nghiệp vụ và đối tượng phục vụ như thế nào?**  
   *Trả lời của sinh viên:* UC058 (View Financial Ledger) phục vụ công tác quản trị nội bộ của Tòa soạn (theo dõi dòng tiền biến động Nợ/Có theo thời gian thực, tính số dư ròng Net Balance). Trong khi đó UC057 (Generate Financial Documents) phục vụ nghĩa vụ pháp lý và quan hệ khách hàng (xuất hóa đơn VAT điện tử hoặc biên lai thu tiền chuẩn có mã chứng từ tra cứu cho đơn hàng đã thanh toán thành công).
3. **Vì sao tính năng Quẹt thẻ / QR Code tự động (Payment Gateway) và Đối soát lệch (Reconciliation) nằm ngoài phạm vi Iteration 1?**  
   *Trả lời của sinh viên:* Theo đúng lộ trình Activity Flow của dự án: Iteration 1 tập trung vào Ingestion, Setup, Master Data và luồng tiền cơ bản (chuyển khoản thủ công, ghi sổ cái). Các cổng thanh toán trực tuyến tự động (VietQR, MoMo, VNPay) thuộc giai đoạn giao dịch lõi (Iteration 2), và hệ thống đối soát tự động xử lý lệch tiền thuộc giai đoạn vận hành nâng cao (Iteration 3).

---

### 1.2 Thiết kế

#### 1.2.1 Bảng phân công AI và sinh viên

| Artifact / Mục | Mức | Đóng góp và giới hạn minh chứng |
| :--- | :---: | :--- |
| **Swimlane quy trình duyệt chuyển khoản (SV4 Iter 1)** | **C** | AI hỗ trợ mô tả 4 làn: Khách hàng $\rightarrow$ Hệ thống $\rightarrow$ Kế toán viên $\rightarrow$ Hệ thống phát sự kiện; tôi phản hồi actor, các điều kiện rẽ nhánh và kiểm tra trùng mã bút toán. |
| **Use Case diagram phần Iter 1** | **C** | AI hỗ trợ vẽ các quan hệ `include`/`extend` của UC051, UC057, UC058; tôi cung cấp danh mục actor chuẩn (`Finance Staff`, `Chief Accountant`). |
| **Giải thích thiết kế Database bảng `transactions`** | **B** | AI đọc cấu trúc bảng hiện có và giải thích; tôi yêu cầu làm rõ Scalar Foreign Key (`subscription_id`, `purchase_id`, `campaign_id`) và CHECK constraint để bảo vệ ranh giới nhóm (Quy tắc 17). |

#### 1.2.2 Ví dụ prompt tiêu biểu
* **Prompt nguyên văn:** `Hãy thiết kế bảng transactions trong CSDL sao cho đơn hàng dùng chung được cho cả Mua gói (SV3), Mua bài lẻ (SV3) và Đặt quảng cáo (SV1) mà không làm module Finance bị dính chặt (tight-coupling) vào Entity của các bạn khác.`
* **Output trích nguyên văn, rút gọn:** `“Sử dụng Scalar Foreign Key dạng BIGINT NULL cho subscription_id, purchase_id, campaign_id kèm điều kiện CHECK constraint: chỉ được phép có đúng 1 trong 3 cột mang giá trị NOT NULL.”`
* **Nhận xét:** Thiết kế này giải quyết triệt để vấn đề xung đột Git khi các thành viên sửa entity riêng, đồng thời bảo đảm tính toàn vẹn dữ liệu ở mức Database Engine.

#### 1.2.3 Thay đổi so với output và lý do
Không có artifact mức B/C trong nhóm này ngoài các tài liệu đã khai. Tôi đưa phản hồi thiết kế về việc cô lập module; AI thực hiện việc sửa sơ đồ và văn bản hóa. Không khai việc đưa yêu cầu là tự vẽ hoặc tự viết hoàn toàn.

#### 1.2.4 Vấn đề đã phát hiện

| Tình huống | AI đề xuất / giới hạn | Vì sao không phù hợp | Cách xử lý |
| :--- | :--- | :--- | :--- |
| **Dùng `@ManyToOne` sang entity của SV khác** | AI ban đầu định nghĩa quan hệ `@ManyToOne private User user; @ManyToOne private Subscription subscription;`. | Khi SV3 hoặc SV5 sửa Entity của họ, code của SV4 sẽ bị lỗi biên dịch (build break) và xung đột git liên tục. | Tôi yêu cầu đổi toàn bộ sang Scalar Foreign Key (`Long userId`, `Long subscriptionId`), giao tiếp liên phân hệ qua ID và `PaymentSuccessEvent` (Quy tắc 17). |
| **Dùng kiểu số thực `Double` cho tiền tệ** | AI tạo cột `amount DOUBLE` trong SQL và `Double amount` trong Java. | Số thực dấu phẩy động bị lỗi làm tròn (precision drift), dẫn đến lệch vài hào/xu khi tính tổng sổ cái. | Tôi bắt buộc đổi toàn bộ sang `BigDecimal` trong Java và `DECIMAL(12, 2)` trong CSDL MySQL. |

#### 1.2.5 Tự đánh giá hiểu bài
1. **Vì sao bảng `transactions` dùng Scalar Foreign Key (`Long`) thay vì `@ManyToOne` thông thường của JPA?**  
   *Trả lời của sinh viên:* Để thực hiện nguyên tắc phân định ranh giới độc lập (Strict Boundary - Quy tắc 17). Nếu dùng `@ManyToOne`, module Finance sẽ phụ thuộc chặt chẽ (tight-coupling) vào code của SV1, SV3, SV5. Khi các bạn sửa đổi entity, mã nguồn của SV4 sẽ bị crash theo. Dùng khóa ngoại dạng `Long` giúp module Finance hoàn toàn tự chủ, chỉ giao tiếp qua Event và DTO.
2. **CHECK constraint trên bảng `transactions` có ý nghĩa gì đối với tính toàn vẹn dữ liệu?**  
   *Trả lời của sinh viên:* Ràng buộc CHECK constraint đảm bảo một giao dịch tài chính chỉ liên kết với **DUY NHẤT 1 trong 3 đối tượng**: Gói đọc (`subscription_id`), Bài lẻ (`purchase_id`) hoặc Quảng cáo (`campaign_id`). Nó ngăn chặn lỗi logic ứng dụng vô tình ghi nhận 1 khoản tiền thanh toán cho cả 2 dịch vụ khác nhau.
3. **Vì sao sau khi duyệt tiền, Finance không gọi thẳng `readerService.unlockArticle()` mà phải bắn `PaymentSuccessEvent`?**  
   *Trả lời của sinh viên:* Áp dụng kiến trúc Event-Driven giúp giảm phụ thuộc (Decoupling). Finance chỉ có trách nhiệm duy nhất: xác nhận tiền vào sổ cái và thông báo cho hệ thống biết đơn hàng đã thanh toán thành công. Việc mở bài đọc hay kích hoạt banner là nghiệp vụ riêng của SV3 và SV1, các bạn tự viết listener đón sự kiện để thực thi.

---

### 1.3 Triển khai

#### 1.3.1 Bảng phân công AI và sinh viên

| Artifact / Mục | Mức | Đóng góp và giới hạn minh chứng |
| :--- | :---: | :--- |
| **API xác nhận chuyển khoản thủ công** | **A** | AI hướng dẫn tạo `ManualBankTransferController.java`, `ManualBankTransferService.java`, DTO; tôi áp dụng và chạy trên máy. |
| **API sổ cái tài chính & tổng kết dòng tiền** | **A** | AI hỗ trợ `FinanceLedgerController.java`, `FinanceLedgerService.java` và truy vấn aggregate tính Credit/Debit. |
| **Domain Entity `Transaction.java`** | **A** | AI sinh mã entity JPA, enum trạng thái và các phương thức nghiệp vụ nội tại (`confirmManualTransfer`). |
| **FE Sổ cái `GeneralLedgerPage.tsx`** | **A** | AI tạo trang hiển thị 3 thẻ KPI và bảng bút toán theo Design System của dự án. |
| **FE Duyệt chuyển khoản `OrderDetailPage.tsx`** | **A** | AI tạo form nhập mã bút toán ngân hàng và modal xác nhận duyệt đơn. |
| **Master `SecurityConfig.java` tầng Shared** | **A** | AI hỗ trợ tập trung hóa cấu hình Spring Security, tích hợp Granular RBAC theo yêu cầu của Leader Huy (Quy tắc 20). |

#### 1.3.2 Ví dụ prompt tiêu biểu
* **Prompt nguyên văn:** `Viết method confirmTransfer trong ManualBankTransferService.java. Cần kiểm tra đơn tồn tại, trạng thái PENDING, mã bút toán ngân hàng không được trùng với bất kỳ đơn nào khác trong DB. Đặt @Transactional và bắn PaymentSuccessEvent.`
* **Output trích nguyên văn, rút gọn:** `“Kiểm tra transactionRepository.findByGatewayTransactionId(refCode). Nếu tồn tại trên đơn khác thì quăng AppException(CONFLICT). Cập nhật status SUCCESS và phát tán PaymentSuccessEvent.”`
* **Nhận xét:** Tôi giới hạn phạm vi xử lý và gửi lỗi thực tế. AI hỗ trợ sửa logic kiểm tra trùng mã bút toán ngân hàng nhằm ngăn chặn kế toán viên duyệt trùng 1 khoản tiền cho 2 đơn khác nhau.

#### 1.3.3 Thay đổi so với output và lý do
Không có artifact mức B/C trong nhóm code này: log hiện có không đủ chứng minh phần code nào được tôi tự gõ bằng tay hoàn toàn. Tôi khai mức A cho nhóm code do AI hướng dẫn/tạo; việc chạy thử nghiệm trên máy, nạp dữ liệu seed data, test kịch bản và phản hồi lỗi là phần thực hiện của tôi.

#### 1.3.4 Vấn đề đã phát hiện

| Tình huống | AI đề xuất / giới hạn | Vì sao không phù hợp | Cách xử lý |
| :--- | :--- | :--- | :--- |
| **Các nhánh tự tạo file SecurityConfig riêng** | AI hỗ trợ các thành viên khác tạo `PasswordConfig.java` và các file config phân tán trong từng module. | Gây lỗi trùng lặp Bean `SecurityFilterChain` khiến toàn bộ ứng dụng Spring Boot bị crash khi khởi động (Lỗi W1/W4 trong báo cáo tuần). | Với vai trò Leader, tôi xóa bỏ toàn bộ file config riêng lẻ; tập trung toàn bộ cấu hình vào duy nhất file `SecurityConfig.java` ở package shared; ban hành Quy tắc 20 trong `AGENTS.md`. |
| **Quên kiểm tra trùng mã bút toán ngân hàng** | Code ban đầu của AI chỉ kiểm tra đơn có ở trạng thái PENDING hay không mà bỏ qua việc kiểm tra mã giao dịch ngân hàng đã tồn tại hay chưa. | Kế toán có thể dùng 1 mã chuyển khoản ngân hàng duy nhất để duyệt thành công cho nhiều đơn hàng khác nhau (gian lận duyệt khống). | Tôi yêu cầu bổ sung logic kiểm tra `findByGatewayTransactionId` và ném mã lỗi `409 Conflict` nếu mã đã được sử dụng. |

#### 1.3.5 Tự đánh giá hiểu bài
1. **Trace luồng kiểm tra trùng mã bút toán từ Controller đến Repository bằng tên hàm?**  
   *Trả lời của sinh viên:*
   * Controller nhận request: `ManualBankTransferController.confirmTransfer(...)`.
   * Chuyển tiếp vào Service: `ManualBankTransferService.confirmTransfer(transactionId, accountantUserId, request)`.
   * Service truy vấn DB: `transactionRepository.findByGatewayTransactionId(refCode)`.
   * Lọc loại trừ đơn hiện tại: `.filter(existing -> !existing.getTransactionId().equals(transactionId))`.
   * Nếu tìm thấy: ném `AppException("Mã bút toán ngân hàng đã được sử dụng", HttpStatus.CONFLICT)`.
2. **Vì sao method `confirmTransfer` bắt buộc phải có annotation `@Transactional`?**  
   *Trả lời của sinh viên:* Để đảm bảo tính nguyên tử (Atomicity). Quá trình duyệt gồm nhiều bước: kiểm tra mã, cập nhật trạng thái đơn, lưu thời gian thanh toán, ghi nhận ID kế toán duyệt và phát sự kiện. Nếu không có `@Transactional`, khi một bước phía sau gặp sự cố, dữ liệu bước trước đã lưu sẽ không được hoàn tác, dẫn đến sai lệch trạng thái đơn và sổ quỹ. Có `@Transactional`, toàn bộ thao tác sẽ tự động Rollback nếu có bất kỳ ngoại lệ nào xảy ra.
3. **Cơ chế Granular RBAC điều hướng người dùng sau khi đăng nhập hoạt động như thế nào?**  
   *Trả lời của sinh viên:* Tại Frontend, hàm tập trung `PERMISSION_CHECKERS.getDefaultBackofficeRoute(user.role)` kiểm tra vai trò: nếu là `ACCOUNTANT`/`FINANCE` sẽ điều hướng về `/backoffice/finance/ledger`; nếu là `ADVERTISER` về cổng B2B; nếu là `JOURNALIST` về CMS. Tại Backend, master `SecurityConfig.java` bảo vệ các endpoint `/api/v1/finance/**` yêu cầu quyền `hasAnyRole('FINANCE', 'ADMIN')`.

---

### 1.4 Kiểm thử

#### 1.4.1 Bảng phân công AI và sinh viên

| Artifact / Mục | Mức | Đóng góp và giới hạn minh chứng |
| :--- | :---: | :--- |
| **Unit test Backend `ManualBankTransferServiceTest`** | **A** | AI hỗ trợ sinh mã JUnit 5 & Mockito test case thành công và case trùng mã; ghi nhận toàn bộ test pass. |
| **Test giao diện Frontend và TypeScript** | **A** | AI hỗ trợ kiểm tra form duyệt đơn và kiểu dữ liệu TypeScript; build và oxlint pass 0 errors. |
| **Kịch bản kiểm thử HTTP `Demo_SV4_Iter1.http`** | **A** | AI tạo file request mẫu kiểm tra API danh sách đơn pending, duyệt đơn và xem sổ cái. |
| **Bằng chứng chạy thử nghiệm thủ công** | **C** | Tôi trực tiếp chạy ứng dụng, nạp dữ liệu qua MySQL Workbench, test giao diện trên trình duyệt và gửi log/ảnh chụp cho AI phân tích. |

#### 1.4.2 Ví dụ prompt tiêu biểu
* **Prompt nguyên văn:** `Viết test case Mockito cho hàm confirmTransfer khi bị trùng mã bút toán ngân hàng. Cần assert ném lỗi AppException 409 Conflict và verify rằng eventPublisher không bao giờ được gọi.`
* **Output trích nguyên văn, rút gọn:** `“assertThrows(AppException.class, () -> service.confirmTransfer(1L, 99L, req)); verify(eventPublisher, never()).publishEvent(any());”`
* **Nhận xét:** Tôi cung cấp yêu cầu kiểm thử an toàn liên phân hệ. AI sinh cấu trúc mock chuẩn xác, xác nhận việc chặn phát sự kiện khi có lỗi nghiệp vụ.

#### 1.4.3 Thay đổi so với output và lý do
Artifact mức C là bằng chứng chạy thủ công: tôi trực tiếp thao tác trên môi trường thật, phát hiện lỗi điều hướng vai trò và xung đột Bean config để yêu cầu AI chỉnh sửa. Lý do: các bài test đơn vị không thể tự phát hiện được lỗi cấu hình môi trường runtime.

#### 1.4.4 Vấn đề đã phát hiện

| Tình huống | AI đề xuất / giới hạn | Vì sao không phù hợp | Cách xử lý |
| :--- | :--- | :--- | :--- |
| **Test mock chưa set ID khác nhau** | AI viết test mock trùng mã nhưng cả hai đối tượng giao dịch đều mang ID là `1L`. | Khiến đoạn code logic `.filter(existing -> !existing.getTransactionId().equals(transactionId))` bỏ qua bản ghi, test case không chạy vào nhánh ném lỗi `409 Conflict`. | Tôi chỉ ra lỗi logic và yêu cầu AI set ID của đơn tồn tại là `2L` để kiểm tra đúng điều kiện biên. |

#### 1.4.5 Tự đánh giá hiểu bài
1. **Vì sao trong test case trùng mã bút toán ngân hàng, bắt buộc phải verify `eventPublisher, never().publishEvent(...)`?**  
   *Trả lời của sinh viên:* Để chứng minh tính an toàn liên phân hệ. Nếu giao dịch bị nghi ngờ gian lận (trùng mã ngân hàng) mà hệ thống vẫn vô tình phát tán `PaymentSuccessEvent`, các phân hệ của SV1 và SV3 sẽ hiểu nhầm là đã thanh toán thành công và cấp quyền đọc báo/chạy quảng cáo cho khách. Do đó, bắt buộc phải kiểm tra sự kiện không được phép phát ra khi có lỗi.
2. **Kế toán duyệt đơn thành công thì dữ liệu trên Sổ cái biến động như thế nào?**  
   *Trả lời của sinh viên:* Số dư ghi nhận phát sinh Thu (Credit) tăng thêm đúng bằng số tiền của đơn hàng (`amount`); tổng số dư ròng (Net Balance) tăng lên tương ứng. Đồng thời một dòng bút toán mới được tạo ra ghi nhận thời gian, mã giao dịch tham chiếu và ID kế toán viên thực hiện đối soát (`reconciled_by`).
3. **Vì sao unit test pass chưa đủ để khẳng định tính năng duyệt chuyển khoản đã an toàn?**  
   *Trả lời của sinh viên:* Unit test chỉ kiểm tra logic trong môi trường giả lập (mocking) với dữ liệu cô lập. Nó không kiểm tra được tính tương thích của Spring Security (liệu token của kế toán có bị 403 Forbidden không), không kiểm tra được transaction lock trong MySQL khi có 2 kế toán cùng duyệt 1 đơn, và không kiểm tra được giao diện thực tế có hiển thị đúng định dạng tiền tệ VND hay không. Cần phải kết hợp kiểm thử tích hợp (Integration Test) và UAT thực tế trên trình duyệt.

---

## Phần 2 Số liệu tổng hợp

| Giai đoạn | Artifact | A | B | C | D | Prompt TB |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Phân tích yêu cầu** | 3 | 0 | 3 | 0 | 0 | Chưa đo |
| **Thiết kế** | 3 | 0 | 1 | 2 | 0 | Chưa đo |
| **Triển khai** | 6 | 6 | 0 | 0 | 0 | Chưa đo |
| **Kiểm thử** | 4 | 3 | 0 | 1 | 0 | Chưa đo |

> **Tổng cộng 16 nhóm artifact của SV4 Iteration 1:** 9 mức A, 4 mức B, 3 mức C, 0 mức D. Không khai mức D khi chưa có minh chứng độc lập. Số vòng prompt trung bình chưa đo chính xác vì không có file export toàn bộ hội thoại. Không quy đổi số lượng này thành phần trăm tỷ lệ code do AI tạo.

---

### Traceability Checklist

| Giai đoạn | Checklist đạt / tổng | Việc cần bổ sung |
| :--- | :---: | :--- |
| **Phân tích** | Chưa xác nhận | Rà soát ma trận Traceability giữa Use Case và SRS; hoàn thiện đặc tả chi tiết cho đợt 2 (Cổng thanh toán QR tự động). |
| **Thiết kế** | Chưa xác nhận | Bổ sung sơ đồ lớp chi tiết (Class Diagram) cho các Entity tài chính; rà soát composite index tối ưu truy vấn Sổ cái. |
| **Triển khai** | Chưa xác nhận | Hoàn thiện endpoint xuất hóa đơn PDF giả lập (UC057); chuẩn bị DTO và Service cho Webhook IPN Iteration 2. |
| **Kiểm thử** | Chưa xác nhận | Bổ sung kịch bản kiểm thử tích hợp tự động (Integration Test) cho luồng duyệt tiền liên thông giữa Finance với Reader và Advertising. |

> **Kết quả kiểm tra liên quan Iteration 1 đã ghi nhận trong lần rà soát:** Backend unit test pass (kiểm tra đầy đủ các nhánh thành công, 404, 409 conflict); Frontend TypeScript pass 0 errors; hệ thống kiểm tra phân quyền Granular RBAC hoạt động chính xác theo vai trò.

---

## Phần 3 Phản tư

### AI làm tốt ở việc nào
AI hỗ trợ rất đắc lực trong việc sinh nhanh các khung code lặp lại (boilerplate code): cấu hình Entity JPA, sinh DTO request/response, viết các câu lệnh truy vấn Spring Data JPA và tạo khung giao diện React chuẩn Tailwind CSS. AI cũng hỗ trợ rà soát cú pháp và phân tích nguyên nhân lỗi biên dịch rất nhanh chóng khi có thông tin log chi tiết.

### Sinh viên và nhóm quyết định việc nào
Nhóm và sinh viên quyết định toàn bộ các quy tắc nghiệp vụ cốt lõi: phân định ranh giới độc lập giữa các thành viên, quy tắc an toàn tài chính (cấm duyệt tự động bằng ảnh bill, bắt buộc đối chiếu sao kê ngân hàng), giải pháp kiến trúc dùng Scalar Foreign Key để chống xung đột Git, và quyết định chỉ duy nhất Leader Huy làm chủ file master `SecurityConfig.java`. AI không thể tự đưa ra những quyết định này nếu không có sự chỉ đạo và định hướng từ sinh viên.

### Rủi ro khi không review
Rủi ro lớn nhất là **lỗ hổng bảo mật và thất thoát tài chính**. Nếu không review kỹ, giải pháp dùng OCR tự duyệt của AI sẽ cho phép kẻ xấu dùng ảnh bill giả để chiếm đoạt quyền đọc bài và đặt quảng cáo miễn phí. Ngoài ra, việc AI liên tục đề xuất `@ManyToOne` xuyên module hoặc tự ý tạo thêm file SecurityConfig riêng sẽ làm sập hệ thống do xung đột Bean hoặc khiến các thành viên xung đột code không thể merge nhánh.

### Nếu làm lại
Nếu làm lại từ đầu, tôi sẽ ban hành file `AGENTS.md` và chốt cứng các quy tắc kiến trúc (như Scalar Foreign Key, Master SecurityConfig) ngay từ buổi họp đầu tiên của nhóm trước khi viết bất kỳ dòng code nào. Tôi cũng sẽ yêu cầu AI luôn áp dụng tư duy kiểm toán tài chính và bảo mật ngay từ câu lệnh prompt đầu tiên để hạn chế việc AI đề xuất các giải pháp ngây thơ về mặt nghiệp vụ.

---

## Phụ lục AI Conversation Log

* File `ai-log.md` ghi nhận các câu lệnh và phản hồi chính trong quá trình thực hiện Iteration 1.
* Các commit then chốt trên nhánh SV4 phản ánh các quyết định kiến trúc:
  - Commit chuẩn hóa Master `SecurityConfig.java` và xóa bỏ `PasswordConfig.java` phân tán.
  - Commit triển khai `Transaction.java`, `ManualBankTransferService.java` xử lý Idempotency.
  - Commit giao diện Sổ cái `GeneralLedgerPage.tsx` và màn hình chi tiết đơn hàng `OrderDetailPage.tsx`.
* **Sản phẩm đối chiếu:** `project_tracking_group2.xlsx`, `AGENTS.md`, `weekly_report.xlsx`, mã nguồn module `backend/src/main/java/com/localpress/finance` và frontend `src/features/finance`.
