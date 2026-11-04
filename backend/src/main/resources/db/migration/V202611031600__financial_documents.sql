-- =============================================================================
-- V202611031600: CHỨNG TỪ TÀI CHÍNH (SV4 - Huy, UC057)
-- =============================================================================
-- Hệ thống tự phát hành 1 chứng từ cho mỗi đơn khi đơn chuyển SUCCESS:
--   đơn AD -> INVOICE (HD-yyyy-nnnnnn), đơn SUBSCRIPTION / ARTICLE -> RECEIPT (BN-yyyy-nnnnnn),
--   mỗi loại một dãy số tăng liên tục theo năm (bảng financial_document_sequences).
-- Giá đơn đã gồm VAT: total_amount = số khách trả, tách amount_before_vat + vat_amount theo vat_rate
-- tại thời điểm phát hành (8% theo NQ 204/2025/QH15 đến 31/12/2026, đổi qua localpress.finance.vat-rate).
-- Thông tin người mua lưu lại tại thời điểm phát hành (doanh nghiệp đổi tên sau đó không làm đổi chứng từ).
-- Hoàn tiền toàn phần -> VOIDED + voided_at; hoàn một phần giữ ISSUED.
-- UNIQUE(transaction_id): webhook gửi lặp không phát hành chứng từ thứ hai (Rule 5).
-- =============================================================================

CREATE TABLE IF NOT EXISTS financial_document_sequences (
    document_type  ENUM('RECEIPT', 'INVOICE') NOT NULL,
    document_year  SMALLINT UNSIGNED NOT NULL,
    last_no        INT UNSIGNED NOT NULL,
    PRIMARY KEY (document_type, document_year)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS financial_documents (
    document_id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_no        VARCHAR(30)  NOT NULL,
    document_type      ENUM('RECEIPT', 'INVOICE') NOT NULL,
    transaction_id     BIGINT UNSIGNED NOT NULL,
    user_id            BIGINT UNSIGNED NOT NULL,
    buyer_name         VARCHAR(255) NOT NULL,
    buyer_tax_code     VARCHAR(50)  NULL,
    buyer_address      VARCHAR(500) NULL,
    vat_rate           DECIMAL(5,2) NOT NULL,
    amount_before_vat  DECIMAL(12,2) NOT NULL,
    vat_amount         DECIMAL(12,2) NOT NULL,
    total_amount       DECIMAL(12,2) NOT NULL,
    status             ENUM('ISSUED', 'VOIDED') NOT NULL DEFAULT 'ISSUED',
    issued_at          DATETIME NOT NULL,
    voided_at          DATETIME NULL,

    CONSTRAINT uk_financial_documents_no UNIQUE (document_no),
    CONSTRAINT uk_financial_documents_tx UNIQUE (transaction_id),
    CONSTRAINT fk_financial_documents_tx
        FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    CONSTRAINT fk_financial_documents_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_financial_documents_amount
        CHECK (total_amount >= 0 AND vat_amount >= 0 AND amount_before_vat + vat_amount = total_amount),
    CONSTRAINT chk_financial_documents_vat_rate
        CHECK (vat_rate >= 0 AND vat_rate <= 100),
    CONSTRAINT chk_financial_documents_voided
        CHECK ((status = 'VOIDED') = (voided_at IS NOT NULL)),
    INDEX idx_financial_documents_user (user_id, issued_at)
) ENGINE = InnoDB;

-- Phát hành bù chứng từ cho đơn đã thu trước UC057 (đơn SUCCESS / REFUNDED chưa có chứng từ), VAT 8%.
-- Đánh số tiếp theo dãy hiện có của từng loại / năm, theo thời điểm thu tiền. Đơn đã hoàn toàn phần -> VOIDED.
INSERT INTO financial_documents (document_no, document_type, transaction_id, user_id, buyer_name, buyer_tax_code,
                                 buyer_address, vat_rate, amount_before_vat, vat_amount, total_amount, status,
                                 issued_at, voided_at)
SELECT CONCAT(IF(x.doc_type = 'INVOICE', 'HD', 'BN'), '-', x.doc_year, '-',
              LPAD(COALESCE(s.last_no, 0) + x.rn, 6, '0')),
       x.doc_type, x.transaction_id, x.user_id, x.buyer_name, x.buyer_tax_code, x.buyer_address,
       8.00, x.before_vat, x.amount - x.before_vat, x.amount,
       IF(x.status = 'REFUNDED', 'VOIDED', 'ISSUED'), x.issued_at,
       IF(x.status = 'REFUNDED', COALESCE(x.refunded_at, x.issued_at), NULL)
FROM (
    SELECT t.transaction_id, t.user_id, t.amount, t.status,
           IF(t.transaction_type = 'AD', 'INVOICE', 'RECEIPT') AS doc_type,
           YEAR(COALESCE(t.paid_at, t.created_at)) AS doc_year,
           COALESCE(t.paid_at, t.created_at) AS issued_at,
           ROUND(t.amount * 100 / 108, 0) AS before_vat,
           ROW_NUMBER() OVER (PARTITION BY IF(t.transaction_type = 'AD', 'INVOICE', 'RECEIPT'),
                                           YEAR(COALESCE(t.paid_at, t.created_at))
                              ORDER BY COALESCE(t.paid_at, t.created_at), t.transaction_id) AS rn,
           COALESCE(NULLIF(a.invoice_name, ''), a.company_name, u.full_name) AS buyer_name,
           COALESCE(NULLIF(a.invoice_tax_code, ''), a.tax_code) AS buyer_tax_code,
           COALESCE(NULLIF(a.invoice_address, ''), a.address) AS buyer_address,
           (SELECT MAX(r.paid_at) FROM transactions r
            WHERE r.transaction_type = 'REFUND' AND r.original_transaction_id = t.transaction_id) AS refunded_at
    FROM transactions t
    JOIN users u ON u.user_id = t.user_id
    LEFT JOIN advertisers a ON a.user_id = t.user_id AND t.transaction_type = 'AD'
    WHERE t.transaction_type IN ('AD', 'ARTICLE', 'SUBSCRIPTION')
      AND t.status IN ('SUCCESS', 'REFUNDED')
      AND NOT EXISTS (SELECT 1 FROM financial_documents d WHERE d.transaction_id = t.transaction_id)
) x
LEFT JOIN financial_document_sequences s ON s.document_type = x.doc_type AND s.document_year = x.doc_year;

-- Dãy số tiếp tục từ số lớn nhất đã phát hành; tạo sẵn dòng năm nay và năm sau (last_no = 0) để lần phát hành
-- đầu năm chỉ UPDATE 1 dòng có sẵn, không chèn dòng mới cùng lúc.
INSERT INTO financial_document_sequences (document_type, document_year, last_no)
SELECT d.document_type, d.doc_year, MAX(d.doc_seq)
FROM (SELECT document_type,
             CAST(SUBSTRING(document_no, 4, 4) AS UNSIGNED) AS doc_year,
             CAST(SUBSTRING(document_no, 9) AS UNSIGNED) AS doc_seq
      FROM financial_documents) d
GROUP BY d.document_type, d.doc_year
ON DUPLICATE KEY UPDATE last_no = GREATEST(last_no, VALUES(last_no));

INSERT IGNORE INTO financial_document_sequences (document_type, document_year, last_no)
SELECT k.document_type, YEAR(CURDATE()) + y.n, 0
FROM (SELECT 'INVOICE' AS document_type UNION ALL SELECT 'RECEIPT') k
CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1) y;
