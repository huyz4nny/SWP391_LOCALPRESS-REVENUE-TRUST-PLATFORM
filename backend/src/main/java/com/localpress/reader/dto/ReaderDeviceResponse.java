package com.localpress.reader.dto;

import java.time.LocalDateTime;

// phiên còn hiệu lực của độc giả đang đăng nhập. Không trả device_token.
public record ReaderDeviceResponse(
        Long deviceId,
        String deviceName,
        String deviceType,
        String ipAddress,
        LocalDateTime lastActiveAt,
        LocalDateTime createdAt,
        boolean current
) {
}
