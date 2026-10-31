package com.localpress.identity.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

// chuẩn hóa số Việt Nam về dạng 0... để cột unique so sánh cùng một cách
public final class VnPhone {

    private VnPhone() {
    }

    // trống thì trả null, có nhập mà sai định dạng thì 400
    public static String normalizeOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String compact = raw.trim().replaceAll("[\\s.\\-]", "");
        if (compact.startsWith("+84")) {
            compact = "0" + compact.substring(3);
        } else if (compact.startsWith("84") && compact.length() > 9) {
            compact = "0" + compact.substring(2);
        }
        boolean mobile = compact.matches("^0(3|5|7|8|9)\\d{8}$");
        boolean landline = compact.matches("^02\\d{8,9}$");
        if (!mobile && !landline) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại không đúng định dạng Việt Nam");
        }
        return compact;
    }
}
