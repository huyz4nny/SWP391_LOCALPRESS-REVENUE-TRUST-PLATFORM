package com.localpress.finance.dto.response;

import com.localpress.finance.model.PaymentComplaint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintResponse {

    private Long complaintId;
    private Long userId;
    private String orderCode;
    private BigDecimal amount;
    private LocalDateTime transferredAt;
    private String bankReference;
    private String note;
    private String status;
    private String resolution;
    private String resolutionNote;
    /** Số tiền đã chuyển trả lại khách (toàn bộ hoặc phần thừa), null nếu không trả. */
    private BigDecimal returnedAmount;
    /** Số tiền của đơn khách khai (kế toán so với số khách chuyển), null nếu không có / không tìm thấy đơn. */
    private BigDecimal orderAmount;
    private Long resolvedBy;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;

    public static ComplaintResponse fromEntity(PaymentComplaint c) {
        return ComplaintResponse.builder()
                .complaintId(c.getComplaintId())
                .userId(c.getUserId())
                .orderCode(c.getOrderCode())
                .amount(c.getAmount())
                .transferredAt(c.getTransferredAt())
                .bankReference(c.getBankReference())
                .note(c.getNote())
                .status(c.getStatus().name())
                .resolution(c.getResolution())
                .resolutionNote(c.getResolutionNote())
                .returnedAmount(c.getReturnedAmount())
                .resolvedBy(c.getResolvedBy())
                .resolvedAt(c.getResolvedAt())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
