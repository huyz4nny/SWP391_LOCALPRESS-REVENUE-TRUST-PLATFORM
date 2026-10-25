package com.localpress.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * HỢP ĐỒNG SỰ KIỆN MIỀN (SHARED DOMAIN EVENT): HOÀN TIỀN ĐÃ ĐƯỢC DUYỆT (UC055 -> UC056)
 * ==============================================================================
 * - Chiều ngược lại của PaymentSuccessEvent: Kế toán trưởng duyệt hoàn tiền (4 mắt) xong,
 *   Finance (SV4) ghi bút toán REFUND, hoàn ví nếu cần, rồi publish sự kiện này.
 * - Tuân thủ Quy tắc 17: SV4 KHÔNG sửa bảng article_purchases / subscriptions / ad_campaigns.
 *   Phân hệ sở hữu đối tượng tự viết @EventListener để điều chỉnh quyền (UC056):
 *     + SV3 (Reader): ARTICLE -> thu hồi quyền đọc bài; SUBSCRIPTION -> hủy / rút ngắn gói.
 *     + SV1 (Advertising): AD -> tạm dừng chiến dịch.
 * - Quy định nghiệp vụ (Leader chốt 21/10/2026): HOÀN TOÀN BỘ thì thu hồi quyền; HOÀN MỘT PHẦN
 *   (bù thiệt hại, giảm giá) thì khách GIỮ quyền. Listener chỉ thu hồi khi shouldRevokeRights() = true.
 * - Sự kiện phát đồng bộ trong cùng transaction DB với bút toán hoàn: listener ném lỗi thì
 *   toàn bộ lần duyệt hoàn bị rollback, không có chuyện đã hoàn tiền mà quyền chưa xử lý.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundCompletedEvent {

    /** Mã yêu cầu hoàn tiền (refund_requests.refund_id). */
    private Long refundId;

    /** Giao dịch thanh toán gốc bị hoàn (transactions.transaction_id). */
    private Long originalTransactionId;

    /** Bút toán REFUND vừa tạo (transactions.transaction_id). */
    private Long refundTransactionId;

    /** Người được hoàn tiền (chủ đơn gốc). */
    private Long userId;

    /** Loại đơn gốc: ARTICLE, SUBSCRIPTION hoặc AD. */
    private String transactionType;

    /**
     * ID đối tượng nghiệp vụ của đơn gốc (giống PaymentSuccessEvent.targetId):
     * ARTICLE -> purchase_id, SUBSCRIPTION -> subscription_id, AD -> campaign_id.
     */
    private Long targetId;

    /** Số tiền hoàn lần này (VND). */
    private BigDecimal refundAmount;

    /** Tổng đã hoàn của đơn gốc tính cả lần này. */
    private BigDecimal totalRefunded;

    /** Số tiền khách đã trả cho đơn gốc. */
    private BigDecimal originalAmount;

    /** true khi tổng đã hoàn >= số tiền đã trả (đơn gốc chuyển REFUNDED). */
    private boolean fullRefund;

    /** Phương thức của đơn gốc: WALLET (đã hoàn vào ví) hoặc SEPAY (chuyển trả ngoài hệ thống). */
    private String paymentMethod;

    /** Lý do hoàn do kế toán nhập. */
    private String reason;

    /** Thời điểm Kế toán trưởng duyệt. */
    private LocalDateTime refundedAt;

    /**
     * Có thu hồi quyền hay không: chỉ khi đã hoàn toàn bộ. Hoàn một phần khách vẫn giữ quyền.
     */
    public boolean shouldRevokeRights() {
        return fullRefund;
    }
}
