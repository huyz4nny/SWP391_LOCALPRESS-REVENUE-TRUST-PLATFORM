// package repository của identity làm việc với bảng users
package com.localpress.identity.repository;

import com.localpress.identity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// repository bảng users dùng chung toàn hệ thống và SV3 dùng cho đăng ký ở UC033
// spring tự sinh câu sql từ tên hàm nên không cần viết tay
public interface UserRepository extends JpaRepository<User, Long> {
    // tìm tài khoản theo email để đăng nhập
    Optional<User> findByEmail(String email);

    // kiểm tra email đã có người dùng chưa trước khi đăng ký
    boolean existsByEmail(String email);

    // kiểm tra số điện thoại đã có người dùng chưa trước khi đăng ký
    boolean existsByPhone(String phone);
}
