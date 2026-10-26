// package service của identity chứa logic đăng ký tài khoản
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

// service đăng ký tài khoản độc giả phục vụ UC033 ở màn hình II.3.3
// luồng đi là ReaderRegistrationController gọi vào đây -> kiểm tra dữ liệu -> băm mật khẩu -> lưu bảng users qua UserRepository -> trả RegisterReaderResponse
@Service
@Validated
@RequiredArgsConstructor
public class ReaderRegistrationService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // block đăng ký độc giả mới
    // có @Transactional để nếu lỗi giữa chừng thì không lưu dở dang
    @Transactional
    public RegisterReaderResponse register(
            @NotNull @Valid RegisterReaderRequest request
    ){
        // chuẩn hóa dữ liệu đầu vào họ tên cắt khoảng trắng email đổi chữ thường số điện thoại null nếu để trống
        String fullName = request.fullName().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String phone = normalizedPhone(request.phone());

        // bcrypt chỉ nhận tối đa 72 byte nên nếu mật khẩu dài hơn thì chặn và trả lỗi 400
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Mật khẩu không được vượt quá 72 byte UTF-8"
            );
        }

        // email đã có người dùng thì trả lỗi 409
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email đã được sử dụng"
            );
        }

        // số điện thoại chỉ kiểm tra khi có nhập và đã có người dùng thì trả lỗi 409
        if (phone != null && userRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Số điện thoại đã được sử dụng"
            );
        }

        // băm mật khẩu bằng bcrypt rồi tạo user với role READER trạng thái ACTIVE
        String passwordHash = passwordEncoder.encode(request.password());
        User user = User.createReader(fullName, email, passwordHash, phone);

        try{
            // lưu và ghi xuống database ngay để nếu trùng khóa unique thì lỗi nổ ra tại đây
            userRepository.saveAndFlush(user);
        } catch(DataIntegrityViolationException exception){
            Throwable cause = exception.getMostSpecificCause();
            // mã lỗi mysql 1062 là trùng khóa unique xảy ra khi hai người đăng ký cùng lúc vượt qua bước kiểm tra phía trên
            if(cause instanceof SQLException sqlException && sqlException.getErrorCode() == 1062){
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email hoặc số điện thoại đã được sử dụng");
            }
            // lỗi khác thì ném lại nguyên vẹn
            throw exception;
        }
        // đăng ký xong trả về thông tin cơ bản cho controller và controller trả mã 201
        return new RegisterReaderResponse(
                user.getId().toString(),
                user.getEmail(),
                user.getRole().name(),
                user.getStatus().name()
        );
    }

    // hàm phụ chuẩn hóa số điện thoại trả null nếu không nhập còn có thì cắt khoảng trắng
    private String normalizedPhone(String phone) {
        if(phone == null || phone.isBlank()){
            return null;
        }
        return phone.trim();
    }
}
