package com.localpress.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ==============================================================================
 * HỢP ĐỒNG SỰ KIỆN MIỀN (SHARED DOMAIN EVENT): TIỀN ĐÃ VỀ NHƯNG KHÔNG CẤP ĐƯỢC QUYỀN (Rule 5)
 * ==============================================================================
 * - Module nguồn (SV3 Reader, SV1 Advertising) publish sự kiện này trong listener PaymentSuccessEvent
 *   khi không cấp được quyền: bản ghi không thuộc người trả, sai trạng thái, số tiền thấp hơn giá...
 *   Bản ghi đích giữ nguyên PENDING; module nguồn KHÔNG tự hoàn tiền.
 * - Finance (SV4) nghe sau khi giao dịch tiền commit, ghi nhận một lần cho mỗi giao dịch và
 *   đưa vào cảnh báo tài chính để kế toán xử lý (lập đề xuất hoàn hoặc cấp quyền tay).
 *   Tiền vẫn ghi nhận bình thường: sự kiện này không làm rollback giao dịch.
 * - Publish đồng bộ được (không cần transaction riêng); listener của finance không ném lỗi ra ngoài.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RightsGrantFailedEvent {

    /** Giao dịch đã thu tiền (giống PaymentSuccessEvent.transactionId). */
    private Long transactionId;

    /** Loại đơn: ARTICLE, SUBSCRIPTION hoặc AD. */
    private String transactionType;

    /** ID bản ghi đích của module nguồn (purchase_id, subscription_id, campaign_id). */
    private Long targetId;

    /** Người đã trả tiền. */
    private Long userId;

    /** Số tiền đã thu (VND). */
    private BigDecimal amount;

    /** Module báo lỗi, vd "SV3" hoặc "SV1". */
    private String sourceModule;

    /** Lý do không cấp được quyền, hiển thị cho kế toán. */
    private String reason;

    /** Thời điểm phát hiện lỗi. */
    private LocalDateTime failedAt;
}
