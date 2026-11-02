package com.localpress.shared.device;

/**
 * Đã có 2 phiên còn hiệu lực. Login map lỗi này thành HTTP 409, mã DEVICE_LIMIT_REACHED.
 * Không xóa phiên nào. Độc giả tự thu hồi một phiên rồi đăng nhập lại.
 */
public class DeviceLimitReachedException extends RuntimeException {

    public static final String CODE = "DEVICE_LIMIT_REACHED";

    public DeviceLimitReachedException() {
        super("Tài khoản đã đủ 2 phiên đăng nhập. Hãy thu hồi một phiên rồi đăng nhập lại.");
    }

    public String getCode() {
        return CODE;
    }
}
