package com.localpress.finance.dto.request;

import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

/**
 * ==============================================================================
 * DTO REQUEST: BỘ LỌC TÌM KIẾM SỔ QUỸ TÀI CHÍNH (UC047)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerFilterRequest {

    /**
     * Lọc theo trạng thái giao dịch: PENDING, SUCCESS, FAILED, REFUNDED.
     */
    private TransactionStatus status;

    /**
     * Lọc theo loại hình dòng tiền: SUBSCRIPTION, ARTICLE, AD, REFUND.
     */
    private TransactionType transactionType;

    /**
     * Lọc theo phương thức thanh toán: MANUAL_BANK_TRANSFER, VIETQR, MOMO, etc.
     */
    private String paymentMethod;

    /**
     * Ngày bắt đầu khoảng thời gian tạo giao dịch (ISO-8601).
     */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime fromDate;

    /**
     * Ngày kết thúc khoảng thời gian tạo giao dịch (ISO-8601).
     */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime toDate;

    /**
     * Từ khóa tìm kiếm: Mã giao dịch, mã tham chiếu ngân hàng, ID người dùng.
     */
    private String keyword;

    /**
     * Số trang hiện tại (0-indexed, mặc định 0).
     */
    @Builder.Default
    private int page = 0;

    /**
     * Số lượng bản ghi trên một trang (mặc định 20).
     */
    @Builder.Default
    private int size = 20;
}
