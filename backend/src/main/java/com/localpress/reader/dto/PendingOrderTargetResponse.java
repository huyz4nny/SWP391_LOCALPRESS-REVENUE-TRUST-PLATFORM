package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// dto trả về sau khi SV3 đã tạo bản ghi chờ thanh toán (PENDING) cho bài lẻ hoặc gói cước
// frontend lấy targetId và amount ở đây để gọi tiếp POST /api/v1/finance/orders của SV4
// targetId là purchase_id khi orderType là ARTICLE và là subscription_id khi orderType là SUBSCRIPTION
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
}
