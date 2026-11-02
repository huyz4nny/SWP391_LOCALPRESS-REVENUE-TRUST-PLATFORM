-- =============================================================================
-- V18: AD CONTRACTS, ADDENDUMS & VIP TIERING (SV2 - Trọng Phan, Iteration 3, UC019, UC025)
-- =============================================================================

ALTER TABLE advertisers
    ADD COLUMN vip_tier ENUM('STANDARD', 'SILVER', 'GOLD', 'DIAMOND') NOT NULL DEFAULT 'STANDARD' AFTER verification_status,
    ADD COLUMN vip_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER vip_tier;

CREATE TABLE IF NOT EXISTS ad_contracts (
    contract_id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id        BIGINT UNSIGNED NOT NULL UNIQUE,
    advertiser_id      BIGINT UNSIGNED NOT NULL,
    contract_number    VARCHAR(100) NOT NULL UNIQUE,
    signing_date       DATE NOT NULL,
    contract_value     DECIMAL(12,2) NOT NULL,
    contract_file_url  VARCHAR(1000) NULL,
    status             ENUM('DRAFT', 'SIGNED', 'ACTIVE', 'TERMINATED', 'EXPIRED') NOT NULL DEFAULT 'SIGNED',
    notes              TEXT NULL,
    created_by         BIGINT UNSIGNED NULL,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_contracts_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_contracts_advertiser FOREIGN KEY (advertiser_id) REFERENCES advertisers(advertiser_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_contracts_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS ad_contract_addendums (
    addendum_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id       BIGINT UNSIGNED NOT NULL,
    contract_id       BIGINT UNSIGNED NULL,
    addendum_number   VARCHAR(100) NOT NULL,
    effective_date    DATE NOT NULL,
    adjustment_type   VARCHAR(100) NOT NULL,
    notes             TEXT NULL,
    created_by        BIGINT UNSIGNED NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_addendum_campaign FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_addendum_contract FOREIGN KEY (contract_id) REFERENCES ad_contracts(contract_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_addendum_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;

-- Dữ liệu mẫu hợp đồng đã ký kết giữa Tòa soạn và Doanh nghiệp để Demo (phục vụ cả SV1 và SV2)
INSERT INTO ad_contracts (contract_id, campaign_id, advertiser_id, contract_number, signing_date, contract_value, contract_file_url, status, notes)
VALUES (1, 1, 1, 'HD-2026-DV-001', '2026-08-25', 45000000.00, 'https://example.com/contracts/HD-2026-DV-001.pdf', 'SIGNED', 'Hợp đồng quảng cáo B2B Cảng Logistics Đình Vũ 2026')
ON DUPLICATE KEY UPDATE contract_number = VALUES(contract_number);
