CREATE TABLE user_identities (
    identity_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_subject VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    email_at_link_time VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_identity_provider_subject UNIQUE (provider, provider_subject),
    CONSTRAINT uk_user_identity_user_provider UNIQUE (user_id, provider),
    CONSTRAINT fk_user_identity_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE
) ENGINE = InnoDB;
