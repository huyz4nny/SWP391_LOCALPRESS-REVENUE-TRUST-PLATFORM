-- Giá gói chốt lúc tạo đơn (không đọc giá plan đang bán khi tiền về).
-- Mã giao dịch đã cấp quyền để webhook lặp không báo lỗi, giao dịch khác thì báo finance.
ALTER TABLE subscriptions
    ADD COLUMN locked_price DECIMAL(12,2) NULL AFTER payment_order_code,
    ADD COLUMN granted_transaction_id BIGINT UNSIGNED NULL AFTER locked_price;

ALTER TABLE article_purchases
    ADD COLUMN granted_transaction_id BIGINT UNSIGNED NULL AFTER payment_order_code;
