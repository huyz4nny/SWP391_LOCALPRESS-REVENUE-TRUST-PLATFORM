package com.localpress.shared.device;

import java.time.Instant;

/**
 * Hợp đồng phiên thiết bị. Login email và Google gọi register sau khi xác thực thành công.
 * Filter JWT gọi isActive với claim sid. Không ghi user_devices ở từng kiểu đăng nhập.
 */
public interface DeviceSessionService {

    /**
     * @param expiresAt hạn của JWT. Phiên mới không được để trống hạn.
     * @param deviceName trống thì lưu "Trình duyệt"
     * @param deviceType DESKTOP, MOBILE hoặc TABLET. Trống thì DESKTOP
     */
    RegisteredSession register(long userId, String deviceName, String deviceType, String ipAddress, Instant expiresAt);

    /** Phiên còn hiệu lực khi chưa thu hồi và chưa quá expiresAt. Mã trống thì false. */
    boolean isActive(String sessionId);
}
