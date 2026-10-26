package com.localpress.reader.service;

import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

// helper lấy độc giả đang đăng nhập cho các api cần biết người dùng của SV3
// không dùng CurrentUserService của identity vì class đó chỉ cho tác giả và biên tập viên
// luồng đi là đọc email từ Spring Security -> tra bảng users -> kiểm tra tài khoản còn hoạt động -> trả về user
@Component
@RequiredArgsConstructor
public class ReaderCurrentUser {

    private final UserRepository userRepository;

    // block bắt buộc phải có người đăng nhập hợp lệ và trả về id người dùng
    public Long requireUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        // chưa đăng nhập hoặc chỉ là khách ẩn danh thì trả 401
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập");
        }

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));

        // tài khoản bị khóa vĩnh viễn hoặc đang bị khóa tạm thì không cho mua
        boolean temporarilyLocked = user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now());
        if (user.getStatus() != User.Status.ACTIVE || temporarilyLocked) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang bị khóa");
        }
        return user.getId();
    }
}
