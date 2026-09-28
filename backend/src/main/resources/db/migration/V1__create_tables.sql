-- ====================================================================
-- LocalPress Database Schema - V1__create_tables.sql
-- Subsystems: Identity, Reader, Content, Editorial, Advertising, Finance
-- ====================================================================

-- 1. Identity & Access Management
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    phone_number VARCHAR(20),
    avatar_url VARCHAR(500),
    role VARCHAR(50) NOT NULL, -- ROLE_READER, ROLE_ADVERTISER, ROLE_JOURNALIST, ROLE_EDITOR, ROLE_ACCOUNTANT, ROLE_ADMIN
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, LOCKED, PENDING
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Content & Editorial
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(350) NOT NULL UNIQUE,
    summary TEXT,
    content LONGTEXT,
    cover_image_url VARCHAR(500),
    author_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    is_premium BOOLEAN DEFAULT FALSE,
    price DECIMAL(12, 2) DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, REJECTED
    view_count BIGINT DEFAULT 0,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_articles_author FOREIGN KEY (author_id) REFERENCES users(id),
    CONSTRAINT fk_articles_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Advertising & B2B
CREATE TABLE IF NOT EXISTS ad_slots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE, -- E.g. HOME_HEADER, ARTICLE_SIDEBAR, IN_FEED
    page_location VARCHAR(100) NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    base_price_per_day DECIMAL(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ad_campaigns (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    advertiser_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    slot_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    banner_image_url VARCHAR(500),
    target_url VARCHAR(500) NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, APPROVED, RUNNING, COMPLETED, REJECTED
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ad_advertiser FOREIGN KEY (advertiser_id) REFERENCES users(id),
    CONSTRAINT fk_ad_slot FOREIGN KEY (slot_id) REFERENCES ad_slots(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Finance & Transactions
CREATE TABLE IF NOT EXISTS payment_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(100) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    order_type VARCHAR(50) NOT NULL, -- PREMIUM_ARTICLE, MEMBERSHIP, AD_CAMPAIGN
    target_id BIGINT, -- ID of article / subscription plan / campaign
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    payment_method VARCHAR(50) NOT NULL, -- VIETQR, VNPAY, MOMO
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, REFUNDED
    transaction_reference VARCHAR(150),
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
