ALTER TABLE advertisers
    ADD COLUMN business_sector VARCHAR(150) NULL AFTER company_name,
    ADD COLUMN invoice_name VARCHAR(255) NULL AFTER business_sector,
    ADD COLUMN invoice_tax_code VARCHAR(50) NULL AFTER invoice_name,
    ADD COLUMN invoice_address VARCHAR(500) NULL AFTER invoice_tax_code,
    ADD COLUMN invoice_email VARCHAR(255) NULL AFTER invoice_address;

UPDATE advertisers
SET invoice_name = company_name,
    invoice_tax_code = tax_code,
    invoice_address = address,
    invoice_email = email;

ALTER TABLE ad_slots
    ADD COLUMN category_id BIGINT UNSIGNED NULL AFTER page_location,
    ADD COLUMN inventory_mode ENUM('EXCLUSIVE', 'ROTATING') NOT NULL DEFAULT 'EXCLUSIVE' AFTER capacity;

UPDATE ad_slots SET inventory_mode = 'ROTATING' WHERE capacity > 1;

ALTER TABLE ad_slots
    ADD CONSTRAINT fk_ad_slots_category FOREIGN KEY (category_id) REFERENCES categories(category_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    ADD CONSTRAINT chk_ad_slots_exclusive_capacity CHECK (inventory_mode <> 'EXCLUSIVE' OR capacity = 1);
