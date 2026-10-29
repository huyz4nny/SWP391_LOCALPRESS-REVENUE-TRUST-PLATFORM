package com.localpress.reader.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

// gói ACTIVE còn hạn của độc giả đang đăng nhập, phục vụ UC044
// inEffect = true khi hôm nay nằm trong start_date và end_date, cả hai đầu đều tính
public record ReaderSubscriptionResponse(
        Long subscriptionId,
        Long planId,
        String planName,
        BigDecimal price,
        String accessScope,
        Long categoryId,
        String categoryName,
        LocalDate startDate,
        LocalDate endDate,
        boolean autoRenew,
        boolean hasAdFree,
        boolean hasAudio,
        boolean inEffect
) {
}
