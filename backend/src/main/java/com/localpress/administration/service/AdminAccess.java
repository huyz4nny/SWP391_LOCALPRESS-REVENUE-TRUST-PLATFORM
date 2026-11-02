package com.localpress.administration.service;

import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminAccess {
    private final UserRepository users;
    public User requireAdmin(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        User user = users.findByEmail(auth.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        if (user.getRole() != User.Role.SYSTEM_ADMIN || user.getStatus() != User.Status.ACTIVE
                || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return user;
    }
}
