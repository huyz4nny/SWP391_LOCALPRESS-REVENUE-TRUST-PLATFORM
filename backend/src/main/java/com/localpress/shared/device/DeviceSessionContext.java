package com.localpress.shared.device;

/**
 * Filter JWT gán attribute này sau khi đọc claim sid.
 * API danh sách thiết bị dùng giá trị đó để đánh dấu phiên hiện tại. Không có attribute thì không phiên nào được đánh dấu.
 */
public final class DeviceSessionContext {

    public static final String SESSION_ID = "com.localpress.device.sessionId";

    private DeviceSessionContext() {
    }
}
