package com.localpress.identity.service;

import com.localpress.identity.dto.CurrentUserResponse;
import com.localpress.identity.repository.UserProfileRepository;
import com.localpress.identity.util.VnPhone;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.SQLException;

// đọc và sửa họ tên, số điện thoại của đúng tài khoản đang đăng nhập
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserProfileRepository profiles;

    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrent(String email) {
        return profiles.findActiveByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin tài khoản"));
    }

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
        if (normalizedPhone != null && profiles.isPhoneUsedByAnother(normalizedPhone, email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }
        try {
            if (profiles.updateNameAndPhone(email, name, normalizedPhone) == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin tài khoản");
            }
        } catch (DataIntegrityViolationException exception) {
            // hai người lưu cùng một số điện thoại cùng lúc: mã lỗi MySQL 1062 là trùng khóa unique
            Throwable cause = exception.getMostSpecificCause();
            if (cause instanceof SQLException sql && sql.getErrorCode() == 1062) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
            }
            throw exception;
        }
    }
}
