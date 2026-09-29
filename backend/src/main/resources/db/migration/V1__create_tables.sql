CREATE DATABASE IF NOT EXISTS localpress_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE localpress_db;

-- =============================================================
-- 1. USERS & ROLES (Người dùng & Phân quyền)
-- =============================================================

-- Bảng users: Trung tâm xác thực của mọi đối tượng trong hệ thống.
-- Lưu ý: Backend khi lưu phone nếu người dùng không nhập thì phải để NULL (không để chuỗi rỗng '')
-- để không bị lỗi trùng Unique Key uk_users_phone.
CREATE TABLE IF NOT EXISTS users
(
    user_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255)              NOT NULL,
    password_hash VARCHAR(255)              NOT NULL,
    full_name     VARCHAR(150)              NOT NULL,
    phone         VARCHAR(20)               NULL,
    role          ENUM ('READER', 'AUTHOR', 'EDITOR', 'STAFF', 'ADVERTISER', 'SYSTEM_ADMIN')
                                            NOT NULL DEFAULT 'READER',
    status        ENUM ('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at    DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT uk_users_phone UNIQUE (phone),

    -- Index phục vụ trang quản trị lọc danh sách user theo vai trò/trạng thái
    INDEX idx_users_role_status (role, status)
) ENGINE = InnoDB;

-- =============================================================
-- 2. CATEGORIES, TAGS & ARTICLES (Nội dung & Quy trình biên tập)
-- =============================================================

