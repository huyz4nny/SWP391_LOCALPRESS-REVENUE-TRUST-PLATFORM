// package dto của identity chứa object nhận và trả dữ liệu đăng ký
package com.localpress.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// record chứa dữ liệu form đăng ký độc giả của UC033
// luồng đi là frontend gửi json -> ReaderRegistrationController nhận và @Valid kiểm tra các ràng buộc bên dưới -> truyền xuống service
// nếu vi phạm ràng buộc nào thì trả lỗi 400 kèm câu thông báo tiếng việt tương ứng
public record RegisterReaderRequest(
        // họ tên bắt buộc và tối đa 150 ký tự
        @NotBlank(message = "Vui lòng nhập họ tên")
        @Size(max = 150, message = "Họ tên tối đa 150 ký tự")
        String fullName,

        // email bắt buộc đúng định dạng và tối đa 255 ký tự
        @NotBlank(message = "Vui lòng nhập email")
        @Email(message = "Email không hợp lệ")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        // mật khẩu bắt buộc và tối thiểu 6 ký tự còn giới hạn trên 72 byte thì service kiểm tra
        @NotBlank(message = "Vui lòng nhập mật khẩu")
        @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
        String password,

        // số điện thoại không bắt buộc và tối đa 20 ký tự
        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
        String phone
) {
}
