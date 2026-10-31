// package controller của identity nhận request đăng ký từ frontend
package com.localpress.identity.controller;

import com.localpress.identity.dto.RegisterReaderRequest;
import com.localpress.identity.dto.RegisterReaderResponse;
import com.localpress.identity.service.ReaderRegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

// controller tiếp nhận yêu cầu đăng ký độc giả phục vụ UC033 ở màn hình II.3.3 route /register
// endpoint là POST /api/v1/auth/register và đã mở permitAll trong SecurityConfig
// luồng đi là frontend RegisterPage gửi form vào đây -> ReaderRegistrationService xử lý -> trả thông tin tài khoản mới
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class ReaderRegistrationController {
    private final ReaderRegistrationService registrationService;

    // block nhận dữ liệu đăng ký
    // @Valid kiểm tra form theo các ràng buộc trong RegisterReaderRequest nếu sai thì dừng luôn ở đây và trả lỗi 400
    // đăng ký thành công thì trả http 201 created
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public RegisterReaderResponse register(@Valid @RequestBody RegisterReaderRequest request) {
        return registrationService.register(request);
    }
}
