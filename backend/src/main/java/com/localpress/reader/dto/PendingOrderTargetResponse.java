package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// dto sau khi SV3 tạo quyền PENDING và tạo/tái dùng đơn thanh toán trên server
// frontend chỉ navigate /payment/:orderCode, không gọi POST /finance/checkout (403 trên main)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingOrderTargetResponse {

    // ARTICLE hoặc SUBSCRIPTION và khớp với orderType mà module tài chính nhận
    private String orderType;

    // id bản ghi thật vừa tạo hoặc dùng lại ở trạng thái chờ
    private Long targetId;

    // số tiền phải trả do server tính từ database
    private BigDecimal amount;

    // tên bài hoặc tên gói để trang thanh toán hiển thị mô tả đơn
    private String title;

    // mã đơn SV4, frontend mở /payment/:orderCode
    private String orderCode;
}