-- Bảng categories: Danh mục bài viết phân cấp cha - con (Adjacency List Model)
CREATE TABLE IF NOT EXISTS categories
(
    category_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id   BIGINT UNSIGNED             NULL, -- Trỏ về chuyên mục cha (vd: Thể thao -> Bóng đá)
    name        VARCHAR(150)                NOT NULL,
    slug        VARCHAR(180)                NOT NULL,
    status      ENUM ('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT uk_categories_slug UNIQUE (slug),
    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES categories (category_id)
            ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;

-- Bảng tags: Thẻ bài viết phân loại theo chiều ngang (chủ đề nóng, sự kiện)
CREATE TABLE IF NOT EXISTS tags
(
    tag_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name   VARCHAR(100) NOT NULL,
    slug   VARCHAR(120) NOT NULL,

    CONSTRAINT uk_tags_name UNIQUE (name),
    CONSTRAINT uk_tags_slug UNIQUE (slug)
) ENGINE = InnoDB;

-- Bảng articles: Thực thể gốc của bài viết (lưu metadata, URL và phiên bản đang live)
CREATE TABLE IF NOT EXISTS articles
(
    article_id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id       BIGINT UNSIGNED          NOT NULL,
    author_id         BIGINT UNSIGNED          NOT NULL,
    slug              VARCHAR(280)             NOT NULL,           -- Đường dẫn tĩnh (SEO friendly URL)
    access_type       ENUM ('FREE', 'PREMIUM') NOT NULL DEFAULT 'FREE',
    single_price      DECIMAL(12, 2)           NULL,               -- Giá mua lẻ cho bài viết PREMIUM
    status            ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'TAKEN_DOWN')
                                               NOT NULL DEFAULT 'DRAFT',
    published_version INT UNSIGNED             NULL,               -- Số phiên bản đang hiển thị ra ngoài cho độc giả
    latest_version    INT UNSIGNED             NOT NULL DEFAULT 0, -- Số phiên bản cao nhất hiện có
    view_count        BIGINT UNSIGNED          NOT NULL DEFAULT 0,
    published_at      DATETIME                 NULL,
    created_at        DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uk_articles_slug UNIQUE (slug),
    CONSTRAINT fk_articles_category
        FOREIGN KEY (category_id) REFERENCES categories (category_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_articles_author
        FOREIGN KEY (author_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,

    -- Ràng buộc: Bài FREE thì giá phải là 0 hoặc NULL; bài PREMIUM thì giá phải >= 0
    CONSTRAINT chk_articles_price CHECK (
        (access_type = 'FREE' AND (single_price IS NULL OR single_price = 0))
            OR
        (access_type = 'PREMIUM' AND single_price IS NOT NULL AND single_price >= 0)
        ),

    -- Ràng buộc: published_version không được vượt quá latest_version; nếu đã PUBLISHED thì bắt buộc phải có published_version
    CONSTRAINT chk_articles_published_version CHECK (
        (published_version IS NULL OR
         (published_version > 0 AND published_version <= latest_version))
            AND (status <> 'PUBLISHED' OR published_version IS NOT NULL)
        ),

    INDEX idx_articles_category_status (category_id, status),
    INDEX idx_articles_author (author_id),
    INDEX idx_articles_views (view_count DESC),
    INDEX idx_articles_published_at (published_at)
) ENGINE = InnoDB;

-- Bảng trung gian Nhiều - Nhiều giữa Bài viết và Tags
CREATE TABLE IF NOT EXISTS article_tags
(
    article_id BIGINT UNSIGNED NOT NULL,
    tag_id     BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (article_id, tag_id),
    CONSTRAINT fk_article_tags_article
        FOREIGN KEY (article_id) REFERENCES articles (article_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_article_tags_tag
        FOREIGN KEY (tag_id) REFERENCES tags (tag_id)
            ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

-- Bảng article_versions: Quản lý lịch sử chỉnh sửa và quy trình xét duyệt bài viết của Tòa soạn
CREATE TABLE IF NOT EXISTS article_versions
(
    version_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id      BIGINT UNSIGNED NOT NULL,
    edited_by       BIGINT UNSIGNED NOT NULL,
    reviewed_by     BIGINT UNSIGNED NULL,
    version_number  INT UNSIGNED    NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    summary         TEXT            NULL,
    content         LONGTEXT        NOT NULL,
    cover_image_url VARCHAR(1000)   NULL,
    metadata_json   JSON            NULL,
    review_status   ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')
                                    NOT NULL DEFAULT 'DRAFT',
    review_feedback TEXT            NULL,
    submitted_at    DATETIME        NULL,
    reviewed_at     DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_article_versions_number
        UNIQUE (article_id, version_number),
    CONSTRAINT chk_article_versions_number CHECK (version_number > 0),
    CONSTRAINT fk_article_versions_article
        FOREIGN KEY (article_id) REFERENCES articles (article_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_article_versions_editor
        FOREIGN KEY (edited_by) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_article_versions_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE SET NULL,

    INDEX idx_article_versions_review (review_status, submitted_at),

    -- [ĐÃ FIX]: Sử dụng WITH PARSER ngram để hỗ trợ Fulltext Search tiếng Việt chính xác
    FULLTEXT INDEX ft_article_versions_search (title, summary, content) WITH PARSER ngram
) ENGINE = InnoDB;

-- [ĐÃ BỔ SUNG]: Ràng buộc khóa ngoại đảm bảo phiên bản xuất bản (published_version) phải có thật trong article_versions
ALTER TABLE articles
    ADD CONSTRAINT fk_articles_published_version
        FOREIGN KEY (article_id, published_version)
            REFERENCES article_versions (article_id, version_number);

-- Bảng comments: Bình luận và trao đổi dưới bài viết (hỗ trợ phân cấp cha-con)
CREATE TABLE IF NOT EXISTS comments
(
    comment_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id   BIGINT UNSIGNED NOT NULL,
    user_id      BIGINT UNSIGNED NOT NULL,
    parent_id    BIGINT UNSIGNED NULL, -- Trỏ về bình luận cha để tạo luồng trả lời (Reply)
    moderated_by BIGINT UNSIGNED NULL,
    content      TEXT            NOT NULL,
    status       ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN')
                                 NOT NULL DEFAULT 'PENDING',
    created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comments_article
        FOREIGN KEY (article_id) REFERENCES articles (article_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_id) REFERENCES comments (comment_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_comments_moderator
        FOREIGN KEY (moderated_by) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE SET NULL,

    INDEX idx_comments_article_status (article_id, status),
    INDEX idx_comments_parent (parent_id),
    INDEX idx_comments_user (user_id)  -- [ĐÃ BỔ SUNG] Tra cứu lịch sử bình luận của user
) ENGINE = InnoDB;

-- Bảng saved_articles: Bài viết đã lưu (Bookmark) của độc giả
CREATE TABLE IF NOT EXISTS saved_articles
(
    user_id    BIGINT UNSIGNED NOT NULL,
    article_id BIGINT UNSIGNED NOT NULL,
    saved_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, article_id),
    CONSTRAINT fk_saved_articles_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_saved_articles_article
        FOREIGN KEY (article_id) REFERENCES articles (article_id)
            ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

-- Bảng category_follows: Theo dõi chuyên mục để nhận thông báo / cá nhân hóa tin tức
CREATE TABLE IF NOT EXISTS category_follows
(
    user_id     BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    followed_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, category_id),
    CONSTRAINT fk_category_follows_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_category_follows_category
        FOREIGN KEY (category_id) REFERENCES categories (category_id)
            ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

-- =============================================================
-- 3. SUBSCRIPTIONS & ARTICLE PURCHASES (Doanh thu độc giả)
-- =============================================================

-- Bảng subscription_plans: Danh mục các gói cước đọc báo định kỳ
CREATE TABLE IF NOT EXISTS subscription_plans
(
    plan_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120)                NOT NULL,
    price         DECIMAL(12, 2)              NOT NULL,
    duration_days INT UNSIGNED                NOT NULL,
    status        ENUM ('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT uk_subscription_plans_name UNIQUE (name),
    CONSTRAINT chk_subscription_plans_price CHECK (price >= 0),
    CONSTRAINT chk_subscription_plans_duration CHECK (duration_days > 0)
) ENGINE = InnoDB;

-- Bảng subscriptions: Quyền truy cập thuê bao của độc giả theo thời hạn
CREATE TABLE IF NOT EXISTS subscriptions
(
    subscription_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL,
    plan_id         BIGINT UNSIGNED NOT NULL,
    start_date      DATE            NOT NULL,
    end_date        DATE            NOT NULL,
    status          ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED')
                                    NOT NULL DEFAULT 'PENDING',
    auto_renew      BOOLEAN         NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_subscriptions_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_subscriptions_plan
        FOREIGN KEY (plan_id) REFERENCES subscription_plans (plan_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_subscriptions_dates CHECK (end_date >= start_date),

    INDEX idx_subscriptions_user_status (user_id, status, end_date)
) ENGINE = InnoDB;

-- Bảng article_purchases: Mua lẻ quyền đọc bài viết cụ thể
-- Lưu ý: uk_article_purchases_user_article đảm bảo mỗi user có 1 bản ghi quyền sở hữu với 1 bài viết.
-- Nếu bị REVOKED (hoàn tiền) mà sau này muốn mua lại, Backend thực hiện UPSERT:
-- ON DUPLICATE KEY UPDATE access_status = 'PENDING', purchase_price = VALUES(purchase_price), purchased_at = NOW();
CREATE TABLE IF NOT EXISTS article_purchases
(
    purchase_id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT UNSIGNED                       NOT NULL,
    article_id     BIGINT UNSIGNED                       NOT NULL,
    purchase_price DECIMAL(12, 2)                        NOT NULL, -- Snapshot giá tại thời điểm giao dịch
    access_status  ENUM ('PENDING', 'ACTIVE', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    purchased_at   DATETIME                              NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_article_purchases_user_article UNIQUE (user_id, article_id),
    CONSTRAINT chk_article_purchases_price CHECK (purchase_price >= 0),
    CONSTRAINT fk_article_purchases_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_article_purchases_article
        FOREIGN KEY (article_id) REFERENCES articles (article_id)
            ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

-- =============================================================
-- 4. ADVERTISING MANAGEMENT (Phân hệ Quảng cáo)
-- =============================================================

-- Bảng advertisers: Hồ sơ pháp nhân doanh nghiệp đặt quảng cáo
CREATE TABLE IF NOT EXISTS advertisers
(
    advertiser_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT UNSIGNED NOT NULL,
    company_name        VARCHAR(255)    NOT NULL,
    tax_code            VARCHAR(50)     NOT NULL,
    contact_person      VARCHAR(150)    NOT NULL,
    email               VARCHAR(255)    NOT NULL,
    phone               VARCHAR(20)     NOT NULL,
    address             VARCHAR(500)    NULL,
    verification_status ENUM ('PENDING', 'VERIFIED', 'REJECTED')
                                        NOT NULL DEFAULT 'PENDING',

    CONSTRAINT uk_advertisers_user UNIQUE (user_id),
    CONSTRAINT uk_advertisers_tax_code UNIQUE (tax_code),
    CONSTRAINT fk_advertisers_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

-- Bảng ad_slots: Kho vị trí hiển thị banner trên giao diện báo
CREATE TABLE IF NOT EXISTS ad_slots
(
    slot_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150)                                NOT NULL,
    page_location VARCHAR(150)                                NOT NULL,
    device_type   ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'ALL') NOT NULL DEFAULT 'ALL',
    dimensions    VARCHAR(50)                                 NOT NULL,
    capacity      INT UNSIGNED                                NOT NULL DEFAULT 1,
    base_price    DECIMAL(12, 2)                              NOT NULL,
    pricing_type  ENUM ('CPD', 'CPM', 'CPC', 'FLAT_FEE')      NOT NULL,
    status        ENUM ('ACTIVE', 'INACTIVE')                 NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT uk_ad_slots_location_device UNIQUE (page_location, device_type, dimensions),
    CONSTRAINT chk_ad_slots_capacity CHECK (capacity > 0),
    CONSTRAINT chk_ad_slots_price CHECK (base_price >= 0)
) ENGINE = InnoDB;

-- Bảng ad_campaigns: Hợp đồng chiến dịch quảng cáo
CREATE TABLE IF NOT EXISTS ad_campaigns
(
    campaign_id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    advertiser_id      BIGINT UNSIGNED                                NOT NULL,
    slot_id            BIGINT UNSIGNED                                NOT NULL,
    reviewed_by        BIGINT UNSIGNED                                NULL,
    campaign_name      VARCHAR(255)                                   NOT NULL,
    start_date         DATE                                           NOT NULL,
    end_date           DATE                                           NOT NULL,
    quoted_amount      DECIMAL(12, 2)                                 NOT NULL DEFAULT 0,
    quotation_status   ENUM ('PENDING', 'ACCEPTED', 'REJECTED')       NOT NULL DEFAULT 'PENDING',
    contract_reference VARCHAR(100)                                   NULL,
    payment_status     ENUM ('UNPAID', 'PENDING', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    status             ENUM ('DRAFT', 'PENDING', 'APPROVED', 'ACTIVE', 'REJECTED', 'COMPLETED', 'SUSPENDED')
                                                                      NOT NULL DEFAULT 'DRAFT',
    rejection_reason   TEXT                                           NULL,
    created_at         DATETIME                                       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_ad_campaigns_contract UNIQUE (contract_reference),
    CONSTRAINT fk_ad_campaigns_advertiser
        FOREIGN KEY (advertiser_id) REFERENCES advertisers (advertiser_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ad_campaigns_slot
        FOREIGN KEY (slot_id) REFERENCES ad_slots (slot_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ad_campaigns_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_ad_campaigns_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_ad_campaigns_amount CHECK (quoted_amount >= 0)
) ENGINE = InnoDB;

-- Bảng ad_creatives: Nội dung banner và kiểm tra an toàn link đích
CREATE TABLE IF NOT EXISTS ad_creatives
(
    creative_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id      BIGINT UNSIGNED                                     NOT NULL,
    reviewed_by      BIGINT UNSIGNED                                     NULL,
    version_number   INT UNSIGNED                                        NOT NULL DEFAULT 1,
    media_url        VARCHAR(1000)                                       NOT NULL,
    target_url       VARCHAR(2048)                                       NOT NULL,
    resolved_url     VARCHAR(2048)                                       NULL,
    review_status    ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED') NOT NULL DEFAULT 'PENDING',
    scan_status      ENUM ('SAFE', 'SUSPICIOUS', 'CHANGED')              NULL,
    rejection_reason TEXT                                                NULL,
    approved_at      DATETIME                                            NULL,
    last_scanned_at  DATETIME                                            NULL,

    CONSTRAINT uk_ad_creatives_campaign_version UNIQUE (campaign_id, version_number),
    CONSTRAINT uk_ad_creatives_campaign_creative UNIQUE (campaign_id, creative_id), -- Dùng làm khóa tham chiếu cho ad_stats
    CONSTRAINT fk_ad_creatives_campaign
        FOREIGN KEY (campaign_id) REFERENCES ad_campaigns (campaign_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ad_creatives_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;

-- Bảng ad_stats: Số liệu thống kê hiệu suất quảng cáo theo ngày
CREATE TABLE IF NOT EXISTS ad_stats
(
    stat_id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id BIGINT UNSIGNED NOT NULL,
    creative_id BIGINT UNSIGNED NOT NULL,
    stat_date   DATE            NOT NULL,
    impressions BIGINT UNSIGNED NOT NULL DEFAULT 0,
    clicks      BIGINT UNSIGNED NOT NULL DEFAULT 0,
    ctr         DECIMAL(8, 4)   NOT NULL DEFAULT 0,

    CONSTRAINT uk_ad_stats_campaign_creative_date UNIQUE (campaign_id, creative_id, stat_date),
    CONSTRAINT fk_ad_stats_campaign_creative
        FOREIGN KEY (campaign_id, creative_id)
            REFERENCES ad_creatives (campaign_id, creative_id)
            ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_ad_stats_ctr CHECK (ctr >= 0 AND ctr <= 100),
    CONSTRAINT chk_ad_stats_clicks CHECK (clicks <= impressions) -- Số click không được vượt quá số view
) ENGINE = InnoDB;

-- =============================================================
-- 5. TRANSACTIONS & COMPLAINTS (Sổ cái thanh toán & Khiếu nại)
-- =============================================================

-- Bảng transactions: Sổ cái lưu vết toàn bộ dòng tiền thu/chi
CREATE TABLE IF NOT EXISTS transactions
(
    transaction_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT UNSIGNED                                   NOT NULL,
    original_transaction_id BIGINT UNSIGNED                                   NULL,                   -- Trỏ về giao dịch gốc nếu đây là giao dịch REFUND
    subscription_id         BIGINT UNSIGNED                                   NULL,
    purchase_id             BIGINT UNSIGNED                                   NULL,
    campaign_id             BIGINT UNSIGNED                                   NULL,
    transaction_type        ENUM ('SUBSCRIPTION', 'ARTICLE', 'AD', 'REFUND')  NOT NULL,
    amount                  DECIMAL(12, 2)                                    NOT NULL,
    currency                VARCHAR(10)                                       NOT NULL DEFAULT 'VND', -- [ĐÃ BỔ SUNG] Mặc định VND cho thị trường VN
    payment_method          VARCHAR(50)                                       NOT NULL,               -- VNPAY, MOMO, STRIPE, BANK_TRANSFER
    gateway_transaction_id  VARCHAR(255)                                      NULL,
    status                  ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    paid_at                 DATETIME                                          NULL,
    created_at              DATETIME                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Trong MySQL, giá trị NULL không xung đột với UNIQUE nên PENDING cho phép gateway_id = NULL
    CONSTRAINT uk_transactions_gateway_id UNIQUE (gateway_transaction_id),
    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_original
        FOREIGN KEY (original_transaction_id) REFERENCES transactions (transaction_id),
    CONSTRAINT fk_transactions_subscription
        FOREIGN KEY (subscription_id) REFERENCES subscriptions (subscription_id),
    CONSTRAINT fk_transactions_purchase
        FOREIGN KEY (purchase_id) REFERENCES article_purchases (purchase_id),
    CONSTRAINT fk_transactions_campaign
        FOREIGN KEY (campaign_id) REFERENCES ad_campaigns (campaign_id),
    CONSTRAINT chk_transactions_amount CHECK (amount >= 0),

    -- Đảm bảo tính độc quyền mục tiêu: Một thanh toán chỉ trỏ về đúng 1 đối tượng nghiệp vụ duy nhất.
    -- Nếu là REFUND thì bắt buộc phải có original_transaction_id và không có target trực tiếp.
    CONSTRAINT chk_transactions_targets CHECK (
        (transaction_type = 'SUBSCRIPTION'
            AND subscription_id IS NOT NULL
            AND purchase_id IS NULL AND campaign_id IS NULL
            AND original_transaction_id IS NULL)
            OR (transaction_type = 'ARTICLE'
            AND purchase_id IS NOT NULL
            AND subscription_id IS NULL AND campaign_id IS NULL
            AND original_transaction_id IS NULL)
            OR (transaction_type = 'AD'
            AND campaign_id IS NOT NULL
            AND subscription_id IS NULL AND purchase_id IS NULL
            AND original_transaction_id IS NULL)
            OR (transaction_type = 'REFUND'
            AND original_transaction_id IS NOT NULL
            AND subscription_id IS NULL AND purchase_id IS NULL
            AND campaign_id IS NULL)
        ),

    INDEX idx_transactions_user_created (user_id, created_at),
    INDEX idx_transactions_original (original_transaction_id),
    INDEX idx_transactions_status (status, created_at)
) ENGINE = InnoDB;

-- Bảng payment_complaints: Xử lý khiếu nại giao dịch của người dùng
CREATE TABLE IF NOT EXISTS payment_complaints
(
    complaint_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    transaction_id BIGINT UNSIGNED                                     NOT NULL,
    user_id        BIGINT UNSIGNED                                     NOT NULL,
    description    TEXT                                                NOT NULL,
    evidence_url   VARCHAR(1000)                                       NULL,
    status         ENUM ('OPEN', 'PROCESSING', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    handled_by     BIGINT UNSIGNED                                     NULL,
    resolution     TEXT                                                NULL,
    created_at     DATETIME                                            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at    DATETIME                                            NULL,

    CONSTRAINT fk_payment_complaints_transaction
        FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_payment_complaints_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_payment_complaints_handler
        FOREIGN KEY (handled_by) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE SET NULL,

    -- Ràng buộc: Đã giải quyết (RESOLVED/REJECTED) thì bắt buộc phải có ngày và nội dung giải quyết
    CONSTRAINT chk_payment_complaints_resolution CHECK (
        (status IN ('OPEN', 'PROCESSING') AND resolved_at IS NULL)
            OR (status IN ('RESOLVED', 'REJECTED')
            AND resolution IS NOT NULL AND resolved_at IS NOT NULL)
        ),

    INDEX idx_payment_complaints_transaction (transaction_id),
    INDEX idx_payment_complaints_user_status (user_id, status),
    INDEX idx_payment_complaints_handler_status (handled_by, status)
) ENGINE = InnoDB;

-- =============================================================
-- 6. NOTIFICATIONS & AUDIT LOGS (Thông báo & Kiểm toán hệ thống)
-- =============================================================

-- Bảng notifications: Hộp thư thông báo đa kênh
CREATE TABLE IF NOT EXISTS notifications
(
    notification_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id           BIGINT UNSIGNED                    NOT NULL,
    notification_type VARCHAR(80)                        NOT NULL,
    channel           ENUM ('IN_APP', 'EMAIL', 'SMS')    NOT NULL,
    title             VARCHAR(255)                       NOT NULL,
    content           TEXT                               NOT NULL,
    delivery_status   ENUM ('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    is_read           BOOLEAN                            NOT NULL DEFAULT FALSE,
    created_at        DATETIME                           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE CASCADE,

    INDEX idx_notifications_user_read (user_id, is_read, created_at)
) ENGINE = InnoDB;

-- Bảng audit_logs: Nhật ký kiểm toán bảo mật và hành vi hệ thống
CREATE TABLE IF NOT EXISTS audit_logs
(
    audit_id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NULL,             -- [ĐÃ FIX]: Cho phép NULL cho các Scheduled/Cron jobs tự động của hệ thống
    action      VARCHAR(120)    NOT NULL,
    target_type VARCHAR(100)    NOT NULL,
    target_id   BIGINT UNSIGNED NULL,
    old_value   JSON            NULL,
    new_value   JSON            NULL,
    ip_address  VARCHAR(45)     NULL,             -- Hỗ trợ cả IPv4 và IPv6
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
            ON UPDATE CASCADE ON DELETE SET NULL, -- [ĐÃ FIX]: Nếu user bị xóa, lịch sử audit log vẫn còn nguyên vẹn

    INDEX idx_audit_logs_target (target_type, target_id),
    INDEX idx_audit_logs_action (action, created_at)
) ENGINE = InnoDB;

-- =============================================================
-- 7. TRIGGERS (Ràng buộc nghiệp vụ chuyên sâu cấp Database)
-- =============================================================

DELIMITER $$

-- [ĐÃ BỔ SUNG]: Trigger ngăn chặn xuất bản bài viết nếu phiên bản được chọn chưa APPROVED
-- Giúp triệt tiêu 100% rủi ro tạo ra "Bài viết ma" do lỗi logic ở tầng Backend code
CREATE TRIGGER trg_articles_check_publish_status
    BEFORE UPDATE
    ON articles
    FOR EACH ROW
BEGIN
    IF NEW.status = 'PUBLISHED' AND NEW.published_version IS NOT NULL THEN
        -- Kiểm tra phiên bản định xuất bản xem đã APPROVED chưa
        IF NOT EXISTS (SELECT 1
                       FROM article_versions
                       WHERE article_id = NEW.article_id
                         AND version_number = NEW.published_version
                         AND review_status = 'APPROVED') THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                        'Lỗi nghiệp vụ: Không thể xuất bản! Phiên bản được chọn chưa có trạng thái APPROVED.';
        END IF;
    END IF;
END$$

DELIMITER ;

-- =============================================================
-- 8. VIEWS (Khung nhìn tối ưu cho ứng dụng truy vấn)
-- =============================================================

-- View 1: Danh sách bài viết đang xuất bản (Dùng trực tiếp cho trang chủ, chuyên mục, danh sách bài đọc)
CREATE OR REPLACE VIEW vw_published_articles AS
SELECT a.article_id,
       a.slug,
       av.title,
       av.summary,
       av.cover_image_url,
       a.access_type,
       a.single_price,
       a.category_id,
       c.name      AS category_name,
       a.author_id,
       u.full_name AS author_name,
       a.view_count,
       a.published_at
FROM articles a
         JOIN categories c ON c.category_id = a.category_id
         JOIN users u ON u.user_id = a.author_id
         JOIN article_versions av
              ON av.article_id = a.article_id
                  AND av.version_number = a.published_version
WHERE a.status = 'PUBLISHED'
  AND av.review_status = 'APPROVED';

-- View 2: Tổng hợp hiệu suất chiến dịch quảng cáo (Dùng cho Dashboard Admin và Advertiser)
CREATE OR REPLACE VIEW vw_campaign_performance AS
SELECT c.campaign_id,
       c.campaign_name,
       c.advertiser_id,
       c.status,
       COALESCE(SUM(s.impressions), 0) AS total_impressions,
       COALESCE(SUM(s.clicks), 0)      AS total_clicks,
       CASE
           WHEN COALESCE(SUM(s.impressions), 0) = 0 THEN 0
           ELSE ROUND(SUM(s.clicks) * 100.0 / SUM(s.impressions), 4)
           END                         AS overall_ctr
FROM ad_campaigns c
         LEFT JOIN ad_stats s ON s.campaign_id = c.campaign_id
GROUP BY c.campaign_id, c.campaign_name, c.advertiser_id, c.status;
