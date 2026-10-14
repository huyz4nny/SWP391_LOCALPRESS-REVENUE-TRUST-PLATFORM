-- Run manually only on the intended localpress_db database.
-- Stop the backend first. This restores AUTHOR after the previous role removal.
-- Do not run the old replace_author_role_with_editor.sql script.
USE localpress_db;

ALTER TABLE users
    MODIFY COLUMN role ENUM(
        'READER', 'AUTHOR', 'EDITOR', 'STAFF', 'ACCOUNTANT', 'ADVERTISER', 'SYSTEM_ADMIN'
    ) NOT NULL DEFAULT 'READER';

START TRANSACTION;
UPDATE users
SET role = 'AUTHOR'
WHERE email = 'phongvien@localpress.vn' AND role = 'EDITOR';
COMMIT;

-- Other users converted to EDITOR must be reviewed individually before changing role.
SELECT user_id, email, role, status
FROM users WHERE email IN ('phongvien@localpress.vn', 'bientap@localpress.vn');
SHOW COLUMNS FROM users LIKE 'role';
