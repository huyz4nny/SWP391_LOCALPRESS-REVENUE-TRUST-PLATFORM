-- Báo lỗi nội dung bài (UC042). Độc giả chỉ tạo dòng PENDING.
-- Màn xử lý thuộc kiểm duyệt nội dung (SV2).

CREATE TABLE IF NOT EXISTS article_reports (
    report_id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id    BIGINT UNSIGNED NOT NULL,
    user_id       BIGINT UNSIGNED NOT NULL,
    reason        ENUM('INCORRECT_INFO', 'TYPO', 'IMAGE_ERROR', 'OTHER') NOT NULL,
    description   VARCHAR(1000) NULL,
    status        ENUM('PENDING', 'RESOLVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    handled_by    BIGINT UNSIGNED NULL,
    handled_at    DATETIME NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_article_reports_article
        FOREIGN KEY (article_id) REFERENCES articles(article_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_article_reports_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_article_reports_handler
        FOREIGN KEY (handled_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_article_reports_status (status, created_at),
    INDEX idx_article_reports_article (article_id),
    INDEX idx_article_reports_user_article (user_id, article_id, status)
) ENGINE = InnoDB;
