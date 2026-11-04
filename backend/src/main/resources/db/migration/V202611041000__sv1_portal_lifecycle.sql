ALTER TABLE ad_campaigns
    MODIFY status ENUM('DRAFT','PENDING','APPROVED','ACTIVE','REJECTED','COMPLETED','SUSPENDED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
    ADD paid_amount DECIMAL(12,2) NULL;
UPDATE ad_campaigns SET paid_amount = accepted_amount WHERE payment_status = 'PAID';

ALTER TABLE ad_creatives
    ADD replacement_reason TEXT NULL,
    ADD requested_effective_at DATETIME NULL;

CREATE TABLE ad_cancellation_requests (
    cancellation_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    campaign_id BIGINT UNSIGNED NOT NULL UNIQUE,
    advertiser_id BIGINT UNSIGNED NOT NULL,
    requested_by BIGINT UNSIGNED NOT NULL,
    reason TEXT NOT NULL,
    effective_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancel_status ENUM('EFFECTIVE') NOT NULL DEFAULT 'EFFECTIVE',
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_days INT NOT NULL,
    unused_days INT NOT NULL,
    proposed_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    refund_request_id BIGINT UNSIGNED NULL,
    refund_decision ENUM('NOT_APPLICABLE','PENDING','APPROVED','REJECTED') NOT NULL,
    refund_status ENUM('NONE','PROCESSING','REFUNDED') NOT NULL DEFAULT 'NONE',
    refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    decided_at DATETIME NULL,
    refunded_at DATETIME NULL,
    review_notes TEXT NULL,
    FOREIGN KEY (campaign_id) REFERENCES ad_campaigns(campaign_id),
    FOREIGN KEY (advertiser_id) REFERENCES advertisers(advertiser_id),
    FOREIGN KEY (requested_by) REFERENCES users(user_id)
);
