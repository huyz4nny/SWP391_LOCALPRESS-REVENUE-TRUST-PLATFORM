-- Run manually against the intended localpress_db connection.
-- Stop the backend before applying, then log in again after restarting it.
-- V1 stays unchanged: this script upgrades both existing and newly created DBs.
USE localpress_db;

SELECT user_id, email, role, status FROM users WHERE role = 'AUTHOR';

START TRANSACTION;
UPDATE users SET role = 'EDITOR' WHERE role = 'AUTHOR';
COMMIT;

ALTER TABLE users
    MODIFY COLUMN role ENUM(
        'READER', 'EDITOR', 'STAFF', 'ACCOUNTANT', 'ADVERTISER', 'SYSTEM_ADMIN'
    ) NOT NULL DEFAULT 'READER';

SELECT user_id, email, role, status
FROM users WHERE email IN ('phongvien@localpress.vn', 'bientap@localpress.vn');
SHOW COLUMNS FROM users LIKE 'role';
