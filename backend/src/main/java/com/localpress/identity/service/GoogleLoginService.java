package com.localpress.identity.service;

import com.localpress.identity.dto.LoginResponse;
import com.localpress.identity.entity.User;
import com.localpress.identity.entity.UserIdentity;
import com.localpress.identity.repository.UserIdentityRepository;
import com.localpress.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.security.SecureRandom;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class GoogleLoginService {
    private final GoogleTokenVerifier verifier;
    private final GoogleLoginNonceService nonces;
    private final UserIdentityRepository identities;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtTokenService tokens;

    @Transactional
    public LoginResponse login(String idToken, String cookie) {
        var google = verifier.verify(idToken);
        nonces.consume(cookie, google.nonce());
        var identity = identities.findByProviderAndProviderSubject("GOOGLE", google.subject());
        User user;
        if (identity.isPresent()) {
            user = users.findById(identity.get().getUserId()).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));
        } else {
            if (users.existsByEmail(google.email())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Email đã có tài khoản LocalPress. Hãy đăng nhập bằng phương thức đã đăng ký");
            }
            byte[] randomPassword = new byte[32];
            new SecureRandom().nextBytes(randomPassword);
            user = users.saveAndFlush(User.createGoogleReader(google.name(), google.email(),
                    passwords.encode(Base64.getEncoder().encodeToString(randomPassword)), google.picture()));
            identities.saveAndFlush(UserIdentity.google(user.getId(), google.subject(), google.email()));
        }
        if (user.getStatus() != User.Status.ACTIVE
                || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang bị khóa");
        }
        return tokens.issue(user);
    }
}
