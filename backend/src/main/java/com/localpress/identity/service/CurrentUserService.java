package com.localpress.identity.service;

import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CurrentUserService {
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public User requireCurrentAuthor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if(authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập");
        }

        String email = authentication.getName();

        User user = userRepository.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));

        boolean temporarilyLocked = user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now());
        if(user.getStatus() != User.Status.ACTIVE || temporarilyLocked) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang bị khóa");
        }

        if(user.getRole() != User.Role.AUTHOR){
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền viết bài");
        }

        return user;
    }
}
