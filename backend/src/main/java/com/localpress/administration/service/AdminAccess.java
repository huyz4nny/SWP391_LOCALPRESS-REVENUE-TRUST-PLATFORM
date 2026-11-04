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
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    public User requireAdmin(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        User user = users.findByEmail(auth.getName()).orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        if (user.getRole() != User.Role.SYSTEM_ADMIN || user.getStatus() != User.Status.ACTIVE
                || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return user;
    }
    // Caller must hold a transaction. All admin mutations acquire these locks in the same order.
    public User lockAdminMutation(Authentication auth) {
        User actor=requireAdmin(auth);
        var activeIds=jdbc.query("SELECT user_id,status,locked_until FROM users WHERE role='SYSTEM_ADMIN' ORDER BY user_id FOR UPDATE",
            (r,n)-> "ACTIVE".equals(r.getString(2)) && (r.getTimestamp(3)==null || !r.getTimestamp(3).toLocalDateTime().isAfter(LocalDateTime.now())) ? r.getLong(1) : -1L);
        if(!activeIds.contains(actor.getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Quyền quản trị đã thay đổi.");
        return actor;
    }

}
