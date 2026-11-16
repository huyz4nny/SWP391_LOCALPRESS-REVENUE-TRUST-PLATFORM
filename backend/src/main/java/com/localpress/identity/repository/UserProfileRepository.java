package com.localpress.identity.repository;

import com.localpress.identity.dto.CurrentUserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

// đọc và sửa hồ sơ của tài khoản đang đăng nhập (UC033: cập nhật thông tin cá nhân)
// dùng JdbcTemplate vì /auth/me cần ghép thêm bảng advertisers, entity User không có quan hệ này
@Repository
@RequiredArgsConstructor
public class UserProfileRepository {

    private final JdbcTemplate jdbc;

    // hồ sơ của tài khoản đang hoạt động, kèm công ty nếu là doanh nghiệp quảng cáo
    public Optional<CurrentUserResponse> findActiveByEmail(String email) {
        return jdbc.query(
                "SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.status, u.avatar_url, " +
                "a.advertiser_id, a.company_name " +
                "FROM users u " +
                "LEFT JOIN advertisers a ON a.user_id = u.user_id " +
                "WHERE u.email = ? AND u.status = 'ACTIVE'",
                (rs, row) -> new CurrentUserResponse(
                        String.valueOf(rs.getLong("user_id")),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getString("phone"),
                        rs.getString("role"),
                        rs.getString("avatar_url"),
                        rs.getString("advertiser_id"),
                        rs.getString("company_name"),
                        true
                ),
                email
        ).stream().findFirst();
    }

    // số điện thoại đã thuộc về tài khoản khác chưa
    public boolean isPhoneUsedByAnother(String phone, String email) {
        Integer taken = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE phone = ? AND email <> ?",
                Integer.class,
                phone,
                email);
        return taken != null && taken > 0;
    }

    // trả về số dòng đã sửa, 0 nghĩa là không có tài khoản đang hoạt động với email này
    public int updateNameAndPhone(String email, String fullName, String phone) {
        return jdbc.update(
                "UPDATE users SET full_name = ?, phone = ? WHERE email = ? AND status = 'ACTIVE'",
                fullName,
                phone,
                email);
    }
}
