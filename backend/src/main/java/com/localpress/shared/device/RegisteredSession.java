package com.localpress.shared.device;

/**
 * Phiên vừa ghi vào user_devices.
 * sessionId là mã ngẫu nhiên lưu ở device_token. Login đưa đúng giá trị này vào claim sid của JWT.
 */
public record RegisteredSession(long deviceId, String sessionId) {
}
