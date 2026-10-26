-- Existing plans retain their site-wide access. No articles, versions or grants are removed.
ALTER TABLE subscription_plans
    ADD COLUMN access_scope ENUM('ALL', 'CATEGORY') NOT NULL DEFAULT 'ALL',
    ADD COLUMN category_id BIGINT UNSIGNED NULL,
    ADD CONSTRAINT fk_subscription_plans_category
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    ADD CONSTRAINT chk_subscription_plans_scope
        CHECK ((access_scope = 'ALL' AND category_id IS NULL)
            OR (access_scope = 'CATEGORY' AND category_id IS NOT NULL));
