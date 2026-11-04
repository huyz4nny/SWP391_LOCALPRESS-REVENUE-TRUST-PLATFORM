CREATE TABLE ad_url_checks (
 check_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 creative_id BIGINT UNSIGNED NOT NULL,
 target_url VARCHAR(2048) NOT NULL,
 resolved_url VARCHAR(2048) NULL,
 outcome VARCHAR(20) NOT NULL,
 detail VARCHAR(300) NOT NULL,
 checked_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 CONSTRAINT fk_ad_url_check_creative FOREIGN KEY (creative_id) REFERENCES ad_creatives(creative_id) ON DELETE CASCADE,
 INDEX idx_ad_url_check_creative (creative_id,check_id)
);
