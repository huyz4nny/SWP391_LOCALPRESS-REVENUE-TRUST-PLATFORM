package com.localpress.finance.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ==============================================================================
 * DTO: DUYỆT / TỪ CHỐI YÊU CẦU HOÀN TIỀN (SV4 - UC055)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewRefundRequest {

    /**
     * True: Đồng ý hoàn tiền | False: Từ chối hoàn tiền.
     */
    private boolean approved;

    /**
     * Ý kiến nhận xét / ghi chú kiểm soát của Kế toán trưởng.
     */
    private String reviewNotes;
}
