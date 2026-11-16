-- Bỏ role STAFF (16/11/2026): tài chính đã có ACCOUNTANT / CHIEF_ACCOUNTANT, tòa soạn (kiểm duyệt) đã có EDITOR.
-- STAFF còn sót từ khi chưa tách role, đang cho người kiểm duyệt vào được phân hệ tài chính (thừa quyền).
-- Đổi tài khoản STAFF còn lại sang EDITOR TRƯỚC khi bỏ giá trị khỏi ENUM, nếu không MODIFY sẽ lỗi.
UPDATE users SET role = 'EDITOR' WHERE role = 'STAFF';

ALTER TABLE users
    MODIFY role ENUM('READER', 'AUTHOR', 'EDITOR', 'ACCOUNTANT', 'CHIEF_ACCOUNTANT', 'ADVERTISER', 'SYSTEM_ADMIN')
        NOT NULL DEFAULT 'READER';
