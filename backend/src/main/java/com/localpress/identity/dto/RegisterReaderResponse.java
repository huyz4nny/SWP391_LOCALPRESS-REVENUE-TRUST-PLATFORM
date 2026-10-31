// package dto của identity chứa object nhận và trả dữ liệu đăng ký
package com.localpress.identity.dto;

// record phản hồi sau khi đăng ký độc giả thành công của UC033
// luồng đi là ReaderRegistrationService tạo ra -> controller trả json với mã 201 -> frontend chuyển sang bước đăng nhập
// gồm id email vai trò (READER) và trạng thái tài khoản (ACTIVE) và tuyệt đối không trả mật khẩu
public record RegisterReaderResponse(
        String id,
        String email,
        String role,
        String status
) {
}
