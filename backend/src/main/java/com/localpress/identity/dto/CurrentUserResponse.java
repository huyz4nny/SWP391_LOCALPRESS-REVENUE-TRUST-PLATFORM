package com.localpress.identity.dto;

// thông tin tài khoản đang đăng nhập trả về cho GET/PATCH /api/v1/auth/me
// dùng cho mọi vai trò (độc giả, doanh nghiệp, tòa soạn, kế toán, admin)
// companyId và companyName chỉ có giá trị khi tài khoản là doanh nghiệp quảng cáo
public record CurrentUserResponse(
        String id,
        String name,
        String email,
        String phone,
        String role,
        String avatarUrl,
        String companyId,
        String companyName,
        boolean isActive
) {
}
