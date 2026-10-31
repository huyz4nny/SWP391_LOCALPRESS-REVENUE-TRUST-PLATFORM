-- UC039 lịch sử đọc tin của độc giả, tách khỏi bookmark (saved_articles)
-- khóa chính kép: đọc lại cùng bài thì chỉ cập nhật last_read_at, không tạo dòng trùng
CREATE TABLE IF NOT EXISTS reading_history (
    user_id         BIGINT UNSIGNED NOT NULL,
    article_id      BIGINT UNSIGNED NOT NULL,
    last_read_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, article_id),
    CONSTRAINT fk_reading_history_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_reading_history_article
        FOREIGN KEY (article_id) REFERENCES articles(article_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_reading_history_user_read (user_id, last_read_at)
) ENGINE = InnoDB;
