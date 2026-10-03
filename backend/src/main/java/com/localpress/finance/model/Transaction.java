package com.localpress.finance.model;

import com.localpress.shared.exception.AppException;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * THỰC THỂ TỰ CHỦ (AUTONOMOUS JPA ENTITY): TRANSACTIONS (SỔ CÁI THANH TOÁN TẬP TRUNG)
 * ==============================================================================
 * - Phân hệ: com.localpress.finance (SV4 - Huy phụ trách)
 * - Bảng CSDL: transactions (xem định nghĩa DDL tại V1__create_tables.sql).
 * - Nguyên tắc thiết kế (Phương án 2 & Quy tắc 17):
 *   + Entity này hoạt động ĐỘC LẬP 100% trong bounded context Finance.
 *   + Các khóa ngoại sang module khác (user_id, subscription_id, purchase_id, campaign_id)
 *     được lưu trữ dưới dạng Long (Scalar Foreign Key), KHÔNG sử dụng Hibernate @ManyToOne
 *     trỏ sang User, Subscription hay AdCampaign.
 *   + Lợi ích: Tránh xung đột Git, loại bỏ circular dependencies, không bị gãy build khi
 *     các thành viên SV1/SV2/SV3 refactor các entity thuộc quyền quản lý của họ.
 */
@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    /**
     * Khóa chính duy nhất của giao dịch tài chính.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Long transactionId;

    /**
     * ID người thực hiện giao dịch (độc giả hoặc đại diện doanh nghiệp quảng cáo).
     * Tham chiếu logic tới bảng users(user_id).
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * ID giao dịch gốc trong trường hợp đây là giao dịch hoàn tiền (REFUND).
     * Tham chiếu logic tới transactions(transaction_id).
     */
    @Column(name = "original_transaction_id")
    private Long originalTransactionId;

    /**
     * ID gói cước đăng ký đọc báo (chỉ có giá trị khi transaction_type = 'SUBSCRIPTION').
     * Tham chiếu logic tới subscriptions(subscription_id).
     */
    @Column(name = "subscription_id")
    private Long subscriptionId;

    /**
     * ID đơn mua lẻ từng bài viết (chỉ có giá trị khi transaction_type = 'ARTICLE').
     * Tham chiếu logic tới article_purchases(purchase_id).
     */
    @Column(name = "purchase_id")
    private Long purchaseId;

    /**
     * ID chiến dịch quảng cáo B2B (chỉ có giá trị khi transaction_type = 'AD').
     * Tham chiếu logic tới ad_campaigns(campaign_id).
     */
    @Column(name = "campaign_id")
    private Long campaignId;

    /**
     * Phân loại dòng thu / chi tài chính: SUBSCRIPTION, ARTICLE, AD, REFUND.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    /**
     * Số tiền giao dịch thực tế (VNĐ).
     */
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    /**
     * Đơn vị tiền tệ, mặc định 'VND'.
     */
    @Column(name = "currency", nullable = false, length = 10)
    @Builder.Default
    private String currency = "VND";

    /**
     * Phương thức thanh toán: 'MANUAL_BANK_TRANSFER', 'VIETQR', 'MOMO', 'VNPAY', v.v.
     */
    @Column(name = "payment_method", nullable = false, length = 50)
    private String paymentMethod;

    /**
     * Mã bút toán giao dịch từ phía Ngân hàng hoặc Cổng thanh toán đối tác.
     * Có ràng buộc duy nhất (Unique) để đảm bảo tính Idempotent (chống xử lý trùng tiền).
     */
    @Column(name = "gateway_transaction_id", unique = true, length = 255)
    private String gatewayTransactionId;

    /**
     * Mã định danh ngân hàng thực hiện chuyển khoản (vd: VCB, MB, TCB, VPB).
     */
    @Column(name = "bank_code", length = 20)
    private String bankCode;

    /**
     * Trạng thái giao dịch hiện tại: PENDING, SUCCESS, FAILED, REFUNDED.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.PENDING;

    /**
     * Thời điểm giao dịch được xác nhận đã nhận đủ tiền vào tài khoản tòa soạn.
     */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    /**
     * Thời điểm Kế toán thực hiện đối soát / xác nhận bút toán.
     */
    @Column(name = "reconciled_at")
    private LocalDateTime reconciledAt;

    /**
     * ID của Kế toán viên (Users) đã thực hiện phê duyệt / đối soát giao dịch này.
     */
    @Column(name = "reconciled_by")
    private Long reconciledBy;

    /**
     * Thời điểm giao dịch được khởi tạo ban đầu.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // =========================================================================
    // CÁC HÀM NGHIỆP VỤ MIỀN (DOMAIN BUSINESS LOGIC ENCAPSULATION)
    // =========================================================================

    /**
     * Xác nhận giao dịch chuyển khoản thủ công thành công (UC051).
     *
     * @param accountantUserId      ID Kế toán viên bấm duyệt.
     * @param bankReferenceCode     Mã bút toán chuyển khoản ngân hàng do Kế toán kiểm tra.
     * @param actualBankCode        Mã ngân hàng (nếu có cập nhật thêm).
     */
    public void confirmManualTransfer(Long accountantUserId, String bankReferenceCode, String actualBankCode) {
        if (this.status != TransactionStatus.PENDING) {
            throw new AppException(
                    "Giao dịch #" + this.transactionId + " không ở trạng thái chờ duyệt (Hiện tại: " + this.status + ")",
                    HttpStatus.CONFLICT
            );
        }

        LocalDateTime now = LocalDateTime.now();
        this.status = TransactionStatus.SUCCESS;
        this.paidAt = now;
        this.reconciledAt = now;
        this.reconciledBy = accountantUserId;

        if (bankReferenceCode != null && !bankReferenceCode.isBlank()) {
            this.gatewayTransactionId = bankReferenceCode.trim();
        }
        if (actualBankCode != null && !actualBankCode.isBlank()) {
            this.bankCode = actualBankCode.trim().toUpperCase();
        }
    }

    /**
     * Từ chối xác nhận giao dịch chuyển khoản thủ công (UC051) do sai cú pháp hoặc chưa thấy tiền về.
     *
     * @param accountantUserId  ID Kế toán viên bấm từ chối.
     */
    public void rejectManualTransfer(Long accountantUserId) {
        if (this.status != TransactionStatus.PENDING) {
            throw new AppException(
                    "Chỉ có thể từ chối giao dịch đang ở trạng thái PENDING (Hiện tại: " + this.status + ")",
                    HttpStatus.CONFLICT
            );
        }

        LocalDateTime now = LocalDateTime.now();
        this.status = TransactionStatus.FAILED;
        this.reconciledAt = now;
        this.reconciledBy = accountantUserId;
    }

    /**
     * Lấy ID đối tượng nghiệp vụ được thanh toán tương ứng.
     */
    public Long resolveTargetId() {
        if (this.transactionType == null) return null;
        return switch (this.transactionType) {
            case SUBSCRIPTION -> this.subscriptionId;
            case ARTICLE -> this.purchaseId;
            case AD -> this.campaignId;
            case REFUND -> this.originalTransactionId;
        };
    }
}
