-- SV3: lưu mã đơn SV4 trên bản ghi mua lẻ / gói. Không đọc bảng transactions (Rule 17).
ALTER TABLE article_purchases
    ADD COLUMN payment_order_code VARCHAR(255) NULL AFTER access_status;

ALTER TABLE subscriptions
    ADD COLUMN payment_order_code VARCHAR(255) NULL AFTER auto_renew;
