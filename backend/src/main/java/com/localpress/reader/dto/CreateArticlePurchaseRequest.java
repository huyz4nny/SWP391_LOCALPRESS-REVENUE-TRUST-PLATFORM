package com.localpress.reader.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// dto nhận yêu cầu mua lẻ một bài premium cho UC034 ở màn hình II.3.3
// client chỉ gửi mã bài còn giá tiền do server tự lấy từ database nên không ai sửa được giá
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateArticlePurchaseRequest {

    // mã bài muốn mua lẻ và phải là số dương
    @NotNull(message = "Thiếu mã bài viết")
    @Positive(message = "Mã bài viết không hợp lệ")
    private Long articleId;
}
