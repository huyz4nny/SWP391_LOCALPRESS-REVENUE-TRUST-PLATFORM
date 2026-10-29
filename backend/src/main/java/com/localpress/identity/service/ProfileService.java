package com.localpress.identity.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.SQLException;

// sửa họ tên và số điện thoại của đúng tài khoản đang đăng nhập
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final JdbcTemplate jdbc;

    @Transactional
    public void update(String email, String fullName, String phone) {
        String name = fullName == null ? "" : fullName.trim();
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập họ tên");
        }
        if (name.length() > 150) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ tên tối đa 150 ký tự");
        }
        String normalizedPhone = VnPhone.normalizeOrNull(phone);
        if (normalizedPhone != null) {
            Integer taken = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE phone = ? AND email <> ?",
                    Integer.class,
                    normalizedPhone,
                    email);
            if (taken != null && taken > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
            }
        }
        try {
            int updated = jdbc.update(
                    "UPDATE users SET full_name = ?, phone = ? WHERE email = ? AND status = 'ACTIVE'",
                    name,
                    normalizedPhone,
                    email);
            if (updated == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin tài khoản");
            }
        } catch (DataIntegrityViolationException exception) {
            Throwable cause = exception.getMostSpecificCause();
            if (cause instanceof SQLException sql && sql.getErrorCode() == 1062) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
            }
            throw exception;
        }
    }
}
