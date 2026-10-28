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
     * Mô tả ngắn hiển thị trên trang thanh toán (vd: tên bài viết, tên gói, tên chiến dịch).
     */
    @Column(name = "description", length = 255)
    private String description;

    /**
     * Chỉ với đơn TOPUP nạp bù: mã đơn (bài / gói / quảng cáo) cần trả ngay khi tiền nạp về (V6).
     */
    @Column(name = "topup_for_order", length = 255)
    private String topupForOrder;

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

    /**
     * Hạn hiệu lực mã QR / giữ chỗ của đơn. Webhook về sau mốc này là "tiền về muộn" (Rule 6).
     */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    // =========================================================================
    // CÁC HÀM NGHIỆP VỤ MIỀN (DOMAIN BUSINESS LOGIC ENCAPSULATION)
    // =========================================================================

    /**
     * Xác nhận thanh toán tự động qua cổng thanh toán / Webhook IPN (UC049).
     */
    public void markPaidByGateway(String bankCode) {
        if (this.status == TransactionStatus.SUCCESS) {
            return;
        }
        this.status = TransactionStatus.SUCCESS;
        this.paidAt = LocalDateTime.now();
        if (bankCode != null && !bankCode.isBlank()) {
            this.bankCode = bankCode.trim().toUpperCase();
        }
    }

    /**
     * Đơn đã quá hạn thanh toán (dùng cho nhánh tiền về muộn).
     */
    public boolean isExpired(LocalDateTime now) {
        return this.expiresAt != null && now.isAfter(this.expiresAt);
    }

    /**
     * Rule 6: hạn chỉ ràng buộc khi có thứ bị giữ chỗ.
     * - AD   : booking giữ slot 15 phút, quá hạn thì không trả được nữa (tiền về muộn vào ví).
     * - TOPUP: hạn của mã QR nạp tiền (tiền nạp về muộn vẫn được cộng ví).
     * - ARTICLE / SUBSCRIPTION: bài / gói không giới hạn số lượng, đơn còn PENDING là còn trả được
     *   (bằng ví hoặc chuyển khoản), giống nhánh webhook.
     */
    public boolean isPaymentWindowClosed(LocalDateTime now) {
        boolean bounded = this.transactionType == TransactionType.AD || this.transactionType == TransactionType.TOPUP;
        return bounded && isExpired(now);
    }

    /** Đơn còn chờ nhưng đã đóng cửa thanh toán theo Rule 6 (trang thanh toán hiển thị "hết hạn"). */
    public boolean isPendingExpired() {
        return this.status == TransactionStatus.PENDING && isPaymentWindowClosed(LocalDateTime.now());
    }

    /**
     * Thanh toán đơn hàng bằng số dư Ví LocalPress (tiền đã được trừ ví trong cùng transaction DB).
     */
    public void markPaidByWallet() {
        if (this.status != TransactionStatus.PENDING) {
            throw new AppException(
                    "Đơn " + this.gatewayTransactionId + " không ở trạng thái chờ thanh toán (Hiện tại: " + this.status + ")",
                    HttpStatus.CONFLICT
            );
        }
        this.status = TransactionStatus.SUCCESS;
        this.paidAt = LocalDateTime.now();
        this.paymentMethod = "WALLET";
    }

    /**
     * Đánh dấu đơn hết hạn khi tiền về muộn và đã được chuyển vào ví thay vì cấp quyền.
     */
    public void markExpired() {
        if (this.status == TransactionStatus.PENDING) {
            this.status = TransactionStatus.FAILED;
        }
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
            case TOPUP -> null;
        };
    }
}
