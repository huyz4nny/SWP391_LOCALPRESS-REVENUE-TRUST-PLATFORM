package com.localpress.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * HỢP ĐỒNG SỰ KIỆN MIỀN (SHARED DOMAIN EVENT): ĐỀ XUẤT HOÀN TIỀN BỊ TỪ CHỐI (UC055)
 * ==============================================================================
 * - Kế toán trưởng từ chối một phiếu hoàn (4 mắt) thì Finance (SV4) phát sự kiện này. Không có bút toán
 *   tiền nào được ghi, đơn gốc giữ nguyên trạng thái.
 * - Cặp với RefundCompletedEvent: module đã lập đề xuất (vd SV1 hủy chiến dịch) nghe một trong hai sự kiện
 *   để cập nhật yêu cầu của mình, không phải hỏi lại danh sách phiếu hoàn (Rule 17).
 * - Phát trong cùng transaction với lúc lưu phiếu REJECTED; listener nên dùng
 *   @TransactionalEventListener để chỉ chạy khi việc từ chối đã commit.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRejectedEvent {

    /** Mã phiếu hoàn bị từ chối (refund_requests.refund_id). */
    private Long refundId;

    /** Giao dịch thanh toán gốc (transactions.transaction_id). */
    private Long originalTransactionId;

    /** Chủ đơn gốc. */
    private Long userId;

    /** Loại đơn gốc: ARTICLE, SUBSCRIPTION hoặc AD. */
    private String transactionType;

    /** Đối tượng nghiệp vụ của đơn gốc: ARTICLE -> purchase_id, SUBSCRIPTION -> subscription_id, AD -> campaign_id. */
    private Long targetId;

    /** Số tiền đã đề xuất hoàn. */
    private BigDecimal refundAmount;

    /** Lý do từ chối do Kế toán trưởng nhập. */
    private String reviewNotes;

    /** Kế toán trưởng đã từ chối. */
    private Long reviewedBy;

    /** Thời điểm từ chối. */
    private LocalDateTime rejectedAt;
}
