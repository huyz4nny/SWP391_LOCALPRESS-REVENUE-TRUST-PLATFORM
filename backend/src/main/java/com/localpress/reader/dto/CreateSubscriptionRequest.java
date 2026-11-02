package com.localpress.reader.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// dto nhận yêu cầu đăng ký một gói cước cho UC035 ở màn hình II.3.3
// client chỉ gửi mã gói còn giá và thời hạn do server tự lấy từ bảng subscription_plans
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSubscriptionRequest {

    // mã gói cước muốn đăng ký và phải là số dương
    @NotNull(message = "Thiếu mã gói cước")
    @Positive(message = "Mã gói cước không hợp lệ")
    private Long planId;
}
