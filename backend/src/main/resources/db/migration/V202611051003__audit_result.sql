-- Historical and unclassified producers must remain UNKNOWN.
ALTER TABLE audit_logs ADD COLUMN result ENUM('SUCCESS','FAILURE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN';
CREATE INDEX idx_audit_logs_result_id ON audit_logs(result,audit_id);
