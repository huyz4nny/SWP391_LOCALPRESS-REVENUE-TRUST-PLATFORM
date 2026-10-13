package com.localpress.identity.service;

import com.localpress.identity.dto.RegisterReaderRequest;
import com.localpress.identity.dto.RegisterReaderResponse;
import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.Locale;

@Service
@Validated
@RequiredArgsConstructor
public class ReaderRegistrationService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public RegisterReaderResponse register(
            @NotNull @Valid RegisterReaderRequest request
    ){
        String fullName = request.fullName().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String phone = normalizedPhone(request.phone());

        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mật khẩu không được vượt quá 72 byte UTF-8"
            );
        }

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email đã được sử dụng"
            );
        }

        if (phone != null && userRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Số điện thoại đã được sử dụng"
            );
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User user = User.createReader(fullName, email, passwordHash, phone);

        try{
            userRepository.saveAndFlush(user);
        } catch(DataIntegrityViolationException exception){
            Throwable cause = exception.getMostSpecificCause();

            if(cause instanceof SQLException sqlException && sqlException.getErrorCode() == 1062){
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email hoặc số điện thoại đã được sử dụng");
            }
            throw exception;
        }
        return new RegisterReaderResponse(
                user.getId().toString(),
                user.getEmail(),
                user.getRole().name(),
                user.getStatus().name()
        );
    }

    private String normalizedPhone(String phone) {
        if(phone == null || phone.isBlank()){
            return null;
        }
        return phone.trim();
    }
}
