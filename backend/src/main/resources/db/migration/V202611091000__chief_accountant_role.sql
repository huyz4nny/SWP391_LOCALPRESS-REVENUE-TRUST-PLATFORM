-- SV4: tách vai trò Kế toán trưởng (mắt 2 duyệt hoàn tiền, chốt kỳ đối soát) khỏi SYSTEM_ADMIN.
-- Trước đây Kế toán trưởng mượn role SYSTEM_ADMIN, nên quản trị hệ thống cũng duyệt được tiền.
-- Chỉ thêm 1 giá trị vào ENUM users.role, không đổi bảng nào khác.
ALTER TABLE users
    MODIFY role ENUM('READER', 'AUTHOR', 'EDITOR', 'STAFF', 'ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'ADVERTISER', 'SYSTEM_ADMIN')
        NOT NULL DEFAULT 'READER';

-- Tài khoản demo Kế toán trưởng (seed) chuyển sang role mới; DB chưa nạp seed thì câu này không đổi gì.
UPDATE users SET role = 'CHIEF_ACCOUNTANT' WHERE email = 'ketoantruong@localpress.vn';
