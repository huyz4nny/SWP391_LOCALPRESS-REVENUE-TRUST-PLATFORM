-- UC043: phân biệt phiên còn hiệu lực, hết hạn và đã thu hồi. Thu hồi mềm, không xóa dòng.
-- UC040: một độc giả chỉ nhận một thông báo bài mới cho một bài, kể cả khi sự kiện bị xử lý hai lần.
ALTER TABLE user_devices
    ADD COLUMN expires_at DATETIME NULL AFTER last_active_at,
    ADD COLUMN revoked_at DATETIME NULL AFTER expires_at,
    ADD INDEX idx_user_devices_active (user_id, revoked_at, expires_at);

ALTER TABLE notifications
    ADD COLUMN dedup_key VARCHAR(120) NULL AFTER content,
    ADD CONSTRAINT uk_notifications_dedup UNIQUE (dedup_key);
